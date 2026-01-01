import mongoose from 'mongoose';
import {
  HotelOrder,
  IHotelOrder,
  IHotelOrderItem,
  HotelOrderStatus,
} from '../models/HotelOrder.js';
import { HotelDish } from '../models/HotelDish.js';
import { HotelGuest } from '../models/HotelGuest.js';
import { Room } from '../models/Room.js';
import { Hotel } from '../models/Hotel.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

// ============================================
// Order Creation
// ============================================

interface CreateOrderInput {
  hotelId: mongoose.Types.ObjectId | string;
  roomId: mongoose.Types.ObjectId | string;
  guestId?: mongoose.Types.ObjectId | string;
  guestName: string;
  guestPhone?: string;
  menuType?: string;
  menuId?: mongoose.Types.ObjectId | string;
  items: Array<{
    dishId: mongoose.Types.ObjectId | string;
    quantity: number;
    options?: Array<{ name: string; price: number }>;
    variant?: { name: string; price: number };
    specialInstructions?: string;
  }>;
  paymentMethod?: 'room_charge' | 'card' | 'cash' | 'mobile_pay';
  deliveryInstructions?: string;
  specialInstructions?: string;
  isScheduled?: boolean;
  scheduledFor?: Date;
  leaveAtDoor?: boolean;
  callBeforeDelivery?: boolean;
  tip?: number;
}

/**
 * Create a new hotel order
 */
export const createOrder = async (input: CreateOrderInput): Promise<IHotelOrder> => {
  const [room, hotel] = await Promise.all([
    Room.findById(input.roomId),
    Hotel.findById(input.hotelId),
  ]);

  if (!room) {throw new Error('Room not found');}
  if (!hotel) {throw new Error('Hotel not found');}

  // Validate and build order items
  const orderItems: IHotelOrderItem[] = [];
  let subtotal = 0;

  for (const item of input.items) {
    const dish = await HotelDish.findById(item.dishId);
    if (!dish) {
      throw new Error(`Dish ${item.dishId} not found`);
    }

    if (!dish.isAvailable) {
      throw new Error(`Dish ${dish.name.fr} is not available`);
    }

    // Calculate item price
    let itemPrice = dish.price;
    if (item.variant) {
      itemPrice = item.variant.price;
    }

    // Add options price
    let optionsTotal = 0;
    if (item.options) {
      optionsTotal = item.options.reduce((sum, opt) => sum + opt.price, 0);
    }

    const itemSubtotal = (itemPrice + optionsTotal) * item.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      dishId: dish._id,
      name: dish.name,
      price: itemPrice,
      quantity: item.quantity,
      options: item.options,
      variant: item.variant,
      specialInstructions: item.specialInstructions,
      subtotal: itemSubtotal,
    } as IHotelOrderItem);
  }

  // Calculate charges
  const serviceChargeRate = hotel.settings?.roomService?.serviceChargePercent || 0;
  const serviceCharge = subtotal * (serviceChargeRate / 100);
  const deliveryFee = hotel.settings?.roomService?.deliveryFee || 0;
  const taxRate = hotel.settings?.roomService?.taxPercent || 0;
  const tax = (subtotal + serviceCharge) * (taxRate / 100);
  const tip = input.tip || 0;
  const total = subtotal + serviceCharge + deliveryFee + tax + tip;

  // Estimate delivery time
  const maxPrepTime = Math.max(...orderItems.map(() => {
    // Default 15 minutes if not specified
    return 15;
  }));
  const estimatedDeliveryTime = new Date();
  estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + maxPrepTime + 10);

  const order = await HotelOrder.create({
    hotelId: input.hotelId,
    roomId: input.roomId,
    roomNumber: room.roomNumber,
    floor: room.floor,
    building: room.building,
    guestId: input.guestId,
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    menuType: input.menuType || 'room_service',
    menuId: input.menuId,
    items: orderItems,
    subtotal,
    serviceCharge,
    deliveryFee,
    tax,
    tip,
    total,
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentMethod === 'room_charge' ? 'room_charge' : 'pending',
    deliveryInstructions: input.deliveryInstructions,
    specialInstructions: input.specialInstructions,
    isScheduled: input.isScheduled || false,
    scheduledFor: input.scheduledFor,
    leaveAtDoor: input.leaveAtDoor ?? false,
    callBeforeDelivery: input.callBeforeDelivery ?? true,
    estimatedDeliveryTime,
  });

  // Update guest stats
  if (input.guestId) {
    await HotelGuest.findByIdAndUpdate(input.guestId, {
      $inc: { totalOrders: 1, totalSpent: total },
      lastOrderAt: new Date(),
    });
  }

  // Update dish stats
  for (const item of orderItems) {
    await HotelDish.findByIdAndUpdate(item.dishId, {
      $inc: {
        totalOrders: item.quantity,
        totalRevenue: item.subtotal,
      },
    });
  }

  logger.info('Hotel order created', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    roomNumber: room.roomNumber,
    total,
  });

  return order;
};

