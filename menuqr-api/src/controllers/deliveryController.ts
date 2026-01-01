import { Request, Response } from 'express';
import { Delivery, DeliveryStatus, PODType } from '../models/Delivery.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { Order } from '../models/Order.js';
import { Restaurant } from '../models/Restaurant.js';
import { routingService } from '../services/routingService.js';

// ============================================
// Delivery CRUD Operations
// ============================================

/**
 * Create a new delivery from an order
 * POST /api/deliveries
 */
export const createDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      orderId,
      deliveryInstructions,
      priority,
      scheduledPickupTime,
    } = req.body;

    // Get the order
    const order = await Order.findById(orderId).populate('restaurantId');
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
      return;
    }

    // Verify order is for delivery
    if (order.fulfillmentType !== 'delivery') {
      res.status(400).json({
        success: false,
        message: 'Cette commande n\'est pas une livraison',
      });
      return;
    }

    // Check if delivery already exists for this order
    const existingDelivery = await Delivery.findOne({ orderId });
    if (existingDelivery) {
      res.status(400).json({
        success: false,
        message: 'Une livraison existe déjà pour cette commande',
      });
      return;
    }

    // Get restaurant for pickup location
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé',
      });
      return;
    }

    // Create delivery
    const delivery = new Delivery({
      orderId: order._id,
      restaurantId: order.restaurantId,
      customerId: order.customerId,
      pickupAddress: {
        street: restaurant.address?.street || '',
        city: restaurant.address?.city || '',
        postalCode: restaurant.address?.postalCode || '',
        country: restaurant.address?.country || 'France',
        coordinates: {
          lat: restaurant.address?.coordinates?.lat || 0,
          lng: restaurant.address?.coordinates?.lng || 0,
        },
      },
      deliveryAddress: order.deliveryAddress,
      deliveryInstructions: deliveryInstructions || order.deliveryInstructions,
      isPriority: priority === 'high',
      status: 'pending',
      estimatedPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : undefined,
      estimatedDistance: 0,
      estimatedDuration: 30,
      statusHistory: [{
        event: 'created',
        timestamp: new Date(),
        note: 'Livraison créée',
      }],
    });

    await delivery.save();

    // Update order with delivery reference
    order.deliveryId = delivery._id;
    order.deliveryStatus = 'pending';
    await order.save();

    res.status(201).json({
      success: true,
      message: 'Livraison créée',
      data: delivery,
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la livraison',
    });
  }
};

/**
 * Get all deliveries (with filters)
 * GET /api/deliveries
 */
export const getDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      restaurantId,
      status,
      driverId,
      date,
      priority,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, unknown> = {};

    // Get user's restaurant if not superadmin
    const user = (req as any).user;
    if (user.role !== 'superadmin' && user.restaurantId) {
      query.restaurantId = user.restaurantId;
    } else if (restaurantId) {
      query.restaurantId = restaurantId;
    }

    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    if (driverId) {
      query.driverId = driverId;
    }
    if (priority === 'high') {
      query.isPriority = true;
    }
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === 'asc' ? 1 : -1,
    };

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate('driverId', 'firstName lastName phone vehicleType rating')
        .populate('orderId', 'orderNumber total items')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
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
    console.error('Get deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livraisons',
    });
  }
};

/**
 * Get delivery by ID
 * GET /api/deliveries/:id
 */
export const getDeliveryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id)
      .populate('driverId', 'firstName lastName phone vehicleType rating photo currentLocation')
      .populate('orderId')
      .populate('restaurantId', 'name phone address');

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
    console.error('Get delivery by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la livraison',
    });
  }
};

/**
 * Assign driver to delivery
 * POST /api/deliveries/:id/assign
 */
