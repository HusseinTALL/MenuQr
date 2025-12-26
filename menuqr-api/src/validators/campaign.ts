import { body, param, query } from 'express-validator';

export const createCampaignValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Campaign name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 160 })
    .withMessage('SMS message cannot exceed 160 characters'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error('Scheduled date must be in the future');
      }
      return true;
    }),
];

export const updateCampaignValidator = [
  param('id').isMongoId().withMessage('Invalid campaign ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Campaign name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('message')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ max: 160 })
    .withMessage('SMS message cannot exceed 160 characters'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];

export const campaignIdValidator = [
  param('id').isMongoId().withMessage('Invalid campaign ID'),
];

export const sendCampaignValidator = [
  param('id').isMongoId().withMessage('Invalid campaign ID'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      if (value) {
        const scheduledDate = new Date(value);
        const now = new Date();
        if (scheduledDate <= now) {
          throw new Error('Scheduled date must be in the future');
        }
      }
      return true;
    }),
];

export const campaignQueryValidator = [
  query('status')
    .optional()
    .isIn(['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];