// ============================================
// Order Status Management
// ============================================

/**
 * Update order status
 */
export const updateOrderStatus = async (
  orderId: mongoose.Types.ObjectId | string,
  status: HotelOrderStatus,
  updatedBy?: { id: string; role: string }
): Promise<IHotelOrder | null> => {
  const order = await HotelOrder.findById(orderId);
  if (!order) {return null;}

  // Validate status transition
  const validTransitions: Record<HotelOrderStatus, HotelOrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['picked_up', 'cancelled'],
    picked_up: ['delivering'],
    delivering: ['delivered'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
  };

  if (!validTransitions[order.status].includes(status)) {
    throw new Error(`Invalid status transition from ${order.status} to ${status}`);
  }

  order.status = status;

  if (status === 'cancelled' && updatedBy) {
    const cancelledBy = updatedBy.role.includes('kitchen')
      ? 'kitchen'
      : updatedBy.role.includes('guest')
        ? 'guest'
        : 'staff';
    order.cancelledBy = cancelledBy;
  }

  await order.save();

  logger.info('Order status updated', {
    orderId,
    orderNumber: order.orderNumber,
    status,
    updatedBy,
  });

  return order;
};

/**
 * Cancel order
 */
export const cancelOrder = async (
  orderId: mongoose.Types.ObjectId | string,
  reason: string,
  cancelledBy: 'guest' | 'staff' | 'kitchen' | 'system'
): Promise<IHotelOrder | null> => {
  const order = await HotelOrder.findById(orderId);
  if (!order) {return null;}

  if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
    throw new Error('Cannot cancel order in current status');
  }

  order.status = 'cancelled';
  order.cancelReason = reason;
  order.cancelledBy = cancelledBy;
  await order.save();

  // Refund if payment was made
  if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refunded';
    await order.save();
  }

  logger.info('Order cancelled', {
    orderId,
    orderNumber: order.orderNumber,
    reason,
    cancelledBy,
  });

  return order;
};

// ============================================
// Staff Assignment
// ============================================

/**
 * Assign order to staff
 */
export const assignOrderToStaff = async (
  orderId: mongoose.Types.ObjectId | string,
  staffId: mongoose.Types.ObjectId | string
): Promise<IHotelOrder | null> => {
  const [order, staff] = await Promise.all([
    HotelOrder.findById(orderId),
    User.findById(staffId),
  ]);

  if (!order || !staff) {return null;}

  order.assignedTo = {
    staffId: staff._id,
    staffName: staff.name,
    assignedAt: new Date(),
  };

  await order.save();

  logger.info('Order assigned to staff', {
    orderId,
    orderNumber: order.orderNumber,
    staffId,
    staffName: staff.name,
  });

  return order;
};

/**
 * Mark order as picked up by staff
 */
export const markOrderPickedUp = async (
  orderId: mongoose.Types.ObjectId | string,
  staffId: mongoose.Types.ObjectId | string
): Promise<IHotelOrder | null> => {
  const [order, staff] = await Promise.all([
    HotelOrder.findById(orderId),
    User.findById(staffId),
  ]);

  if (!order || !staff) {return null;}

  if (order.status !== 'ready') {
    throw new Error('Order must be ready before pickup');
  }

  order.status = 'picked_up';
  order.deliveredBy = {
    staffId: staff._id,
    staffName: staff.name,
    pickedUpAt: new Date(),
  };

  await order.save();

  logger.info('Order picked up', {
    orderId,
    orderNumber: order.orderNumber,
    staffId,
  });

  return order;
};

