import { body, param } from 'express-validator';

export const createRestaurantValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Restaurant name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Slug must be between 3 and 50 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('phone')
    .optional()
    .matches(/^[+]?[\d\s-()]+$/)
    .withMessage('Please enter a valid phone number'),
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('settings.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('settings.tableCount')
    .optional()
    .isInt({ min: 1, max: 999 })
    .withMessage('Table count must be between 1 and 999'),
];

export const updateRestaurantValidator = [
  param('id').isMongoId().withMessage('Invalid restaurant ID'),
  ...createRestaurantValidator.map((validator) => validator.optional()),
];

export const restaurantIdValidator = [
  param('id').isMongoId().withMessage('Invalid restaurant ID'),
];
