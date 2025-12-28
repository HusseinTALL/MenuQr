import { Router } from 'express';
import {
  createDelivery,
  getDeliveries,
  getDeliveryById,
  assignDriver,
  updateDeliveryStatus,
  updateDeliveryLocation,
  submitProofOfDelivery,
  reportDeliveryIssue,
  addChatMessage,
  cancelDelivery,
  getDeliveryStats,
  getActiveDeliveries,
  trackDelivery,
  acceptDelivery,
  rejectDelivery,
  completeDelivery,
} from '../controllers/deliveryController.js';
import { authenticate, authenticateDriver, authenticateUserOrDriver } from '../middleware/auth.js';
import { hasPermission, hasAnyPermission } from '../middleware/permission.js';

const router = Router();

// ============================================
// Public Routes (Customer Tracking)
// ============================================

// GET /api/deliveries/track/:trackingCode - Track delivery (public)
router.get('/track/:trackingCode', trackDelivery);

// ============================================
// Authenticated Routes
// ============================================

// GET /api/deliveries - List deliveries (with filters)
router.get(
  '/',
  authenticate,
  hasPermission('deliveries:read'),
  getDeliveries
);

// GET /api/deliveries/active - Get active deliveries (for dashboard)
router.get(
  '/active',
  authenticate,
  hasPermission('deliveries:read'),
  getActiveDeliveries
);

// GET /api/deliveries/stats - Get delivery statistics
router.get(
  '/stats',
  authenticate,
  hasPermission('deliveries:stats'),
  getDeliveryStats
);

// POST /api/deliveries - Create new delivery
router.post(
  '/',
  authenticate,
  hasPermission('deliveries:create'),
  createDelivery
);

// GET /api/deliveries/:id - Get delivery details
router.get(
  '/:id',
  authenticate,
  hasAnyPermission(['deliveries:read', 'driver:self:deliveries']),
  getDeliveryById
);

// POST /api/deliveries/:id/assign - Assign driver to delivery
router.post(
  '/:id/assign',
  authenticate,
  hasPermission('deliveries:assign'),
  assignDriver
);

// PUT /api/deliveries/:id/status - Update delivery status (admin or driver)
router.put(
  '/:id/status',
  authenticateUserOrDriver,
  updateDeliveryStatus
);

// PUT /api/deliveries/:id/location - Update driver location (admin or driver)
router.put(
  '/:id/location',
  authenticateUserOrDriver,
  updateDeliveryLocation
);

// POST /api/deliveries/:id/pod - Submit proof of delivery
router.post(
  '/:id/pod',
  authenticate,
  hasAnyPermission(['deliveries:update', 'driver:self:deliveries']),
  submitProofOfDelivery
);

// POST /api/deliveries/:id/issue - Report delivery issue
router.post(
  '/:id/issue',
  authenticate,
  hasAnyPermission(['deliveries:update', 'driver:self:deliveries']),
  reportDeliveryIssue
);

// POST /api/deliveries/:id/chat - Add chat message
router.post(
  '/:id/chat',
  authenticate,
  addChatMessage
);

// POST /api/deliveries/:id/cancel - Cancel delivery
router.post(
  '/:id/cancel',
  authenticate,
  hasPermission('deliveries:cancel'),
  cancelDelivery
);

// ============================================
// Driver Self-Service Routes
// ============================================

// POST /api/deliveries/:id/accept - Accept delivery (driver)
router.post(
  '/:id/accept',
  authenticateDriver,
  acceptDelivery
);

// POST /api/deliveries/:id/reject - Reject delivery (driver)
router.post(
  '/:id/reject',
  authenticateDriver,
  rejectDelivery
);

// POST /api/deliveries/:id/complete - Complete delivery with POD (driver)
router.post(
  '/:id/complete',
  authenticateDriver,
  completeDelivery
);

export default router;
