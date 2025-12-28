import { Request, Response } from 'express';
import { Customer, OTP, Restaurant } from '../models/index.js';
import {
  generateCustomerTokens,
  verifyCustomerRefreshToken,
  generateOtpVerificationToken,
  verifyOtpToken,
} from '../middleware/customerAuth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import smsService from '../services/smsService.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// Constants for account lockout
const MAX_FAILED_ATTEMPTS = config.security.maxFailedLoginAttempts;
const LOCK_DURATION_MS = config.security.lockoutDurationMinutes * 60 * 1000;

/**
 * Send OTP code to phone number
 * POST /customer/auth/send-otp
 */
export const sendOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, restaurantId, type = 'register' } = req.body;

  // Verify restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  // Check if customer exists for register/login type
  const existingCustomer = await Customer.findOne({ phone, restaurantId });

  if (type === 'register' && existingCustomer) {
    throw new ApiError(409, 'Un compte existe déjà avec ce numéro de téléphone');
  }

  if ((type === 'login' || type === 'reset_password') && !existingCustomer) {
    throw new ApiError(404, 'Aucun compte trouvé avec ce numéro de téléphone');
  }

  // Check for recent OTP (rate limiting)
  const recentOtp = await OTP.findOne({
    phone,
    restaurantId,
    createdAt: { $gt: new Date(Date.now() - config.otp.resendCooldownSeconds * 1000) },
  });

  if (recentOtp) {
    const waitTime = Math.ceil(
      (config.otp.resendCooldownSeconds * 1000 - (Date.now() - recentOtp.createdAt.getTime())) / 1000
    );
    throw new ApiError(429, `Veuillez attendre ${waitTime} secondes avant de demander un nouveau code`);
  }

  // Generate OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Delete any existing OTPs for this phone/restaurant/type
  await OTP.deleteMany({ phone, restaurantId, type });

  // Create new OTP
  const otp = await OTP.create({
    phone,
    restaurantId,
    code,
    type,
    expiresAt: new Date(Date.now() + config.otp.expiresInMinutes * 60 * 1000),
  });

  // Send SMS
  const smsResult = await smsService.sendOTP(phone, code, restaurant.name);

  if (!smsResult.success) {
    await OTP.findByIdAndDelete(otp._id);
    throw new ApiError(500, 'Erreur lors de l\'envoi du SMS. Veuillez réessayer.');
  }

  res.json({
    success: true,
    message: 'Code de vérification envoyé par SMS',
    data: {
      expiresIn: config.otp.expiresInMinutes * 60, // in seconds
    },
  });
});