export const assignDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { driverId, autoAssign } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    if (delivery.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Cette livraison ne peut pas être assignée',
      });
      return;
    }

    let driver;

    if (autoAssign) {
      // Auto-assign nearest available driver
      const pickupCoords = delivery.pickupAddress.coordinates;
      if (!pickupCoords) {
        res.status(400).json({
          success: false,
          message: 'Coordonnées de pickup manquantes pour l\'auto-assignation',
        });
        return;
      }

      driver = await DeliveryDriver.findOne({
        status: 'verified',
        shiftStatus: 'online',
        isAvailable: true,
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [pickupCoords.lng, pickupCoords.lat],
            },
            $maxDistance: 10000, // 10km
          },
        },
      });

      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Aucun livreur disponible à proximité',
        });
        return;
      }
    } else {
      // Manual assignment
      if (!driverId) {
        res.status(400).json({
          success: false,
          message: 'ID du livreur requis',
        });
        return;
      }

      driver = await DeliveryDriver.findById(driverId);
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Livreur non trouvé',
        });
        return;
      }

      if (driver.status !== 'verified') {
        res.status(400).json({
          success: false,
          message: 'Ce livreur n\'est pas vérifié',
        });
        return;
      }
    }

    // Assign driver
    delivery.driverId = driver._id;
    delivery.status = 'assigned';
    delivery.assignedAt = new Date();
    delivery.assignmentAttempts += 1;
    delivery.statusHistory.push({
      event: 'assigned',
      timestamp: new Date(),
      note: `Assigné à ${driver.firstName} ${driver.lastName}`,
    });

    await delivery.save();

    // Update driver status
    driver.shiftStatus = 'on_delivery';
    driver.currentDeliveryId = delivery._id;
    await driver.save();

    // Update order delivery status
    await Order.findByIdAndUpdate(delivery.orderId, {
      deliveryStatus: 'assigned',
      driverInfo: {
        driverId: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        phone: driver.phone,
        photo: driver.profilePhoto,
        vehicleType: driver.vehicleType,
        rating: driver.stats?.averageRating || 0,
      },
    });

    res.json({
      success: true,
      message: 'Livreur assigné',
      data: {
        deliveryId: delivery._id,
        driver: {
          id: driver._id,
          name: `${driver.firstName} ${driver.lastName}`,
          phone: driver.phone,
          vehicleType: driver.vehicleType,
        },
      },
    });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation du livreur',
    });
  }
};

/**
 * Update delivery status
 * PUT /api/deliveries/:id/status
 */
