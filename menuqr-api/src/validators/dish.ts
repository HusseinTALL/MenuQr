import { body, param, query } from 'express-validator';

export const createDishValidator = [
  body('name.fr')
    .trim()
    .notEmpty()
    .withMessage('French name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('name.en')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('categoryId')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('description.fr')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('description.en')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('allergens')
    .optional()
    .isArray()
    .withMessage('Allergens must be an array'),
  body('allergens.*')
    .optional()
    .isString()
    .withMessage('Each allergen must be a string'),
  body('isVegetarian')
    .optional()
    .isBoolean()
    .withMessage('isVegetarian must be a boolean'),
  body('isVegan')
    .optional()
    .isBoolean()
    .withMessage('isVegan must be a boolean'),
  body('isGlutenFree')
    .optional()
    .isBoolean()
    .withMessage('isGlutenFree must be a boolean'),
  body('isSpicy')
    .optional()
    .isBoolean()
    .withMessage('isSpicy must be a boolean'),
  body('spicyLevel')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Spicy level must be between 0 and 5'),
  body('preparationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Preparation time must be a positive number'),
  body('options')
    .optional()
    .isArray()
    .withMessage('Options must be an array'),
  body('options.*.name.fr')
    .optional()
    .notEmpty()
    .withMessage('Option French name is required'),
  body('options.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Option price must be a positive number'),
  body('variants')
    .optional()
    .isArray()
    .withMessage('Variants must be an array'),
  body('variants.*.name.fr')
    .optional()
    .notEmpty()
    .withMessage('Variant French name is required'),
  body('variants.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Variant price must be a positive number'),
];

export const updateDishValidator = [
  param('id').isMongoId().withMessage('Invalid dish ID'),
  ...createDishValidator.map((validator) => validator.optional()),
];

export const dishIdValidator = [
  param('id').isMongoId().withMessage('Invalid dish ID'),
];

export const dishQueryValidator = [
  query('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  query('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
  query('isVegetarian')
    .optional()
    .isBoolean()
    .withMessage('isVegetarian must be a boolean'),
  query('isVegan')
    .optional()
    .isBoolean()
    .withMessage('isVegan must be a boolean'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search term must be at least 2 characters'),
];
