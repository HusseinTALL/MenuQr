/**
 * GDPR Service
 * Handles data export and deletion for GDPR compliance
 * - Right to data portability (Article 20)
 * - Right to erasure / Right to be forgotten (Article 17)
 */

import mongoose from 'mongoose';
import {
  User,
  Customer,
  Order,
  Review,
  Reservation,
  LoginHistory,
  AuditLog,
  Restaurant,
} from '../models/index.js';
import * as auditService from './auditService.js';
import logger from '../utils/logger.js';

// Data export types
export interface UserDataExport {
  exportedAt: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
    lastLogin: string | null;
    twoFactorEnabled: boolean;
  };
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
  loginHistory: Array<{
    date: string;
    ipAddress: string | undefined;
    device: string | undefined;
    status: string;
  }>;
  auditLogs: Array<{
    date: string;
    action: string;
    category: string;
    description: string;
  }>;
}

export interface CustomerDataExport {
  exportedAt: string;
  expiresAt: string;
  customer: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    createdAt: string;
    lastOrderAt: string | null;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    date: string;
    status: string;
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  }>;
  reviews: Array<{
    id: string;
    date: string;
    rating: number;
    comment: string | null;
    status: string;
  }>;
  reservations: Array<{
    id: string;
    date: string;
    partySize: number;
    status: string;
  }>;
  loyaltyPoints: number;
}

export interface DeletionResult {
  success: boolean;
  deletedData: {
    user?: boolean;
    customer?: boolean;
    orders?: number;
    reviews?: number;
    reservations?: number;
    loginHistory?: number;
    auditLogs?: number;
  };
  errors: string[];
}

/**
 * Export user data (for admin/staff users)
 */
export const exportUserData = async (
  userId: string,
  requestedBy: { _id: mongoose.Types.ObjectId; email: string; name: string; role: string }
): Promise<UserDataExport> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user's restaurant if they have one
    let restaurant = null;
    if (user.restaurantId) {
      restaurant = await Restaurant.findById(user.restaurantId);
    }

    // Get login history (last 100)
    const loginHistory = await LoginHistory.find({ userId })
      .sort({ loginAt: -1 })
      .limit(100);

    // Get audit logs for this user (last 100)
    const auditLogs = await AuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);

    const exportData: UserDataExport = {
      exportedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString() || null,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      restaurant: restaurant ? {
        id: restaurant._id.toString(),
        name: restaurant.name,
        slug: restaurant.slug,
        createdAt: restaurant.createdAt.toISOString(),
      } : undefined,
      loginHistory: loginHistory.map((l) => ({
        date: l.loginAt.toISOString(),
        ipAddress: l.ipAddress,
        device: l.device?.browser ? `${l.device.browser} on ${l.device.os}` : undefined,
        status: l.status,
      })),
      auditLogs: auditLogs.map((a) => ({
        date: a.createdAt.toISOString(),
        action: a.action,
        category: a.category,
        description: a.description,
      })),
    };

    // Audit the export
    await auditService.auditDataExport(
      requestedBy,
      'user',
      1 // Single user record
    );

    logger.info('User data exported', { userId, requestedBy: requestedBy._id });

    return exportData;
  } catch (error) {
    logger.error('Failed to export user data', { error, userId });
    throw error;
  }
};

/**
 * Export customer data (for restaurant customers)
 */
export const exportCustomerData = async (
  customerId: string,
  requestedBy?: { _id: mongoose.Types.ObjectId; email: string; name: string; role: string }
): Promise<CustomerDataExport> => {
  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get orders
    const orders = await Order.find({ customerId })
      .sort({ createdAt: -1 })
      .populate('items.dishId', 'name');

    // Get reviews
    const reviews = await Review.find({ customerId })
      .sort({ createdAt: -1 });

    // Get reservations
    const reservations = await Reservation.find({ customerId })
      .sort({ reservationDate: -1 });

    const exportData: CustomerDataExport = {
      exportedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      customer: {
        id: customer._id.toString(),
        phone: customer.phone,
        email: customer.email || null,
        name: customer.name || null,
        createdAt: customer.createdAt.toISOString(),
        lastOrderAt: customer.lastOrderAt?.toISOString() || null,
      },
      orders: orders.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        date: o.createdAt.toISOString(),
        status: o.status,
        total: o.total,
        items: o.items.map((item) => ({
          name: (item.dishId as unknown as { name: string })?.name || 'Unknown',
          quantity: item.quantity,
          price: item.price,
        })),
      })),
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        date: r.createdAt.toISOString(),
        rating: r.rating,
        comment: r.comment || null,
        status: r.status,
      })),
      reservations: reservations.map((r) => ({
        id: r._id.toString(),
        date: r.reservationDate.toISOString(),
        partySize: r.partySize,
        status: r.status,
      })),
      loyaltyPoints: customer.loyalty?.totalPoints || 0,
    };

    // Audit the export if requested by admin
    if (requestedBy) {
      await auditService.auditDataExport(
        requestedBy,
        'customer',
        1 // Single customer record
      );
    }

    logger.info('Customer data exported', { customerId });

    return exportData;
  } catch (error) {
    logger.error('Failed to export customer data', { error, customerId });
    throw error;
  }
};

