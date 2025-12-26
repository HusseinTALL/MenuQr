import { body, param, query } from 'express-validator';
import { LOYALTY_CONFIG } from '../services/loyaltyService.js';

// Customer validators
export const redeemPointsValidator = [
  body('points')
    .isInt({ min: LOYALTY_CONFIG.MIN_REDEMPTION })
    .withMessage(`Points must be at least ${LOYALTY_CONFIG.MIN_REDEMPTION}`),
];

export const pointsHistoryQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['earn', 'redeem', 'expire', 'adjust', 'bonus'])
    .withMessage('Invalid transaction type'),
];

export const expiringPointsQueryValidator = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
];

// Admin validators
export const customerIdValidator = [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),
];

export const adjustPointsValidator = [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),
  body('points')
    .isInt()
    .withMessage('Points must be an integer')
    .custom((value) => value !== 0)
    .withMessage('Points cannot be zero'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),
];

export const bonusPointsValidator = [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),
  body('points')
    .isInt({ min: 1 })
    .withMessage('Points must be a positive integer'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
];

export const loyaltyCustomersQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('tier')
    .optional()
    .isIn(['bronze', 'argent', 'or', 'platine'])
    .withMessage('Invalid tier'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['totalPoints', 'lifetimePoints', 'lastOrderAt', 'createdAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];
