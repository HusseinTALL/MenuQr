import { Request, Response } from 'express';
import {
  Restaurant,
  User,
  Order,
  Dish,
  Category,
  Customer,
  Subscription,
  AuditLog,
} from '../../models/index.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { Parser } from 'json2csv';

/**
 * Helper to create audit log for bulk actions
 */
const logBulkAction = async (
  req: Request,
  targetType: string,
  targetIds: string[],
  action: string,
  description: string,
  status: 'success' | 'failure' = 'success',
  errorMessage?: string
) => {
  if (!req.user) {return;}

  await AuditLog.create({
    action: 'bulk_action',
    category: targetType as 'restaurant' | 'user' | 'subscription',
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    userRole: req.user.role,
    description,
    metadata: {
      targetType,
      targetIds,
      actionType: action,
      count: targetIds.length,
    },
    ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
    userAgent: req.headers['user-agent'],
    status,
    errorMessage,
  });
};

// ============================================
// Restaurant Bulk Operations
// ============================================

/**
 * Bulk update restaurant status (activate/suspend)
 */
export const bulkUpdateRestaurantStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids, isActive, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, 'Restaurant IDs are required');
    }

    if (typeof isActive !== 'boolean') {
      throw new ApiError(400, 'isActive must be a boolean');
    }

    // Update all restaurants
    const result = await Restaurant.updateMany(
      { _id: { $in: ids } },
      { isActive }
    );

    // Get restaurant names for audit
    const restaurants = await Restaurant.find({ _id: { $in: ids } }).select('name');
    const restaurantNames = restaurants.map((r) => r.name).join(', ');

    // Log the bulk action
    await logBulkAction(
      req,
      'restaurant',
      ids,
      'status_change',
      `Bulk ${isActive ? 'activated' : 'suspended'} ${result.modifiedCount} restaurants: ${restaurantNames}${reason ? `. Reason: ${reason}` : ''}`
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} restaurant(s) ${isActive ? 'activated' : 'suspended'} successfully`,
      data: {
        modified: result.modifiedCount,
        matched: result.matchedCount,
      },
    });
  }
);

/**
 * Bulk delete restaurants
 */
export const bulkDeleteRestaurants = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids, permanent = false } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, 'Restaurant IDs are required');
    }

    // Get restaurant names for audit before deletion
    const restaurants = await Restaurant.find({ _id: { $in: ids } }).select('name');
    const restaurantNames = restaurants.map((r) => r.name).join(', ');

    if (permanent) {
      // Permanent delete - cascade delete all related data
      await Promise.all([
        Order.deleteMany({ restaurantId: { $in: ids } }),
        Dish.deleteMany({ restaurantId: { $in: ids } }),
        Category.deleteMany({ restaurantId: { $in: ids } }),
        User.updateMany({ restaurantId: { $in: ids } }, { $unset: { restaurantId: 1 } }),
        Restaurant.deleteMany({ _id: { $in: ids } }),
      ]);

      await logBulkAction(
        req,
        'restaurant',
        ids,
        'delete',
        `Permanently deleted ${ids.length} restaurants: ${restaurantNames}`
      );

      res.json({
        success: true,
        message: `${ids.length} restaurant(s) and all related data permanently deleted`,
      });
    } else {
      // Soft delete (deactivate)
      const result = await Restaurant.updateMany({ _id: { $in: ids } }, { isActive: false });

      await logBulkAction(
        req,
        'restaurant',
        ids,
        'status_change',
        `Soft deleted (deactivated) ${result.modifiedCount} restaurants: ${restaurantNames}`
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} restaurant(s) deactivated successfully`,
        data: {
          modified: result.modifiedCount,
        },
      });
    }
  }
);

/**
 * Bulk export restaurants to CSV/JSON
 */
