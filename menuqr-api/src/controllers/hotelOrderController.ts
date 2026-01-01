import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as orderService from '../services/hotelOrderService.js';
import { HotelOrder } from '../models/index.js';
import { HotelOrderStatus } from '../models/HotelOrder.js';

// ============================================
// Order Creation
// ============================================

/**
 * Create a new order (Guest)
 * POST /api/hotels/:hotelId/orders
 */
export const createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { hotelId } = req.params;
  const guest = req.hotelGuest;

  // Get guest info from token or request body
  const guestId = guest?._id;
  const guestName = guest?.name || req.body.guestName;
  const guestPhone = guest?.phone || req.body.guestPhone;
  const roomId = guest?.roomId || req.body.roomId;

  if (!roomId) {
    throw new ApiError(400, 'Room ID is required');
  }

  if (!guestName) {
    throw new ApiError(400, 'Guest name is required');
  }

  // Extract only allowed fields (prevent field injection)
  const {
    items,
    specialInstructions,
    paymentMethod,
    isScheduled,
    scheduledFor,
    menuId,
  } = req.body;

  const order = await orderService.createOrder({
    hotelId,
    roomId,
    guestId,
    guestName,
    guestPhone,
    items,
    specialInstructions,
    paymentMethod,
    isScheduled,
    scheduledFor,
    menuId,
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

/**
 * Create order as staff (for walk-in or phone orders)
 * POST /api/hotels/:hotelId/orders/staff
 */
export const createOrderAsStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const { roomId, guestName, guestPhone, items, ...rest } = req.body;

  if (!roomId || !guestName) {
    throw new ApiError(400, 'Room ID and guest name are required');
  }

  const order = await orderService.createOrder({
    hotelId,
    roomId,
    guestName,
    guestPhone,
    items,
    ...rest,
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

// ============================================
// Order Status Management
// ============================================

/**
 * Update order status
 * PATCH /api/hotels/:hotelId/orders/:orderId/status
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, orderId } = req.params;
  const { status } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (!status) {
    throw new ApiError(400, 'Status is required');
  }

  const order = await orderService.updateOrderStatus(orderId, status, {
    id: user._id.toString(),
    role: user.role,
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: order,
  });
});

/**
 * Cancel order
 * POST /api/hotels/:hotelId/orders/:orderId/cancel
 */
export const cancelOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const guest = req.hotelGuest;
  const { hotelId, orderId } = req.params;
  const { reason } = req.body;

  // Determine who is cancelling
  let cancelledBy: 'guest' | 'staff' | 'kitchen' | 'system' = 'system';

  if (guest) {
    // Guest cancelling their own order
    const order = await HotelOrder.findById(orderId);
    if (!order || order.guestId?.toString() !== guest._id.toString()) {
      throw new ApiError(403, 'Not authorized to cancel this order');
    }
    cancelledBy = 'guest';
  } else if (user) {
    // Staff cancelling
    if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
      throw new ApiError(403, 'Not authorized');
    }
    cancelledBy = user.role === 'hotel_kitchen' ? 'kitchen' : 'staff';
  } else {
    throw new ApiError(401, 'Authentication required');
  }

  const order = await orderService.cancelOrder(orderId, reason || 'No reason provided', cancelledBy);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: order,
  });
});

// ============================================
// Staff Assignment
// ============================================

/**
 * Assign order to staff
 * POST /api/hotels/:hotelId/orders/:orderId/assign
 */
export const assignOrderToStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, orderId } = req.params;
  const { staffId } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (!staffId) {
    throw new ApiError(400, 'Staff ID is required');
  }

  const order = await orderService.assignOrderToStaff(orderId, staffId);
  if (!order) {
    throw new ApiError(404, 'Order or staff not found');
  }

  res.json({
    success: true,
    message: 'Order assigned successfully',
    data: order,
  });
});

/**
 * Mark order as picked up
 * POST /api/hotels/:hotelId/orders/:orderId/pickup
 */
export const markOrderPickedUp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, orderId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  // Room service or concierge can pick up orders
  const validRoles = ['hotel_owner', 'hotel_manager', 'room_service', 'concierge', 'superadmin'];
  if (!validRoles.includes(user.role)) {
    throw new ApiError(403, 'Only room service staff can pick up orders');
  }

  const order = await orderService.markOrderPickedUp(orderId, user._id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({
    success: true,
    message: 'Order marked as picked up',
    data: order,
  });
});

/**
 * Mark order as delivered
 * POST /api/hotels/:hotelId/orders/:orderId/deliver
 */
