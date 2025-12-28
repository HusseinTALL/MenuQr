/**
 * Review Controller for MenuQR
 * Handles CRUD operations for customer reviews
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review, Restaurant, Dish } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import {
  canCustomerReview,
  determineInitialStatus,
  updateDishReviewStats,
  updateRestaurantReviewStats,
  getReviewsWithPagination,
  getRestaurantReviewStats,
  getAdminReviewStats,
  type ReviewFilters,
} from '../services/reviewService.js';
import { emitNewReview } from '../services/socketService.js';

// =====================
// Customer Endpoints
// =====================

/**
 * Create a new review (customer)
 */
export const createReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { restaurantId, dishId, orderId, rating, title, comment, images } = req.body;

  const restaurantObjId = new mongoose.Types.ObjectId(restaurantId);
  const dishObjId = dishId ? new mongoose.Types.ObjectId(dishId) : undefined;

  // Check if customer can review
  const { canReview, reason, isVerifiedPurchase } = await canCustomerReview(
    customer._id,
    restaurantObjId,
    dishObjId
  );

  if (!canReview) {
    throw new ApiError(400, reason || 'Vous ne pouvez pas laisser un avis');
  }

  // Get restaurant settings for initial status
  const restaurant = await Restaurant.findById(restaurantObjId);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  // Check if photos are allowed
  if (images && images.length > 0 && !restaurant.settings.reviews?.allowPhotos) {
    throw new ApiError(400, 'Les photos ne sont pas autorisées pour ce restaurant');
  }

  // Determine initial status
  const initialStatus = determineInitialStatus(rating, restaurant.settings.reviews);

  // Create review
  const review = await Review.create({
    restaurantId: restaurantObjId,
    dishId: dishObjId,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    customerId: customer._id,
    rating,
    title,
    comment,
    images: images || [],
    status: initialStatus,
    isVerifiedPurchase,
  });

  // Update stats if approved
  if (initialStatus === 'approved') {
    if (dishObjId) {
      await updateDishReviewStats(dishObjId);
    }
    await updateRestaurantReviewStats(restaurantObjId);
  }

  // Populate for response
  await review.populate('customerId', 'name');
  if (dishObjId) {
    await review.populate('dishId', 'name slug image');
  }

  // Emit real-time event for new review
  emitNewReview(restaurantId, {
    reviewId: review._id.toString(),
    rating: review.rating,
    comment: review.comment,
    customerName: customer.name,
  });

  res.status(201).json({
    success: true,
    message: initialStatus === 'approved'
      ? 'Avis publié avec succès'
      : 'Avis soumis, en attente de modération',
    data: review,
  });
});

/**
 * Update own review (customer)
 */
export const updateOwnReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { id } = req.params;
  const { rating, title, comment, images } = req.body;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Check ownership
  if (review.customerId.toString() !== customer._id.toString()) {
    throw new ApiError(403, 'Non autorisé à modifier cet avis');
  }

  // Check if photos are allowed
  if (images && images.length > 0) {
    const restaurant = await Restaurant.findById(review.restaurantId);
    if (!restaurant?.settings.reviews?.allowPhotos) {
      throw new ApiError(400, 'Les photos ne sont pas autorisées pour ce restaurant');
    }
  }

  // Store old values for stats update
  const wasApproved = review.status === 'approved';
  const oldRating = review.rating;

  // Update fields
  if (rating !== undefined) {review.rating = rating;}
  if (title !== undefined) {review.title = title;}
  if (comment !== undefined) {review.comment = comment;}
  if (images !== undefined) {review.images = images;}

  // Reset to pending if was approved (needs re-moderation)
  if (wasApproved && (rating !== oldRating || comment !== review.comment)) {
    const restaurant = await Restaurant.findById(review.restaurantId);
    if (restaurant?.settings.reviews?.requireApproval) {
      review.status = 'pending';
    }
  }

  await review.save();

  // Update stats if needed
  if (wasApproved || review.status === 'approved') {
    if (review.dishId) {
      await updateDishReviewStats(review.dishId);
    }
    await updateRestaurantReviewStats(review.restaurantId);
  }

  await review.populate('customerId', 'name');
  if (review.dishId) {
    await review.populate('dishId', 'name slug image');
  }

  res.json({
    success: true,
    message: review.status === 'pending'
      ? 'Avis modifié, en attente de re-modération'
      : 'Avis modifié avec succès',
    data: review,
  });
});

/**
 * Delete own review (customer)
 */
export const deleteOwnReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Check ownership
  if (review.customerId.toString() !== customer._id.toString()) {
    throw new ApiError(403, 'Non autorisé à supprimer cet avis');
  }

  const wasApproved = review.status === 'approved';
  const { dishId, restaurantId } = review;

  await Review.findByIdAndDelete(id);

  // Update stats
  if (wasApproved) {
    if (dishId) {
      await updateDishReviewStats(dishId);
    }
    await updateRestaurantReviewStats(restaurantId);
  }

  res.json({
    success: true,
    message: 'Avis supprimé avec succès',
  });
});

