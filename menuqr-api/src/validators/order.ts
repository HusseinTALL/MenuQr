import { body, param, query } from 'express-validator';

export const createOrderValidator = [
  body('restaurantId')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  body('tableNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Table number cannot exceed 20 characters'),
  body('customerName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Customer name cannot exceed 100 characters'),
  body('customerPhone')
    .optional()
    .matches(/^[+]?[\d\s-()]+$/)
    .withMessage('Please enter a valid phone number'),
  body('customerEmail')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.dishId')
    .isMongoId()
    .withMessage('Invalid dish ID'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  body('items.*.options')
    .optional()
    .isArray()
    .withMessage('Options must be an array'),
  body('items.*.specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Special instructions cannot exceed 200 characters'),
  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters'),
];

export const updateOrderStatusValidator = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'])
    .withMessage('Invalid order status'),
  body('cancelReason')
    .if(body('status').equals('cancelled'))
    .notEmpty()
    .withMessage('Cancel reason is required when cancelling an order')
    .isLength({ max: 200 })
    .withMessage('Cancel reason cannot exceed 200 characters'),
];

export const orderIdValidator = [
  param('id').isMongoId().withMessage('Invalid order ID'),
];

export const updateOrderItemsValidator = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.dishId')
    .isMongoId()
    .withMessage('Invalid dish ID'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  body('items.*.options')
    .optional()
    .isArray()
    .withMessage('Options must be an array'),
  body('items.*.specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Special instructions cannot exceed 200 characters'),
  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters'),
];

export const orderQueryValidator = [
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  query('tableNumber')
    .optional()
    .trim(),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
