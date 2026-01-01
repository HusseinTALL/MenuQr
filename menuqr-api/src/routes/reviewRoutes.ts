/**
 * Review Routes for MenuQR
 * Public, Customer, and Admin endpoints for reviews
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
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
  getReviewDistribution,
  getReviewTrend,
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
  hasPermission(PERMISSIONS.REVIEWS_READ),
  validate(adminReviewQueryValidator),
  getAdminReviews
);

// Get pending reviews
adminRouter.get(
  '/pending',
  authenticate,
  hasPermission(PERMISSIONS.REVIEWS_READ),
  getPendingReviews
);

// Get admin statistics
adminRouter.get(
  '/stats',
  authenticate,
  hasPermission(PERMISSIONS.REVIEWS_READ),
  getAdminReviewStatsController
);

// Get review rating distribution (for charts)
adminRouter.get(
  '/stats/distribution',
  authenticate,
  hasPermission(PERMISSIONS.REVIEWS_READ),
  getReviewDistribution
);

// Get review rating trend over time (for charts)
adminRouter.get(
  '/stats/trend',
  authenticate,
  hasPermission(PERMISSIONS.REVIEWS_READ),
  getReviewTrend
);

// Approve a review
adminRouter.put(
  '/:id/approve',
  authenticate,
  hasPermission(PERMISSIONS.REVIEWS_MODERATE),
  validate(reviewIdValidator),
  approveReview
);

// Reject a review
adminRouter.put(
  '/:id/reject',
  authenticate,
  hasPermission(PERMISSIONS.REVIEWS_MODERATE),
  validate(rejectReviewValidator),
  rejectReview
);

// Respond to a review
adminRouter.put(
  '/:id/respond',
  authenticate,
  hasPermission(PERMISSIONS.REVIEWS_MODERATE),
  validate(respondToReviewValidator),
  respondToReview
);

// Delete a review
adminRouter.delete(
  '/:id',
  authenticate,
  hasPermission(PERMISSIONS.REVIEWS_DELETE),
  validate(reviewIdValidator),
  deleteReview
);

export { publicRouter as reviewPublicRoutes, customerRouter as reviewCustomerRoutes, adminRouter as reviewAdminRoutes };
