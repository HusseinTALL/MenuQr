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

/**
 * @swagger
 * /customer/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone number
 *     tags: [Customer Auth]
 *     description: Send a 6-digit OTP via SMS for phone verification. Requires CAPTCHA.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - captchaToken
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+33612345678"
 *                 description: Phone number in E.164 format
 *               captchaToken:
 *                 type: string
 *                 description: reCAPTCHA verification token
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post('/send-otp', requireCaptcha, validate(sendOtpValidator), sendOtp);

/**
 * @swagger
 * /customer/auth/verify-otp:
 *   post:
 *     summary: Verify OTP code
 *     tags: [Customer Auth]
 *     description: Verify the OTP sent to the phone number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+33612345678"
 *               code:
 *                 type: string
 *                 example: "123456"
 *                 description: 6-digit OTP code
 *     responses:
 *       200:
 *         description: OTP verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     verificationToken:
 *                       type: string
 *                       description: Token to use for registration
 *       400:
 *         description: Invalid or expired OTP
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post('/verify-otp', validate(verifyOtpValidator), verifyOtp);

/**
 * @swagger
 * /customer/auth/register:
 *   post:
 *     summary: Register a new customer
 *     tags: [Customer Auth]
 *     description: Complete registration after phone verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - verificationToken
 *               - name
 *               - captchaToken
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+33612345678"
 *               verificationToken:
 *                 type: string
 *                 description: Token from OTP verification
 *               name:
 *                 type: string
 *                 example: Jean Dupont
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jean@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Optional password for email login
 *               captchaToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       $ref: '#/components/schemas/Customer'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Phone already registered
 */
router.post('/register', requireCaptcha, validate(customerRegisterValidator), register);

/**
 * @swagger
 * /customer/auth/login:
 *   post:
 *     summary: Customer login
 *     tags: [Customer Auth]
 *     description: Login with email/password or phone/OTP verification token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - email
 *                   - password
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                   password:
 *                     type: string
 *               - type: object
 *                 required:
 *                   - phone
 *                   - verificationToken
 *                 properties:
 *                   phone:
 *                     type: string
 *                   verificationToken:
 *                     type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       $ref: '#/components/schemas/Customer'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(customerLoginValidator), login);

/**
 * @swagger
 * /customer/auth/refresh-token:
 *   post:
 *     summary: Refresh customer access token
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TokenPair'
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh-token', validate(customerRefreshTokenValidator), refreshToken);

/**
 * @swagger
 * /customer/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Customer Auth]
 *     description: Send password reset OTP to phone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+33612345678"
 *     responses:
 *       200:
 *         description: Reset OTP sent
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post('/forgot-password', validate(customerForgotPasswordValidator), forgotPassword);

/**
 * @swagger
 * /customer/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *               - newPassword
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *                 description: OTP from forgot-password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP or password
 */
router.post('/reset-password', validate(customerResetPasswordValidator), resetPassword);

/**
 * @swagger
 * /customer/auth/check-phone:
 *   post:
 *     summary: Check if phone is registered
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+33612345678"
 *     responses:
 *       200:
 *         description: Phone check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                     hasPassword:
 *                       type: boolean
 */
router.post('/check-phone', validate(sendOtpValidator), checkPhone);

/**
 * @swagger
 * /customer/auth/logout:
 *   post:
 *     summary: Logout customer
 *     tags: [Customer Auth]
 *     security:
 *       - CustomerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout', authenticateCustomer, logout);

/**
 * @swagger
 * /customer/auth/profile:
 *   get:
 *     summary: Get customer profile
 *     tags: [Customer Auth]
 *     security:
 *       - CustomerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       $ref: '#/components/schemas/Customer'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/profile', authenticateCustomer, getProfile);

/**
 * @swagger
 * /customer/auth/profile:
 *   put:
 *     summary: Update customer profile
 *     tags: [Customer Auth]
 *     security:
 *       - CustomerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/profile', authenticateCustomer, validate(customerUpdateProfileValidator), updateProfile);

/**
 * @swagger
 * /customer/auth/change-password:
 *   put:
 *     summary: Change customer password
 *     tags: [Customer Auth]
 *     security:
 *       - CustomerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Invalid current password
 */
router.put('/change-password', authenticateCustomer, validate(customerChangePasswordValidator), changePassword);

export default router;
