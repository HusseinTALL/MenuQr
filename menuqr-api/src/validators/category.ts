import { body, param } from 'express-validator';

export const createCategoryValidator = [
  body('name.fr')
    .trim()
    .notEmpty()
    .withMessage('French name is required')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('name.en')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('description.fr')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('description.en')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon cannot exceed 50 characters'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive number'),
];

export const updateCategoryValidator = [
  param('id').isMongoId().withMessage('Invalid category ID'),
  ...createCategoryValidator.map((validator) => validator.optional()),
];

export const categoryIdValidator = [
  param('id').isMongoId().withMessage('Invalid category ID'),
];

export const reorderCategoriesValidator = [
  body('categories')
    .isArray({ min: 1 })
    .withMessage('Categories array is required'),
  body('categories.*.id')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('categories.*.order')
    .isInt({ min: 0 })
    .withMessage('Order must be a positive number'),
];
