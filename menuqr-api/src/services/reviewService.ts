/**
 * Review Service - Business logic for customer reviews
 */

import mongoose from 'mongoose';
import { Review, Dish, Restaurant, Order, type IReview } from '../models/index.js';

/**
 * Update dish review statistics after review changes
 */
export async function updateDishReviewStats(dishId: mongoose.Types.ObjectId): Promise<void> {
  const stats = await Review.aggregate([
    {
      $match: {
        dishId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratings: { $push: '$rating' },
      },
    },
  ]);

  // Calculate distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (stats.length > 0 && stats[0].ratings) {
    stats[0].ratings.forEach((r: number) => {
      if (r >= 1 && r <= 5) {
        distribution[r as 1 | 2 | 3 | 4 | 5]++;
      }
    });
  }

  await Dish.findByIdAndUpdate(dishId, {
    reviewStats: {
      averageRating: stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0,
      totalReviews: stats.length > 0 ? stats[0].totalReviews : 0,
      ratingDistribution: distribution,
      lastReviewAt: new Date(),
    },
  });
}

/**
 * Update restaurant review statistics after review changes
 */
export async function updateRestaurantReviewStats(
  restaurantId: mongoose.Types.ObjectId
): Promise<void> {
  // Get review stats
  const reviewStats = await Review.aggregate([
    {
      $match: {
        restaurantId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratings: { $push: '$rating' },
        withResponse: {
          $sum: { $cond: [{ $ifNull: ['$response', false] }, 1, 0] },
        },
      },
    },
  ]);

  // Calculate distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (reviewStats.length > 0 && reviewStats[0].ratings) {
    reviewStats[0].ratings.forEach((r: number) => {
      if (r >= 1 && r <= 5) {
        distribution[r as 1 | 2 | 3 | 4 | 5]++;
      }
    });
  }

  const totalReviews = reviewStats.length > 0 ? reviewStats[0].totalReviews : 0;
  const withResponse = reviewStats.length > 0 ? reviewStats[0].withResponse : 0;
  const responseRate = totalReviews > 0 ? Math.round((withResponse / totalReviews) * 100) : 0;

  await Restaurant.findByIdAndUpdate(restaurantId, {
    reviewStats: {
      averageRating: reviewStats.length > 0 ? Math.round(reviewStats[0].averageRating * 10) / 10 : 0,
      totalReviews,
      ratingDistribution: distribution,
      responseRate,
    },
  });
}

/**
 * Check if a customer can leave a review for a restaurant/dish
 */
export async function canCustomerReview(
  customerId: mongoose.Types.ObjectId,
  restaurantId: mongoose.Types.ObjectId,
  dishId?: mongoose.Types.ObjectId
): Promise<{ canReview: boolean; reason?: string; isVerifiedPurchase: boolean }> {
  // Get restaurant review settings
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return { canReview: false, reason: 'Restaurant non trouvé', isVerifiedPurchase: false };
  }

  if (!restaurant.settings.reviews?.enabled) {
    return { canReview: false, reason: 'Les avis sont désactivés pour ce restaurant', isVerifiedPurchase: false };
  }

  // Check for existing review
  const existingQuery: {
    customerId: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    dishId?: mongoose.Types.ObjectId | { $exists: boolean };
  } = {
    customerId,
    restaurantId,
  };

  if (dishId) {
    existingQuery.dishId = dishId;
  } else {
    existingQuery.dishId = { $exists: false };
  }

  const existingReview = await Review.findOne(existingQuery);
  if (existingReview) {
    return {
      canReview: false,
      reason: dishId
        ? 'Vous avez déjà laissé un avis pour ce plat'
        : 'Vous avez déjà laissé un avis pour ce restaurant',
      isVerifiedPurchase: false,
    };
  }

  // Check minimum orders requirement
  const minOrders = restaurant.settings.reviews?.minOrdersToReview || 1;

  if (minOrders > 0) {
    const completedOrders = await Order.countDocuments({
      customerId,
      restaurantId,
      status: 'completed',
    });

    if (completedOrders < minOrders) {
      return {
        canReview: false,
        reason: `Vous devez avoir au moins ${minOrders} commande(s) terminée(s) pour laisser un avis`,
        isVerifiedPurchase: false,
      };
    }
  }

  // Check if customer has ordered this specific dish (for verified purchase badge)
  let isVerifiedPurchase = false;

  if (dishId) {
    const orderWithDish = await Order.findOne({
      customerId,
      restaurantId,
      status: 'completed',
      'items.dishId': dishId,
    });
    isVerifiedPurchase = !!orderWithDish;
  } else {
    // For restaurant reviews, verified if they have any completed order
    const hasOrder = await Order.exists({
      customerId,
      restaurantId,
      status: 'completed',
    });
    isVerifiedPurchase = !!hasOrder;
  }

  return { canReview: true, isVerifiedPurchase };
}

/**
 * Determine initial review status based on restaurant settings
 */