/**
 * Verify OTP code
 * POST /customer/auth/verify-otp
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, restaurantId, code } = req.body;

  // Find OTP
  const otp = await OTP.findOne({
    phone,
    restaurantId,
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw new ApiError(400, 'Code invalide ou expiré');
  }

  // Check if expired
  if (new Date() > otp.expiresAt) {
    await OTP.findByIdAndDelete(otp._id);
    throw new ApiError(400, 'Code expiré. Veuillez en demander un nouveau.');
  }

  // Check attempts
  if (otp.attempts >= config.otp.maxAttempts) {
    await OTP.findByIdAndDelete(otp._id);
    throw new ApiError(400, 'Trop de tentatives. Veuillez demander un nouveau code.');
  }

  // Verify code
  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    const remainingAttempts = config.otp.maxAttempts - otp.attempts;
    throw new ApiError(400, `Code incorrect. ${remainingAttempts} tentative(s) restante(s).`);
  }

  // Mark OTP as used
  otp.isUsed = true;
  await otp.save();

  // Generate temporary token for registration/password reset
  const otpToken = generateOtpVerificationToken(phone, restaurantId);

  res.json({
    success: true,
    message: 'Code vérifié avec succès',
    data: {
      otpToken,
      type: otp.type,
    },
  });
});

/**
 * Register new customer (after OTP verified)
 * POST /customer/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, restaurantId, password, name, email, otpToken } = req.body;

  // Verify OTP token
  const tokenData = verifyOtpToken(otpToken);
  if (!tokenData || tokenData.phone !== phone || tokenData.restaurantId !== restaurantId) {
    throw new ApiError(400, 'Token de vérification invalide ou expiré. Veuillez recommencer.');
  }

  // Check if customer already exists
  const existingCustomer = await Customer.findOne({ phone, restaurantId });
  if (existingCustomer) {
    throw new ApiError(409, 'Un compte existe déjà avec ce numéro de téléphone');
  }

  // Verify restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  // Create customer
  const customer = await Customer.create({
    phone,
    restaurantId,
    password,
    name,
    email,
    isPhoneVerified: true,
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateCustomerTokens(customer);

  // Save refresh token
  customer.refreshToken = refreshToken;
  await customer.save();

  res.status(201).json({
    success: true,
    message: 'Compte créé avec succès',
    data: {
      customer: {
        id: customer._id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        restaurantId: customer.restaurantId,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Login customer
 * POST /customer/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, restaurantId, password } = req.body;

  // Find customer with password and lockout fields
  const customer = await Customer.findOne({ phone, restaurantId }).select('+password +failedLoginAttempts +lockUntil');
  if (!customer) {
    throw new ApiError(401, 'Numéro de téléphone ou mot de passe incorrect');
  }

  // Check if account is locked
  if (customer.lockUntil && customer.lockUntil > new Date()) {
    const remainingMinutes = Math.ceil((customer.lockUntil.getTime() - Date.now()) / 60000);
    throw new ApiError(423, `Compte verrouillé suite à trop de tentatives. Réessayez dans ${remainingMinutes} minute(s).`);
  }

  // Check if active
  if (!customer.isActive) {
    throw new ApiError(403, 'Compte désactivé');
  }

  // Verify password
  const isPasswordValid = await customer.comparePassword(password);
  if (!isPasswordValid) {
    // Increment failed attempts
    customer.failedLoginAttempts = (customer.failedLoginAttempts || 0) + 1;

    // Lock account if max attempts reached
    if (customer.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      customer.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await customer.save();

      logger.warn('Customer account locked due to too many failed attempts', {
        phone,
        restaurantId,
        attempts: customer.failedLoginAttempts,
        lockUntil: customer.lockUntil
      });

      throw new ApiError(423, `Compte verrouillé suite à ${MAX_FAILED_ATTEMPTS} tentatives échouées. Réessayez dans ${config.security.lockoutDurationMinutes} minutes.`);
    }

    await customer.save();

    const remainingAttempts = MAX_FAILED_ATTEMPTS - customer.failedLoginAttempts;
    throw new ApiError(401, `Numéro de téléphone ou mot de passe incorrect. ${remainingAttempts} tentative(s) restante(s).`);
  }

  // Reset failed attempts on successful login
  customer.failedLoginAttempts = 0;
  customer.lockUntil = undefined;

  // Generate tokens
  const { accessToken, refreshToken } = generateCustomerTokens(customer);

  // Update customer
  customer.refreshToken = refreshToken;
  await customer.save();

  res.json({
    success: true,
    message: 'Connexion réussie',
    data: {
      customer: {
        id: customer._id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        restaurantId: customer.restaurantId,
        dietaryPreferences: customer.dietaryPreferences,
        allergens: customer.allergens,
        totalOrders: customer.totalOrders,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Refresh tokens
 * POST /customer/auth/refresh-token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  // Verify refresh token
  const decoded = verifyCustomerRefreshToken(token);
  if (!decoded) {
    throw new ApiError(401, 'Token de rafraîchissement invalide');
  }

  // Find customer
  const customer = await Customer.findById(decoded.customerId).select('+refreshToken');
  if (!customer || customer.refreshToken !== token) {
    throw new ApiError(401, 'Token de rafraîchissement invalide');
  }

  if (!customer.isActive) {
    throw new ApiError(403, 'Compte désactivé');
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateCustomerTokens(customer);

  // Update refresh token
  customer.refreshToken = newRefreshToken;
  await customer.save();

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

/**
 * Logout customer
 * POST /customer/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (req.customer) {
    await Customer.findByIdAndUpdate(req.customer._id, { refreshToken: null });
  }

  res.json({
    success: true,
    message: 'Déconnexion réussie',
  });
});

/**
 * Get customer profile
 * GET /customer/auth/profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;

  res.json({
    success: true,
    data: {
      id: customer._id,
      phone: customer.phone,
      name: customer.name,
      email: customer.email,
      restaurantId: customer.restaurantId,
      isPhoneVerified: customer.isPhoneVerified,
      defaultAddress: customer.defaultAddress,
      savedAddresses: customer.savedAddresses,
      dietaryPreferences: customer.dietaryPreferences,
      allergens: customer.allergens,
      favoriteDishes: customer.favoriteDishes,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      lastOrderAt: customer.lastOrderAt,
      createdAt: customer.createdAt,
    },
  });
});

/**
 * Update customer profile
 * PUT /customer/auth/profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, dietaryPreferences, allergens } = req.body;
  const customer = req.customer!;

  // Check if email is taken by another customer in same restaurant
  if (email && email !== customer.email) {
    const existingCustomer = await Customer.findOne({
      email,
      restaurantId: customer.restaurantId,
      _id: { $ne: customer._id },
    });
    if (existingCustomer) {
      throw new ApiError(409, 'Cet email est déjà utilisé');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) {updateData.name = name;}
  if (email !== undefined) {updateData.email = email;}
  if (dietaryPreferences !== undefined) {updateData.dietaryPreferences = dietaryPreferences;}
  if (allergens !== undefined) {updateData.allergens = allergens;}

  const updatedCustomer = await Customer.findByIdAndUpdate(customer._id, updateData, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: 'Profil mis à jour',
    data: {
      id: updatedCustomer!._id,
      phone: updatedCustomer!.phone,
      name: updatedCustomer!.name,
      email: updatedCustomer!.email,
      dietaryPreferences: updatedCustomer!.dietaryPreferences,
      allergens: updatedCustomer!.allergens,
    },
  });
});

/**
 * Change password
 * PUT /customer/auth/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  // Get customer with password
  const customer = await Customer.findById(req.customer!._id).select('+password');
  if (!customer) {
    throw new ApiError(404, 'Client non trouvé');
  }

  // Verify current password
  const isPasswordValid = await customer.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Mot de passe actuel incorrect');
  }

  // Update password
  customer.password = newPassword;
  await customer.save();

  // Generate new tokens
  const { accessToken, refreshToken } = generateCustomerTokens(customer);
  customer.refreshToken = refreshToken;
  await customer.save();

  res.json({
    success: true,
    message: 'Mot de passe modifié avec succès',
    data: {
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Forgot password - send OTP
 * POST /customer/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, restaurantId } = req.body;

  // Check if customer exists
  const customer = await Customer.findOne({ phone, restaurantId });
  if (!customer) {
    // Don't reveal if account exists
    res.json({
      success: true,
      message: 'Si un compte existe avec ce numéro, un code de vérification a été envoyé',
    });
    return;
  }

  // Get restaurant for SMS
  const restaurant = await Restaurant.findById(restaurantId);

  // Check for recent OTP
  const recentOtp = await OTP.findOne({
    phone,
    restaurantId,
    type: 'reset_password',
    createdAt: { $gt: new Date(Date.now() - config.otp.resendCooldownSeconds * 1000) },
  });

  if (recentOtp) {
    const waitTime = Math.ceil(
      (config.otp.resendCooldownSeconds * 1000 - (Date.now() - recentOtp.createdAt.getTime())) / 1000
    );
    throw new ApiError(429, `Veuillez attendre ${waitTime} secondes avant de demander un nouveau code`);
  }

  // Generate OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Delete existing reset OTPs
  await OTP.deleteMany({ phone, restaurantId, type: 'reset_password' });

  // Create OTP
  await OTP.create({
    phone,
    restaurantId,
    code,
    type: 'reset_password',
    expiresAt: new Date(Date.now() + config.otp.expiresInMinutes * 60 * 1000),
  });

  // Send SMS
  await smsService.sendOTP(phone, code, restaurant?.name);

  res.json({
    success: true,
    message: 'Si un compte existe avec ce numéro, un code de vérification a été envoyé',
  });
});

/**
 * Reset password (after OTP verified)
 * POST /customer/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, restaurantId, code, newPassword } = req.body;

  // Find OTP
  const otp = await OTP.findOne({
    phone,
    restaurantId,
    type: 'reset_password',
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw new ApiError(400, 'Code invalide ou expiré');
  }

  // Check if expired
  if (new Date() > otp.expiresAt) {
    await OTP.findByIdAndDelete(otp._id);
    throw new ApiError(400, 'Code expiré. Veuillez en demander un nouveau.');
  }

  // Check attempts
  if (otp.attempts >= config.otp.maxAttempts) {
    await OTP.findByIdAndDelete(otp._id);
    throw new ApiError(400, 'Trop de tentatives. Veuillez demander un nouveau code.');
  }

  // Verify code
  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(400, 'Code incorrect');
  }

  // Find customer
  const customer = await Customer.findOne({ phone, restaurantId });
  if (!customer) {
    throw new ApiError(404, 'Client non trouvé');
  }

  // Update password
  customer.password = newPassword;
  customer.refreshToken = undefined; // Invalidate all sessions
  await customer.save();

  // Mark OTP as used
  otp.isUsed = true;
  await otp.save();

  res.json({
    success: true,
    message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
  });
});

/**
 * Check if phone number is registered
 * POST /customer/auth/check-phone
 */
export const checkPhone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, restaurantId } = req.body;

  const customer = await Customer.findOne({ phone, restaurantId });

  res.json({
    success: true,
    data: {
      exists: !!customer,
      isVerified: customer?.isPhoneVerified || false,
    },
  });
});
