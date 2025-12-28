/**
 * Password Expiration Service
 * Handles password age checking and expiration warnings
 */

import config from '../config/env.js';

const EXPIRY_DAYS = config.security.passwordExpiryDays;
const WARNING_DAYS = config.security.passwordExpiryWarningDays;
const IS_ENABLED = config.security.passwordExpiryEnabled;

export interface PasswordExpiryStatus {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number;
  expiresAt: Date;
  passwordChangedAt: Date;
}

/**
 * Calculate password expiry status for a user
 */
export const getPasswordExpiryStatus = (passwordChangedAt?: Date): PasswordExpiryStatus => {
  // If no password change date, treat as never set (needs immediate change)
  const changedAt = passwordChangedAt || new Date(0);

  // Calculate expiry date
  const expiresAt = new Date(changedAt.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  // Calculate days until expiry
  const msUntilExpiry = expiresAt.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000));

  // Check status
  const isExpired = IS_ENABLED && daysUntilExpiry <= 0;
  const isExpiringSoon = IS_ENABLED && daysUntilExpiry > 0 && daysUntilExpiry <= WARNING_DAYS;

  return {
    isExpired,
    isExpiringSoon,
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    expiresAt,
    passwordChangedAt: changedAt,
  };
};

/**
 * Check if password expiry is enabled
 */
export const isPasswordExpiryEnabled = (): boolean => IS_ENABLED;

/**
 * Get password expiry configuration
 */
export const getPasswordExpiryConfig = (): {
  enabled: boolean;
  expiryDays: number;
  warningDays: number;
} => ({
  enabled: IS_ENABLED,
  expiryDays: EXPIRY_DAYS,
  warningDays: WARNING_DAYS,
});

/**
 * Get warning message for expiring password
 */
export const getExpiryWarningMessage = (daysUntilExpiry: number): string => {
  if (daysUntilExpiry <= 0) {
    return 'Your password has expired. Please change your password to continue.';
  }
  if (daysUntilExpiry === 1) {
    return 'Your password will expire tomorrow. Please change it soon.';
  }
  return `Your password will expire in ${daysUntilExpiry} days. Please change it soon.`;
};

export default {
  getPasswordExpiryStatus,
  isPasswordExpiryEnabled,
  getPasswordExpiryConfig,
  getExpiryWarningMessage,
};