/**
 * Mark order as delivered
 */
export const markOrderDelivered = async (
  orderId: mongoose.Types.ObjectId | string,
  deliveryInfo?: {
    recipientName?: string;
    signature?: string;
    photo?: string;
  }
): Promise<IHotelOrder | null> => {
  const order = await HotelOrder.findById(orderId);
  if (!order) {return null;}

  if (!['picked_up', 'delivering'].includes(order.status)) {
    throw new Error('Invalid order status for delivery');
  }

  order.status = 'delivered';
  if (order.deliveredBy) {
    order.deliveredBy.deliveredAt = new Date();
    if (deliveryInfo?.recipientName) {order.deliveredBy.recipientName = deliveryInfo.recipientName;}
    if (deliveryInfo?.signature) {order.deliveredBy.signature = deliveryInfo.signature;}
    if (deliveryInfo?.photo) {order.deliveredBy.photo = deliveryInfo.photo;}
  }

  await order.save();

  logger.info('Order delivered', {
    orderId,
    orderNumber: order.orderNumber,
    roomNumber: order.roomNumber,
  });

  return order;
};

// ============================================
// Order Queries
// ============================================

/**
 * Get order by ID
 */
export const getOrderById = async (
  orderId: mongoose.Types.ObjectId | string
): Promise<IHotelOrder | null> => {
  return HotelOrder.findById(orderId)
    .populate('roomId', 'roomNumber floor building')
    .populate('guestId', 'name email phone');
};

/**
 * Get orders for kitchen display
 */
export const getKitchenOrders = async (
  hotelId: mongoose.Types.ObjectId | string
): Promise<IHotelOrder[]> => {
  return HotelOrder.find({
    hotelId,
    status: { $in: ['confirmed', 'preparing'] },
  })
    .sort({ createdAt: 1 })
    .populate('roomId', 'roomNumber floor building');
};

/**
 * Get orders ready for delivery
 */
export const getReadyForDeliveryOrders = async (
  hotelId: mongoose.Types.ObjectId | string
): Promise<IHotelOrder[]> => {
  return HotelOrder.find({
    hotelId,
    status: 'ready',
  })
    .sort({ readyAt: 1 })
    .populate('roomId', 'roomNumber floor building');
};

/**
 * Get active orders for staff member
 */
export const getStaffActiveOrders = async (
  staffId: mongoose.Types.ObjectId | string
): Promise<IHotelOrder[]> => {
  return HotelOrder.find({
    'assignedTo.staffId': staffId,
    status: { $in: ['ready', 'picked_up', 'delivering'] },
  })
    .sort({ createdAt: 1 })
    .populate('roomId', 'roomNumber floor building');
};

/**
 * Get orders by room
 */
export const getOrdersByRoom = async (
  roomId: mongoose.Types.ObjectId | string,
  options?: { activeOnly?: boolean }
): Promise<IHotelOrder[]> => {
  const query: Record<string, unknown> = { roomId };

  if (options?.activeOnly) {
    query.status = { $nin: ['delivered', 'completed', 'cancelled'] };
  }

  return HotelOrder.find(query).sort({ createdAt: -1 });
};

/**
 * Get orders by guest
 */
export const getOrdersByGuest = async (
  guestId: mongoose.Types.ObjectId | string
): Promise<IHotelOrder[]> => {
  return HotelOrder.find({ guestId }).sort({ createdAt: -1 });
};

/**
 * Get orders for hotel with filters
 */
export const getHotelOrders = async (
  hotelId: mongoose.Types.ObjectId | string,
  options?: {
    status?: HotelOrderStatus | HotelOrderStatus[];
    floor?: number;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }
): Promise<{ orders: IHotelOrder[]; total: number }> => {
  const { page = 1, limit = 20 } = options || {};
  const query: Record<string, unknown> = { hotelId };

  if (options?.status) {
    query.status = Array.isArray(options.status)
      ? { $in: options.status }
      : options.status;
  }

  if (options?.floor !== undefined) {
    query.floor = options.floor;
  }

  if (options?.startDate || options?.endDate) {
    query.createdAt = {};
    if (options.startDate) {(query.createdAt as Record<string, Date>).$gte = options.startDate;}
    if (options.endDate) {(query.createdAt as Record<string, Date>).$lte = options.endDate;}
  }

  const [orders, total] = await Promise.all([
    HotelOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('roomId', 'roomNumber floor building')
      .populate('guestId', 'name'),
    HotelOrder.countDocuments(query),
  ]);

  return { orders, total };
};

