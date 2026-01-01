/**
 * Reservation Routes for MenuQR
 * Customer and Admin endpoints for managing reservations
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
import { authenticateCustomer, optionalCustomerAuth } from '../middleware/customerAuth.js';
import {
  // Customer endpoints
  getAvailableDates,
  getAvailableSlots,
  createReservation,
  getMyReservations,
  getMyReservation,
  cancelMyReservation,
  // Admin endpoints
  getReservations,
  getReservation,
  updateReservation,
  confirmReservation,
  assignTable,
  markArrived,
  markSeated,
  markCompleted,
  markNoShow,
  cancelReservation,
  getReservationStats,
  getDailyReservationStats,
  getTodayReservations,
  createReservationAdmin,
} from '../controllers/reservationController.js';

// ============================================================================
// Customer Router
// ============================================================================

const customerRouter = Router();

// Customer-only endpoints (require customer auth)
// IMPORTANT: These routes MUST be defined BEFORE /:restaurantId routes
// to avoid "me" being interpreted as a restaurantId
customerRouter.get('/me', authenticateCustomer, getMyReservations);
customerRouter.get('/me/:id', authenticateCustomer, getMyReservation);
customerRouter.put('/me/:id/cancel', authenticateCustomer, cancelMyReservation);

// Public availability endpoints (no auth required)
customerRouter.get('/:restaurantId/availability/dates', getAvailableDates);
customerRouter.get('/:restaurantId/availability/slots', getAvailableSlots);

// Create reservation (optional auth - can be guest or logged-in customer)
customerRouter.post('/:restaurantId', optionalCustomerAuth, createReservation);

// ============================================================================
// Admin Router
// ============================================================================

const adminRouter = Router();

// All admin routes require authentication
adminRouter.use(authenticate);

// Quick views (read)
adminRouter.get('/today', hasPermission(PERMISSIONS.RESERVATIONS_READ), getTodayReservations);
adminRouter.get('/stats', hasPermission(PERMISSIONS.RESERVATIONS_STATS), getReservationStats);
adminRouter.get('/stats/daily', hasPermission(PERMISSIONS.RESERVATIONS_STATS), getDailyReservationStats);

// CRUD
adminRouter.get('/', hasPermission(PERMISSIONS.RESERVATIONS_READ), getReservations);
adminRouter.post('/', hasPermission(PERMISSIONS.RESERVATIONS_CREATE), createReservationAdmin);
adminRouter.get('/:id', hasPermission(PERMISSIONS.RESERVATIONS_READ), getReservation);
adminRouter.put('/:id', hasPermission(PERMISSIONS.RESERVATIONS_UPDATE), updateReservation);

// Status actions
adminRouter.put('/:id/confirm', hasPermission(PERMISSIONS.RESERVATIONS_UPDATE_STATUS), confirmReservation);
adminRouter.put('/:id/assign-table', hasPermission(PERMISSIONS.RESERVATIONS_UPDATE_STATUS), assignTable);
adminRouter.put('/:id/arrived', hasPermission(PERMISSIONS.RESERVATIONS_UPDATE_STATUS), markArrived);
adminRouter.put('/:id/seated', hasPermission(PERMISSIONS.RESERVATIONS_UPDATE_STATUS), markSeated);
adminRouter.put('/:id/completed', hasPermission(PERMISSIONS.RESERVATIONS_UPDATE_STATUS), markCompleted);
adminRouter.put('/:id/no-show', hasPermission(PERMISSIONS.RESERVATIONS_UPDATE_STATUS), markNoShow);
adminRouter.put('/:id/cancel', hasPermission(PERMISSIONS.RESERVATIONS_UPDATE_STATUS), cancelReservation);

export { customerRouter, adminRouter };
export default adminRouter;