export const updateDeliveryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, note: _note, location: _location } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Validate status transition
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      pending: ['assigned', 'cancelled'],
      assigned: ['accepted', 'cancelled'],
      accepted: ['arriving_restaurant', 'cancelled'],
      arriving_restaurant: ['at_restaurant', 'cancelled'],
      at_restaurant: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['arrived', 'failed'],
      arrived: ['delivered', 'failed'],
      delivered: [],
      failed: ['pending'], // Can retry
      cancelled: [],
      returned: [],
    };

    if (!validTransitions[delivery.status]?.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Transition de statut invalide: ${delivery.status} -> ${status}`,
      });
      return;
    }

    // Update status (pre-save hook handles statusHistory)
    delivery.previousStatus = delivery.status;
    delivery.status = status;

    // Handle specific status updates
    switch (status) {
      case 'accepted': {
        delivery.acceptedAt = new Date();
        // Estimate delivery time (simple calculation)
        const estimatedMinutes = 30;
        delivery.estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
        break;
      }

      case 'picked_up':
        delivery.actualPickupTime = new Date();
        break;

      case 'delivered':
        delivery.actualDeliveryTime = new Date();
        // Update driver stats
        if (delivery.driverId) {
          const driver = await DeliveryDriver.findById(delivery.driverId);
          if (driver) {
            driver.shiftStatus = 'online';
            driver.currentDeliveryId = undefined;
            driver.isAvailable = true;
            driver.stats.totalDeliveries += 1;
            driver.stats.completedDeliveries += 1;
            await driver.save();
          }
        }
        break;

      case 'failed':
      case 'cancelled':
        // Free up driver
        if (delivery.driverId) {
          const driver = await DeliveryDriver.findById(delivery.driverId);
          if (driver) {
            driver.shiftStatus = 'online';
            driver.currentDeliveryId = undefined;
            driver.isAvailable = true;
            if (status === 'cancelled') {
              driver.stats.cancelledDeliveries += 1;
            }
            await driver.save();
          }
        }
        break;
    }

    await delivery.save();

    // Update order delivery status
    await Order.findByIdAndUpdate(delivery.orderId, {
      deliveryStatus: status,
      ...(status === 'delivered' ? { actualDeliveryTime: new Date() } : {}),
    });

    res.json({
      success: true,
      message: 'Statut mis à jour',
      data: {
        id: delivery._id,
        status: delivery.status,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
    });
  }
};

/**
 * Update driver location for a delivery
 * PUT /api/deliveries/:id/location
 */
export const updateDeliveryLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Update current location
    delivery.currentDriverLocation = {
      lat,
      lng,
      updatedAt: new Date(),
    };
    delivery.lastLocationUpdate = new Date();

    // Add to location history (limit to prevent unbounded growth)
    delivery.locationHistory.push({
      lat,
      lng,
      timestamp: new Date(),
    });
    if (delivery.locationHistory.length > 500) {
      delivery.locationHistory = delivery.locationHistory.slice(-300);
    }

    await delivery.save();

    // Also update driver's location
    if (delivery.driverId) {
      await DeliveryDriver.findByIdAndUpdate(delivery.driverId, {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        lastLocationUpdate: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Position mise à jour',
    });
  } catch (error) {
    console.error('Update delivery location error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la position',
    });
  }
};

/**
 * Submit proof of delivery
 * POST /api/deliveries/:id/pod
 */
export const submitProofOfDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, photoUrl, signatureUrl, otpCode, recipientName, notes } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Verify OTP if provided
    if (type === 'otp' && otpCode) {
      if (delivery.otpCode !== otpCode) {
        res.status(400).json({
          success: false,
          message: 'Code OTP incorrect',
        });
        return;
      }
    }

    delivery.pod = {
      type,
      photoUrl,
      signatureUrl,
      otpVerified: type === 'otp' && otpCode === delivery.otpCode,
      recipientName,
      completedAt: new Date(),
      gpsCoordinates: delivery.currentDriverLocation ? {
        lat: delivery.currentDriverLocation.lat,
        lng: delivery.currentDriverLocation.lng,
      } : undefined,
      gpsVerified: !!delivery.currentDriverLocation,
      deliveryNotes: notes,
    };

    await delivery.save();

    res.json({
      success: true,
      message: 'Preuve de livraison enregistrée',
      data: delivery.pod,
    });
  } catch (error) {
    console.error('Submit POD error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la preuve',
    });
  }
};

/**
 * Report delivery issue
 * POST /api/deliveries/:id/issue
 */
export const reportDeliveryIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, description, photos } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    delivery.issues.push({
      type,
      description,
      reportedAt: new Date(),
      reportedBy: 'driver',
      photos,
    });

    delivery.statusHistory.push({
      event: 'issue_reported',
      timestamp: new Date(),
      note: `Problème signalé: ${type}`,
    });

    await delivery.save();

    res.json({
      success: true,
      message: 'Problème signalé',
      data: delivery.issues[delivery.issues.length - 1],
    });
  } catch (error) {
    console.error('Report issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du signalement du problème',
    });
  }
};

/**
 * Add chat message to delivery
 * POST /api/deliveries/:id/chat
 */
export const addChatMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message, senderType } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    const user = (req as any).user;
    delivery.chatMessages.push({
      senderId: user.driverId || user.userId || user.customerId,
      senderType: senderType || (user.driverId ? 'driver' : user.customerId ? 'customer' : 'support'),
      message,
      messageType: 'text',
      isRead: false,
      timestamp: new Date(),
    });

    await delivery.save();

    res.json({
      success: true,
      message: 'Message envoyé',
      data: delivery.chatMessages[delivery.chatMessages.length - 1],
    });
  } catch (error) {
    console.error('Add chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message',
    });
  }
};

/**
 * Cancel delivery
 * POST /api/deliveries/:id/cancel
 */
export const cancelDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    if (['delivered', 'cancelled'].includes(delivery.status)) {
      res.status(400).json({
        success: false,
        message: 'Cette livraison ne peut pas être annulée',
      });
      return;
    }

    // Free up driver if assigned
    if (delivery.driverId) {
      const driver = await DeliveryDriver.findById(delivery.driverId);
      if (driver) {
        driver.shiftStatus = 'online';
        driver.currentDeliveryId = undefined;
        driver.isAvailable = true;
        await driver.save();
      }
    }

    delivery.status = 'cancelled';
    delivery.statusHistory.push({
      event: 'cancelled',
      timestamp: new Date(),
      note: reason,
    });

    await delivery.save();

    // Update order
    await Order.findByIdAndUpdate(delivery.orderId, {
      deliveryStatus: 'cancelled',
    });

    res.json({
      success: true,
      message: 'Livraison annulée',
    });
  } catch (error) {
    console.error('Cancel delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation',
    });
  }
};

/**
 * Get delivery statistics
 * GET /api/deliveries/stats
 */
export const getDeliveryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId, startDate, endDate } = req.query;

    const user = (req as any).user;
    const query: Record<string, unknown> = {};

    if (user.role !== 'superadmin' && user.restaurantId) {
      query.restaurantId = user.restaurantId;
    } else if (restaurantId) {
      query.restaurantId = restaurantId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
      }
    }

    const [statusStats, dailyStats, avgDeliveryTime] = await Promise.all([
      // Status breakdown
      Delivery.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Daily deliveries (last 30 days)
      Delivery.aggregate([
        {
          $match: {
            ...query,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Average delivery time
      Delivery.aggregate([
        {
          $match: {
            ...query,
            status: 'delivered',
            actualDeliveryTime: { $exists: true },
            actualPickupTime: { $exists: true },
          },
        },
        {
          $project: {
            deliveryTime: {
              $divide: [
                { $subtract: ['$actualDeliveryTime', '$actualPickupTime'] },
                60000, // Convert to minutes
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$deliveryTime' },
            minTime: { $min: '$deliveryTime' },
            maxTime: { $max: '$deliveryTime' },
          },
        },
      ]),
    ]);

    // Count totals
    const totalDeliveries = statusStats.reduce((sum, s) => sum + s.count, 0);
    const completedDeliveries = statusStats.find(s => s._id === 'delivered')?.count || 0;
    const cancelledDeliveries = statusStats.find(s => s._id === 'cancelled')?.count || 0;
    const activeDeliveries = statusStats
      .filter(s => !['delivered', 'cancelled', 'failed'].includes(s._id))
      .reduce((sum, s) => sum + s.count, 0);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalDeliveries,
          completed: completedDeliveries,
          cancelled: cancelledDeliveries,
          active: activeDeliveries,
          completionRate: totalDeliveries > 0
            ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1)
            : 0,
        },
        statusBreakdown: statusStats,
        dailyStats,
        deliveryTime: avgDeliveryTime[0] || {
          avgTime: 0,
          minTime: 0,
          maxTime: 0,
        },
      },
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
};

/**
 * Get active deliveries (for real-time dashboard)
 * GET /api/deliveries/active
 */
export const getActiveDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const query: Record<string, unknown> = {
      status: { $nin: ['delivered', 'cancelled', 'failed', 'returned'] },
    };

    if (user.role !== 'superadmin' && user.restaurantId) {
      query.restaurantId = user.restaurantId;
    }

    const deliveries = await Delivery.find(query)
      .populate('driverId', 'firstName lastName phone vehicleType currentLocation')
      .populate('orderId', 'orderNumber items total')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: deliveries,
      count: deliveries.length,
    });
  } catch (error) {
    console.error('Get active deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livraisons actives',
    });
  }
};

/**
 * Track delivery (public endpoint for customers)
 * GET /api/deliveries/track/:trackingCode
 */
export const trackDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackingCode } = req.params;

    // trackingCode could be deliveryNumber
    const delivery = await Delivery.findOne({
      deliveryNumber: trackingCode,
    })
      .select('deliveryNumber status statusHistory currentDriverLocation estimatedDeliveryTime deliveryAddress')
      .populate('driverId', 'firstName vehicleType rating');

    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        deliveryNumber: delivery.deliveryNumber,
        status: delivery.status,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
        currentLocation: delivery.currentDriverLocation,
        driver: delivery.driverId ? {
          firstName: (delivery.driverId as any).firstName,
          vehicleType: (delivery.driverId as any).vehicleType,
          rating: (delivery.driverId as any).rating,
        } : null,
        statusHistory: delivery.statusHistory.map(h => ({
          event: h.event,
          timestamp: h.timestamp,
        })),
      },
    });
  } catch (error) {
    console.error('Track delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du suivi de la livraison',
    });
  }
};

/**
 * Accept delivery assignment (driver)
 * POST /api/deliveries/:id/accept
 */
export const acceptDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const driverId = (req as any).user?.driverId;

    if (!driverId) {
      res.status(403).json({
        success: false,
        message: 'Accès réservé aux livreurs',
      });
      return;
    }

    const delivery = await Delivery.findById(id);

    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Verify driver is assigned to this delivery
    if (delivery.driverId?.toString() !== driverId) {
      res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas assigné à cette livraison',
      });
      return;
    }

    // Verify delivery is in correct status
    if (delivery.status !== 'assigned') {
      res.status(400).json({
        success: false,
        message: `Impossible d'accepter une livraison en statut "${delivery.status}"`,
      });
      return;
    }

    // Update delivery status (pre-save hook handles statusHistory)
    delivery.status = 'accepted' as DeliveryStatus;
    delivery.acceptedAt = new Date();

    await delivery.save();

    // Update driver status
    await DeliveryDriver.findByIdAndUpdate(driverId, {
      shiftStatus: 'on_delivery',
      isAvailable: false,
      currentDeliveryId: delivery._id,
    });

    res.json({
      success: true,
      message: 'Livraison acceptée',
      data: delivery,
    });
  } catch (error) {
    console.error('Accept delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'acceptation de la livraison',
    });
  }
};