// ============================================
// Order Rating & Feedback
// ============================================

/**
 * Add rating to order
 */
export const addOrderRating = async (
  orderId: mongoose.Types.ObjectId | string,
  rating: number,
  feedback?: string
): Promise<IHotelOrder | null> => {
  const order = await HotelOrder.findById(orderId);
  if (!order) {return null;}

  if (!['delivered', 'completed'].includes(order.status)) {
    throw new Error('Can only rate delivered orders');
  }

  order.rating = rating;
  order.feedback = feedback;
  order.ratedAt = new Date();

  if (order.status === 'delivered') {
    order.status = 'completed';
  }

  await order.save();

  logger.info('Order rated', {
    orderId,
    orderNumber: order.orderNumber,
    rating,
  });

  return order;
};

// ============================================
// Order Statistics
// ============================================

/**
 * Get order statistics for hotel
 */
export const getOrderStats = async (
  hotelId: mongoose.Types.ObjectId | string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgDeliveryTime: number;
  avgRating: number;
  byStatus: Record<HotelOrderStatus, number>;
  byMenuType: Array<{ type: string; count: number; revenue: number }>;
  topDishes: Array<{ dishId: string; name: string; count: number; revenue: number }>;
}> => {
  const match: Record<string, unknown> = {
    hotelId: new mongoose.Types.ObjectId(hotelId.toString()),
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) {(match.createdAt as Record<string, Date>).$gte = startDate;}
    if (endDate) {(match.createdAt as Record<string, Date>).$lte = endDate;}
  }

  const [generalStats, statusStats, menuTypeStats, dishStats] = await Promise.all([
    // General statistics
    HotelOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          avgRating: { $avg: '$rating' },
        },
      },
    ]),
    // By status
    HotelOrder.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // By menu type
    HotelOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$menuType',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    // Top dishes
    HotelOrder.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.dishId',
          name: { $first: '$items.name.fr' },
          count: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Calculate average delivery time
  const deliveryTimeResult = await HotelOrder.aggregate([
    {
      $match: {
        ...match,
        status: { $in: ['delivered', 'completed'] },
        confirmedAt: { $exists: true },
        deliveredAt: { $exists: true },
      },
    },
    {
      $project: {
        deliveryTime: {
          $divide: [
            { $subtract: ['$deliveredAt', '$confirmedAt'] },
            60000, // Convert to minutes
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgDeliveryTime: { $avg: '$deliveryTime' },
      },
    },
  ]);

  const byStatus: Record<string, number> = {};
  for (const s of statusStats) {
    byStatus[s._id] = s.count;
  }

  return {
    totalOrders: generalStats[0]?.totalOrders || 0,
    totalRevenue: generalStats[0]?.totalRevenue || 0,
    avgOrderValue: generalStats[0]?.avgOrderValue || 0,
    avgDeliveryTime: deliveryTimeResult[0]?.avgDeliveryTime || 0,
    avgRating: generalStats[0]?.avgRating || 0,
    byStatus: byStatus as Record<HotelOrderStatus, number>,
    byMenuType: menuTypeStats.map((m) => ({
      type: m._id,
      count: m.count,
      revenue: m.revenue,
    })),
    topDishes: dishStats.map((d) => ({
      dishId: d._id.toString(),
      name: d.name,
      count: d.count,
      revenue: d.revenue,
    })),
  };
};

export default {
  createOrder,
  updateOrderStatus,
  cancelOrder,
  assignOrderToStaff,
  markOrderPickedUp,
  markOrderDelivered,
  getOrderById,
  getKitchenOrders,
  getReadyForDeliveryOrders,
  getStaffActiveOrders,
  getOrdersByRoom,
  getOrdersByGuest,
  getHotelOrders,
  addOrderRating,
  getOrderStats,
};
