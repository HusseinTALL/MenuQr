/**
 * Reservation Validators for MenuQR
 */

import { body, param, query } from 'express-validator';

// Valid location preferences
const validLocations = ['indoor', 'outdoor', 'terrace', 'no_preference'];

// Valid reservation statuses
const validStatuses = ['pending', 'confirmed', 'arrived', 'seated', 'completed', 'cancelled', 'no_show'];

// Time format validation regex (HH:MM)
const timeFormatRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Validate getting available dates
 */
export const getAvailableDatesValidator = [
  param('restaurantId')
    .isMongoId()
    .withMessage('ID de restaurant invalide'),
  query('partySize')
    .isInt({ min: 1, max: 50 })
    .withMessage('Le nombre de personnes doit être entre 1 et 50'),
  query('days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Le nombre de jours doit être entre 1 et 90'),
  query('location')
    .optional()
    .isIn(validLocations)
    .withMessage('Emplacement invalide'),
];

/**
 * Validate getting available time slots
 */
export const getAvailableSlotsValidator = [
  param('restaurantId')
    .isMongoId()
    .withMessage('ID de restaurant invalide'),
  query('date')
    .isISO8601()
    .withMessage('Format de date invalide'),
  query('partySize')
    .isInt({ min: 1, max: 50 })
    .withMessage('Le nombre de personnes doit être entre 1 et 50'),
  query('location')
    .optional()
    .isIn(validLocations)
    .withMessage('Emplacement invalide'),
];

/**
 * Validate creating a reservation
 */
export const createReservationValidator = [
  param('restaurantId')
    .isMongoId()
    .withMessage('ID de restaurant invalide'),
  body('reservationDate')
    .isISO8601()
    .withMessage('Format de date invalide'),
  body('timeSlot')
    .matches(timeFormatRegex)
    .withMessage('Format horaire invalide (HH:MM)'),
  body('partySize')
    .isInt({ min: 1, max: 50 })
    .withMessage('Le nombre de personnes doit être entre 1 et 50'),
  body('duration')
    .optional()
    .isInt({ min: 30, max: 240 })
    .withMessage('La durée doit être entre 30 et 240 minutes'),
  body('locationPreference')
    .optional()
    .isIn(validLocations)
    .withMessage('Emplacement invalide'),
  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Les demandes spéciales ne peuvent pas dépasser 500 caractères'),
  body('customerName')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('customerPhone')
    .notEmpty()
    .matches(/^[+]?[\d\s-()]+$/)
    .withMessage('Numéro de téléphone invalide'),
  body('customerEmail')
    .optional()
    .isEmail()
    .withMessage('Email invalide'),
  body('preOrder')
    .optional()
    .isObject()
    .withMessage('La pré-commande doit être un objet'),
  body('preOrder.items')
    .optional()
    .isArray()
    .withMessage('Les articles doivent être un tableau'),
  body('preOrder.items.*.dishId')
    .optional()
    .isMongoId()
    .withMessage('ID de plat invalide'),
  body('preOrder.items.*.quantity')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('La quantité doit être entre 1 et 99'),
];

/**
 * Validate reservation ID param
 */
export const reservationIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de réservation invalide'),
];

/**
 * Validate updating a reservation
 */
export const updateReservationValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de réservation invalide'),
  body('reservationDate')
    .optional()
    .isISO8601()
    .withMessage('Format de date invalide'),
  body('timeSlot')
    .optional()
    .matches(timeFormatRegex)
    .withMessage('Format horaire invalide (HH:MM)'),
  body('partySize')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Le nombre de personnes doit être entre 1 et 50'),
  body('duration')
    .optional()
    .isInt({ min: 30, max: 240 })
    .withMessage('La durée doit être entre 30 et 240 minutes'),
  body('locationPreference')
    .optional()
    .isIn(validLocations)
    .withMessage('Emplacement invalide'),
  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Les demandes spéciales ne peuvent pas dépasser 500 caractères'),
  body('customerName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('customerPhone')
    .optional()
    .matches(/^[+]?[\d\s-()]+$/)
    .withMessage('Numéro de téléphone invalide'),
  body('customerEmail')
    .optional()
    .isEmail()
    .withMessage('Email invalide'),
  body('tableId')
    .optional()
    .isMongoId()
    .withMessage('ID de table invalide'),
];

/**
 * Validate assigning a table
 */
export const assignTableValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de réservation invalide'),
  body('tableId')
    .optional()
    .isMongoId()
    .withMessage('ID de table invalide'),
];

/**
 * Validate cancelling a reservation
 */
export const cancelReservationValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de réservation invalide'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La raison ne peut pas dépasser 500 caractères'),
];

/**
 * Validate reservation query params
 */
export const reservationQueryValidator = [
  query('status')
    .optional()
    .custom((value) => {
      const statuses = value.split(',');
      return statuses.every((s: string) => validStatuses.includes(s));
    })
    .withMessage('Statut invalide'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Format de date invalide'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Format de date invalide'),
  query('tableId')
    .optional()
    .isMongoId()
    .withMessage('ID de table invalide'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un nombre positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être entre 1 et 100'),
  query('sortBy')
    .optional()
    .isIn(['reservationDate', 'timeSlot', 'partySize', 'status', 'createdAt'])
    .withMessage('Champ de tri invalide'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordre de tri invalide'),
];

/**
 * Validate marking reservation with table
 */
export const markSeatedValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de réservation invalide'),
  body('tableId')
    .optional()
    .isMongoId()
    .withMessage('ID de table invalide'),
];