/**
 * Reject delivery assignment (driver)
 * POST /api/deliveries/:id/reject
 */
export const rejectDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason: _reason } = req.body;
    const driverId = (req as any).user?.driverId;

    if (!driverId) {
      res.status(403).json({
        success: false,
        message: 'Accès réservé aux livreurs',
      });
      return;
    }

    const delivery = await Delivery.findById(id);

    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Verify driver is assigned to this delivery
    if (delivery.driverId?.toString() !== driverId) {
      res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas assigné à cette livraison',
      });
      return;
    }

    // Verify delivery is in correct status
    if (!['assigned', 'accepted'].includes(delivery.status)) {
      res.status(400).json({
        success: false,
        message: `Impossible de rejeter une livraison en statut "${delivery.status}"`,
      });
      return;
    }

    // Update delivery - unassign driver (pre-save hook handles statusHistory)
    delivery.driverId = undefined;
    delivery.status = 'pending' as DeliveryStatus;

    await delivery.save();

    // Update driver - make available again
    await DeliveryDriver.findByIdAndUpdate(driverId, {
      shiftStatus: 'online',
      isAvailable: true,
      currentDeliveryId: undefined,
    });

    res.json({
      success: true,
      message: 'Livraison refusée',
    });
  } catch (error) {
    console.error('Reject delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du refus de la livraison',
    });
  }
};

