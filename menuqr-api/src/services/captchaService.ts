/**
 * CAPTCHA Verification Service
 * Supports: Google reCAPTCHA, hCaptcha, Cloudflare Turnstile
 */

import config from '../config/env.js';
import logger from '../utils/logger.js';

interface CaptchaVerifyResult {
  success: boolean;
  score?: number; // For reCAPTCHA v3
  errorCodes?: string[];
}

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

interface HCaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

/**
 * Verify Google reCAPTCHA token
 */
async function verifyRecaptcha(token: string, remoteIp?: string): Promise<CaptchaVerifyResult> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: config.captcha.secretKey,
        response: token,
        ...(remoteIp && { remoteip: remoteIp }),
      }).toString(),
    });

    const data = await response.json() as RecaptchaResponse;

    return {
      success: data.success,
      score: data.score,
      errorCodes: data['error-codes'],
    };
  } catch (error) {
    logger.error('reCAPTCHA verification failed', { error });
    return { success: false, errorCodes: ['verification-failed'] };
  }
}

/**
 * Verify hCaptcha token
 */
async function verifyHCaptcha(token: string, remoteIp?: string): Promise<CaptchaVerifyResult> {
  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: config.captcha.secretKey,
        response: token,
        ...(remoteIp && { remoteip: remoteIp }),
        sitekey: config.captcha.siteKey,
      }).toString(),
    });

    const data = await response.json() as HCaptchaResponse;

    return {
      success: data.success,
      errorCodes: data['error-codes'],
    };
  } catch (error) {
    logger.error('hCaptcha verification failed', { error });
    return { success: false, errorCodes: ['verification-failed'] };
  }
}

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(token: string, remoteIp?: string): Promise<CaptchaVerifyResult> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: config.captcha.secretKey,
        response: token,
        ...(remoteIp && { remoteip: remoteIp }),
      }),
    });

    const data = await response.json() as TurnstileResponse;

    return {
      success: data.success,
      errorCodes: data['error-codes'],
    };
  } catch (error) {
    logger.error('Turnstile verification failed', { error });
    return { success: false, errorCodes: ['verification-failed'] };
  }
}

/**
 * Verify CAPTCHA token using configured provider
 */
export async function verifyCaptcha(token: string, remoteIp?: string): Promise<CaptchaVerifyResult> {
  // If CAPTCHA is disabled, always succeed
  if (!config.captcha.enabled) {
    return { success: true };
  }

  // If no secret key configured, skip verification with warning
  if (!config.captcha.secretKey) {
    logger.warn('CAPTCHA enabled but no secret key configured');
    return { success: true };
  }

  // If no token provided, fail
  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  switch (config.captcha.provider) {
    case 'recaptcha':
      return verifyRecaptcha(token, remoteIp);
    case 'hcaptcha':
      return verifyHCaptcha(token, remoteIp);
    case 'turnstile':
      return verifyTurnstile(token, remoteIp);
    default:
      logger.warn(`Unknown CAPTCHA provider: ${config.captcha.provider}`);
      return { success: true };
  }
}

/**
 * Check if CAPTCHA is enabled
 */
export function isCaptchaEnabled(): boolean {
  return config.captcha.enabled && !!config.captcha.secretKey;
}

/**
 * Get CAPTCHA configuration for frontend
 */
export function getCaptchaConfig() {
  return {
    enabled: isCaptchaEnabled(),
    provider: config.captcha.provider,
    siteKey: config.captcha.siteKey,
  };
}

export default {
  verifyCaptcha,
  isCaptchaEnabled,
  getCaptchaConfig,
};
