import { Request, Response } from 'express';
import { DeliveryDriver, IDeliveryDriver } from '../models/DeliveryDriver.js';
import { DriverShift } from '../models/DriverShift.js';
import { DriverPayout } from '../models/DriverPayout.js';
import { Delivery } from '../models/Delivery.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

// ============================================
// Driver Registration & Authentication
// ============================================

/**
 * Register a new delivery driver
 * POST /api/drivers/register
 */
export const registerDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      phone,
      firstName,
      lastName,
      vehicleType,
      vehiclePlate,
      dateOfBirth,
      address,
      emergencyContact,
    } = req.body;

    // Check if driver already exists
    const existingDriver = await DeliveryDriver.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingDriver) {
      res.status(400).json({
        success: false,
        message: 'Un livreur avec cet email ou téléphone existe déjà',
      });
      return;
    }

    // Hash password (using config for consistent rounds across all models)
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create driver
    const driver = new DeliveryDriver({
      email,
      passwordHash,
      phone,
      firstName,
      lastName,
      vehicleType,
      vehiclePlate,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
      emergencyContact,
      status: 'pending',
      shiftStatus: 'offline',
    });

    await driver.save();

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. En attente de vérification.',
      data: {
        id: driver._id,
        email: driver.email,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
    });
  }
};

/**
 * Driver login
 * POST /api/drivers/login
 */
export const loginDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find driver
    const driver = await DeliveryDriver.findOne({ email }).select('+passwordHash');
    if (!driver) {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, driver.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
      return;
    }

    // Check if driver is verified
    if (driver.status === 'pending') {
      res.status(403).json({
        success: false,
        message: 'Votre compte est en attente de vérification',
      });
      return;
    }

    if (driver.status === 'suspended' || driver.status === 'deactivated') {
      res.status(403).json({
        success: false,
        message: 'Votre compte a été suspendu ou désactivé',
      });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      {
        driverId: driver._id,
        email: driver.email,
        role: 'delivery_driver',
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Update last login
    driver.lastLoginAt = new Date();
    await driver.save();

    res.json({
      success: true,
      data: {
        token,
        driver: {
          id: driver._id,
          email: driver.email,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phone: driver.phone,
          status: driver.status,
          shiftStatus: driver.shiftStatus,
          vehicleType: driver.vehicleType,
          rating: driver.stats?.averageRating || 0,
        },
      },
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
    });
  }
};

// ============================================
// Driver Management (Admin)
// ============================================

/**
 * Get all drivers (with filters)
 * GET /api/drivers
 */
export const getDrivers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      shiftStatus,
      vehicleType,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, unknown> = {};

    // Filters
    if (status) {
      query.status = status;
    }
    if (shiftStatus) {
      query.shiftStatus = shiftStatus;
    }
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === 'asc' ? 1 : -1,
    };

    const [drivers, total] = await Promise.all([
      DeliveryDriver.find(query)
        .select('-passwordHash')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      DeliveryDriver.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: drivers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livreurs',
    });
  }
};

/**
 * Get driver by ID
 * GET /api/drivers/:id
 */
export const getDriverById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const driver = await DeliveryDriver.findById(id).select('-passwordHash');
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    // Get additional stats
    const [activeShift, recentDeliveries, pendingPayout] = await Promise.all([
      DriverShift.findOne({ driverId: id, isActive: true }),
      Delivery.find({ driverId: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('deliveryNumber status createdAt completedAt'),
      DriverPayout.findOne({ driverId: id, status: 'pending' }),
    ]);

    res.json({
      success: true,
      data: {
        ...driver.toObject(),
        activeShift,
        recentDeliveries,
        pendingPayout,
      },
    });
  } catch (error) {
    console.error('Get driver by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du livreur',
    });
  }
};

/**
 * Update driver
 * PUT /api/drivers/:id
 */
