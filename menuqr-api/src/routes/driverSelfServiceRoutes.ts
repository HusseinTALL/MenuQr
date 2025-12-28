import { Router } from 'express';
import {
  startShift,
  endShift,
  startBreak,
  endBreak,
  getCurrentShift,
  updateLocation,
  getShiftHistory,
  getShiftById,
  getShiftStats,
} from '../controllers/driverShiftController.js';
import {
  getDriverEarnings,
  getDailyEarnings,
  getDriverPayouts,
  getPayoutById,
  requestInstantPayout,
  updateBankAccount,
} from '../controllers/driverPayoutController.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { Delivery } from '../models/Delivery.js';
import { authenticateDriver } from '../middleware/auth.js';

const router = Router();

// All routes require driver authentication
router.use(authenticateDriver);

// ============================================
// Profile Routes
// ============================================

// GET /api/driver/profile - Get driver's own profile
router.get('/profile', async (req, res) => {
  try {
    const driverId = (req as any).user.driverId;
    const driver = await DeliveryDriver.findById(driverId)
      .select('-passwordHash');

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Profil non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
    });
  }
});

// PUT /api/driver/profile - Update driver's own profile
router.put('/profile', async (req, res) => {
  try {
    const driverId = (req as any).user.driverId;
    const allowedUpdates = [
      'phone',
      'address',
      'emergencyContact',
      'vehicleType',
      'vehiclePlate',
      'photo',
      'preferences',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const driver = await DeliveryDriver.findByIdAndUpdate(
      driverId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Profil non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: driver,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
    });
  }
});

// ============================================
// Shift Routes
// ============================================

// POST /api/driver/shifts/start - Start a new shift
router.post('/shifts/start', startShift);

// POST /api/driver/shifts/end - End current shift
router.post('/shifts/end', endShift);

// POST /api/driver/shifts/break/start - Start a break
router.post('/shifts/break/start', startBreak);

// POST /api/driver/shifts/break/end - End a break
router.post('/shifts/break/end', endBreak);

// GET /api/driver/shifts/current - Get current active shift
router.get('/shifts/current', getCurrentShift);

// POST /api/driver/shifts/location - Update location during shift
router.post('/shifts/location', updateLocation);

// GET /api/driver/shifts/history - Get shift history
router.get('/shifts/history', getShiftHistory);

// GET /api/driver/shifts/stats - Get shift statistics
router.get('/shifts/stats', getShiftStats);

// GET /api/driver/shifts/:id - Get shift details
router.get('/shifts/:id', getShiftById);

// ============================================
// Delivery Routes
// ============================================

// GET /api/driver/deliveries - Get driver's deliveries
router.get('/deliveries', async (req, res) => {
  try {
    const driverId = (req as any).user.driverId;
    const { status, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { driverId };
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('restaurantId', 'name address phone'),
      Delivery.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: deliveries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get driver deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livraisons',
    });
  }
});

// GET /api/driver/deliveries/active - Get driver's active delivery
router.get('/deliveries/active', async (req, res) => {
  try {
    const driverId = (req as any).user.driverId;

    const activeDelivery = await Delivery.findOne({
      driverId,
      status: { $nin: ['delivered', 'cancelled', 'failed'] },
    })
      .populate('restaurantId', 'name address phone')
      .populate('orderId', 'orderNumber items total');

    res.json({
      success: true,
      data: activeDelivery,
    });
  } catch (error) {
    console.error('Get active delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la livraison active',
    });
  }
});

// GET /api/driver/deliveries/:id - Get delivery details
router.get('/deliveries/:id', async (req, res) => {
  try {
    const driverId = (req as any).user.driverId;
    const { id } = req.params;

    const delivery = await Delivery.findOne({ _id: id, driverId })
      .populate('restaurantId', 'name address phone')
      .populate('orderId');

    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la livraison',
    });
  }
});

// ============================================
// Earnings & Payouts Routes
// ============================================

// GET /api/driver/earnings - Get earnings summary
router.get('/earnings', getDriverEarnings);

// GET /api/driver/earnings/daily - Get daily earnings breakdown
router.get('/earnings/daily', getDailyEarnings);

// GET /api/driver/payouts - Get payout history
router.get('/payouts', getDriverPayouts);

// GET /api/driver/payouts/:id - Get payout details
router.get('/payouts/:id', getPayoutById);

// POST /api/driver/payouts/instant - Request instant payout
router.post('/payouts/instant', requestInstantPayout);

// PUT /api/driver/bank-account - Update bank account
router.put('/bank-account', updateBankAccount);

// ============================================
// Status & Availability Routes
// ============================================

// POST /api/driver/go-online - Go online
router.post('/go-online', async (req, res) => {
  try {
    const driverId = (req as any).user.driverId;
    const { location } = req.body;

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

    res.json({
      success: true,
      message: 'Vous êtes maintenant en ligne',
      data: {
        shiftStatus: driver.shiftStatus,
        isAvailable: driver.isAvailable,
      },
    });
  } catch (error) {
    console.error('Go online error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise en ligne',
    });
  }
});

// POST /api/driver/go-offline - Go offline
router.post('/go-offline', async (req, res) => {
  try {
    const driverId = (req as any).user.driverId;

    // Check for active delivery
    const activeDelivery = await Delivery.findOne({
      driverId,
      status: { $nin: ['delivered', 'cancelled', 'failed'] },
    });

    if (activeDelivery) {
      res.status(400).json({
        success: false,
        message: 'Vous avez une livraison en cours',
        data: { deliveryId: activeDelivery._id },
      });
      return;
    }

    const driver = await DeliveryDriver.findById(driverId);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    driver.shiftStatus = 'offline';
    driver.isAvailable = false;
    await driver.save();

    res.json({
      success: true,
      message: 'Vous êtes maintenant hors ligne',
      data: {
        shiftStatus: driver.shiftStatus,
        isAvailable: driver.isAvailable,
      },
    });
  } catch (error) {
    console.error('Go offline error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise hors ligne',
    });
  }
});

// POST /api/driver/update-location - Update current location
router.post('/update-location', updateLocation);

// GET /api/driver/stats - Get driver's overall stats
router.get('/stats', async (req, res) => {
  try {
    const driverId = (req as any).user.driverId;

    const driver = await DeliveryDriver.findById(driverId)
      .select('stats earnings rating');

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        stats: driver.stats,
        earnings: {
          currentBalance: driver.currentBalance,
          lifetimeEarnings: driver.lifetimeEarnings,
        },
        rating: driver.stats?.averageRating || 0,
      },
    });
  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
});

export default router;