/**
 * Complete delivery with proof of delivery (driver)
 * POST /api/deliveries/:id/complete
 */
export const completeDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { photoUrl, signatureUrl, deliveryNotes, gpsCoordinates } = req.body;
    const driverId = (req as any).user?.driverId;

    if (!driverId) {
      res.status(403).json({
        success: false,
        message: 'Accès réservé aux livreurs',
      });
      return;
    }

    const delivery = await Delivery.findById(id);

    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Verify driver is assigned
    if (delivery.driverId?.toString() !== driverId) {
      res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas assigné à cette livraison',
      });
      return;
    }

    // Verify delivery can be completed
    if (!['in_transit', 'arrived'].includes(delivery.status)) {
      res.status(400).json({
        success: false,
        message: `Impossible de compléter une livraison en statut "${delivery.status}"`,
      });
      return;
    }

    // Update delivery with POD
    delivery.status = 'delivered' as DeliveryStatus;
    delivery.actualDeliveryTime = new Date();
    delivery.driverNotes = deliveryNotes;
    delivery.pod = {
      type: (photoUrl ? 'photo' : signatureUrl ? 'signature' : 'customer_confirm') as PODType,
      photoUrl,
      signatureUrl,
      gpsCoordinates: gpsCoordinates ? {
        lat: gpsCoordinates.lat,
        lng: gpsCoordinates.lng,
      } : undefined,
      gpsVerified: !!gpsCoordinates,
      customerConfirmedAt: new Date(),
      completedAt: new Date(),
    };
    // Pre-save hook handles statusHistory automatically

    await delivery.save();

    // Update driver - make available again
    const driver = await DeliveryDriver.findById(driverId);
    if (driver) {
      driver.shiftStatus = 'online';
      driver.isAvailable = true;
      driver.currentDeliveryId = undefined;

      // Update stats
      driver.stats.totalDeliveries += 1;
      driver.stats.completedDeliveries += 1;
      driver.stats.completionRate = (driver.stats.completedDeliveries / driver.stats.totalDeliveries) * 100;

      // Calculate driver earnings (80% of total delivery earnings)
      const driverEarnings = delivery.earnings?.total ? delivery.earnings.total * 0.8 : 0;
      if (driverEarnings > 0) {
        driver.stats.totalEarnings += driverEarnings;
        driver.currentBalance += driverEarnings;
        driver.lifetimeEarnings += driverEarnings;
      }

      await driver.save();
    }

    // Update order status
    if (delivery.orderId) {
      await Order.findByIdAndUpdate(delivery.orderId, {
        status: 'delivered',
        completedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Livraison complétée avec succès',
      data: delivery,
    });
  } catch (error) {
    console.error('Complete delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la complétion de la livraison',
    });
  }
};