export const updateDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Extract only allowed fields to prevent field injection
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'email', 'address', 'dateOfBirth',
      'vehicleType', 'vehiclePlate', 'profilePhoto', 'emergencyContact',
      'status', 'shiftStatus', 'isAvailable', 'preferences', 'bankAccount'
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const driver = await DeliveryDriver.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Livreur mis à jour',
      data: driver,
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du livreur',
    });
  }
};

/**
 * Verify/approve a driver
 * POST /api/drivers/:id/verify
 */
export const verifyDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approved, rejectionReason } = req.body;

    const driver = await DeliveryDriver.findById(id);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    if (approved) {
      driver.status = 'verified';
      driver.verifiedAt = new Date();
      driver.verifiedBy = req.user?._id;
      // Mark background check as passed
      driver.backgroundCheckStatus = 'passed';
      driver.backgroundCheckDate = new Date();
    } else {
      driver.status = 'deactivated';
      driver.deactivationReason = rejectionReason || 'Application rejected';
    }

    await driver.save();

    res.json({
      success: true,
      message: approved ? 'Livreur vérifié avec succès' : 'Livreur rejeté',
      data: {
        id: driver._id,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error('Verify driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du livreur',
    });
  }
};

/**
 * Suspend a driver
 * POST /api/drivers/:id/suspend
 */
export const suspendDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason: _reason } = req.body;  

    const driver = await DeliveryDriver.findById(id);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    // End any active shift
    const activeShift = await DriverShift.findOne({ driverId: id, isActive: true });
    if (activeShift) {
      // Use model method to end shift
      activeShift.isActive = false;
      activeShift.endedAt = new Date();
      activeShift.endReason = 'admin';
      await activeShift.save();
    }

    driver.status = 'suspended';
    driver.shiftStatus = 'offline';
    await driver.save();

    res.json({
      success: true,
      message: 'Livreur suspendu',
      data: {
        id: driver._id,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error('Suspend driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suspension du livreur',
    });
  }
};

/**
 * Reactivate a suspended driver
 * POST /api/drivers/:id/reactivate
 */
export const reactivateDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const driver = await DeliveryDriver.findById(id);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    if (driver.status !== 'suspended') {
      res.status(400).json({
        success: false,
        message: 'Le livreur n\'est pas suspendu',
      });
      return;
    }

    driver.status = 'verified';
    await driver.save();

    res.json({
      success: true,
      message: 'Livreur réactivé',
      data: {
        id: driver._id,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error('Reactivate driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réactivation du livreur',
    });
  }
};

/**
 * Delete a driver
 * DELETE /api/drivers/:id
 */
export const deleteDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check for active deliveries
    const activeDelivery = await Delivery.findOne({
      driverId: id,
      status: { $nin: ['delivered', 'cancelled', 'failed'] },
    });

    if (activeDelivery) {
      res.status(400).json({
        success: false,
        message: 'Impossible de supprimer: le livreur a des livraisons en cours',
      });
    }

    const driver = await DeliveryDriver.findByIdAndDelete(id);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
    }

    res.json({
      success: true,
      message: 'Livreur supprimé',
    });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du livreur',
    });
  }
};

/**
 * Get available drivers near a location
 * GET /api/drivers/available
 */
export const getAvailableDrivers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius = 5000, vehicleType } = req.query;

    if (!lat || !lng) {
      res.status(400).json({
        success: false,
        message: 'Latitude et longitude requises',
      });
    }

    const query: Record<string, unknown> = {
      status: 'verified',
      shiftStatus: 'online',
      isAvailable: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Number(radius),
        },
      },
    };

    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    const drivers = await DeliveryDriver.find(query)
      .select('firstName lastName phone vehicleType stats.averageRating currentLocation profilePhoto')
      .limit(20);

    res.json({
      success: true,
      data: drivers,
    });
  } catch (error) {
    console.error('Get available drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche des livreurs disponibles',
    });
  }
};

/**
 * Get driver statistics
 * GET /api/drivers/:id/stats
 */
