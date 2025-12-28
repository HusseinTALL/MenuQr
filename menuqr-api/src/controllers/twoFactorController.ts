/**
 * Two-Factor Authentication Controller
 */

import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as twoFactorService from '../services/twoFactorService.js';
import * as auditService from '../services/auditService.js';
import * as sessionService from '../services/sessionService.js';
import { generateTokens } from '../middleware/auth.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

// Temporary storage for 2FA setup (in production, use Redis)
const pendingSetups = new Map<string, { secret: string; backupCodes: string[]; expiresAt: Date }>();

/**
 * Get 2FA status for current user
 * GET /auth/2fa/status
 */
export const getTwoFactorStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id.toString();

  const status = await twoFactorService.getTwoFactorStatus(userId);

  res.json({
    success: true,
    data: status,
  });
});

/**
 * Initialize 2FA setup - generates QR code and backup codes
 * POST /auth/2fa/setup
 */
export const initTwoFactorSetup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const userId = user._id.toString();

  // Check if 2FA is already enabled
  if (user.twoFactorEnabled) {
    throw new ApiError(400, '2FA is already enabled. Disable it first to set up again.');
  }

  // Generate 2FA setup
  const setup = await twoFactorService.generateTwoFactorSetup(user);

  // Store pending setup temporarily (expires in 10 minutes)
  pendingSetups.set(userId, {
    secret: setup.secret,
    backupCodes: setup.backupCodes,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  // Clean up expired setups
  cleanupExpiredSetups();

  res.json({
    success: true,
    message: 'Scan the QR code with your authenticator app, then verify with a code',
    data: {
      qrCodeDataUrl: setup.qrCodeDataUrl,
      backupCodes: setup.backupCodes,
      // Note: secret is not exposed to frontend for security
    },
  });
});

/**
 * Enable 2FA after verification
 * POST /auth/2fa/enable
 */
export const enableTwoFactor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const userId = user._id.toString();
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, 'Verification code is required');
  }

  // Get pending setup
  const pendingSetup = pendingSetups.get(userId);
  if (!pendingSetup) {
    throw new ApiError(400, 'No pending 2FA setup found. Please start the setup process again.');
  }

  if (pendingSetup.expiresAt < new Date()) {
    pendingSetups.delete(userId);
    throw new ApiError(400, '2FA setup has expired. Please start the setup process again.');
  }

  // Enable 2FA
  const result = await twoFactorService.enableTwoFactor(
    userId,
    pendingSetup.secret,
    token,
    pendingSetup.backupCodes
  );

  if (!result.success) {
    throw new ApiError(400, result.message);
  }

  // Clear pending setup
  pendingSetups.delete(userId);

  // Audit log
  await auditService.createAuditLog({
    action: 'update',
    category: 'authentication',
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    description: `User ${user.email} enabled two-factor authentication`,
    request: { ip: req.ip, userAgent: req.get('user-agent') },
  });

  res.json({
    success: true,
    message: result.message,
  });
});

/**
 * Disable 2FA
 * POST /auth/2fa/disable
 */
export const disableTwoFactor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const userId = user._id.toString();
  const { password } = req.body;

  if (!password) {
    throw new ApiError(400, 'Password is required to disable 2FA');
  }

  const result = await twoFactorService.disableTwoFactor(userId, password);

  if (!result.success) {
    throw new ApiError(400, result.message);
  }

  // Audit log
  await auditService.createAuditLog({
    action: 'update',
    category: 'authentication',
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    description: `User ${user.email} disabled two-factor authentication`,
    request: { ip: req.ip, userAgent: req.get('user-agent') },
  });

  res.json({
    success: true,
    message: result.message,
  });
});

/**
 * Verify 2FA token during login
 * POST /auth/2fa/verify
 */
export const verifyTwoFactor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    throw new ApiError(400, 'User ID and verification code are required');
  }

  // Get user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify 2FA token
  const result = await twoFactorService.verifyTwoFactorToken(userId, token);

  if (!result.success) {
    // Audit failed 2FA attempt
    await auditService.auditLoginFailure(
      user.email,
      'Invalid 2FA code',
      { ip: req.ip, userAgent: req.get('user-agent') }
    );
    throw new ApiError(401, result.message || 'Invalid verification code');
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Update user
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // Create session for device tracking
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.get('user-agent');
  await sessionService.createSession({
    userId: user._id.toString(),
    refreshToken,
    userAgent,
    ipAddress,
  }).catch((err) => logger.error('Failed to create session after 2FA', { error: err }));

  // Audit successful login
  await auditService.auditLoginSuccess(
    { _id: user._id, email: user.email, name: user.name, role: user.role },
    { ip: req.ip, userAgent: req.get('user-agent') },
    { twoFactorUsed: true, backupCodeUsed: result.usedBackupCode }
  );

  // Warn if backup code was used
  if (result.usedBackupCode) {
    const status = await twoFactorService.getTwoFactorStatus(userId);
    res.json({
      success: true,
      message: 'Login successful',
      warning: `Backup code used. ${status.backupCodesRemaining} backup codes remaining.`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          restaurantId: user.restaurantId,
        },
        accessToken,
        refreshToken,
        backupCodesRemaining: status.backupCodesRemaining,
      },
    });
    return;
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Regenerate backup codes
 * POST /auth/2fa/regenerate-backup-codes
 */
export const regenerateBackupCodes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const userId = user._id.toString();
  const { password } = req.body;

  if (!password) {
    throw new ApiError(400, 'Password is required');
  }

  const result = await twoFactorService.regenerateBackupCodes(userId, password);

  if (!result.success) {
    throw new ApiError(400, result.message);
  }

  // Audit log
  await auditService.createAuditLog({
    action: 'update',
    category: 'authentication',
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    description: `User ${user.email} regenerated 2FA backup codes`,
    request: { ip: req.ip, userAgent: req.get('user-agent') },
  });

  res.json({
    success: true,
    message: result.message,
    data: {
      backupCodes: result.backupCodes,
    },
  });
});

/**
 * Clean up expired pending setups
 */
const cleanupExpiredSetups = (): void => {
  const now = new Date();
  for (const [userId, setup] of pendingSetups.entries()) {
    if (setup.expiresAt < now) {
      pendingSetups.delete(userId);
    }
  }
};

export default {
  getTwoFactorStatus,
  initTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactor,
  regenerateBackupCodes,
};