export const bulkExportRestaurants = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids, format = 'json' } = req.body;

    // If no IDs provided, export all
    const query = ids && Array.isArray(ids) && ids.length > 0 ? { _id: { $in: ids } } : {};

    const restaurants = await Restaurant.find(query)
      .populate('ownerId', 'name email')
      .lean();

    // Get stats for each restaurant
    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const [orderCount, dishCount, revenue] = await Promise.all([
          Order.countDocuments({ restaurantId: restaurant._id }),
          Dish.countDocuments({ restaurantId: restaurant._id }),
          Order.aggregate([
            { $match: { restaurantId: restaurant._id, status: { $in: ['completed', 'paid'] } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
          ]),
        ]);

        return {
          id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
          email: restaurant.email,
          phone: restaurant.phone,
          address: restaurant.address,
          isActive: restaurant.isActive,
          ownerName: (restaurant.ownerId as { name?: string })?.name || '',
          ownerEmail: (restaurant.ownerId as { email?: string })?.email || '',
          orderCount,
          dishCount,
          totalRevenue: revenue[0]?.total || 0,
          createdAt: restaurant.createdAt,
        };
      })
    );

    await logBulkAction(
      req,
      'restaurant',
      ids || ['all'],
      'export',
      `Exported ${restaurantsWithStats.length} restaurants to ${format.toUpperCase()}`
    );

    if (format === 'csv') {
      const fields = [
        'id',
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'isActive',
        'ownerName',
        'ownerEmail',
        'orderCount',
        'dishCount',
        'totalRevenue',
        'createdAt',
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(restaurantsWithStats);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=restaurants.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: restaurantsWithStats,
        meta: {
          total: restaurantsWithStats.length,
          exportedAt: new Date().toISOString(),
        },
      });
    }
  }
);

// ============================================
// User Bulk Operations
// ============================================

/**
 * Bulk update user status (activate/deactivate)
 */
export const bulkUpdateUserStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids, isActive, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, 'User IDs are required');
    }

    if (typeof isActive !== 'boolean') {
      throw new ApiError(400, 'isActive must be a boolean');
    }

    // Don't allow deactivating super admins
    const superAdmins = await User.countDocuments({
      _id: { $in: ids },
      role: 'superadmin',
    });

    if (superAdmins > 0 && !isActive) {
      throw new ApiError(400, 'Cannot deactivate super admin accounts');
    }

    const result = await User.updateMany({ _id: { $in: ids } }, { isActive });

    // Get user names for audit
    const users = await User.find({ _id: { $in: ids } }).select('name email');
    const userNames = users.map((u) => `${u.name} (${u.email})`).join(', ');

    await logBulkAction(
      req,
      'user',
      ids,
      'status_change',
      `Bulk ${isActive ? 'activated' : 'deactivated'} ${result.modifiedCount} users: ${userNames}${reason ? `. Reason: ${reason}` : ''}`
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} user(s) ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        modified: result.modifiedCount,
        matched: result.matchedCount,
      },
    });
  }
);

/**
 * Bulk delete users
 */
export const bulkDeleteUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, 'User IDs are required');
    }

    // Don't allow deleting super admins
    const superAdmins = await User.countDocuments({
      _id: { $in: ids },
      role: 'superadmin',
    });

    if (superAdmins > 0) {
      throw new ApiError(400, 'Cannot delete super admin accounts');
    }

    // Don't allow deleting yourself
    if (req.user && ids.includes(req.user._id.toString())) {
      throw new ApiError(400, 'Cannot delete your own account');
    }

    // Get user info for audit before deletion
    const users = await User.find({ _id: { $in: ids } }).select('name email');
    const userNames = users.map((u) => `${u.name} (${u.email})`).join(', ');

    const result = await User.deleteMany({ _id: { $in: ids } });

    await logBulkAction(
      req,
      'user',
      ids,
      'delete',
      `Deleted ${result.deletedCount} users: ${userNames}`
    );

    res.json({
      success: true,
      message: `${result.deletedCount} user(s) deleted successfully`,
    });
  }
);

/**
 * Bulk export users to CSV/JSON
 */
export const bulkExportUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids, format = 'json' } = req.body;

    // If no IDs provided, export all (except super admins for security)
    const query: Record<string, unknown> =
      ids && Array.isArray(ids) && ids.length > 0
        ? { _id: { $in: ids } }
        : { role: { $ne: 'superadmin' } };

    const users = await User.find(query)
      .select('-password -refreshTokens')
      .populate('restaurantId', 'name')
      .lean();

    const exportData = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      restaurantName: (user.restaurantId as { name?: string })?.name || '',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || user.updatedAt,
    }));

    await logBulkAction(
      req,
      'user',
      ids || ['all'],
      'export',
      `Exported ${exportData.length} users to ${format.toUpperCase()}`
    );

    if (format === 'csv') {
      const fields = [
        'id',
        'name',
        'email',
        'role',
        'isActive',
        'restaurantName',
        'createdAt',
        'lastLogin',
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(exportData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: exportData,
        meta: {
          total: exportData.length,
          exportedAt: new Date().toISOString(),
        },
      });
    }
  }
);

// ============================================
// Subscription Bulk Operations
// ============================================

/**
 * Bulk extend subscriptions
 */
