import { Request, Response } from 'express';
import { DriverShift, IDriverShift, ShiftEndReason } from '../models/DriverShift.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { Delivery } from '../models/Delivery.js';
import mongoose from 'mongoose';

// Helper function to cast shift documents to include methods
const asShiftWithMethods = (shift: IDriverShift) => shift as unknown as {
  endShift: (reason: ShiftEndReason, location?: { lat: number; lng: number }) => Promise<IDriverShift>;
  startBreak: (reason?: string) => Promise<IDriverShift>;
  endBreak: () => Promise<IDriverShift>;
  addLocationSnapshot: (lat: number, lng: number) => Promise<IDriverShift>;
};

// ============================================
// Driver Self-Service (Shift Management)
// ============================================

/**
 * Start a new shift
 * POST /api/driver/shifts/start
 */
export const startShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { location, goals } = req.body;

    // Check if driver exists and is verified
    const driver = await DeliveryDriver.findById(driverId);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    if (driver.status !== 'verified') {
      res.status(403).json({
        success: false,
        message: 'Votre compte n\'est pas vérifié',
      });
      return;
    }

    // Check for existing active shift
    const existingShift = await DriverShift.findOne({
      driverId,
      isActive: true,
    });

    if (existingShift) {
      res.status(400).json({
        success: false,
        message: 'Vous avez déjà un shift actif',
        data: { shiftId: existingShift._id },
      });
      return;
    }

    // Create new shift
    const shift = new DriverShift({
      driverId,
      startedAt: new Date(),
      isActive: true,
      startLocation: location ? {
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date(),
      } : undefined,
      goals: goals ? {
        deliveryTarget: goals.deliveryTarget,
        earningsTarget: goals.earningsTarget,
        achievedDeliveries: 0,
        achievedEarnings: 0,
      } : undefined,
    });

    await shift.save();

    // Update driver status
    driver.shiftStatus = 'online';
    driver.isAvailable = true;
    if (location) {
      driver.currentLocation = {
        type: 'Point',
        coordinates: [location.lng, location.lat],
        updatedAt: new Date(),
      };
    }
    await driver.save();

    res.status(201).json({
      success: true,
      message: 'Shift démarré',
      data: {
        shiftId: shift._id,
        startedAt: shift.startedAt,
        goals: shift.goals,
      },
    });
  } catch (error) {
    console.error('Start shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage du shift',
    });
  }
};

/**
 * End current shift
 * POST /api/driver/shifts/end
 */
export const endShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { location, notes } = req.body;

    // Find active shift
    const shift = await DriverShift.findOne({
      driverId,
      isActive: true,
    });

    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Aucun shift actif trouvé',
      });
      return;
    }

    // Check for ongoing deliveries
    const activeDelivery = await Delivery.findOne({
      driverId,
      status: { $nin: ['delivered', 'cancelled', 'failed'] },
    });

    if (activeDelivery) {
      res.status(400).json({
        success: false,
        message: 'Vous avez une livraison en cours. Terminez-la avant de finir votre shift.',
        data: { deliveryId: activeDelivery._id },
      });
      return;
    }

    // End shift using model method
    await asShiftWithMethods(shift).endShift('manual', location);

    if (notes) {
      shift.notes = notes;
      await shift.save();
    }

    // Update driver status
    const driver = await DeliveryDriver.findById(driverId);
    if (driver) {
      driver.shiftStatus = 'offline';
      driver.isAvailable = false;
      await driver.save();
    }

    res.json({
      success: true,
      message: 'Shift terminé',
      data: {
        shiftId: shift._id,
        duration: shift.duration,
        stats: shift.stats,
        earnings: shift.earnings,
      },
    });
  } catch (error) {
    console.error('End shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la fin du shift',
    });
  }
};

/**
 * Start a break
 * POST /api/driver/shifts/break/start
 */
export const startBreak = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { reason } = req.body;

    // Find active shift
    const shift = await DriverShift.findOne({
      driverId,
      isActive: true,
    });

    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Aucun shift actif trouvé',
      });
      return;
    }

    // Check for ongoing deliveries
    const activeDelivery = await Delivery.findOne({
      driverId,
      status: { $nin: ['delivered', 'cancelled', 'failed'] },
    });

    if (activeDelivery) {
      res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas prendre de pause pendant une livraison',
      });
      return;
    }

    try {
      await asShiftWithMethods(shift).startBreak(reason);
    } catch (err: unknown) {
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      });
      return;
    }

    // Update driver status
    const driver = await DeliveryDriver.findById(driverId);
    if (driver) {
      driver.shiftStatus = 'on_break';
      driver.isAvailable = false;
      await driver.save();
    }

    res.json({
      success: true,
      message: 'Pause démarrée',
      data: {
        breakStartedAt: shift.currentBreakStartedAt,
      },
    });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la pause',
    });
  }
};

