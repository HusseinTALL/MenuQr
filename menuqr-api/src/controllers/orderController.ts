import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Order, Dish, Restaurant, Customer } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as loyaltyService from '../services/loyaltyService.js';
import * as inventoryService from '../services/inventoryService.js';
import { emitNewOrder, emitOrderUpdate, emitOrderReady } from '../services/socketService.js';
import logger from '../utils/logger.js';
import * as auditService from '../services/auditService.js';
import { subscriptionService } from '../services/subscriptionService.js';

interface OrderItemInput {
  dishId: string;
  quantity: number;
  options?: { name: string; price: number }[];
  variant?: { name: string; price: number };
  specialInstructions?: string;
}

export const createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    restaurantId,
    tableNumber,
    customerName,
    customerPhone,
    customerEmail,
    items,
    specialInstructions,
    customerId,
    redeemPoints,
  } = req.body;

  // Verify restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Quick stock validation for immediate user feedback (non-blocking)
  // The REAL validation happens atomically in reduceStockForOrder below
  const stockValidation = await inventoryService.validateOrderStock(
    (items as OrderItemInput[]).map(item => ({
      dishId: item.dishId,
      quantity: item.quantity,
    }))
  );

  if (!stockValidation.isValid) {
    const insufficientItems = stockValidation.insufficientItems
      .map(item => `${item.dishName} (demandé: ${item.requestedQuantity}, disponible: ${item.availableStock})`)
      .join(', ');
    throw new ApiError(400, `Stock insuffisant pour: ${insufficientItems}`);
  }

  // Process items and calculate totals
  let subtotal = 0;
  const processedItems = [];

  for (const item of items as OrderItemInput[]) {
    const dish = await Dish.findOne({
      _id: item.dishId,
      restaurantId,
      isAvailable: true,
    });

    if (!dish) {
      throw new ApiError(404, `Dish ${item.dishId} not found or unavailable`);
    }

    const itemPrice = item.variant ? item.variant.price : dish.price;
    let optionsTotal = 0;

    if (item.options && item.options.length > 0) {
      optionsTotal = item.options.reduce((sum, opt) => sum + (opt.price || 0), 0);
    }

    const itemSubtotal = (itemPrice + optionsTotal) * item.quantity;
    subtotal += itemSubtotal;

    processedItems.push({
      dishId: dish._id,
      name: (dish.name as Record<string, string>).fr,
      price: itemPrice,
      quantity: item.quantity,
      options: item.options,
      variant: item.variant,
      specialInstructions: item.specialInstructions,
      subtotal: itemSubtotal,
    });
  }

  // Calculate tax (default 0% for now)
  const taxRate = 0;
  const tax = subtotal * taxRate;
  let total = subtotal + tax;

  // Loyalty program calculations
  let loyaltyData: {
    tierAtOrder?: string;
    tierDiscountPercent: number;
    tierDiscountAmount: number;
    pointsRedeemed: number;
    redemptionCreditApplied: number;
    pointsEarned: number;
    finalTotal: number;
  } | undefined;

  // Check if customer is logged in and apply loyalty benefits
  if (customerId) {
    const customer = await Customer.findOne({ _id: customerId, restaurantId });
    if (customer) {
      const loyaltyInfo = await loyaltyService.getCustomerLoyalty(customer._id);

      // Calculate tier discount
      const tierDiscountPercent = loyaltyInfo.tierDiscount;
      const tierDiscountAmount = Math.round(total * tierDiscountPercent / 100);

      // Handle point redemption
      let redemptionCreditApplied = 0;
      let pointsRedeemed = 0;

      if (redeemPoints && redeemPoints >= loyaltyService.LOYALTY_CONFIG.MIN_REDEMPTION) {
        // Validate customer has enough points
        if (redeemPoints > loyaltyInfo.availablePoints) {
          throw new ApiError(400, `Points insuffisants. Vous avez ${loyaltyInfo.availablePoints} points disponibles.`);
        }

        // Redeem points and get credit value
        const redemptionResult = await loyaltyService.redeemPoints(customer._id, redeemPoints);
        redemptionCreditApplied = redemptionResult.creditValue;
        pointsRedeemed = redeemPoints;
      }

      // Calculate final total
      const finalTotal = Math.max(0, total - tierDiscountAmount - redemptionCreditApplied);

      loyaltyData = {
        tierAtOrder: loyaltyInfo.currentTier,
        tierDiscountPercent,
        tierDiscountAmount,
        pointsRedeemed,
        redemptionCreditApplied,
        pointsEarned: 0, // Will be calculated when order is completed
        finalTotal,
      };

      // Update total to finalTotal for display
      total = finalTotal;
    }
  }

  // Generate order number
  const generateOrderNumber = (): string => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.getTime().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `CMD-${dateStr}-${timeStr}${random}`;
  };

  // CRITICAL: Atomically reduce stock BEFORE creating the order
  // This prevents race conditions where two concurrent orders could both
  // pass validation but then oversell the stock
  const stockResults = await inventoryService.reduceStockForOrder(
    processedItems.map(item => ({
      dishId: item.dishId.toString(),
      quantity: item.quantity,
    }))
  );

  // Log any items that became low stock or out of stock
  const lowStockItems = stockResults.filter(r => r.isLowStock || r.isOutOfStock);
  if (lowStockItems.length > 0) {
    logger.info('Stock alert after order', {
      lowStockItems: lowStockItems.map(i => ({
        dish: i.dishName,
        stock: i.newStock,
        outOfStock: i.isOutOfStock,
      })),
    });
  }

  // Create order - stock has already been reserved
  let order;
  try {
    order = await Order.create({
      orderNumber: generateOrderNumber(),
      restaurantId,
      customerId,
      tableNumber,
      customerName,
      customerPhone,
      customerEmail,
      items: processedItems,
      subtotal,
      tax,
      total,
      specialInstructions,
      status: 'pending',
      paymentStatus: 'pending',
      loyalty: loyaltyData,
    });
  } catch (orderError) {
    // If order creation fails, restore the stock we just reduced
    logger.error('Order creation failed after stock reduction, restoring stock', {
      error: orderError,
    });
    await inventoryService.restoreStockForCancelledOrder(
      processedItems.map(item => ({
        dishId: item.dishId.toString(),
        quantity: item.quantity,
      }))
    );
    throw orderError;
  }

  // Emit real-time event for new order
  emitNewOrder(restaurantId, {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    status: order.status,
    tableNumber: order.tableNumber,
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    total: order.total,
    createdAt: order.createdAt,
  });

  // Track order usage for subscription (monthly count)
  try {
    await subscriptionService.incrementUsage(
      new mongoose.Types.ObjectId(restaurantId),
      'orders'
    );
  } catch (usageError) {
    logger.error('Failed to track order usage:', usageError);
    // Don't fail the request if usage tracking fails
  }

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

