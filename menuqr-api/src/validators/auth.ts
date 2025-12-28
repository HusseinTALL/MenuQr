import { body } from 'express-validator';

export const registerValidator = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
];

export const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshTokenValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/\d/)
    .withMessage('New password must contain at least one number'),
];