/**
 * Get customer's own reviews
 */
export const getMyReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { page = 1, limit = 10, sort = 'recent' } = req.query;

  const result = await getReviewsWithPagination(
    { customerId: customer._id },
    {
      page: Number(page),
      limit: Number(limit),
      sort: String(sort),
    }
  );

  res.json({
    success: true,
    message: 'Avis récupérés avec succès',
    data: result.reviews,
    pagination: result.pagination,
  });
});

/**
 * Mark review as helpful (customer)
 */
export const markHelpful = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Can't vote on own review
  if (review.customerId.toString() === customer._id.toString()) {
    throw new ApiError(400, 'Vous ne pouvez pas voter pour votre propre avis');
  }

  // Check if already voted
  const alreadyVoted = review.helpfulVoters.some(
    (v) => v.toString() === customer._id.toString()
  );

  if (alreadyVoted) {
    // Remove vote
    review.helpfulVoters = review.helpfulVoters.filter(
      (v) => v.toString() !== customer._id.toString()
    );
    review.helpfulCount = Math.max(0, review.helpfulCount - 1);
  } else {
    // Add vote
    review.helpfulVoters.push(customer._id);
    review.helpfulCount++;
  }

  await review.save();

  res.json({
    success: true,
    message: alreadyVoted ? 'Vote retiré' : 'Vote ajouté',
    data: {
      helpfulCount: review.helpfulCount,
      hasVoted: !alreadyVoted,
    },
  });
});

/**
 * Report a review (customer)
 */
export const reportReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Can't report own review
  if (review.customerId.toString() === customer._id.toString()) {
    throw new ApiError(400, 'Vous ne pouvez pas signaler votre propre avis');
  }

  // Check if already reported
  const alreadyReported = review.reporters.some(
    (r) => r.toString() === customer._id.toString()
  );

  if (alreadyReported) {
    throw new ApiError(400, 'Vous avez déjà signalé cet avis');
  }

  review.reporters.push(customer._id);
  review.reportCount++;

  // Auto-flag if too many reports
  if (review.reportCount >= 3 && review.status === 'approved') {
    review.status = 'flagged';
  }

  await review.save();

  res.json({
    success: true,
    message: 'Avis signalé avec succès',
  });
});

// =====================
// Public Endpoints
// =====================

/**
 * Get reviews for a restaurant (public)
 */
export const getRestaurantReviews = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10, rating, sort = 'recent' } = req.query;

    const filters: ReviewFilters = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      status: 'approved',
    };

    if (rating) {
      filters.rating = Number(rating);
    }

    const result = await getReviewsWithPagination(filters, {
      page: Number(page),
      limit: Number(limit),
      sort: String(sort),
    });

    res.json({
      success: true,
      message: 'Avis récupérés avec succès',
      data: result.reviews,
      pagination: result.pagination,
    });
  }
);

/**
 * Get reviews for a dish (public)
 */
export const getDishReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { dishId } = req.params;
  const { page = 1, limit = 10, rating, sort = 'recent' } = req.query;

  // Verify dish exists
  const dish = await Dish.findById(dishId);
  if (!dish) {
    throw new ApiError(404, 'Plat non trouvé');
  }

  const filters: ReviewFilters = {
    dishId: new mongoose.Types.ObjectId(dishId),
    status: 'approved',
  };

  if (rating) {
    filters.rating = Number(rating);
  }

  const result = await getReviewsWithPagination(filters, {
    page: Number(page),
    limit: Number(limit),
    sort: String(sort),
  });

  res.json({
    success: true,
    message: 'Avis récupérés avec succès',
    data: result.reviews,
    pagination: result.pagination,
  });
});

/**
 * Get a single review by ID (public)
 */
export const getReviewById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const review = await Review.findById(id)
    .populate('customerId', 'name')
    .populate('dishId', 'name slug image')
    .populate('response.respondedBy', 'name');

  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Only show approved reviews to public
  if (review.status !== 'approved') {
    throw new ApiError(404, 'Avis non trouvé');
  }

  res.json({
    success: true,
    message: 'Avis récupéré avec succès',
    data: review,
  });
});

/**
 * Get restaurant review statistics (public)
 */
export const getRestaurantReviewStatsPublic = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;

    const stats = await getRestaurantReviewStats(new mongoose.Types.ObjectId(restaurantId));

    res.json({
      success: true,
      message: 'Statistiques récupérées avec succès',
      data: stats,
    });
  }
);

// =====================
// Admin Endpoints
// =====================

/**
 * Get all reviews for admin (with filters)
 */
