import { Request, Response } from 'express';
import { Restaurant, User, Order, Dish, Category, AuditLog } from '../../models/index.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { generateImpersonationToken } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

/**
 * Get all restaurants with pagination and filters (Super Admin)
 */
export const getAllRestaurants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query: Record<string, unknown> = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  // Build sort
  const sort: Record<string, 1 | -1> = {};
  sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);

  const [restaurants, total] = await Promise.all([
    Restaurant.find(query)
      .populate('ownerId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Restaurant.countDocuments(query),
  ]);

  // Get stats for each restaurant
  const restaurantsWithStats = await Promise.all(
    restaurants.map(async (restaurant) => {
      const [orderCount, dishCount, categoryCount] = await Promise.all([
        Order.countDocuments({ restaurantId: restaurant._id }),
        Dish.countDocuments({ restaurantId: restaurant._id }),
        Category.countDocuments({ restaurantId: restaurant._id }),
      ]);

      return {
        ...restaurant.toObject(),
        stats: {
          orders: orderCount,
          dishes: dishCount,
          categories: categoryCount,
        },
      };
    })
  );

  res.json({
    success: true,
    data: {
      restaurants: restaurantsWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * Get restaurant details by ID (Super Admin)
 */
export const getRestaurantById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const restaurant = await Restaurant.findById(id).populate('ownerId', 'name email role');

  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Get detailed stats
  const [orderStats, dishCount, categoryCount, staffCount] = await Promise.all([
    Order.aggregate([
      { $match: { restaurantId: restaurant._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $in: ['$status', ['completed', 'paid']] }, 1, 0] },
          },
        },
      },
    ]),
    Dish.countDocuments({ restaurantId: restaurant._id }),
    Category.countDocuments({ restaurantId: restaurant._id }),
    User.countDocuments({ restaurantId: restaurant._id }),
  ]);

  const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, completedOrders: 0 };

  res.json({
    success: true,
    data: {
      restaurant,
      stats: {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        completedOrders: stats.completedOrders,
        dishes: dishCount,
        categories: categoryCount,
        staff: staffCount,
      },
    },
  });
});

/**
 * Update restaurant (Super Admin)
 */
export const updateRestaurant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Update restaurant
  const updatedRestaurant = await Restaurant.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Restaurant updated successfully',
    data: updatedRestaurant,
  });
});

/**
 * Update restaurant status (activate/suspend) (Super Admin)
 */
export const updateRestaurantStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive, reason } = req.body;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  restaurant.isActive = isActive;
  await restaurant.save();

  // Log the action
  logger.info('[SuperAdmin] Restaurant status changed', {
    restaurantId: restaurant._id,
    restaurantName: restaurant.name,
    isActive,
    reason: reason || 'Not specified',
  });

  res.json({
    success: true,
    message: `Restaurant ${isActive ? 'activated' : 'suspended'} successfully`,
    data: restaurant,
  });
});

/**
 * Delete restaurant (Super Admin)
 */
export const deleteRestaurant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { permanent = false } = req.query;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  if (permanent === 'true') {
    // Permanent delete - cascade delete all related data
    await Promise.all([
      Order.deleteMany({ restaurantId: id }),
      Dish.deleteMany({ restaurantId: id }),
      Category.deleteMany({ restaurantId: id }),
      User.updateMany({ restaurantId: id }, { $unset: { restaurantId: 1 } }),
      Restaurant.findByIdAndDelete(id),
    ]);

    res.json({
      success: true,
      message: 'Restaurant and all related data permanently deleted',
    });
  } else {
    // Soft delete
    restaurant.isActive = false;
    await restaurant.save();

    res.json({
      success: true,
      message: 'Restaurant deactivated successfully',
      data: restaurant,
    });
  }
});

/**
 * Generate impersonation token for restaurant owner (Super Admin)
 */
export const impersonateRestaurant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }

  const restaurant = await Restaurant.findById(id).populate('ownerId');
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  if (!restaurant.ownerId) {
    throw new ApiError(400, 'Restaurant has no owner');
  }

  // Get the owner user
  const owner = await User.findById((restaurant.ownerId as unknown as { _id: string })._id);
  if (!owner) {
    throw new ApiError(400, 'Restaurant owner not found');
  }

  // Cannot impersonate another super admin
  if (owner.role === 'superadmin') {
    throw new ApiError(403, 'Cannot impersonate another super admin');
  }

  // Generate secure impersonation token (1 hour expiry)
  const impersonationToken = generateImpersonationToken(
    owner,
    req.user,
    restaurant._id.toString()
  );

  // Log the impersonation action
  await AuditLog.create({
    action: 'impersonate',
    category: 'restaurant',
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    userRole: req.user.role,
    targetType: 'Restaurant',
    targetId: restaurant._id,
    targetName: restaurant.name,
    description: `Super admin ${req.user.name} started impersonation session as ${owner.name} (${owner.email}) for restaurant ${restaurant.name}`,
    metadata: {
      ownerId: owner._id,
      ownerEmail: owner.email,
      ownerRole: owner.role,
      restaurantSlug: restaurant.slug,
    },
    ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
    userAgent: req.headers['user-agent'],
    status: 'success',
  });

  res.json({
    success: true,
    message: 'Impersonation session started',
    data: {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      ownerId: owner._id,
      ownerName: owner.name,
      ownerEmail: owner.email,
      ownerRole: owner.role,
      impersonationToken,
      expiresIn: 3600, // 1 hour in seconds
      impersonationUrl: `/admin?impersonate=${restaurant._id}`,
    },
  });
});

/**
 * Get restaurant orders (Super Admin)
 */
export const getRestaurantOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { page = 1, limit = 10, status } = req.query;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const query: Record<string, unknown> = { restaurantId: id };
  if (status && status !== 'all') {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * Get restaurant staff (Super Admin)
 */
export const getRestaurantStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const staff = await User.find({ restaurantId: id })
    .select('name email role isActive createdAt lastLoginAt')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: { staff },
  });
});

/**
 * Get restaurant menu (dishes and categories) (Super Admin)
 */
export const getRestaurantMenu = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const [dishes, categories] = await Promise.all([
    Dish.find({ restaurantId: id })
      .select('name price image isAvailable isPopular categoryId order')
      .sort({ order: 1, createdAt: -1 })
      .lean(),
    Category.find({ restaurantId: id })
      .select('name order isActive')
      .sort({ order: 1 })
      .lean(),
  ]);

  res.json({
    success: true,
    data: { dishes, categories },
  });
});

/**
 * End impersonation session
 */
export const endImpersonation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.isImpersonating || !req.originalUser) {
    throw new ApiError(400, 'Not in an impersonation session');
  }

  // Log the end of impersonation
  if (req.user) {
    await AuditLog.create({
      action: 'impersonate',
      category: 'restaurant',
      userId: req.originalUser.userId,
      userName: 'Super Admin',
      userEmail: req.originalUser.email,
      userRole: req.originalUser.role,
      targetType: 'User',
      targetId: req.user._id,
      targetName: req.user.name,
      description: `Super admin ${req.originalUser.email} ended impersonation session as ${req.user.name}`,
      metadata: {
        action: 'end_impersonation',
        impersonatedUserId: req.user._id,
        impersonatedUserEmail: req.user.email,
      },
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
      status: 'success',
    });
  }

  res.json({
    success: true,
    message: 'Impersonation session ended',
    data: {
      originalUserId: req.originalUser.userId,
      originalEmail: req.originalUser.email,
      redirectUrl: '/super-admin',
    },
  });
});