/**
 * Delete user data (right to be forgotten)
 * This performs a soft delete by anonymizing the data
 */
export const deleteUserData = async (
  userId: string,
  requestedBy: { _id: mongoose.Types.ObjectId; email: string; name: string; role: string },
  hardDelete: boolean = false
): Promise<DeletionResult> => {
  const result: DeletionResult = {
    success: false,
    deletedData: {},
    errors: [],
  };

  try {
    const user = await User.findById(userId);
    if (!user) {
      result.errors.push('User not found');
      return result;
    }

    // Don't allow deleting superadmin
    if (user.role === 'superadmin') {
      result.errors.push('Cannot delete superadmin accounts');
      return result;
    }

    // Store user info for audit before deletion
    const userEmail = user.email;
    const userName = user.name;

    if (hardDelete) {
      // Hard delete - actually remove data
      await User.findByIdAndDelete(userId);
      result.deletedData.user = true;

      // Delete login history
      const loginResult = await LoginHistory.deleteMany({ userId });
      result.deletedData.loginHistory = loginResult.deletedCount;

      // Anonymize audit logs (keep for compliance, but remove PII)
      await AuditLog.updateMany(
        { userId },
        {
          $set: {
            userName: '[DELETED USER]',
            userEmail: '[DELETED]',
          },
        }
      );
    } else {
      // Soft delete - anonymize the data
      const anonymizedEmail = `deleted_${userId}@deleted.local`;
      const anonymizedName = '[Deleted User]';

      await User.findByIdAndUpdate(userId, {
        email: anonymizedEmail,
        name: anonymizedName,
        password: 'DELETED',
        refreshToken: null,
        isActive: false,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: [],
        $unset: { customPermissions: 1 },
      });
      result.deletedData.user = true;

      // Anonymize login history
      await LoginHistory.updateMany(
        { userId },
        {
          $set: {
            userEmail: anonymizedEmail,
            userName: anonymizedName,
            ipAddress: '[REDACTED]',
            userAgent: '[REDACTED]',
          },
        }
      );
      const loginCount = await LoginHistory.countDocuments({ userId });
      result.deletedData.loginHistory = loginCount;
    }

    // Audit the deletion
    await auditService.auditDelete(
      'user',
      requestedBy,
      { type: 'User', id: new mongoose.Types.ObjectId(userId), name: userName },
      `GDPR deletion request for user "${userName}" (${userEmail})`
    );

    logger.info('User data deleted (GDPR)', { userId, hardDelete, requestedBy: requestedBy._id });

    result.success = true;
    return result;
  } catch (error) {
    logger.error('Failed to delete user data', { error, userId });
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
};

/**
 * Delete customer data (right to be forgotten)
 */
export const deleteCustomerData = async (
  customerId: string,
  requestedBy: { _id: mongoose.Types.ObjectId; email: string; name: string; role: string },
  hardDelete: boolean = false
): Promise<DeletionResult> => {
  const result: DeletionResult = {
    success: false,
    deletedData: {},
    errors: [],
  };

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      result.errors.push('Customer not found');
      return result;
    }

    // Store customer info for audit before deletion
    const customerPhone = customer.phone;
    const customerName = customer.name || customer.phone;

    if (hardDelete) {
      // Hard delete orders (or anonymize to keep sales data)
      await Order.updateMany(
        { customerId },
        {
          $set: {
            customerName: '[DELETED CUSTOMER]',
            customerPhone: '[DELETED]',
            customerEmail: null,
          },
          $unset: { customerId: 1 },
        }
      );
      const orderCount = await Order.countDocuments({ customerId: null, customerName: '[DELETED CUSTOMER]' });
      result.deletedData.orders = orderCount;

      // Delete reviews
      const reviewResult = await Review.deleteMany({ customerId });
      result.deletedData.reviews = reviewResult.deletedCount;

      // Anonymize reservations
      await Reservation.updateMany(
        { customerId },
        {
          $set: {
            customerName: '[DELETED]',
            customerPhone: '[DELETED]',
            customerEmail: null,
          },
          $unset: { customerId: 1 },
        }
      );
      const reservationCount = await Reservation.countDocuments({ customerId: null, customerName: '[DELETED]' });
      result.deletedData.reservations = reservationCount;

      // Delete customer
      await Customer.findByIdAndDelete(customerId);
      result.deletedData.customer = true;
    } else {
      // Soft delete - anonymize the data
      const anonymizedPhone = `deleted_${customerId}`;

      await Customer.findByIdAndUpdate(customerId, {
        phone: anonymizedPhone,
        firstName: '[Deleted]',
        lastName: '[Customer]',
        email: null,
        isActive: false,
        loyaltyPoints: 0,
        refreshToken: null,
      });
      result.deletedData.customer = true;

      // Anonymize orders
      const orderResult = await Order.updateMany(
        { customerId },
        {
          $set: {
            customerName: '[Deleted Customer]',
            customerPhone: '[REDACTED]',
            customerEmail: null,
          },
        }
      );
      result.deletedData.orders = orderResult.modifiedCount;

      // Anonymize reviews
      const reviewResult = await Review.updateMany(
        { customerId },
        {
          $set: {
            customerName: '[Deleted Customer]',
          },
        }
      );
      result.deletedData.reviews = reviewResult.modifiedCount;

      // Anonymize reservations
      const reservationResult = await Reservation.updateMany(
        { customerId },
        {
          $set: {
            customerName: '[Deleted Customer]',
            customerPhone: '[REDACTED]',
            customerEmail: null,
          },
        }
      );
      result.deletedData.reservations = reservationResult.modifiedCount;
    }

    // Audit the deletion
    await auditService.auditDelete(
      'customer',
      requestedBy,
      { type: 'Customer', id: new mongoose.Types.ObjectId(customerId), name: customerName },
      `GDPR deletion request for customer "${customerName}" (${customerPhone})`
    );

    logger.info('Customer data deleted (GDPR)', { customerId, hardDelete, requestedBy: requestedBy._id });

    result.success = true;
    return result;
  } catch (error) {
    logger.error('Failed to delete customer data', { error, customerId });
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
};