export const getAdminReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const {
    page = 1,
    limit = 20,
    status,
    rating,
    dishId,
    customerId,
    hasResponse,
    isVerifiedPurchase,
    sort = 'recent',
  } = req.query;

  // Get restaurant for this owner
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  const filters: ReviewFilters = {
    restaurantId: restaurant._id,
  };

  if (status) {filters.status = String(status);}
  if (rating) {filters.rating = Number(rating);}
  if (dishId) {filters.dishId = new mongoose.Types.ObjectId(String(dishId));}
  if (customerId) {filters.customerId = new mongoose.Types.ObjectId(String(customerId));}
  if (hasResponse !== undefined) {filters.hasResponse = hasResponse === 'true';}
  if (isVerifiedPurchase !== undefined) {filters.isVerifiedPurchase = isVerifiedPurchase === 'true';}

  const result = await getReviewsWithPagination(filters, {
    page: Number(page),
    limit: Number(limit),
    sort: String(sort),
  });

  res.json({
    success: true,
    message: 'Avis récupérés avec succès',
    data: result.reviews,
    pagination: result.pagination,
  });
});

/**
 * Get pending reviews for admin
 */
export const getPendingReviews = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    const reviews = await Review.find({
      restaurantId: restaurant._id,
      status: 'pending',
    })
      .populate('customerId', 'name phone')
      .populate('dishId', 'name slug image')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Avis en attente récupérés',
      data: reviews,
    });
  }
);

/**
 * Get admin review statistics
 */
export const getAdminReviewStatsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    const stats = await getAdminReviewStats(restaurant._id);

    res.json({
      success: true,
      message: 'Statistiques récupérées avec succès',
      data: stats,
    });
  }
);

/**
 * Approve a review (admin)
 */
export const approveReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(review.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé à modérer cet avis');
  }

  const wasApproved = review.status === 'approved';

  review.status = 'approved';
  review.moderatedAt = new Date();
  review.moderatedBy = user._id;
  review.rejectionReason = undefined;

  await review.save();

  // Update stats if newly approved
  if (!wasApproved) {
    if (review.dishId) {
      await updateDishReviewStats(review.dishId);
    }
    await updateRestaurantReviewStats(review.restaurantId);
  }

  await review.populate('customerId', 'name');
  if (review.dishId) {
    await review.populate('dishId', 'name slug image');
  }

  res.json({
    success: true,
    message: 'Avis approuvé avec succès',
    data: review,
  });
});

/**
 * Reject a review (admin)
 */
export const rejectReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { reason } = req.body;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(review.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé à modérer cet avis');
  }

  const wasApproved = review.status === 'approved';

  review.status = 'rejected';
  review.moderatedAt = new Date();
  review.moderatedBy = user._id;
  review.rejectionReason = reason;

  await review.save();

  // Update stats if was approved
  if (wasApproved) {
    if (review.dishId) {
      await updateDishReviewStats(review.dishId);
    }
    await updateRestaurantReviewStats(review.restaurantId);
  }

  res.json({
    success: true,
    message: 'Avis rejeté',
    data: review,
  });
});

/**
 * Respond to a review (admin)
 */
export const respondToReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { content } = req.body;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(review.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé à répondre à cet avis');
  }

  review.response = {
    content,
    respondedAt: new Date(),
    respondedBy: user._id,
  };

  await review.save();

  // Update response rate
  await updateRestaurantReviewStats(review.restaurantId);

  await review.populate('customerId', 'name');
  await review.populate('response.respondedBy', 'name');
  if (review.dishId) {
    await review.populate('dishId', 'name slug image');
  }

  res.json({
    success: true,
    message: 'Réponse ajoutée avec succès',
    data: review,
  });
});

/**
 * Delete a review (admin)
 */
export const deleteReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Avis non trouvé');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(review.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé à supprimer cet avis');
  }

  const wasApproved = review.status === 'approved';
  const { dishId, restaurantId } = review;

  await Review.findByIdAndDelete(id);

  // Update stats
  if (wasApproved) {
    if (dishId) {
      await updateDishReviewStats(dishId);
    }
    await updateRestaurantReviewStats(restaurantId);
  }

  res.json({
    success: true,
    message: 'Avis supprimé avec succès',
  });
});

/**
 * Check if customer can review (public helper endpoint)
 */
export const checkCanReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer;
  const { restaurantId, dishId } = req.query;

  if (!customer) {
    res.json({
      success: true,
      data: {
        canReview: false,
        reason: 'Vous devez être connecté pour laisser un avis',
        isVerifiedPurchase: false,
      },
    });
    return;
  }

  const result = await canCustomerReview(
    customer._id,
    new mongoose.Types.ObjectId(String(restaurantId)),
    dishId ? new mongoose.Types.ObjectId(String(dishId)) : undefined
  );

  res.json({
    success: true,
    data: result,
  });
});
