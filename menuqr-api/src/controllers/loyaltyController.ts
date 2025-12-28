import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Customer } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as loyaltyService from '../services/loyaltyService.js';
import { getAuthenticatedRestaurant } from '../middleware/restaurantContext.js';

// ============================================
// CUSTOMER ENDPOINTS
// ============================================

/**
 * Get customer's loyalty info
 * GET /customer/loyalty/me
 */
export const getCustomerLoyaltyInfo = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const customer = req.customer!;

    const loyaltyInfo = await loyaltyService.getCustomerLoyalty(customer._id);

    res.json({
      success: true,
      data: loyaltyInfo,
    });
  }
);

/**
 * Get customer's points history
 * GET /customer/loyalty/me/history
 */
export const getCustomerPointsHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const customer = req.customer!;
    const { page = 1, limit = 20, type } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);

    const result = await loyaltyService.getPointsHistory(customer._id, pageNum, limitNum, type as string);

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Redeem points for credit
 * POST /customer/loyalty/me/redeem
 */
export const redeemPoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { points } = req.body;

  const result = await loyaltyService.redeemPoints(customer._id, points);

  res.json({
    success: true,
    message: `${points} points échangés contre ${result.creditValue} FCFA de crédit`,
    data: {
      transaction: result.transaction,
      creditValue: result.creditValue,
      newBalance: result.newBalance,
    },
  });
});

/**
 * Get points expiring soon
 * GET /customer/loyalty/me/expiring
 */
export const getExpiringPoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { days = 30 } = req.query;

  const daysNum = Math.min(parseInt(days as string, 10), 365);
  const result = await loyaltyService.getExpiringPoints(customer._id, daysNum);

  res.json({
    success: true,
    data: result,
  });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get loyalty program stats
 * GET /loyalty/stats
 */
export const getLoyaltyStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Use verified restaurant context instead of trusting req.user.restaurantId
  const restaurant = await getAuthenticatedRestaurant(req);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found or access denied');
  }

  const stats = await loyaltyService.getLoyaltyStats(restaurant._id.toString());

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Get all customers with loyalty info
 * GET /loyalty/customers
 */
export const getCustomersLoyalty = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Use verified restaurant context
    const restaurant = await getAuthenticatedRestaurant(req);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found or access denied');
    }
    const restaurantId = restaurant._id.toString();
    const { page = 1, limit = 20, tier, search, sortBy = 'totalPoints', sortOrder = 'desc' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);

    const result = await loyaltyService.getCustomersLoyalty(restaurantId, {
      page: pageNum,
      limit: limitNum,
      tier: tier as string,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Get specific customer's loyalty info (admin)
 * GET /loyalty/customers/:customerId
 */
export const getCustomerLoyaltyAdmin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Use verified restaurant context
    const restaurant = await getAuthenticatedRestaurant(req);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found or access denied');
    }
    const restaurantId = restaurant._id.toString();
    const { customerId } = req.params;

    // Verify customer belongs to this restaurant
    const customer = await Customer.findOne({
      _id: customerId,
      restaurantId,
    });

    if (!customer) {
      throw new ApiError(404, 'Client non trouvé');
    }

    const loyaltyInfo = await loyaltyService.getCustomerLoyalty(new mongoose.Types.ObjectId(customerId));
    const history = await loyaltyService.getPointsHistory(new mongoose.Types.ObjectId(customerId), 1, 10);

    res.json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        },
        loyalty: loyaltyInfo,
        recentTransactions: history.transactions,
      },
    });
  }
);

/**
 * Get specific customer's full points history (admin)
 * GET /loyalty/customers/:customerId/history
 */
export const getCustomerHistoryAdmin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Use verified restaurant context
    const restaurant = await getAuthenticatedRestaurant(req);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found or access denied');
    }
    const restaurantId = restaurant._id.toString();
    const { customerId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    // Verify customer belongs to this restaurant
    const customer = await Customer.findOne({
      _id: customerId,
      restaurantId,
    });

    if (!customer) {
      throw new ApiError(404, 'Client non trouvé');
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);

    const result = await loyaltyService.getPointsHistory(
      new mongoose.Types.ObjectId(customerId),
      pageNum,
      limitNum,
      type as string
    );

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Adjust customer points (admin)
 * POST /loyalty/customers/:customerId/adjust
 */
export const adjustCustomerPoints = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Use verified restaurant context
    const restaurant = await getAuthenticatedRestaurant(req);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found or access denied');
    }
    const restaurantId = restaurant._id.toString();
    const adminId = req.user!._id;
    const { customerId } = req.params;
    const { points, reason } = req.body;

    // Verify customer belongs to this restaurant
    const customer = await Customer.findOne({
      _id: customerId,
      restaurantId,
    });

    if (!customer) {
      throw new ApiError(404, 'Client non trouvé');
    }

    const result = await loyaltyService.adjustPoints(
      new mongoose.Types.ObjectId(customerId),
      restaurantId,
      points,
      reason,
      adminId
    );

    const action = points > 0 ? 'ajoutés' : 'retirés';
    res.json({
      success: true,
      message: `${Math.abs(points)} points ${action}`,
      data: {
        transaction: result.transaction,
        newBalance: result.newBalance,
        newTier: result.newTier,
      },
    });
  }
);

/**
 * Add bonus points to customer (admin)
 * POST /loyalty/customers/:customerId/bonus
 */
export const addBonusPoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Use verified restaurant context
  const restaurant = await getAuthenticatedRestaurant(req);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found or access denied');
  }
  const restaurantId = restaurant._id.toString();
  const adminId = req.user!._id;
  const { customerId } = req.params;
  const { points, description } = req.body;

  // Verify customer belongs to this restaurant
  const customer = await Customer.findOne({
    _id: customerId,
    restaurantId,
  });

  if (!customer) {
    throw new ApiError(404, 'Client non trouvé');
  }

  const result = await loyaltyService.addBonusPoints(
    new mongoose.Types.ObjectId(customerId),
    restaurantId,
    points,
    description,
    adminId
  );

  res.json({
    success: true,
    message: `${points} points bonus ajoutés`,
    data: {
      transaction: result.transaction,
      newBalance: result.newBalance,
      newTier: result.newTier,
    },
  });
});

/**
 * Manually trigger point expiration (admin - for testing/maintenance)
 * POST /loyalty/expire-points
 */
export const triggerExpirePoints = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Use verified restaurant context
    const restaurant = await getAuthenticatedRestaurant(req);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found or access denied');
    }

    const result = await loyaltyService.processExpiredPoints(restaurant._id.toString());

    res.json({
      success: true,
      message: `${result.customersProcessed} clients traités, ${result.totalPointsExpired} points expirés`,
      data: result,
    });
  }
);