export const markOrderDelivered = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, orderId } = req.params;
  const { recipientName, signature, photo } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const order = await orderService.markOrderDelivered(orderId, {
    recipientName,
    signature,
    photo,
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({
    success: true,
    message: 'Order marked as delivered',
    data: order,
  });
});

// ============================================
// Order Queries
// ============================================

/**
 * Get order by ID
 * GET /api/hotels/:hotelId/orders/:orderId
 */
export const getOrderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.params;
  const user = req.user;
  const guest = req.hotelGuest;

  const order = await orderService.getOrderById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check authorization
  if (guest) {
    // Guest can only view their own orders
    if (order.guestId?.toString() !== guest._id.toString()) {
      throw new ApiError(403, 'Not authorized to view this order');
    }
  } else if (user) {
    // Staff can view orders from their hotel
    if (user.hotelId?.toString() !== order.hotelId.toString() && user.role !== 'superadmin') {
      throw new ApiError(403, 'Not authorized to view this order');
    }
  } else {
    throw new ApiError(401, 'Authentication required');
  }

  res.json({
    success: true,
    data: order,
  });
});

/**
 * Get orders for kitchen display
 * GET /api/hotels/:hotelId/orders/kitchen
 */
export const getKitchenOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const orders = await orderService.getKitchenOrders(hotelId);

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * Get orders ready for delivery
 * GET /api/hotels/:hotelId/orders/ready
 */
export const getReadyOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const orders = await orderService.getReadyForDeliveryOrders(hotelId);

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * Get my active orders (staff)
 * GET /api/hotels/:hotelId/orders/my-active
 */
export const getMyActiveOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const orders = await orderService.getStaffActiveOrders(user._id);

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * Get orders by room
 * GET /api/hotels/:hotelId/rooms/:roomId/orders
 */
export const getOrdersByRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;
  const { activeOnly } = req.query;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const orders = await orderService.getOrdersByRoom(roomId, {
    activeOnly: activeOnly === 'true',
  });

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * Get guest's orders
 * GET /api/hotels/guest/orders
 */
export const getGuestOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const guest = req.hotelGuest;
  if (!guest) {
    throw new ApiError(401, 'Guest authentication required');
  }

  const orders = await orderService.getOrdersByGuest(guest._id);

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * Get hotel orders with filters
 * GET /api/hotels/:hotelId/orders
 */
export const getHotelOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;
  const { status, floor, startDate, endDate, page, limit } = req.query;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const result = await orderService.getHotelOrders(hotelId, {
    status: status as HotelOrderStatus | HotelOrderStatus[] | undefined,
    floor: floor ? Number(floor) : undefined,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json({
    success: true,
    data: {
      orders: result.orders,
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        total: result.total,
        pages: Math.ceil(result.total / (Number(limit) || 20)),
      },
    },
  });
});

// ============================================
// Order Rating & Feedback
// ============================================

/**
 * Add rating to order (Guest)
 * POST /api/hotels/:hotelId/orders/:orderId/rate
 */
export const addOrderRating = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const guest = req.hotelGuest;
  const { orderId } = req.params;
  const { rating, feedback } = req.body;

  if (!guest) {
    throw new ApiError(401, 'Guest authentication required');
  }

  // Verify guest owns this order
  const order = await HotelOrder.findById(orderId);
  if (!order || order.guestId?.toString() !== guest._id.toString()) {
    throw new ApiError(403, 'Not authorized to rate this order');
  }

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  const updatedOrder = await orderService.addOrderRating(orderId, rating, feedback);

  res.json({
    success: true,
    message: 'Rating added successfully',
    data: updatedOrder,
  });
});

// ============================================
// Order Statistics
// ============================================

/**
 * Get order statistics
 * GET /api/hotels/:hotelId/orders/stats
 */
export const getOrderStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;
  const { startDate, endDate } = req.query;

  // Verify hotel access - only managers can view stats
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (!['hotel_owner', 'hotel_manager', 'superadmin'].includes(user.role)) {
    throw new ApiError(403, 'Only managers can view order statistics');
  }

  const stats = await orderService.getOrderStats(
    hotelId,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  res.json({
    success: true,
    data: stats,
  });
});

export default {
  // Creation
  createOrder,
  createOrderAsStaff,
  // Status
  updateOrderStatus,
  cancelOrder,
  // Staff
  assignOrderToStaff,
  markOrderPickedUp,
  markOrderDelivered,
  // Queries
  getOrderById,
  getKitchenOrders,
  getReadyOrders,
  getMyActiveOrders,
  getOrdersByRoom,
  getGuestOrders,
  getHotelOrders,
  // Rating
  addOrderRating,
  // Stats
  getOrderStats,
};