export const getOrdersByRestaurant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { status, tableNumber, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    // Get restaurant
    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    const query: Record<string, unknown> = { restaurantId: restaurant._id };

    if (status) {
      query.status = status;
    }

    if (tableNumber) {
      query.tableNumber = tableNumber;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        (query.createdAt as Record<string, Date>).$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        (query.createdAt as Record<string, Date>).$lte = new Date(dateTo as string);
      }
    }

    const orders = await Order.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

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
  }
);

export const getOrderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({
    success: true,
    data: order,
  });
});

export const getOrderByNumber = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    res.json({
      success: true,
      data: order,
    });
  }
);

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;
    const { status, cancelReason } = req.body;

    // Find order
    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Store old status for audit
    const oldStatus = order.status;

    // Check ownership
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant || (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin')) {
      throw new ApiError(403, 'Not authorized to update this order');
    }

    // Update timestamps based on status
    const now = new Date();
    switch (status) {
      case 'confirmed':
        order.confirmedAt = now;
        break;
      case 'preparing':
        if (!order.confirmedAt) {order.confirmedAt = now;}
        break;
      case 'ready':
        order.preparedAt = now;
        break;
      case 'served':
        order.servedAt = now;
        break;
      case 'completed':
        order.completedAt = now;

        // Award loyalty points when order is completed
        if (order.customerId) {
          try {
            // Calculate points based on final total (after discounts)
            const orderTotal = order.loyalty?.finalTotal ?? order.total;
            const pointsToEarn = loyaltyService.calculatePointsFromOrder(orderTotal);

            if (pointsToEarn > 0) {
              // Earn points
              await loyaltyService.earnPoints(
                order.customerId,
                order.restaurantId,
                order._id,
                orderTotal
              );

              // Update order with earned points
              if (order.loyalty) {
                order.loyalty.pointsEarned = pointsToEarn;
              } else {
                order.loyalty = {
                  tierAtOrder: 'bronze',
                  tierDiscountPercent: 0,
                  tierDiscountAmount: 0,
                  pointsRedeemed: 0,
                  redemptionCreditApplied: 0,
                  pointsEarned: pointsToEarn,
                  finalTotal: order.total,
                };
              }

              // Update customer stats
              await Customer.findByIdAndUpdate(order.customerId, {
                $inc: { totalOrders: 1, totalSpent: orderTotal },
                $set: { lastOrderAt: now },
              });
            }
          } catch (loyaltyError) {
            // Log error but don't fail the order completion
            logger.error('Loyalty points error:', loyaltyError);
          }
        }
        break;
      case 'cancelled':
        order.cancelledAt = now;
        order.cancelReason = cancelReason;

        // Restore stock for cancelled order items
        try {
          await inventoryService.restoreStockForCancelledOrder(
            order.items.map(item => ({
              dishId: item.dishId.toString(),
              quantity: item.quantity,
            })),
            user._id.toString()
          );
          logger.info('Stock restored for cancelled order', {
            orderId: order._id,
            orderNumber: order.orderNumber,
          });
        } catch (stockError) {
          logger.error('Error restoring stock for cancelled order', {
            orderId: order._id,
            error: stockError,
          });
        }
        break;
    }

    order.status = status;
    await order.save();

    // Emit real-time events based on status
    const orderEventData = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      tableNumber: order.tableNumber,
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
      total: order.total,
      updatedAt: now,
    };

    if (status === 'ready') {
      // Special event for order ready (customer notification)
      emitOrderReady(order.restaurantId.toString(), orderEventData);
    } else {
      // General order update event
      emitOrderUpdate(order.restaurantId.toString(), orderEventData);
    }

    // Audit log
    const auditUser = auditService.getUserFromRequest(req);
    if (auditUser) {
      await auditService.auditStatusChange(
        'order',
        auditUser,
        { type: 'Order', id: order._id, name: order.orderNumber },
        oldStatus,
        status,
        auditService.getRequestInfo(req),
        { tableNumber: order.tableNumber, total: order.total, cancelReason }
      );
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  }
);

