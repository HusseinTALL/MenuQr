import { Request, Response } from 'express';
import { User, LoginHistory } from '../models/index.js';
import { generateTokens, verifyRefreshToken, blacklistToken } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';
import * as auditService from '../services/auditService.js';
import * as sessionService from '../services/sessionService.js';
import * as passwordExpiryService from '../services/passwordExpiryService.js';
import * as loginNotificationService from '../services/loginNotificationService.js';
import * as anomalyDetectionService from '../services/anomalyDetectionService.js';

// Constants for account lockout
const MAX_FAILED_ATTEMPTS = config.security.maxFailedLoginAttempts;
const LOCK_DURATION_MS = config.security.lockoutDurationMinutes * 60 * 1000;

// Helper to parse user agent for device info
const parseUserAgent = (userAgent?: string) => {
  if (!userAgent) {return { type: 'unknown' as const };}

  const ua = userAgent.toLowerCase();
  let type: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  let browser = 'Unknown';
  let os = 'Unknown';

  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    type = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    type = 'tablet';
  } else if (/windows|macintosh|linux|x11/i.test(ua)) {
    type = 'desktop';
  }

  if (ua.includes('firefox')) {browser = 'Firefox';}
  else if (ua.includes('edg/')) {browser = 'Edge';}
  else if (ua.includes('chrome')) {browser = 'Chrome';}
  else if (ua.includes('safari')) {browser = 'Safari';}

  if (ua.includes('windows')) {os = 'Windows';}
  else if (ua.includes('mac os')) {os = 'macOS';}
  else if (ua.includes('linux')) {os = 'Linux';}
  else if (ua.includes('android')) {os = 'Android';}
  else if (ua.includes('iphone') || ua.includes('ipad')) {os = 'iOS';}

  return { type, browser, os };
};

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'User with this email already exists');
  }

  // Create user
  const user = await User.create({
    email,
    password,
    name,
    role: 'owner',
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Audit log - user registration
  await auditService.auditUserRegistration(
    { _id: user._id, email: user.email, name: user.name, role: user.role },
    { ip: req.ip, userAgent: req.get('user-agent') }
  );

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.get('user-agent');

  // Check if IP is blocked due to suspicious activity
  const ipBlockStatus = await anomalyDetectionService.isIPBlocked(ipAddress || '');
  if (ipBlockStatus.blocked) {
    throw new ApiError(429, ipBlockStatus.reason || 'Too many requests. Please try again later.');
  }

  // Find user with password, lockout, and password expiry fields
  const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil +passwordChangedAt');

  if (!user) {
    // Log failed login attempt - user not found
    await LoginHistory.create({
      userEmail: email,
      loginAt: new Date(),
      ipAddress,
      userAgent,
      device: parseUserAgent(userAgent),
      status: 'failed',
      failureReason: 'invalid_credentials',
    }).catch((err) => logger.error('Failed to log login attempt', { error: err }));

    // Audit log - failed login
    await auditService.auditLoginFailure(
      email,
      'User not found',
      { ip: ipAddress, userAgent }
    );

    // Process for anomaly detection (async, don't block)
    anomalyDetectionService.processLoginForAnomalies({
      ipAddress,
      email,
      isSuccess: false,
    }).catch((err) => logger.error('Anomaly detection failed', { error: err }));

    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);

    // Log failed login - account locked
    await LoginHistory.create({
      userId: user._id,
      userEmail: email,
      userName: user.name,
      userRole: user.role,
      loginAt: new Date(),
      ipAddress,
      userAgent,
      device: parseUserAgent(userAgent),
      status: 'failed',
      failureReason: 'account_locked',
    }).catch((err) => logger.error('Failed to log login attempt', { error: err }));

    throw new ApiError(423, `Account is locked due to too many failed login attempts. Try again in ${remainingMinutes} minute(s).`);
  }

  // Check if user is active
  if (!user.isActive) {
    // Log failed login - account disabled
    await LoginHistory.create({
      userId: user._id,
      userEmail: email,
      userName: user.name,
      userRole: user.role,
      loginAt: new Date(),
      ipAddress,
      userAgent,
      device: parseUserAgent(userAgent),
      status: 'failed',
      failureReason: 'account_disabled',
    }).catch((err) => logger.error('Failed to log login attempt', { error: err }));

    throw new ApiError(403, 'Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    // Increment failed attempts
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    // Lock account if max attempts reached
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await user.save();

      logger.warn('Account locked due to too many failed attempts', {
        email,
        attempts: user.failedLoginAttempts,
        lockUntil: user.lockUntil
      });

      // Log failed login - account now locked
      await LoginHistory.create({
        userId: user._id,
        userEmail: email,
        userName: user.name,
        userRole: user.role,
        loginAt: new Date(),
        ipAddress,
        userAgent,
        device: parseUserAgent(userAgent),
        status: 'failed',
        failureReason: 'account_locked',
      }).catch((err) => logger.error('Failed to log login attempt', { error: err }));

      // Audit log - account lockout
      await auditService.auditAccountLockout(email, { ip: ipAddress, userAgent });

      // Send account lockout notification (async, don't block response)
      loginNotificationService.notifyAccountLockout({
        email: user.email,
        userName: user.name,
        ipAddress,
        attemptCount: MAX_FAILED_ATTEMPTS,
      }).catch((err) => logger.error('Failed to send lockout notification', { error: err }));

      throw new ApiError(423, `Account is now locked due to ${MAX_FAILED_ATTEMPTS} failed login attempts. Try again in ${config.security.lockoutDurationMinutes} minutes.`);
    }

    await user.save();

    // Log failed login - invalid password
    await LoginHistory.create({
      userId: user._id,
      userEmail: email,
      userName: user.name,
      userRole: user.role,
      loginAt: new Date(),
      ipAddress,
      userAgent,
      device: parseUserAgent(userAgent),
      status: 'failed',
      failureReason: 'invalid_credentials',
    }).catch((err) => logger.error('Failed to log login attempt', { error: err }));

    // Process for anomaly detection (async, don't block)
    anomalyDetectionService.processLoginForAnomalies({
      ipAddress,
      email,
      isSuccess: false,
      userId: user._id.toString(),
    }).catch((err) => logger.error('Anomaly detection failed', { error: err }));

    const remainingAttempts = MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
    throw new ApiError(401, `Invalid email or password. ${remainingAttempts} attempt(s) remaining before account lockout.`);
  }

  // Reset failed attempts on successful password verification
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // Check if 2FA is enabled
  if (user.twoFactorEnabled) {
    // Log 2FA challenge
    await LoginHistory.create({
      userId: user._id,
      userEmail: email,
      userName: user.name,
      userRole: user.role,
      loginAt: new Date(),
      ipAddress,
      userAgent,
      device: parseUserAgent(userAgent),
      status: 'pending_2fa',
    }).catch((err) => logger.error('Failed to log 2FA challenge', { error: err }));

    // Return 2FA required response
    res.json({
      success: true,
      message: 'Two-factor authentication required',
      requiresTwoFactor: true,
      data: {
        userId: user._id,
        email: user.email,
      },
    });
    return;
  }

  // Generate tokens (no 2FA required)
  const { accessToken, refreshToken } = generateTokens(user);

  // Update user
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  // Create session for device tracking
  await sessionService.createSession({
    userId: user._id.toString(),
    refreshToken,
    userAgent,
    ipAddress,
  }).catch((err) => logger.error('Failed to create session', { error: err }));

  // Log successful login
  await LoginHistory.create({
    userId: user._id,
    userEmail: email,
    userName: user.name,
    userRole: user.role,
    loginAt: new Date(),
    ipAddress,
    userAgent,
    device: parseUserAgent(userAgent),
    status: 'success',
  }).catch((err) => logger.error('Failed to log login', { error: err }));

  // Audit log - successful login
  await auditService.auditLoginSuccess(
    { _id: user._id, email: user.email, name: user.name, role: user.role },
    { ip: ipAddress, userAgent }
  );

  // Send login notification if new device/IP detected (async, don't block response)
  loginNotificationService.notifyLoginIfNeeded({
    userId: user._id.toString(),
    userEmail: user.email,
    userName: user.name,
    ipAddress,
    userAgent,
    device: parseUserAgent(userAgent),
  }).catch((err) => logger.error('Failed to process login notification', { error: err }));

  // Process for anomaly detection (async, don't block)
  anomalyDetectionService.processLoginForAnomalies({
    ipAddress,
    email: user.email,
    isSuccess: true,
    userId: user._id.toString(),
  }).catch((err) => logger.error('Anomaly detection failed', { error: err }));

  // Check password expiry status
  const passwordStatus = passwordExpiryService.getPasswordExpiryStatus(user.passwordChangedAt);

  // Build response
  const response: {
    success: boolean;
    message: string;
    passwordExpired?: boolean;
    passwordExpiryWarning?: string;
    data: {
      user: {
        id: unknown;
        email: string;
        name: string;
        role: string;
        restaurantId?: unknown;
        twoFactorEnabled: boolean;
      };
      accessToken: string;
      refreshToken: string;
    };
  } = {
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      accessToken,
      refreshToken,
    },
  };

  // Add password expiry warning if applicable
  if (passwordStatus.isExpired) {
    response.passwordExpired = true;
    response.passwordExpiryWarning = passwordExpiryService.getExpiryWarningMessage(0);
  } else if (passwordStatus.isExpiringSoon) {
    response.passwordExpiryWarning = passwordExpiryService.getExpiryWarningMessage(passwordStatus.daysUntilExpiry);
  }

  res.json(response);
});

