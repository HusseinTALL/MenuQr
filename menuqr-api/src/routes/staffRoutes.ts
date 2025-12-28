/**
 * Staff Routes for MenuQR
 * Endpoints for managing restaurant staff members
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, requireRestaurant, PERMISSIONS } from '../middleware/permission.js';
import {
  getStaff,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  resetStaffPassword,
  getAvailableRoles,
  getAvailablePermissions,
} from '../controllers/staffController.js';
import { validate } from '../middleware/validate.js';
import { body, param, query } from 'express-validator';

const router = Router();

// All routes require authentication and restaurant context
router.use(authenticate);
router.use(requireRestaurant());

// ============================================
// Validators
// ============================================

const staffIdValidator = [
  param('id').isMongoId().withMessage('Invalid staff member ID'),
];

const createStaffValidator = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .isIn(['admin', 'manager', 'kitchen', 'cashier', 'staff'])
    .withMessage('Invalid role'),
  body('customPermissions')
    .optional()
    .isArray()
    .withMessage('Custom permissions must be an array'),
];

const updateStaffValidator = [
  param('id').isMongoId().withMessage('Invalid staff member ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'kitchen', 'cashier', 'staff'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('customPermissions')
    .optional()
    .isArray()
    .withMessage('Custom permissions must be an array'),
];

const staffQueryValidator = [
  query('role')
    .optional()
    .isIn(['admin', 'manager', 'kitchen', 'cashier', 'staff'])
    .withMessage('Invalid role filter'),
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term too long'),
];

// ============================================
// Routes
// ============================================

// Get available roles for staff assignment
router.get(
  '/roles',
  hasPermission(PERMISSIONS.STAFF_READ),
  getAvailableRoles
);

// Get all available permissions
router.get(
  '/permissions',
  hasPermission(PERMISSIONS.STAFF_READ),
  getAvailablePermissions
);

// Get all staff members
router.get(
  '/',
  hasPermission(PERMISSIONS.STAFF_READ),
  validate(staffQueryValidator),
  getStaff
);

// Get a single staff member
router.get(
  '/:id',
  hasPermission(PERMISSIONS.STAFF_READ),
  validate(staffIdValidator),
  getStaffMember
);

// Create a new staff member
router.post(
  '/',
  hasPermission(PERMISSIONS.STAFF_CREATE),
  validate(createStaffValidator),
  createStaffMember
);

// Update a staff member
router.put(
  '/:id',
  hasPermission(PERMISSIONS.STAFF_UPDATE),
  validate(updateStaffValidator),
  updateStaffMember
);

// Delete a staff member
router.delete(
  '/:id',
  hasPermission(PERMISSIONS.STAFF_DELETE),
  validate(staffIdValidator),
  deleteStaffMember
);

// Reset staff member password
router.post(
  '/:id/reset-password',
  hasPermission(PERMISSIONS.STAFF_UPDATE),
  validate(staffIdValidator),
  resetStaffPassword
);

export default router;