/**
 * End a break
 * POST /api/driver/shifts/break/end
 */
export const endBreak = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;

    // Find active shift
    const shift = await DriverShift.findOne({
      driverId,
      isActive: true,
    });

    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Aucun shift actif trouvé',
      });
      return;
    }

    try {
      await asShiftWithMethods(shift).endBreak();
    } catch (err: unknown) {
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      });
      return;
    }

    // Update driver status
    const driver = await DeliveryDriver.findById(driverId);
    if (driver) {
      driver.shiftStatus = 'online';
      driver.isAvailable = true;
      await driver.save();
    }

    // Get last break duration
    const lastBreak = shift.breaks[shift.breaks.length - 1];

    res.json({
      success: true,
      message: 'Pause terminée',
      data: {
        breakDuration: lastBreak?.duration,
        totalBreakTime: shift.stats.totalBreakTime,
      },
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la fin de la pause',
    });
  }
};

/**
 * Get current active shift
 * GET /api/driver/shifts/current
 */
export const getCurrentShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;

    const shift = await DriverShift.findOne({
      driverId,
      isActive: true,
    });

    if (!shift) {
      res.json({
        success: true,
        data: null,
        message: 'Aucun shift actif',
      });
      return;
    }

    // Calculate current duration
    const now = new Date();
    const duration = Math.round((now.getTime() - shift.startedAt.getTime()) / 60000);
    const totalBreakTime = shift.breaks.reduce((total, brk) => {
      if (brk.endedAt) {
        return total + (brk.duration || 0);
      } else {
        // Ongoing break
        return total + Math.round((now.getTime() - brk.startedAt.getTime()) / 60000);
      }
    }, 0);

    res.json({
      success: true,
      data: {
        ...shift.toObject(),
        currentDuration: duration,
        currentActiveTime: duration - totalBreakTime,
        isOnBreak: !!shift.currentBreakStartedAt,
      },
    });
  } catch (error) {
    console.error('Get current shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du shift',
    });
  }
};

/**
 * Update location during shift
 * POST /api/driver/shifts/location
 */
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { lat, lng } = req.body;

    // Update driver location
    const driver = await DeliveryDriver.findById(driverId);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    driver.currentLocation = {
      type: 'Point',
      coordinates: [lng, lat],
      updatedAt: new Date(),
    };
    await driver.save();

    // Add location snapshot to active shift
    const shift = await DriverShift.findOne({
      driverId,
      isActive: true,
    });

    if (shift) {
      await asShiftWithMethods(shift).addLocationSnapshot(lat, lng);
    }

    res.json({
      success: true,
      message: 'Position mise à jour',
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la position',
    });
  }
};

/**
 * Get shift history
 * GET /api/driver/shifts/history
 */
export const getShiftHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const query: Record<string, unknown> = { driverId };

    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) {
        (query.startedAt as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        (query.startedAt as Record<string, Date>).$lte = new Date(endDate as string);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [shifts, total] = await Promise.all([
      DriverShift.find(query)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-locationSnapshots'), // Exclude large array for list view
      DriverShift.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: shifts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get shift history error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
    });
  }
};

/**
 * Get shift by ID
 * GET /api/driver/shifts/:id
 */
export const getShiftById = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { id } = req.params;

    const shift = await DriverShift.findOne({
      _id: id,
      driverId,
    }).populate('deliveryIds', 'deliveryNumber status earnings');

    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Shift non trouvé',
      });
    }

    res.json({
      success: true,
      data: shift,
    });
  } catch (error) {
    console.error('Get shift by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du shift',
    });
  }
};

/**
 * Get shift statistics
 * GET /api/driver/shifts/stats
 */