export function determineInitialStatus(
  rating: number,
  reviewSettings?: {
    requireApproval?: boolean;
    autoApproveThreshold?: number;
  }
): 'pending' | 'approved' {
  // Default to pending if settings not found
  if (!reviewSettings) {
    return 'pending';
  }

  // If no approval required, auto-approve
  if (!reviewSettings.requireApproval) {
    return 'approved';
  }

  // Check auto-approve threshold
  if (reviewSettings.autoApproveThreshold && rating >= reviewSettings.autoApproveThreshold) {
    return 'approved';
  }

  return 'pending';
}

/**
 * Get paginated reviews with filters
 */
export interface ReviewFilters {
  restaurantId?: mongoose.Types.ObjectId;
  dishId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  status?: string;
  rating?: number;
  hasResponse?: boolean;
  isVerifiedPurchase?: boolean;
}

export interface ReviewPaginationOptions {
  page: number;
  limit: number;
  sort: string;
}

export interface PaginatedReviews {
  reviews: IReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getReviewsWithPagination(
  filters: ReviewFilters,
  options: ReviewPaginationOptions
): Promise<PaginatedReviews> {
  const { page, limit, sort } = options;

  // Build query
  const query: Record<string, unknown> = {};

  if (filters.restaurantId) query.restaurantId = filters.restaurantId;
  if (filters.dishId) query.dishId = filters.dishId;
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.status) query.status = filters.status;
  if (filters.rating) query.rating = filters.rating;
  if (filters.hasResponse !== undefined) {
    query.response = filters.hasResponse ? { $exists: true } : { $exists: false };
  }
  if (filters.isVerifiedPurchase !== undefined) {
    query.isVerifiedPurchase = filters.isVerifiedPurchase;
  }

  // Build sort
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  switch (sort) {
    case 'oldest':
      sortObj = { createdAt: 1 };
      break;
    case 'rating_high':
      sortObj = { rating: -1, createdAt: -1 };
      break;
    case 'rating_low':
      sortObj = { rating: 1, createdAt: -1 };
      break;
    case 'helpful':
      sortObj = { helpfulCount: -1, createdAt: -1 };
      break;
    default:
      sortObj = { createdAt: -1 };
  }

  // Execute query
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('customerId', 'name phone')
      .populate('dishId', 'name slug image')
      .populate('response.respondedBy', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(query),
  ]);

  return {
    reviews: reviews as IReview[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get review statistics for a restaurant
 */
export interface ReviewStatsResult {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  responseRate: number;
  recentReviews: IReview[];
}

export async function getRestaurantReviewStats(
  restaurantId: mongoose.Types.ObjectId
): Promise<ReviewStatsResult> {
  // Get aggregated stats
  const stats = await Review.aggregate([
    {
      $match: {
        restaurantId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratings: { $push: '$rating' },
        withResponse: {
          $sum: { $cond: [{ $ifNull: ['$response', false] }, 1, 0] },
        },
      },
    },
  ]);

  // Calculate distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (stats.length > 0 && stats[0].ratings) {
    stats[0].ratings.forEach((r: number) => {
      if (r >= 1 && r <= 5) {
        distribution[r as 1 | 2 | 3 | 4 | 5]++;
      }
    });
  }

  // Get recent reviews
  const recentReviews = await Review.find({
    restaurantId,
    status: 'approved',
  })
    .populate('customerId', 'name')
    .populate('dishId', 'name slug')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const totalReviews = stats.length > 0 ? stats[0].totalReviews : 0;
  const withResponse = stats.length > 0 ? stats[0].withResponse : 0;

  return {
    averageRating: stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0,
    totalReviews,
    ratingDistribution: distribution,
    responseRate: totalReviews > 0 ? Math.round((withResponse / totalReviews) * 100) : 0,
    recentReviews: recentReviews as IReview[],
  };
}

/**
 * Get admin review statistics
 */
export interface AdminReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  averageRating: number;
  responseRate: number;
  todayCount: number;
  weekCount: number;
}

export async function getAdminReviewStats(
  restaurantId: mongoose.Types.ObjectId
): Promise<AdminReviewStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const [statusCounts, ratingStats, todayCount, weekCount] = await Promise.all([
    Review.aggregate([
      { $match: { restaurantId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Review.aggregate([
      { $match: { restaurantId, status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          total: { $sum: 1 },
          withResponse: {
            $sum: { $cond: [{ $ifNull: ['$response', false] }, 1, 0] },
          },
        },
      },
    ]),
    Review.countDocuments({ restaurantId, createdAt: { $gte: startOfDay } }),
    Review.countDocuments({ restaurantId, createdAt: { $gte: startOfWeek } }),
  ]);

  // Parse status counts
  const counts: Record<string, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
  };
  statusCounts.forEach((s) => {
    if (s._id in counts) {
      counts[s._id] = s.count;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const approvedTotal = ratingStats.length > 0 ? ratingStats[0].total : 0;
  const withResponse = ratingStats.length > 0 ? ratingStats[0].withResponse : 0;

  return {
    total,
    pending: counts.pending,
    approved: counts.approved,
    rejected: counts.rejected,
    flagged: counts.flagged,
    averageRating: ratingStats.length > 0 ? Math.round(ratingStats[0].averageRating * 10) / 10 : 0,
    responseRate: approvedTotal > 0 ? Math.round((withResponse / approvedTotal) * 100) : 0,
    todayCount,
    weekCount,
  };
}
