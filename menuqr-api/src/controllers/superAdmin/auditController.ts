import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuditLog, LoginHistory, SystemAlert } from '../../models/index.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

// ================== AUDIT LOGS ==================

/**
 * Get audit logs with pagination and filters
 */
export const getAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 50,
    category,
    action,
    userId,
    startDate,
    endDate,
    search,
    status,
  } = req.query;

  const query: Record<string, unknown> = {};

  if (category) {query.category = category;}
  if (action) {query.action = action;}
  if (status) {query.status = status;}
  if (userId) {
    if (mongoose.Types.ObjectId.isValid(userId as string)) {
      query.userId = new mongoose.Types.ObjectId(userId as string);
    }
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, unknown>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, unknown>).$lte = new Date(endDate as string);}
  }
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { userName: { $regex: search, $options: 'i' } },
      { userEmail: { $regex: search, $options: 'i' } },
      { targetName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      logs,
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
 * Get single audit log by ID
 */
export const getAuditLogById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid audit log ID',
    });
    return;
  }

  const log = await AuditLog.findById(id);

  if (!log) {
    res.status(404).json({
      success: false,
      message: 'Audit log not found',
    });
    return;
  }

  res.json({
    success: true,
    data: log,
  });
});

/**
 * Get audit log statistics
 */
export const getAuditLogStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Number(days));

  const [actionStats, categoryStats, statusStats, dailyStats, topUsers] = await Promise.all([
    // Stats by action
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Stats by category
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Stats by status
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Daily stats
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
          failureCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
    // Top active users
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Calculate totals
  const total = await AuditLog.countDocuments({ createdAt: { $gte: startDate } });

  res.json({
    success: true,
    data: {
      total,
      byAction: actionStats,
      byCategory: categoryStats,
      byStatus: statusStats,
      daily: dailyStats.map((d) => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        count: d.count,
        success: d.successCount,
        failure: d.failureCount,
      })),
      topUsers,
    },
  });
});

// ================== LOGIN HISTORY ==================

/**
 * Get login history with pagination and filters
 */