export const getShiftStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { period = 'week' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    const stats = await DriverShift.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          startedAt: { $gte: startDate },
          isActive: false, // Only completed shifts
        },
      },
      {
        $group: {
          _id: null,
          totalShifts: { $sum: 1 },
          totalHours: { $sum: { $divide: ['$duration', 60] } },
          totalActiveHours: { $sum: { $divide: ['$stats.totalActiveTime', 60] } },
          totalBreakHours: { $sum: { $divide: ['$stats.totalBreakTime', 60] } },
          totalDeliveries: { $sum: '$stats.completedDeliveries' },
          totalDistance: { $sum: '$stats.totalDistance' },
          totalEarnings: { $sum: '$earnings.total' },
          totalTips: { $sum: '$earnings.tips' },
          avgDeliveriesPerShift: { $avg: '$stats.completedDeliveries' },
          avgEarningsPerShift: { $avg: '$earnings.total' },
          avgDeliveryTime: { $avg: '$stats.averageDeliveryTime' },
        },
      },
    ]);

    // Daily breakdown
    const dailyStats = await DriverShift.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          startedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
          shifts: { $sum: 1 },
          hours: { $sum: { $divide: ['$duration', 60] } },
          deliveries: { $sum: '$stats.completedDeliveries' },
          earnings: { $sum: '$earnings.total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        period,
        summary: stats[0] || {
          totalShifts: 0,
          totalHours: 0,
          totalActiveHours: 0,
          totalBreakHours: 0,
          totalDeliveries: 0,
          totalDistance: 0,
          totalEarnings: 0,
          totalTips: 0,
          avgDeliveriesPerShift: 0,
          avgEarningsPerShift: 0,
          avgDeliveryTime: 0,
        },
        daily: dailyStats,
      },
    });
  } catch (error) {
    console.error('Get shift stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
};

// ============================================
// Admin Shift Management
// ============================================

/**
 * Get all shifts (admin)
 * GET /api/admin/shifts
 */
export const getAllShifts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      driverId,
      isActive,
      date,
      page = 1,
      limit = 20,
    } = req.query;

    const query: Record<string, unknown> = {};

    if (driverId) {
      query.driverId = driverId;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      query.startedAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [shifts, total] = await Promise.all([
      DriverShift.find(query)
        .populate('driverId', 'firstName lastName phone vehicleType')
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-locationSnapshots'),
      DriverShift.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: shifts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des shifts',
    });
  }
};

/**
 * Force end a driver's shift (admin)
 * POST /api/admin/shifts/:id/end
 */
export const forceEndShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const shift = await DriverShift.findById(id);
    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Shift non trouvé',
      });
      return;
    }

    if (!shift.isActive) {
      res.status(400).json({
        success: false,
        message: 'Ce shift est déjà terminé',
      });
      return;
    }

    await asShiftWithMethods(shift).endShift('admin');
    shift.adminNotes = reason || 'Terminé par l\'administrateur';
    await shift.save();

    // Update driver status
    const driver = await DeliveryDriver.findById(shift.driverId);
    if (driver) {
      driver.shiftStatus = 'offline';
      driver.isAvailable = false;
      await driver.save();
    }

    res.json({
      success: true,
      message: 'Shift terminé par l\'administrateur',
      data: {
        shiftId: shift._id,
        endedAt: shift.endedAt,
      },
    });
  } catch (error) {
    console.error('Force end shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la terminaison du shift',
    });
  }
};

/**
 * Get active drivers with their shifts (admin dashboard)
 * GET /api/admin/shifts/active-drivers
 */
export const getActiveDriversWithShifts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const activeShifts = await DriverShift.find({ isActive: true })
      .populate('driverId', 'firstName lastName phone vehicleType currentLocation shiftStatus stats.averageRating')
      .sort({ startedAt: -1 });

    const driversWithShifts = activeShifts.map(shift => ({
      driver: shift.driverId,
      shift: {
        id: shift._id,
        startedAt: shift.startedAt,
        duration: Math.round((Date.now() - shift.startedAt.getTime()) / 60000),
        isOnBreak: !!shift.currentBreakStartedAt,
        stats: shift.stats,
        earnings: shift.earnings,
      },
    }));

    res.json({
      success: true,
      data: driversWithShifts,
      count: driversWithShifts.length,
    });
  } catch (error) {
    console.error('Get active drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livreurs actifs',
    });
  }
};

export default {
  // Driver self-service
  startShift,
  endShift,
  startBreak,
  endBreak,
  getCurrentShift,
  updateLocation,
  getShiftHistory,
  getShiftById,
  getShiftStats,
  // Admin
  getAllShifts,
  forceEndShift,
  getActiveDriversWithShifts,
};