export const bulkExtendSubscriptions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids, days, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, 'Subscription IDs are required');
    }

    if (!days || typeof days !== 'number' || days <= 0) {
      throw new ApiError(400, 'Days must be a positive number');
    }

    // Get subscriptions
    const subscriptions = await Subscription.find({ _id: { $in: ids } });

    if (subscriptions.length === 0) {
      throw new ApiError(404, 'No subscriptions found');
    }

    // Extend each subscription
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const currentEndDate = new Date(sub.currentPeriodEnd);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + days);

        sub.currentPeriodEnd = newEndDate;
        await sub.save();

        return {
          id: sub._id,
          restaurantId: sub.restaurantId,
          oldEndDate: currentEndDate,
          newEndDate,
        };
      })
    );

    await logBulkAction(
      req,
      'subscription',
      ids,
      'update',
      `Extended ${results.length} subscriptions by ${days} days${reason ? `. Reason: ${reason}` : ''}`
    );

    res.json({
      success: true,
      message: `${results.length} subscription(s) extended by ${days} days`,
      data: results,
    });
  }
);

/**
 * Bulk cancel subscriptions
 */
export const bulkCancelSubscriptions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, 'Subscription IDs are required');
    }

    const result = await Subscription.updateMany(
      { _id: { $in: ids } },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason || 'Bulk cancellation by super admin',
      }
    );

    await logBulkAction(
      req,
      'subscription',
      ids,
      'status_change',
      `Cancelled ${result.modifiedCount} subscriptions${reason ? `. Reason: ${reason}` : ''}`
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} subscription(s) cancelled`,
      data: {
        modified: result.modifiedCount,
      },
    });
  }
);

// ============================================
// Customer Bulk Operations
// ============================================

/**
 * Bulk export customers to CSV/JSON
 */
export const bulkExportCustomers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId, format = 'json' } = req.body;

    const query: Record<string, unknown> = {};
    if (restaurantId) {
      query.restaurantId = restaurantId;
    }

    const customers = await Customer.find(query)
      .populate('restaurantId', 'name')
      .lean();

    const exportData = customers.map((customer) => ({
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      loyaltyPoints: customer.loyalty?.totalPoints || 0,
      totalOrders: customer.totalOrders || 0,
      restaurantName: (customer.restaurantId as { name?: string })?.name || '',
      createdAt: customer.createdAt,
    }));

    await logBulkAction(
      req,
      'user',
      restaurantId ? [restaurantId] : ['all'],
      'export',
      `Exported ${exportData.length} customers to ${format.toUpperCase()}`
    );

    if (format === 'csv') {
      const fields = [
        'id',
        'name',
        'phone',
        'email',
        'loyaltyPoints',
        'totalOrders',
        'restaurantName',
        'createdAt',
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(exportData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: exportData,
        meta: {
          total: exportData.length,
          exportedAt: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * Bulk export orders to CSV/JSON
 */
export const bulkExportOrders = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId, startDate, endDate, format = 'json' } = req.body;

    const query: Record<string, unknown> = {};
    if (restaurantId) {
      query.restaurantId = restaurantId;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {(query.createdAt as Record<string, Date>).$gte = new Date(startDate);}
      if (endDate) {(query.createdAt as Record<string, Date>).$lte = new Date(endDate);}
    }

    const orders = await Order.find(query)
      .populate('restaurantId', 'name')
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10000) // Limit to prevent memory issues
      .lean();

    const exportData = orders.map((order) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      restaurantName: (order.restaurantId as { name?: string })?.name || '',
      customerName: (order.customerId as { name?: string })?.name || 'Guest',
      customerPhone: (order.customerId as { phone?: string })?.phone || '',
      status: order.status,
      totalAmount: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      tableNumber: order.tableNumber,
      itemCount: order.items?.length || 0,
      createdAt: order.createdAt,
    }));

    await logBulkAction(
      req,
      'order',
      restaurantId ? [restaurantId] : ['all'],
      'export',
      `Exported ${exportData.length} orders to ${format.toUpperCase()}`
    );

    if (format === 'csv') {
      const fields = [
        'id',
        'orderNumber',
        'restaurantName',
        'customerName',
        'customerPhone',
        'status',
        'totalAmount',
        'paymentMethod',
        'paymentStatus',
        'tableNumber',
        'itemCount',
        'createdAt',
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(exportData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: exportData,
        meta: {
          total: exportData.length,
          exportedAt: new Date().toISOString(),
        },
      });
    }
  }
);