export const getLoginHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 50,
    userId,
    userEmail,
    status,
    startDate,
    endDate,
    ipAddress,
  } = req.query;

  const query: Record<string, unknown> = {};

  if (userId) {
    if (mongoose.Types.ObjectId.isValid(userId as string)) {
      query.userId = new mongoose.Types.ObjectId(userId as string);
    }
  }
  if (userEmail) {query.userEmail = { $regex: userEmail, $options: 'i' };}
  if (status) {query.status = status;}
  if (ipAddress) {query.ipAddress = { $regex: ipAddress, $options: 'i' };}
  if (startDate || endDate) {
    query.loginAt = {};
    if (startDate) {(query.loginAt as Record<string, unknown>).$gte = new Date(startDate as string);}
    if (endDate) {(query.loginAt as Record<string, unknown>).$lte = new Date(endDate as string);}
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [history, total] = await Promise.all([
    LoginHistory.find(query)
      .sort({ loginAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    LoginHistory.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      history,
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
 * Get login history for a specific user
 */
export const getUserLoginHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid user ID',
    });
    return;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [history, total] = await Promise.all([
    LoginHistory.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ loginAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    LoginHistory.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
  ]);

  res.json({
    success: true,
    data: {
      history,
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
 * Get login statistics
 */
export const getLoginStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Number(days));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    statusStats,
    dailyStats,
    deviceStats,
    topIPs,
    failureReasons,
    todayStats,
  ] = await Promise.all([
    // Stats by status
    LoginHistory.aggregate([
      { $match: { loginAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Daily stats
    LoginHistory.aggregate([
      { $match: { loginAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$loginAt' },
            month: { $month: '$loginAt' },
            day: { $dayOfMonth: '$loginAt' },
          },
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
    // Stats by device type
    LoginHistory.aggregate([
      { $match: { loginAt: { $gte: startDate } } },
      { $group: { _id: '$device.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Top IPs
    LoginHistory.aggregate([
      { $match: { loginAt: { $gte: startDate }, ipAddress: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // Failure reasons
    LoginHistory.aggregate([
      { $match: { loginAt: { $gte: startDate }, status: 'failed' } },
      { $group: { _id: '$failureReason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Today's stats
    LoginHistory.aggregate([
      { $match: { loginAt: { $gte: today } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          uniqueUsers: { $addToSet: '$userEmail' },
        },
      },
    ]),
  ]);

  // Calculate average session duration (for successful logins with logout)
  const avgDuration = await LoginHistory.aggregate([
    {
      $match: {
        loginAt: { $gte: startDate },
        status: 'success',
        logoutAt: { $exists: true, $ne: null },
      },
    },
    {
      $project: {
        duration: { $subtract: ['$logoutAt', '$loginAt'] },
      },
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' },
      },
    },
  ]);

  const todaySummary = todayStats[0] || { total: 0, success: 0, failed: 0, uniqueUsers: [] };

  res.json({
    success: true,
    data: {
      today: {
        total: todaySummary.total,
        success: todaySummary.success,
        failed: todaySummary.failed,
        uniqueUsers: todaySummary.uniqueUsers?.length || 0,
      },
      byStatus: statusStats,
      byDevice: deviceStats,
      daily: dailyStats.map((d) => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        total: d.total,
        success: d.success,
        failed: d.failed,
      })),
      topIPs,
      failureReasons,
      avgSessionDuration: avgDuration[0]?.avgDuration || 0,
    },
  });
});

// ================== SYSTEM ALERTS ==================

/**
 * Get system alerts with pagination and filters
 */
export const getSystemAlerts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 50,
    type,
    category,
    priority,
    isResolved,
    isAcknowledged,
    startDate,
    endDate,
  } = req.query;

  const query: Record<string, unknown> = {};

  if (type) {query.type = type;}
  if (category) {query.category = category;}
  if (priority) {query.priority = priority;}
  if (isResolved !== undefined) {query.isResolved = isResolved === 'true';}
  if (isAcknowledged !== undefined) {
    if (isAcknowledged === 'true') {
      query['acknowledgedBy.0'] = { $exists: true };
    } else {
      query.acknowledgedBy = { $size: 0 };
    }
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, unknown>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, unknown>).$lte = new Date(endDate as string);}
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [alerts, total] = await Promise.all([
    SystemAlert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    SystemAlert.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      alerts,
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
 * Get alert by ID
 */
export const getAlertById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid alert ID',
    });
    return;
  }

  const alert = await SystemAlert.findById(id);

  if (!alert) {
    res.status(404).json({
      success: false,
      message: 'Alert not found',
    });
    return;
  }

  res.json({
    success: true,
    data: alert,
  });
});

/**
 * Get alert statistics
 */
export const getAlertStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const [typeStats, categoryStats, priorityStats, unresolvedByPriority, recentAlerts] = await Promise.all([
    // Stats by type
    SystemAlert.aggregate([
      { $match: { isResolved: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    // Stats by category
    SystemAlert.aggregate([
      { $match: { isResolved: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    // Stats by priority
    SystemAlert.aggregate([
      { $match: { isResolved: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    // Unresolved by priority (for badges)
    SystemAlert.aggregate([
      { $match: { isResolved: false } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          unacknowledged: {
            $sum: { $cond: [{ $eq: [{ $size: '$acknowledgedBy' }, 0] }, 1, 0] },
          },
        },
      },
    ]),
    // Recent alerts (last 24h)
    SystemAlert.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
  ]);

  // Count totals
  const [totalUnresolved, totalResolved, totalCritical] = await Promise.all([
    SystemAlert.countDocuments({ isResolved: false }),
    SystemAlert.countDocuments({ isResolved: true }),
    SystemAlert.countDocuments({ isResolved: false, type: 'critical' }),
  ]);

  res.json({
    success: true,
    data: {
      total: {
        unresolved: totalUnresolved,
        resolved: totalResolved,
        critical: totalCritical,
        last24h: recentAlerts,
      },
      byType: typeStats,
      byCategory: categoryStats,
      byPriority: priorityStats,
      unresolvedByPriority: unresolvedByPriority.reduce(
        (acc, item) => {
          acc[item._id] = { count: item.count, unacknowledged: item.unacknowledged };
          return acc;
        },
        {} as Record<string, { count: number; unacknowledged: number }>
      ),
    },
  });
});

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid alert ID',
    });
    return;
  }

  const alert = await SystemAlert.findById(id);

  if (!alert) {
    res.status(404).json({
      success: false,
      message: 'Alert not found',
    });
    return;
  }

  // Check if already acknowledged by this user
  const alreadyAcknowledged = alert.acknowledgedBy.some(
    (a) => a.userId.toString() === user._id.toString()
  );

  if (alreadyAcknowledged) {
    res.status(400).json({
      success: false,
      message: 'Alert already acknowledged by you',
    });
    return;
  }

  alert.acknowledgedBy.push({
    userId: user._id,
    userName: user.name,
    acknowledgedAt: new Date(),
  });

  await alert.save();

  res.json({
    success: true,
    message: 'Alert acknowledged',
    data: alert,
  });
});

/**
 * Resolve an alert
 */
export const resolveAlert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { resolutionNote } = req.body;
  const user = req.user!;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid alert ID',
    });
    return;
  }

  const alert = await SystemAlert.findById(id);

  if (!alert) {
    res.status(404).json({
      success: false,
      message: 'Alert not found',
    });
    return;
  }

  if (alert.isResolved) {
    res.status(400).json({
      success: false,
      message: 'Alert is already resolved',
    });
    return;
  }

  alert.isResolved = true;
  alert.resolvedBy = user._id;
  alert.resolvedAt = new Date();
  alert.resolutionNote = resolutionNote;

  await alert.save();

  // Log the resolution
  await AuditLog.create({
    action: 'update',
    category: 'system',
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    targetType: 'SystemAlert',
    targetId: alert._id,
    targetName: alert.title,
    description: `Resolved system alert: ${alert.title}`,
    metadata: { resolutionNote },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
  });

  res.json({
    success: true,
    message: 'Alert resolved',
    data: alert,
  });
});

/**
 * Delete an alert
 */
export const deleteAlert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid alert ID',
    });
    return;
  }

  const alert = await SystemAlert.findById(id);

  if (!alert) {
    res.status(404).json({
      success: false,
      message: 'Alert not found',
    });
    return;
  }

  await alert.deleteOne();

  // Log the deletion
  await AuditLog.create({
    action: 'delete',
    category: 'system',
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    targetType: 'SystemAlert',
    targetId: alert._id,
    targetName: alert.title,
    description: `Deleted system alert: ${alert.title}`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
  });

  res.json({
    success: true,
    message: 'Alert deleted',
  });
});

/**
 * Create a test alert (for development/testing)
 */
export const createTestAlert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, category, priority, title, message } = req.body;

  const alert = await SystemAlert.create({
    type: type || 'info',
    category: category || 'system',
    priority: priority || 'low',
    title: title || 'Test Alert',
    message: message || 'This is a test alert for development purposes.',
    source: 'manual',
    metadata: { createdBy: req.user?.email },
  });

  res.status(201).json({
    success: true,
    message: 'Test alert created',
    data: alert,
  });
});