/**
 * Get GDPR statistics for super admin dashboard
 */
export const getGDPRStats = async (): Promise<{
  totalDataExports: number;
  totalDeletionRequests: number;
  pendingDeletions: number;
  exportsByMonth: Array<{ month: string; count: number }>;
  deletionsByMonth: Array<{ month: string; count: number }>;
}> => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [exportStats, deletionStats] = await Promise.all([
      // Data exports
      AuditLog.aggregate([
        { $match: { action: 'data_export', createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      // Deletions
      AuditLog.aggregate([
        {
          $match: {
            action: 'delete',
            description: { $regex: /GDPR/i },
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const totalExports = exportStats.reduce((sum, s) => sum + s.count, 0);
    const totalDeletions = deletionStats.reduce((sum, s) => sum + s.count, 0);

    return {
      totalDataExports: totalExports,
      totalDeletionRequests: totalDeletions,
      pendingDeletions: 0, // Could track pending requests if needed
      exportsByMonth: exportStats.map((s) => ({
        month: `${s._id.year}-${String(s._id.month).padStart(2, '0')}`,
        count: s.count,
      })),
      deletionsByMonth: deletionStats.map((s) => ({
        month: `${s._id.year}-${String(s._id.month).padStart(2, '0')}`,
        count: s.count,
      })),
    };
  } catch (error) {
    logger.error('Failed to get GDPR stats', { error });
    return {
      totalDataExports: 0,
      totalDeletionRequests: 0,
      pendingDeletions: 0,
      exportsByMonth: [],
      deletionsByMonth: [],
    };
  }
};

export default {
  exportUserData,
  exportCustomerData,
  deleteUserData,
  deleteCustomerData,
  getGDPRStats,
};