/**
 * Get real-time ETA for a delivery
 * GET /api/deliveries/:id/eta
 */
export const getDeliveryETA = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id).populate('driverId');
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Check if delivery is in a trackable state
    const trackableStatuses: DeliveryStatus[] = [
      'accepted',
      'arriving_restaurant',
      'at_restaurant',
      'picked_up',
      'in_transit',
      'arrived',
    ];

    if (!trackableStatuses.includes(delivery.status)) {
      res.status(400).json({
        success: false,
        message: 'Cette livraison n\'est pas en cours de suivi',
        data: {
          status: delivery.status,
          canTrack: false,
        },
      });
      return;
    }

    // Get driver location
    const driver = delivery.driverId as any;
    const driverLocation = driver?.currentLocation || delivery.locationHistory?.[delivery.locationHistory.length - 1];

    if (!driverLocation) {
      res.status(400).json({
        success: false,
        message: 'Position du livreur non disponible',
        data: {
          status: delivery.status,
          canTrack: true,
          hasLocation: false,
        },
      });
      return;
    }

    // Determine destination based on status
    let destination: { lat: number; lng: number };
    let etaType: 'to_restaurant' | 'to_customer';
    let additionalMinutes = 0;

    if (['accepted', 'arriving_restaurant'].includes(delivery.status)) {
      // Driver going to restaurant
      destination = delivery.pickupAddress.coordinates;
      etaType = 'to_restaurant';
      // Add estimated prep time if order not ready
      additionalMinutes = 5; // Default prep buffer
    } else {
      // Driver going to customer
      destination = delivery.deliveryAddress.coordinates;
      etaType = 'to_customer';
    }

    // Calculate ETA using routing service
    const etaResult = await routingService.calculateETA(
      { lat: driverLocation.lat, lng: driverLocation.lng },
      destination,
      additionalMinutes
    );

    // Get route polyline if available
    let route = null;
    if (routingService.isEnabled()) {
      const routeInfo = await routingService.getRoute(
        { lat: driverLocation.lat, lng: driverLocation.lng },
        destination
      );
      route = {
        polyline: routeInfo.polyline,
        distanceKm: routeInfo.distanceKm,
        durationMinutes: routeInfo.durationMinutes,
      };
    }

    // Update delivery with new ETA
    if (etaType === 'to_customer') {
      delivery.estimatedDeliveryTime = etaResult.eta;
      await delivery.save();
    }

    res.json({
      success: true,
      data: {
        deliveryId: delivery._id,
        status: delivery.status,
        etaType,
        eta: etaResult.eta,
        durationMinutes: etaResult.durationMinutes,
        distanceKm: etaResult.distanceKm,
        trafficCondition: etaResult.trafficCondition,
        driverLocation: {
          lat: driverLocation.lat,
          lng: driverLocation.lng,
          updatedAt: driverLocation.timestamp || driverLocation.updatedAt || new Date(),
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          type: etaType === 'to_restaurant' ? 'restaurant' : 'customer',
        },
        route,
        mapsApiEnabled: routingService.isEnabled(),
      },
    });
  } catch (error) {
    console.error('Get delivery ETA error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul de l\'ETA',
    });
  }
};

