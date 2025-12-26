/**
 * Reservation Routes for MenuQR
 * Customer and Admin endpoints for managing reservations
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
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
adminRouter.use(authorize('owner', 'admin'));

// Quick views
adminRouter.get('/today', getTodayReservations);
adminRouter.get('/stats', getReservationStats);

// CRUD
adminRouter.get('/', getReservations);
adminRouter.post('/', createReservationAdmin);
adminRouter.get('/:id', getReservation);
adminRouter.put('/:id', updateReservation);

// Status actions
adminRouter.put('/:id/confirm', confirmReservation);
adminRouter.put('/:id/assign-table', assignTable);
adminRouter.put('/:id/arrived', markArrived);
adminRouter.put('/:id/seated', markSeated);
adminRouter.put('/:id/completed', markCompleted);
adminRouter.put('/:id/no-show', markNoShow);
adminRouter.put('/:id/cancel', cancelReservation);

export { customerRouter, adminRouter };
export default adminRouter;