export const getActiveOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  // Get restaurant
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const orders = await Order.find({
    restaurantId: restaurant._id,
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
  }).sort({ createdAt: 1 });

  res.json({
    success: true,
    data: orders,
  });
});

export const updateOrderItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;
    const { items, specialInstructions } = req.body;

    // Find order
    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Check ownership
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant || (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin')) {
      throw new ApiError(403, 'Not authorized to update this order');
    }

    // Only allow modification for orders that are not completed or cancelled
    if (['completed', 'cancelled'].includes(order.status)) {
      throw new ApiError(400, 'Cannot modify completed or cancelled orders');
    }

    // Process new items and calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items as OrderItemInput[]) {
      const dish = await Dish.findOne({
        _id: item.dishId,
        restaurantId: order.restaurantId,
      });

      if (!dish) {
        throw new ApiError(404, `Dish ${item.dishId} not found`);
      }

      const itemPrice = item.variant ? item.variant.price : dish.price;
      let optionsTotal = 0;

      if (item.options && item.options.length > 0) {
        optionsTotal = item.options.reduce((sum, opt) => sum + (opt.price || 0), 0);
      }

      const itemSubtotal = (itemPrice + optionsTotal) * item.quantity;
      subtotal += itemSubtotal;

      processedItems.push({
        dishId: dish._id,
        name: (dish.name as Record<string, string>).fr,
        price: itemPrice,
        quantity: item.quantity,
        options: item.options,
        variant: item.variant,
        specialInstructions: item.specialInstructions,
        subtotal: itemSubtotal,
      });
    }

    // Calculate tax (default 0% for now)
    const taxRate = 0;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Update order
    order.items = processedItems;
    order.subtotal = subtotal;
    order.tax = tax;
    order.total = total;
    if (specialInstructions !== undefined) {
      order.specialInstructions = specialInstructions;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  }
);