/**
 * Get full route for delivery tracking
 * GET /api/deliveries/:id/route
 */
export const getDeliveryRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id).populate('driverId');
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Get driver location
    const driver = delivery.driverId as any;
    const driverLocation = driver?.currentLocation || delivery.locationHistory?.[delivery.locationHistory.length - 1];

    if (!driverLocation) {
      res.status(400).json({
        success: false,
        message: 'Position du livreur non disponible',
      });
      return;
    }

    // Calculate full delivery route
    const fullRoute = await routingService.calculateDeliveryETA(
      { lat: driverLocation.lat, lng: driverLocation.lng },
      delivery.pickupAddress.coordinates,
      delivery.deliveryAddress.coordinates,
      5 // Default prep time buffer
    );

    // Get route polylines
    let routeToRestaurant = null;
    let routeToCustomer = null;

    if (routingService.isEnabled()) {
      // Driver to restaurant
      if (['accepted', 'arriving_restaurant'].includes(delivery.status)) {
        const route = await routingService.getRoute(
          { lat: driverLocation.lat, lng: driverLocation.lng },
          delivery.pickupAddress.coordinates
        );
        routeToRestaurant = {
          polyline: route.polyline,
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
        };
      }

      // Restaurant to customer (or driver to customer if already picked up)
      const customerRouteOrigin = ['picked_up', 'in_transit', 'arrived'].includes(delivery.status)
        ? { lat: driverLocation.lat, lng: driverLocation.lng }
        : delivery.pickupAddress.coordinates;

      const route = await routingService.getRoute(
        customerRouteOrigin,
        delivery.deliveryAddress.coordinates
      );
      routeToCustomer = {
        polyline: route.polyline,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
      };
    }

    res.json({
      success: true,
      data: {
        deliveryId: delivery._id,
        status: delivery.status,
        driverLocation: {
          lat: driverLocation.lat,
          lng: driverLocation.lng,
        },
        restaurant: {
          coordinates: delivery.pickupAddress.coordinates,
          address: `${delivery.pickupAddress.street}, ${delivery.pickupAddress.city}`,
        },
        customer: {
          coordinates: delivery.deliveryAddress.coordinates,
          address: `${delivery.deliveryAddress.street}, ${delivery.deliveryAddress.city}`,
          instructions: delivery.deliveryAddress.instructions,
        },
        eta: {
          toRestaurant: fullRoute.toRestaurant,
          toCustomer: fullRoute.toCustomer,
          total: {
            eta: fullRoute.totalETA,
            minutes: fullRoute.totalMinutes,
          },
        },
        routes: {
          toRestaurant: routeToRestaurant,
          toCustomer: routeToCustomer,
        },
        mapsApiEnabled: routingService.isEnabled(),
      },
    });
  } catch (error) {
    console.error('Get delivery route error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la route',
    });
  }
};

/**
 * Add tip to a completed delivery
 * POST /api/deliveries/:id/tip
 */
