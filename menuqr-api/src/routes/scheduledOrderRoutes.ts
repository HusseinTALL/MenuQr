/**
 * Scheduled Order Routes for MenuQR
 * Public, Customer and Admin endpoints for managing scheduled orders
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { authenticateCustomer } from '../middleware/customerAuth.js';
import {
  // Public endpoints
  getAvailability,
  getSlots,
  // Admin endpoints
  getSettings,
  updateSettings,
  getScheduledOrders,
  getCalendarData,
  // Customer endpoints
  getCustomerScheduledOrders,
  cancelCustomerScheduledOrder,
} from '../controllers/scheduledOrderController.js';

// ============================================================================
// Public Router (no auth required)
// ============================================================================

export const publicRouter = Router();

// Get available dates for a restaurant
publicRouter.get('/:restaurantId/availability', getAvailability);

// Get available time slots for a specific date
publicRouter.get('/:restaurantId/slots', getSlots);

// ============================================================================
// Admin Router (requires staff/owner auth)
// ============================================================================

export const adminRouter = Router();

// All admin routes require authentication
adminRouter.use(authenticate);
adminRouter.use(authorize('owner', 'admin'));

// Settings management
adminRouter.get('/settings', getSettings);
adminRouter.put('/settings', updateSettings);

// Order management
adminRouter.get('/', getScheduledOrders);
adminRouter.get('/calendar', getCalendarData);

// ============================================================================
// Customer Router (requires customer auth)
// ============================================================================

export const customerRouter = Router();

// All customer routes require authentication
customerRouter.use(authenticateCustomer);

// Get my scheduled orders
customerRouter.get('/', getCustomerScheduledOrders);

// Cancel a scheduled order
customerRouter.put('/:id/cancel', cancelCustomerScheduledOrder);

export default { publicRouter, adminRouter, customerRouter };
