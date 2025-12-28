/**
 * Login Notification Service
 * Detects new devices/IPs and sends security notifications
 */

import { LoginHistory } from '../models/index.js';
import * as emailService from './emailService.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';

export interface LoginContext {
  userId: string;
  userEmail: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  device?: {
    type?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser?: string;
    os?: string;
  };
}

export interface NewLoginDetectionResult {
  isNewDevice: boolean;
  isNewIP: boolean;
  previousLoginCount: number;
}

/**
 * Check if this is a new device or IP for the user
 */
export const detectNewLogin = async (context: LoginContext): Promise<NewLoginDetectionResult> => {
  const { userId, ipAddress, device } = context;

  try {
    // Get previous successful logins for this user
    const previousLogins = await LoginHistory.find({
      userId,
      status: 'success',
    })
      .sort({ loginAt: -1 })
      .limit(100);

    const loginCount = previousLogins.length;

    // First login ever - consider it as new device
    if (loginCount === 0) {
      return {
        isNewDevice: false, // Don't notify on first login ever
        isNewIP: false,
        previousLoginCount: 0,
      };
    }

    // Check for new IP
    let isNewIP = true;
    if (ipAddress) {
      const previousIPs = new Set(
        previousLogins
          .filter((l) => l.ipAddress)
          .map((l) => l.ipAddress)
      );
      isNewIP = !previousIPs.has(ipAddress);
    }

    // Check for new device (based on browser + OS combination)
    let isNewDevice = true;
    if (device?.browser && device?.os) {
      const deviceSignature = `${device.browser}-${device.os}-${device.type}`;
      const previousDevices = new Set(
        previousLogins
          .filter((l) => l.device?.browser && l.device?.os)
          .map((l) => `${l.device?.browser}-${l.device?.os}-${l.device?.type}`)
      );
      isNewDevice = !previousDevices.has(deviceSignature);
    }

    return {
      isNewDevice,
      isNewIP,
      previousLoginCount: loginCount,
    };
  } catch (error) {
    logger.error('Failed to detect new login', { error, userId });
    return {
      isNewDevice: false,
      isNewIP: false,
      previousLoginCount: 0,
    };
  }
};

/**
 * Send login notification if needed
 */
export const notifyLoginIfNeeded = async (context: LoginContext): Promise<void> => {
  // Check if notifications are enabled
  if (!config.email.loginNotification.enabled) {
    return;
  }

  try {
    const detection = await detectNewLogin(context);

    // Skip if nothing new detected or first login
    if (
      (!detection.isNewDevice && !detection.isNewIP) ||
      detection.previousLoginCount === 0
    ) {
      return;
    }

    // Skip based on configuration
    if (detection.isNewDevice && !config.email.loginNotification.notifyNewDevice) {
      return;
    }
    if (detection.isNewIP && !detection.isNewDevice && !config.email.loginNotification.notifyNewIP) {
      return;
    }

    // Send notification email
    await emailService.sendLoginNotificationEmail({
      to: context.userEmail,
      userName: context.userName,
      loginTime: new Date(),
      ipAddress: context.ipAddress,
      device: context.device,
      isNewDevice: detection.isNewDevice,
      isNewIP: detection.isNewIP,
    });

    logger.info('Login notification sent', {
      userId: context.userId,
      isNewDevice: detection.isNewDevice,
      isNewIP: detection.isNewIP,
    });
  } catch (error) {
    // Don't fail the login if notification fails
    logger.error('Failed to send login notification', { error, userId: context.userId });
  }
};

/**
 * Send account lockout notification
 */
export const notifyAccountLockout = async (options: {
  email: string;
  userName: string;
  ipAddress?: string;
  attemptCount: number;
}): Promise<void> => {
  try {
    await emailService.sendAccountLockoutEmail({
      to: options.email,
      userName: options.userName,
      lockoutTime: new Date(),
      lockDurationMinutes: config.security.lockoutDurationMinutes,
      ipAddress: options.ipAddress,
      attemptCount: options.attemptCount,
    });

    logger.info('Account lockout notification sent', { email: options.email });
  } catch (error) {
    logger.error('Failed to send account lockout notification', { error, email: options.email });
  }
};

/**
 * Send password changed notification
 */
export const notifyPasswordChanged = async (options: {
  email: string;
  userName: string;
  ipAddress?: string;
}): Promise<void> => {
  try {
    await emailService.sendPasswordChangedEmail({
      to: options.email,
      userName: options.userName,
      changeTime: new Date(),
      ipAddress: options.ipAddress,
    });

    logger.info('Password changed notification sent', { email: options.email });
  } catch (error) {
    logger.error('Failed to send password changed notification', { error, email: options.email });
  }
};

export default {
  detectNewLogin,
  notifyLoginIfNeeded,
  notifyAccountLockout,
  notifyPasswordChanged,
};
