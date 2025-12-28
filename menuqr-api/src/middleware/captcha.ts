/**
 * CAPTCHA Verification Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { verifyCaptcha, isCaptchaEnabled } from '../services/captchaService.js';
import { User } from '../models/index.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// Number of failed attempts before requiring CAPTCHA
const CAPTCHA_THRESHOLD = config.security?.captchaThreshold || 3;

/**
 * Middleware to verify CAPTCHA token
 * Expects the token in req.body.captchaToken
 */
export const requireCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip if CAPTCHA is not enabled
  if (!isCaptchaEnabled()) {
    return next();
  }

  const captchaToken = req.body.captchaToken;
  const remoteIp = req.ip || req.socket.remoteAddress;

  if (!captchaToken) {
    logger.warn('CAPTCHA token missing', { ip: remoteIp, path: req.path });
    res.status(400).json({
      success: false,
      message: 'CAPTCHA verification required',
      errors: { captchaToken: 'CAPTCHA token is required' },
    });
    return;
  }

  const result = await verifyCaptcha(captchaToken, remoteIp);

  if (!result.success) {
    logger.warn('CAPTCHA verification failed', {
      ip: remoteIp,
      path: req.path,
      errorCodes: result.errorCodes,
    });
    res.status(400).json({
      success: false,
      message: 'CAPTCHA verification failed',
      errors: { captchaToken: 'Invalid CAPTCHA. Please try again.' },
    });
    return;
  }

  // For reCAPTCHA v3, check score (0.0 is bot, 1.0 is human)
  if (result.score !== undefined && result.score < 0.5) {
    logger.warn('CAPTCHA score too low', {
      ip: remoteIp,
      path: req.path,
      score: result.score,
    });
    res.status(400).json({
      success: false,
      message: 'CAPTCHA verification failed',
      errors: { captchaToken: 'Suspicious activity detected. Please try again.' },
    });
    return;
  }

  // Remove captchaToken from body to avoid storing it
  delete req.body.captchaToken;

  next();
};

/**
 * Optional CAPTCHA middleware - verifies if present but doesn't require
 */
export const optionalCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const captchaToken = req.body.captchaToken;

  // If no token, just continue
  if (!captchaToken) {
    return next();
  }

  // If token present, verify it
  const remoteIp = req.ip || req.socket.remoteAddress;
  const result = await verifyCaptcha(captchaToken, remoteIp);

  if (!result.success) {
    logger.warn('Optional CAPTCHA verification failed', {
      ip: remoteIp,
      path: req.path,
      errorCodes: result.errorCodes,
    });
    res.status(400).json({
      success: false,
      message: 'CAPTCHA verification failed',
      errors: { captchaToken: 'Invalid CAPTCHA. Please try again.' },
    });
    return;
  }

  // Remove captchaToken from body
  delete req.body.captchaToken;

  next();
};

/**
 * CAPTCHA middleware for login - requires CAPTCHA after N failed attempts
 * Checks the user's failed login attempts before deciding if CAPTCHA is needed
 */
export const requireCaptchaAfterFailedAttempts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip if CAPTCHA is not enabled
  if (!isCaptchaEnabled()) {
    return next();
  }

  const { email } = req.body;
  const captchaToken = req.body.captchaToken;
  const remoteIp = req.ip || req.socket.remoteAddress;

  // Check if user exists and has failed attempts
  let requiresCaptcha = false;

  if (email) {
    const user = await User.findOne({ email }).select('failedLoginAttempts');
    if (user && user.failedLoginAttempts && user.failedLoginAttempts >= CAPTCHA_THRESHOLD) {
      requiresCaptcha = true;
    }
  }

  // If CAPTCHA not required, continue
  if (!requiresCaptcha) {
    return next();
  }

  // CAPTCHA is required - validate the token
  if (!captchaToken) {
    logger.warn('CAPTCHA required but token missing', { ip: remoteIp, email });
    res.status(400).json({
      success: false,
      message: 'CAPTCHA verification required due to multiple failed login attempts',
      requiresCaptcha: true,
      errors: { captchaToken: 'CAPTCHA token is required' },
    });
    return;
  }

  const result = await verifyCaptcha(captchaToken, remoteIp);

  if (!result.success) {
    logger.warn('CAPTCHA verification failed for login', {
      ip: remoteIp,
      email,
      errorCodes: result.errorCodes,
    });
    res.status(400).json({
      success: false,
      message: 'CAPTCHA verification failed',
      requiresCaptcha: true,
      errors: { captchaToken: 'Invalid CAPTCHA. Please try again.' },
    });
    return;
  }

  // For reCAPTCHA v3, check score
  if (result.score !== undefined && result.score < 0.5) {
    logger.warn('CAPTCHA score too low for login', {
      ip: remoteIp,
      email,
      score: result.score,
    });
    res.status(400).json({
      success: false,
      message: 'CAPTCHA verification failed',
      requiresCaptcha: true,
      errors: { captchaToken: 'Suspicious activity detected. Please try again.' },
    });
    return;
  }

  // Remove captchaToken from body
  delete req.body.captchaToken;

  next();
};

/**
 * Check if CAPTCHA is required for a given email
 * Useful for frontend to know if it should show CAPTCHA
 */
export const checkCaptchaRequired = async (email: string): Promise<boolean> => {
  if (!isCaptchaEnabled()) {
    return false;
  }

  if (!email) {
    return false;
  }

  const user = await User.findOne({ email }).select('failedLoginAttempts');
  if (!user) {
    return false;
  }

  return (user.failedLoginAttempts || 0) >= CAPTCHA_THRESHOLD;
};

export default { requireCaptcha, optionalCaptcha, requireCaptchaAfterFailedAttempts, checkCaptchaRequired };