export const getDriverStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const driver = await DeliveryDriver.findById(id).select('stats currentBalance lifetimeEarnings');
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    // Get delivery stats for date range
    const dateFilter: Record<string, unknown> = { driverId: id };
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        (dateFilter.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        (dateFilter.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
      }
    }

    const deliveryStats = await Delivery.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEarnings: { $sum: '$earnings.total' },
          totalTips: { $sum: '$earnings.tip' },
        },
      },
    ]);

    // Get shift stats
    const shiftStats = await DriverShift.aggregate([
      { $match: { driverId: new mongoose.Types.ObjectId(id), ...dateFilter } },
      {
        $group: {
          _id: null,
          totalShifts: { $sum: 1 },
          totalHours: { $sum: { $divide: ['$duration', 60] } },
          totalEarnings: { $sum: '$earnings.total' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        overall: driver.stats,
        earnings: {
          currentBalance: driver.currentBalance,
          lifetimeEarnings: driver.lifetimeEarnings,
        },
        rating: driver.stats?.averageRating || 0,
        deliveryStats,
        shiftStats: shiftStats[0] || {
          totalShifts: 0,
          totalHours: 0,
          totalEarnings: 0,
        },
      },
    });
  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
};

/**
 * Get pending driver applications
 * GET /api/drivers/pending
 */
export const getPendingDrivers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const drivers = await DeliveryDriver.find({ status: 'pending' })
      .select('-passwordHash')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: drivers,
      count: drivers.length,
    });
  } catch (error) {
    console.error('Get pending drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des candidatures',
    });
  }
};

/**
 * Upload driver document
 * POST /api/drivers/:id/documents
 */
export const uploadDriverDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, url, expiresAt } = req.body;

    // IDOR Protection: If user is a driver (not admin), they can only upload to their own profile
    const user = req.user as any;
    const isAdmin = user?.role === 'admin' || user?.role === 'owner';
    const driverId = user?.driverId;

    if (!isAdmin && driverId && driverId.toString() !== id) {
      res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que vos propres documents',
      });
      return;
    }

    // Valid document types
    const validTypes = ['idCard', 'driverLicense', 'vehicleRegistration', 'insurance', 'proofOfAddress'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Type de document invalide',
      });
      return;
    }

    const driver = await DeliveryDriver.findById(id);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    // Initialize documents if not exists
    if (!driver.documents) {
      driver.documents = {} as IDeliveryDriver['documents'];
    }

    // Update the specific document type
    (driver.documents as Record<string, unknown>)[type] = {
      url,
      verified: false,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };

    await driver.save();

    res.json({
      success: true,
      message: 'Document téléchargé',
      data: driver.documents,
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement du document',
    });
  }
};

/**
 * Verify driver document
 * POST /api/drivers/:id/documents/:docType/verify
 */
export const verifyDriverDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, docType } = req.params;
    const { verified, rejectionReason } = req.body;

    // Valid document types
    const validTypes = ['idCard', 'driverLicense', 'vehicleRegistration', 'insurance', 'proofOfAddress'];
    if (!validTypes.includes(docType)) {
      res.status(400).json({
        success: false,
        message: 'Type de document invalide',
      });
      return;
    }

    const driver = await DeliveryDriver.findById(id);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    const doc = driver.documents?.[docType as keyof IDeliveryDriver['documents']];
    if (!doc) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    doc.verified = verified;
    doc.verifiedAt = verified ? new Date() : undefined;
    doc.verifiedBy = req.user?._id;
    if (!verified && rejectionReason) {
      doc.rejectionReason = rejectionReason;
    }
    await driver.save();

    res.json({
      success: true,
      message: verified ? 'Document vérifié' : 'Document rejeté',
      data: doc,
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du document',
    });
  }
};

export default {
  registerDriver,
  loginDriver,
  getDrivers,
  getDriverById,
  updateDriver,
  verifyDriver,
  suspendDriver,
  reactivateDriver,
  deleteDriver,
  getAvailableDrivers,
  getDriverStats,
  getPendingDrivers,
  uploadDriverDocument,
  verifyDriverDocument,
};
