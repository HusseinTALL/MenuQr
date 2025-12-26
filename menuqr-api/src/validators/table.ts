/**
 * Table Validators for MenuQR
 */

import { body, param, query } from 'express-validator';

// Valid table locations
const validLocations = ['indoor', 'outdoor', 'terrace', 'private'];

/**
 * Validate creating a table
 */
export const createTableValidator = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom de la table doit contenir entre 1 et 50 caractères'),
  body('capacity')
    .isInt({ min: 1, max: 50 })
    .withMessage('La capacité doit être entre 1 et 50'),
  body('minCapacity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('La capacité minimum doit être entre 1 et 50'),
  body('location')
    .isIn(validLocations)
    .withMessage('Emplacement invalide (indoor, outdoor, terrace, private)'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La description ne peut pas dépasser 200 caractères'),
  body('qrCode')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le code QR ne peut pas dépasser 100 caractères'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive doit être un booléen'),
];

/**
 * Validate table ID param
 */
export const tableIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de table invalide'),
];

/**
 * Validate updating a table
 */
export const updateTableValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de table invalide'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom de la table doit contenir entre 1 et 50 caractères'),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('La capacité doit être entre 1 et 50'),
  body('minCapacity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('La capacité minimum doit être entre 1 et 50'),
  body('location')
    .optional()
    .isIn(validLocations)
    .withMessage('Emplacement invalide (indoor, outdoor, terrace, private)'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La description ne peut pas dépasser 200 caractères'),
  body('qrCode')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le code QR ne peut pas dépasser 100 caractères'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive doit être un booléen'),
];

/**
 * Validate table query params
 */
export const tableQueryValidator = [
  query('location')
    .optional()
    .isIn(validLocations)
    .withMessage('Emplacement invalide'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive doit être un booléen'),
  query('minCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La capacité minimum doit être un nombre positif'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un nombre positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être entre 1 et 100'),
];

/**
 * Validate location param
 */
export const locationParamValidator = [
  param('location')
    .isIn(validLocations)
    .withMessage('Emplacement invalide (indoor, outdoor, terrace, private)'),
];

/**
 * Validate reorder tables
 */
export const reorderTablesValidator = [
  body('tableIds')
    .isArray({ min: 1 })
    .withMessage('tableIds doit être un tableau non vide'),
  body('tableIds.*')
    .isMongoId()
    .withMessage('ID de table invalide'),
];
