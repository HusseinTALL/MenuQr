/**
 * Two-Factor Authentication Service
 * Handles TOTP generation, verification, and backup codes
 */

import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User.js';
import logger from '../utils/logger.js';

// Configure TOTP settings
authenticator.options = {
  digits: 6,
  step: 30, // 30 second window
  window: 1, // Allow 1 step before/after for clock drift
};

const APP_NAME = 'MenuQR';
const BACKUP_CODES_COUNT = 10;

interface TwoFactorSetup {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

interface VerifyResult {
  success: boolean;
  usedBackupCode?: boolean;
  message?: string;
}

/**
 * Generate a new 2FA secret and QR code for setup
 */
export const generateTwoFactorSetup = async (user: IUser): Promise<TwoFactorSetup> => {
  // Generate a new secret
  const secret = authenticator.generateSecret();

  // Generate the otpauth URL for authenticator apps
  const otpauthUrl = authenticator.keyuri(user.email, APP_NAME, secret);

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Generate backup codes
  const backupCodes = generateBackupCodes();

  return {
    secret,
    qrCodeDataUrl,
    backupCodes,
  };
};

/**
 * Generate random backup codes
 */
const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
};

/**
 * Hash backup codes for storage
 */
const hashBackupCodes = async (codes: string[]): Promise<string[]> => {
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code.replace('-', ''), 10))
  );
  return hashedCodes;
};

/**
 * Enable 2FA for a user after they verify the code
 */
export const enableTwoFactor = async (
  userId: string,
  secret: string,
  token: string,
  backupCodes: string[]
): Promise<{ success: boolean; message: string }> => {
  // Verify the token first
  const isValid = authenticator.verify({ token, secret });

  if (!isValid) {
    return {
      success: false,
      message: 'Invalid verification code. Please try again.',
    };
  }

  // Hash backup codes before storing
  const hashedBackupCodes = await hashBackupCodes(backupCodes);

  // Update user with 2FA settings
  await User.findByIdAndUpdate(userId, {
    twoFactorEnabled: true,
    twoFactorSecret: secret,
    twoFactorBackupCodes: hashedBackupCodes,
    twoFactorVerifiedAt: new Date(),
  });

  logger.info('2FA enabled for user', { userId });

  return {
    success: true,
    message: 'Two-factor authentication enabled successfully',
  };
};

/**
 * Disable 2FA for a user
 */
export const disableTwoFactor = async (
  userId: string,
  password: string
): Promise<{ success: boolean; message: string }> => {
  // Get user with password
  const user = await User.findById(userId).select('+password');
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // Verify password before disabling 2FA
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return { success: false, message: 'Invalid password' };
  }

  // Clear 2FA settings
  await User.findByIdAndUpdate(userId, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: [],
    twoFactorVerifiedAt: null,
  });

  logger.info('2FA disabled for user', { userId });

  return {
    success: true,
    message: 'Two-factor authentication disabled successfully',
  };
};

/**
 * Verify a 2FA token (TOTP or backup code)
 */
export const verifyTwoFactorToken = async (
  userId: string,
  token: string
): Promise<VerifyResult> => {
  // Get user with 2FA fields
  const user = await User.findById(userId).select('+twoFactorSecret +twoFactorBackupCodes');
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return { success: false, message: '2FA is not enabled for this account' };
  }

  // First, try TOTP verification
  const isValidTOTP = authenticator.verify({
    token: token.replace(/\s/g, ''), // Remove any spaces
    secret: user.twoFactorSecret,
  });

  if (isValidTOTP) {
    return { success: true, usedBackupCode: false };
  }

  // If TOTP fails, try backup codes
  const normalizedToken = token.replace('-', '').toUpperCase();
  const backupCodes = user.twoFactorBackupCodes || [];

  for (let i = 0; i < backupCodes.length; i++) {
    const isMatch = await bcrypt.compare(normalizedToken, backupCodes[i]);
    if (isMatch) {
      // Remove used backup code
      const newBackupCodes = [...backupCodes];
      newBackupCodes.splice(i, 1);

      await User.findByIdAndUpdate(userId, {
        twoFactorBackupCodes: newBackupCodes,
      });

      logger.warn('Backup code used for 2FA', {
        userId,
        remainingCodes: newBackupCodes.length,
      });

      return { success: true, usedBackupCode: true };
    }
  }

  return { success: false, message: 'Invalid verification code' };
};

/**
 * Regenerate backup codes for a user
 */
export const regenerateBackupCodes = async (
  userId: string,
  password: string
): Promise<{ success: boolean; backupCodes?: string[]; message: string }> => {
  // Get user with password
  const user = await User.findById(userId).select('+password');
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (!user.twoFactorEnabled) {
    return { success: false, message: '2FA is not enabled' };
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return { success: false, message: 'Invalid password' };
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = await hashBackupCodes(backupCodes);

  await User.findByIdAndUpdate(userId, {
    twoFactorBackupCodes: hashedBackupCodes,
  });

  logger.info('Backup codes regenerated', { userId });

  return {
    success: true,
    backupCodes,
    message: 'Backup codes regenerated successfully',
  };
};

/**
 * Check if 2FA is required for login based on role
 */
export const isTwoFactorRequiredForRole = (role: string): boolean => {
  // Require 2FA for admin and superadmin roles
  const rolesRequiring2FA = ['admin', 'superadmin'];
  return rolesRequiring2FA.includes(role);
};

/**
 * Get 2FA status for a user
 */
export const getTwoFactorStatus = async (
  userId: string
): Promise<{
  enabled: boolean;
  required: boolean;
  verifiedAt?: Date;
  backupCodesRemaining: number;
}> => {
  const user = await User.findById(userId).select('+twoFactorBackupCodes');
  if (!user) {
    throw new Error('User not found');
  }

  return {
    enabled: user.twoFactorEnabled,
    required: isTwoFactorRequiredForRole(user.role),
    verifiedAt: user.twoFactorVerifiedAt,
    backupCodesRemaining: user.twoFactorBackupCodes?.length || 0,
  };
};

export default {
  generateTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorToken,
  regenerateBackupCodes,
  isTwoFactorRequiredForRole,
  getTwoFactorStatus,
};
