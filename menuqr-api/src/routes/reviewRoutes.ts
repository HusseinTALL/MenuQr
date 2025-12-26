/**
 * Review Routes for MenuQR
 * Public, Customer, and Admin endpoints for reviews
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { authenticateCustomer, optionalCustomerAuth } from '../middleware/customerAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createReviewValidator,
  updateReviewValidator,
  reviewIdValidator,
  restaurantIdValidator,
  dishIdValidator,
  respondToReviewValidator,
  rejectReviewValidator,
  reportReviewValidator,
  reviewQueryValidator,
  adminReviewQueryValidator,
} from '../validators/review.js';
import {
  // Customer endpoints
  createReview,
  updateOwnReview,
  deleteOwnReview,
  getMyReviews,
  markHelpful,
  reportReview,
  checkCanReview,
  // Public endpoints
  getRestaurantReviews,
  getDishReviews,
  getReviewById,
  getRestaurantReviewStatsPublic,
  // Admin endpoints
  getAdminReviews,
  getPendingReviews,
  getAdminReviewStatsController,
  approveReview,
  rejectReview,
  respondToReview,
  deleteReview,
} from '../controllers/reviewController.js';

const publicRouter = Router();
const customerRouter = Router();
const adminRouter = Router();

// =====================
// Public Routes (no auth required)
// =====================

// Get reviews for a restaurant
publicRouter.get(
  '/restaurant/:restaurantId',
  validate(restaurantIdValidator),
  validate(reviewQueryValidator),
  getRestaurantReviews
);

// Get reviews for a dish
publicRouter.get(
  '/dish/:dishId',
  validate(dishIdValidator),
  validate(reviewQueryValidator),
  getDishReviews
);

// Get restaurant review statistics
publicRouter.get(
  '/restaurant/:restaurantId/stats',
  validate(restaurantIdValidator),
  getRestaurantReviewStatsPublic
);

// Get a single review by ID
publicRouter.get(
  '/:id',
  validate(reviewIdValidator),
  getReviewById
);

// Check if customer can review (with optional auth)
publicRouter.get(
  '/can-review',
  optionalCustomerAuth,
  checkCanReview
);

// =====================
// Customer Routes (customer auth required)
// =====================

// IMPORTANT: Specific routes MUST come BEFORE parameterized routes

// Get my reviews
customerRouter.get(
  '/me',
  authenticateCustomer,
  validate(reviewQueryValidator),
  getMyReviews
);

// Create a new review
customerRouter.post(
  '/',
  authenticateCustomer,
  validate(createReviewValidator),
  createReview
);

// Update own review
customerRouter.put(
  '/:id',
  authenticateCustomer,
  validate(updateReviewValidator),
  updateOwnReview
);

// Delete own review
customerRouter.delete(
  '/:id',
  authenticateCustomer,
  validate(reviewIdValidator),
  deleteOwnReview
);

// Mark review as helpful
customerRouter.post(
  '/:id/helpful',
  authenticateCustomer,
  validate(reviewIdValidator),
  markHelpful
);

// Report a review
customerRouter.post(
  '/:id/report',
  authenticateCustomer,
  validate(reportReviewValidator),
  reportReview
);

// =====================
// Admin Routes (admin auth required)
// =====================

// Get all reviews with filters
adminRouter.get(
  '/',
  authenticate,
  authorize('owner', 'admin'),
  validate(adminReviewQueryValidator),
  getAdminReviews
);

// Get pending reviews
adminRouter.get(
  '/pending',
  authenticate,
  authorize('owner', 'admin'),
  getPendingReviews
);

// Get admin statistics
adminRouter.get(
  '/stats',
  authenticate,
  authorize('owner', 'admin'),
  getAdminReviewStatsController
);

// Approve a review
adminRouter.put(
  '/:id/approve',
  authenticate,
  authorize('owner', 'admin'),
  validate(reviewIdValidator),
  approveReview
);

// Reject a review
adminRouter.put(
  '/:id/reject',
  authenticate,
  authorize('owner', 'admin'),
  validate(rejectReviewValidator),
  rejectReview
);

// Respond to a review
adminRouter.put(
  '/:id/respond',
  authenticate,
  authorize('owner', 'admin'),
  validate(respondToReviewValidator),
  respondToReview
);

// Delete a review
adminRouter.delete(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  validate(reviewIdValidator),
  deleteReview
);

export { publicRouter as reviewPublicRoutes, customerRouter as reviewCustomerRoutes, adminRouter as reviewAdminRoutes };