export const getOrderStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { dateFrom, dateTo } = req.query;

  // Get restaurant
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const dateFilter: Record<string, Date> = {};
  if (dateFrom) {
    dateFilter.$gte = new Date(dateFrom as string);
  }
  if (dateTo) {
    dateFilter.$lte = new Date(dateTo as string);
  }

  const matchStage: Record<string, unknown> = { restaurantId: restaurant._id };
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  const stats = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0],
          },
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        averageOrderValue: { $avg: '$total' },
      },
    },
  ]);

  const statusCounts = await Order.aggregate([
    { $match: matchStage },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      summary: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        averageOrderValue: 0,
      },
      statusCounts: statusCounts.reduce(
        (acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  });
});

/**
 * Get daily order statistics for charts
 * Returns order count and revenue per day for the specified period
 */
export const getDailyOrderStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { days = 7 } = req.query;

  // Get restaurant
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const daysNum = Math.min(Number(days), 90); // Max 90 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  startDate.setHours(0, 0, 0, 0);

  const dailyStats = await Order.aggregate([
    {
      $match: {
        restaurantId: restaurant._id,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        count: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0],
          },
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
          },
        },
        count: 1,
        revenue: 1,
        completedCount: 1,
      },
    },
  ]);

  // Fill in missing days with zeros
  const result = [];
  const current = new Date(startDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    const existing = dailyStats.find(
      (s) => s.date.toISOString().split('T')[0] === dateStr
    );

    result.push({
      date: dateStr,
      dayOfWeek: current.toLocaleDateString('fr-FR', { weekday: 'short' }),
      count: existing?.count || 0,
      revenue: existing?.revenue || 0,
      completedCount: existing?.completedCount || 0,
    });

    current.setDate(current.getDate() + 1);
  }

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Get order location distribution statistics
 * Returns breakdown by tableLocation (interior, terrace, private, etc.)
 */
export const getOrderLocationStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { dateFrom, dateTo } = req.query;

  // Get restaurant
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const dateFilter: Record<string, Date> = {};
  if (dateFrom) {
    dateFilter.$gte = new Date(dateFrom as string);
  }
  if (dateTo) {
    dateFilter.$lte = new Date(dateTo as string);
  }

  const matchStage: Record<string, unknown> = {
    restaurantId: restaurant._id,
    status: { $in: ['completed', 'served', 'ready', 'preparing', 'confirmed'] },
  };
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  // Get location distribution from table numbers
  // Tables are looked up to get their location type
  const locationStats = await Order.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'tables',
        let: { tableNum: '$tableNumber', restId: '$restaurantId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$restaurantId', '$$restId'] },
                  { $eq: ['$name', '$$tableNum'] },
                ],
              },
            },
          },
        ],
        as: 'tableInfo',
      },
    },
    {
      $unwind: {
        path: '$tableInfo',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: { $ifNull: ['$tableInfo.location', 'unknown'] },
        count: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    {
      $project: {
        _id: 0,
        location: '$_id',
        count: 1,
        revenue: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Calculate percentages
  const total = locationStats.reduce((sum, s) => sum + s.count, 0);
  const result = locationStats.map((s) => ({
    ...s,
    percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
  }));

  res.json({
    success: true,
    data: {
      locations: result,
      total,
    },
  });
});
