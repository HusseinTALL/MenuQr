import { Router } from 'express';
import {
  sendOtp,
  verifyOtp,
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  checkPhone,
} from '../controllers/customerAuthController.js';
import { authenticateCustomer } from '../middleware/customerAuth.js';
import { validate } from '../middleware/validate.js';
import { requireCaptcha } from '../middleware/captcha.js';
import {
  sendOtpValidator,
  verifyOtpValidator,
  customerRegisterValidator,
  customerLoginValidator,
  customerRefreshTokenValidator,
  customerUpdateProfileValidator,
  customerChangePasswordValidator,
  customerForgotPasswordValidator,
  customerResetPasswordValidator,
} from '../validators/customerAuth.js';

const router = Router();

// Public routes (no auth required)
// CAPTCHA required for OTP send (prevents SMS bombing)
router.post('/send-otp', requireCaptcha, validate(sendOtpValidator), sendOtp);
router.post('/verify-otp', validate(verifyOtpValidator), verifyOtp);
// CAPTCHA required for registration
router.post('/register', requireCaptcha, validate(customerRegisterValidator), register);
router.post('/login', validate(customerLoginValidator), login);
router.post('/refresh-token', validate(customerRefreshTokenValidator), refreshToken);
router.post('/forgot-password', validate(customerForgotPasswordValidator), forgotPassword);
router.post('/reset-password', validate(customerResetPasswordValidator), resetPassword);
router.post('/check-phone', validate(sendOtpValidator), checkPhone);

// Protected routes (require customer auth)
router.post('/logout', authenticateCustomer, logout);
router.get('/profile', authenticateCustomer, getProfile);
router.put('/profile', authenticateCustomer, validate(customerUpdateProfileValidator), updateProfile);
router.put('/change-password', authenticateCustomer, validate(customerChangePasswordValidator), changePassword);

export default router;