export const addDeliveryTip = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, message: tipMessage } = req.body;

    // Validate amount
    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount <= 0 || tipAmount > 100) {
      res.status(400).json({
        success: false,
        message: 'Montant de pourboire invalide (entre 0€ et 100€)',
      });
      return;
    }

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Verify delivery is completed
    if (delivery.status !== 'delivered') {
      res.status(400).json({
        success: false,
        message: 'Le pourboire ne peut être ajouté qu\'après la livraison',
      });
      return;
    }

    // Check if tip already added
    if (delivery.tipAmount && delivery.tipAmount > 0) {
      res.status(400).json({
        success: false,
        message: 'Un pourboire a déjà été ajouté à cette livraison',
      });
      return;
    }

    // Update delivery with tip
    delivery.tipAmount = tipAmount;
    delivery.tipAddedAt = new Date();

    // Update earnings
    if (delivery.earnings) {
      delivery.earnings.tip = tipAmount;
      delivery.earnings.total = (delivery.earnings.total || 0) + tipAmount;
    }

    // Add tip message to notes if provided
    if (tipMessage) {
      delivery.customerNotes = delivery.customerNotes
        ? `${delivery.customerNotes}\n[Pourboire: ${tipMessage}]`
        : `[Pourboire: ${tipMessage}]`;
    }

    await delivery.save();

    // Update driver balance (tips go 100% to driver)
    if (delivery.driverId) {
      await DeliveryDriver.findByIdAndUpdate(delivery.driverId, {
        $inc: {
          currentBalance: tipAmount,
          lifetimeEarnings: tipAmount,
          'stats.totalEarnings': tipAmount,
        },
      });
    }

    res.json({
      success: true,
      message: 'Pourboire ajouté avec succès',
      data: {
        tipAmount,
        deliveryId: delivery._id,
      },
    });
  } catch (error) {
    console.error('Add delivery tip error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du pourboire',
    });
  }
};

/**
 * Rate a completed delivery
 * POST /api/deliveries/:id/rate
 */
export const rateDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Validate rating
    const ratingValue = parseInt(rating);
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      res.status(400).json({
        success: false,
        message: 'Note invalide (entre 1 et 5)',
      });
      return;
    }

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Livraison non trouvée',
      });
      return;
    }

    // Verify delivery is completed
    if (delivery.status !== 'delivered') {
      res.status(400).json({
        success: false,
        message: 'La note ne peut être ajoutée qu\'après la livraison',
      });
      return;
    }

    // Check if already rated
    if (delivery.customerRating) {
      res.status(400).json({
        success: false,
        message: 'Cette livraison a déjà été notée',
      });
      return;
    }

    // Update delivery with rating
    delivery.customerRating = {
      rating: ratingValue,
      comment: comment || undefined,
      ratedAt: new Date(),
    };

    await delivery.save();

    // Update driver average rating
    if (delivery.driverId) {
      const driverDeliveries = await Delivery.find({
        driverId: delivery.driverId,
        'customerRating.rating': { $exists: true },
      });

      const avgRating = driverDeliveries.reduce((sum, d) => sum + (d.customerRating?.rating || 0), 0) / driverDeliveries.length;

      await DeliveryDriver.findByIdAndUpdate(delivery.driverId, {
        'stats.averageRating': Math.round(avgRating * 10) / 10,
        'stats.totalRatings': driverDeliveries.length,
      });
    }

    res.json({
      success: true,
      message: 'Merci pour votre évaluation',
      data: {
        rating: ratingValue,
        deliveryId: delivery._id,
      },
    });
  } catch (error) {
    console.error('Rate delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'évaluation',
    });
  }
};

export default {
  createDelivery,
  getDeliveries,
  getDeliveryById,
  assignDriver,
  updateDeliveryStatus,
  updateDeliveryLocation,
  submitProofOfDelivery,
  reportDeliveryIssue,
  addChatMessage,
  cancelDelivery,
  getDeliveryStats,
  getActiveDeliveries,
  trackDelivery,
  acceptDelivery,
  rejectDelivery,
  completeDelivery,
  getDeliveryETA,
  getDeliveryRoute,
  addDeliveryTip,
  rateDelivery,
};