export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  // Verify refresh token (now async to check blacklist)
  const decoded = await verifyRefreshToken(token);
  if (!decoded) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Find user
  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated');
  }

  // Blacklist the old refresh token and delete old session
  await blacklistToken(token, user._id.toString(), 'refresh');
  await sessionService.deleteSessionByToken(token);

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  // Update refresh token
  user.refreshToken = newRefreshToken;
  await user.save();

  // Create new session
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.get('user-agent');
  await sessionService.createSession({
    userId: user._id.toString(),
    refreshToken: newRefreshToken,
    userAgent,
    ipAddress,
  }).catch((err) => logger.error('Failed to create session on refresh', { error: err }));

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const { refreshToken } = req.body;

  if (req.user) {
    const userId = req.user._id.toString();

    // Blacklist the access token
    if (accessToken) {
      await blacklistToken(accessToken, userId, 'access');
    }

    // Blacklist the refresh token if provided and delete session
    if (refreshToken) {
      await blacklistToken(refreshToken, userId, 'refresh');
      await sessionService.deleteSessionByToken(refreshToken);
    }

    // Clear refresh token in database
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

    // Audit log - logout
    await auditService.auditLogout(
      { _id: req.user._id, email: req.user.email, name: req.user.name, role: req.user.role },
      { ip: req.ip, userAgent: req.get('user-agent') }
    );

    logger.info('User logged out', { userId });
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Get user with passwordChangedAt for expiry check
  const user = await User.findById(req.user!._id).select('+passwordChangedAt');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check password expiry status
  const passwordStatus = passwordExpiryService.getPasswordExpiryStatus(user.passwordChangedAt);

  res.json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      passwordExpiry: {
        daysUntilExpiry: passwordStatus.daysUntilExpiry,
        isExpired: passwordStatus.isExpired,
        isExpiringSoon: passwordStatus.isExpiringSoon,
        expiresAt: passwordStatus.expiresAt,
      },
    },
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email } = req.body;
  const user = req.user!;

  // Check if email is taken
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, 'Email already in use');
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    { name, email },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: updatedUser!._id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      role: updatedUser!.role,
    },
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user!._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new tokens
  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  // Audit log - password change
  await auditService.auditPasswordChange(
    { _id: user._id, email: user.email, name: user.name, role: user.role },
    { ip: req.ip, userAgent: req.get('user-agent') }
  );

  // Send password changed notification (async, don't block response)
  loginNotificationService.notifyPasswordChanged({
    email: user.email,
    userName: user.name,
    ipAddress: req.ip,
  }).catch((err) => logger.error('Failed to send password changed notification', { error: err }));

  res.json({
    success: true,
    message: 'Password changed successfully',
    data: {
      accessToken,
      refreshToken,
    },
  });
});
