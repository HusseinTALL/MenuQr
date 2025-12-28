import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireCaptcha, requireCaptchaAfterFailedAttempts } from '../middleware/captcha.js';
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  changePasswordValidator,
} from '../validators/auth.js';

const router = Router();

// Public routes
router.post('/register', requireCaptcha, validate(registerValidator), register);
// Login requires CAPTCHA after 3 failed attempts (configurable via CAPTCHA_THRESHOLD)
router.post('/login', requireCaptchaAfterFailedAttempts, validate(loginValidator), login);
router.post('/refresh-token', validate(refreshTokenValidator), refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, validate(changePasswordValidator), changePassword);

export default router;
