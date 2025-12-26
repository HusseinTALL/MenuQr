import { body, param, query } from 'express-validator';

// Create review validator (customer)
export const createReviewValidator = [
  body('restaurantId')
    .isMongoId()
    .withMessage('ID de restaurant invalide'),
  body('dishId')
    .optional()
    .isMongoId()
    .withMessage('ID de plat invalide'),
  body('orderId')
    .optional()
    .isMongoId()
    .withMessage('ID de commande invalide'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('La note doit être entre 1 et 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le titre ne peut pas dépasser 100 caractères'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Le commentaire ne peut pas dépasser 1000 caractères'),
  body('images')
    .optional()
    .isArray({ max: 3 })
    .withMessage('Maximum 3 photos autorisées'),
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('URL de photo invalide'),
  body('images.*.publicId')
    .optional()
    .isString()
    .withMessage('publicId invalide'),
];

// Update review validator (customer)
export const updateReviewValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID d\'avis invalide'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La note doit être entre 1 et 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le titre ne peut pas dépasser 100 caractères'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Le commentaire ne peut pas dépasser 1000 caractères'),
  body('images')
    .optional()
    .isArray({ max: 3 })
    .withMessage('Maximum 3 photos autorisées'),
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('URL de photo invalide'),
  body('images.*.publicId')
    .optional()
    .isString()
    .withMessage('publicId invalide'),
];

// Review ID validator
export const reviewIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID d\'avis invalide'),
];

// Restaurant ID validator
export const restaurantIdValidator = [
  param('restaurantId')
    .isMongoId()
    .withMessage('ID de restaurant invalide'),
];

// Dish ID validator
export const dishIdValidator = [
  param('dishId')
    .isMongoId()
    .withMessage('ID de plat invalide'),
];

// Respond to review validator (admin)
export const respondToReviewValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID d\'avis invalide'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Le contenu de la réponse est requis')
    .isLength({ max: 500 })
    .withMessage('La réponse ne peut pas dépasser 500 caractères'),
];

// Reject review validator (admin)
export const rejectReviewValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID d\'avis invalide'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('La raison du rejet est requise')
    .isLength({ max: 200 })
    .withMessage('La raison ne peut pas dépasser 200 caractères'),
];

// Report review validator (customer)
export const reportReviewValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID d\'avis invalide'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La raison ne peut pas dépasser 200 caractères'),
];

// Query validator for listing reviews
export const reviewQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page doit être un entier positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit doit être entre 1 et 50'),
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating doit être entre 1 et 5'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'flagged'])
    .withMessage('Status invalide'),
  query('sort')
    .optional()
    .isIn(['recent', 'oldest', 'rating_high', 'rating_low', 'helpful'])
    .withMessage('Tri invalide'),
];

// Admin query validator (extended)
export const adminReviewQueryValidator = [
  ...reviewQueryValidator,
  query('dishId')
    .optional()
    .isMongoId()
    .withMessage('ID de plat invalide'),
  query('customerId')
    .optional()
    .isMongoId()
    .withMessage('ID de client invalide'),
  query('hasResponse')
    .optional()
    .isBoolean()
    .withMessage('hasResponse doit être un booléen'),
  query('isVerifiedPurchase')
    .optional()
    .isBoolean()
    .withMessage('isVerifiedPurchase doit être un booléen'),
];
