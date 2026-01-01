/**
 * Socket.io Service for Real-Time Features
 * Handles WebSocket connections for orders, notifications, and KDS
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// Types
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  restaurantId?: string;
}

interface OrderEventData {
  orderId: string;
  orderNumber: string;
  status: string;
  tableNumber?: string;
  items?: Array<{ name: string; quantity: number }>;
  total?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NotificationEventData {
  id?: string;
  type: 'order' | 'reservation' | 'review' | 'system' | 'delivery' | string;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
  createdAt?: Date;
}

interface ReservationEventData {
  reservationId: string;
  customerName: string;
  partySize: number;
  timeSlot: string;
  status: string;
  tableId?: string;
}

// Singleton instance
let io: Server | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        // Allow unauthenticated connections for public menu viewing
        logger.debug('Socket connected without auth (public)');
        return next();
      }

      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        role: string;
        restaurantId?: string;
      };

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.restaurantId = decoded.restaurantId;

      logger.debug('Socket authenticated', { userId: decoded.userId, role: decoded.role });
      next();
    } catch (error) {
      logger.warn('Socket authentication failed', { error });
      // Allow connection but mark as unauthenticated
      next();
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
    });

    // Join restaurant room if authenticated admin/staff
    if (socket.restaurantId && (socket.userRole === 'owner' || socket.userRole === 'admin' || socket.userRole === 'staff')) {
      socket.join(`restaurant:${socket.restaurantId}`);
      socket.join(`restaurant:${socket.restaurantId}:admin`);
      logger.debug('Socket joined restaurant admin room', { restaurantId: socket.restaurantId });
    }

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Handle joining restaurant room (for customers viewing menu)
    socket.on('join:restaurant', (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}:public`);
      logger.debug('Socket joined public restaurant room', { restaurantId });
    });

    // Handle joining order tracking room (for customers)
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
      logger.debug('Socket joined order room', { orderId });
    });

    // Handle KDS room join (kitchen display)
    socket.on('join:kds', (restaurantId: string) => {
      if (socket.restaurantId === restaurantId || socket.userRole === 'superadmin') {
        socket.join(`restaurant:${restaurantId}:kds`);
        logger.debug('Socket joined KDS room', { restaurantId });
      }
    });

    // Handle joining delivery tracking room (for customers tracking their delivery)
    socket.on('join:delivery', (deliveryId: string) => {
      socket.join(`delivery:${deliveryId}`);
      logger.debug('Socket joined delivery tracking room', { deliveryId });
    });

    // Handle driver location updates
    socket.on('driver:location:update', async (data: {
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
      accuracy?: number;
    }) => {
      if (socket.userId && socket.userRole === 'driver') {
        // Import dynamically to avoid circular dependency
        const { updateDriverLocation } = await import('./liveLocationService.js');
        await updateDriverLocation({
          driverId: socket.userId,
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
          speed: data.speed,
          accuracy: data.accuracy,
          timestamp: Date.now(),
        });
      }
    });

    // Handle leaving rooms
    socket.on('leave:restaurant', (restaurantId: string) => {
      socket.leave(`restaurant:${restaurantId}:public`);
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('leave:delivery', (deliveryId: string) => {
      socket.leave(`delivery:${deliveryId}`);
    });

    // Handle joining chat room for delivery
    socket.on('join:chat', (deliveryId: string) => {
      socket.join(`chat:${deliveryId}`);
      logger.debug('Socket joined chat room', { deliveryId, userId: socket.userId });
    });

    socket.on('leave:chat', (deliveryId: string) => {
      socket.leave(`chat:${deliveryId}`);
    });

    // Handle real-time chat messages
    socket.on('chat:send', async (data: {
      deliveryId: string;
      orderId: string;
      recipientType: 'driver' | 'customer' | 'restaurant' | 'all';
      content: string;
      messageType?: 'text' | 'image' | 'location';
      imageUrl?: string;
      location?: { lat: number; lng: number };
    }) => {
      if (!socket.userId) {
        socket.emit('chat:error', { message: 'Not authenticated' });
        return;
      }

      try {
        // Import dynamically to avoid circular dependency
        const chatService = await import('./chatService.js');

        // Determine sender type from socket role
        let senderType: 'driver' | 'customer' | 'restaurant' = 'customer';
        if (socket.userRole === 'driver') {
          senderType = 'driver';
        } else if (socket.userRole === 'owner' || socket.userRole === 'admin' || socket.userRole === 'staff') {
          senderType = 'restaurant';
        }

        await chatService.sendMessage({
          deliveryId: data.deliveryId,
          orderId: data.orderId,
          senderType,
          senderId: socket.userId,
          senderName: 'User', // Will be enriched by the service
          recipientType: data.recipientType,
          messageType: data.messageType || 'text',
          content: data.content,
          imageUrl: data.imageUrl,
          location: data.location,
        });
      } catch (error) {
        logger.error('Failed to send chat message via socket:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('chat:typing', (data: { deliveryId: string; isTyping: boolean }) => {
      if (!socket.userId) {return;}

      let senderType = 'customer';
      if (socket.userRole === 'driver') {
        senderType = 'driver';
      } else if (socket.userRole === 'owner' || socket.userRole === 'admin') {
        senderType = 'restaurant';
      }

      socket.to(`chat:${data.deliveryId}`).emit('chat:typing', {
        deliveryId: data.deliveryId,
        userId: socket.userId,
        userType: senderType,
        isTyping: data.isTyping,
      });
    });

    // Handle message read acknowledgment
    socket.on('chat:read', async (data: { deliveryId: string }) => {
      if (!socket.userId) {return;}

      try {
        const chatService = await import('./chatService.js');

        let readerType: 'driver' | 'customer' | 'restaurant' = 'customer';
        if (socket.userRole === 'driver') {
          readerType = 'driver';
        } else if (socket.userRole === 'owner' || socket.userRole === 'admin') {
          readerType = 'restaurant';
        }

        await chatService.markMessagesAsRead(data.deliveryId, readerType, socket.userId);
      } catch (error) {
        logger.error('Failed to mark messages as read:', error);
      }
    });

    // Handle order acknowledgement from KDS
    socket.on('order:acknowledge', (data: { orderId: string; restaurantId: string }) => {
      if (socket.restaurantId === data.restaurantId) {
        io?.to(`restaurant:${data.restaurantId}:kds`).emit('order:acknowledged', {
          orderId: data.orderId,
          acknowledgedBy: socket.userId,
          acknowledgedAt: new Date(),
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { socketId: socket.id, reason });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error', { socketId: socket.id, error });
    });
  });

  logger.info('Socket.io server initialized');
  return io;
}

/**
 * Get Socket.io instance
 */
export function getIO(): Server | null {
  return io;
}

// ===========================================
// Event Emitters
// ===========================================

/**
 * Emit new order event to restaurant admins and KDS
 */
export function emitNewOrder(restaurantId: string, orderData: OrderEventData): void {
  if (!io) {return;}

  // Emit to admin dashboard
  io.to(`restaurant:${restaurantId}:admin`).emit('order:new', orderData);

  // Emit to KDS
  io.to(`restaurant:${restaurantId}:kds`).emit('kds:new-order', {
    ...orderData,
    sound: 'new-order', // Signal to play sound
  });

  logger.debug('Emitted new order event', { restaurantId, orderId: orderData.orderId });
}

/**
 * Emit order status update
 */
export function emitOrderUpdate(restaurantId: string, orderData: OrderEventData): void {
  if (!io) {return;}

  // Emit to admin dashboard
  io.to(`restaurant:${restaurantId}:admin`).emit('order:updated', orderData);

  // Emit to KDS
  io.to(`restaurant:${restaurantId}:kds`).emit('kds:order-updated', orderData);

  // Emit to specific order room (for customer tracking)
  io.to(`order:${orderData.orderId}`).emit('order:status', {
    orderId: orderData.orderId,
    status: orderData.status,
    updatedAt: orderData.updatedAt,
  });

  logger.debug('Emitted order update event', { restaurantId, orderId: orderData.orderId, status: orderData.status });
}

/**
 * Emit order ready notification
 */
export function emitOrderReady(restaurantId: string, orderData: OrderEventData): void {
  if (!io) {return;}

  // Emit to order room for customer
  io.to(`order:${orderData.orderId}`).emit('order:ready', {
    orderId: orderData.orderId,
    orderNumber: orderData.orderNumber,
    message: `Votre commande #${orderData.orderNumber} est prête !`,
  });

  // Also update KDS
  io.to(`restaurant:${restaurantId}:kds`).emit('kds:order-ready', orderData);

  logger.debug('Emitted order ready event', { orderId: orderData.orderId });
}

/**
 * Emit notification to restaurant admins
 */
export function emitNotification(restaurantId: string, notification: NotificationEventData): void {
  if (!io) {return;}

  io.to(`restaurant:${restaurantId}:admin`).emit('notification:new', notification);

  logger.debug('Emitted notification', { restaurantId, type: notification.type });
}

/**
 * Emit notification to specific user
 */
export function emitUserNotification(userId: string, notification: NotificationEventData): void {
  if (!io) {return;}

  io.to(`user:${userId}`).emit('notification:new', notification);

  logger.debug('Emitted user notification', { userId, type: notification.type });
}

/**
 * Emit new reservation event
 */
export function emitNewReservation(restaurantId: string, reservation: ReservationEventData): void {
  if (!io) {return;}

  io.to(`restaurant:${restaurantId}:admin`).emit('reservation:new', reservation);

  // Also emit notification
  emitNotification(restaurantId, {
    id: `reservation-${reservation.reservationId}`,
    type: 'reservation',
    title: 'Nouvelle réservation',
    message: `${reservation.customerName} - ${reservation.partySize} personnes à ${reservation.timeSlot}`,
    link: '/admin/reservations',
    createdAt: new Date(),
  });

  logger.debug('Emitted new reservation event', { restaurantId, reservationId: reservation.reservationId });
}

/**
 * Emit reservation update
 */
export function emitReservationUpdate(restaurantId: string, reservation: ReservationEventData): void {
  if (!io) {return;}

  io.to(`restaurant:${restaurantId}:admin`).emit('reservation:updated', reservation);

  logger.debug('Emitted reservation update', { restaurantId, reservationId: reservation.reservationId });
}

/**
 * Emit new review event
 */
export function emitNewReview(restaurantId: string, reviewData: {
  reviewId: string;
  rating: number;
  comment?: string;
  customerName?: string;
}): void {
  if (!io) {return;}

  io.to(`restaurant:${restaurantId}:admin`).emit('review:new', reviewData);

  // Also emit notification
  emitNotification(restaurantId, {
    id: `review-${reviewData.reviewId}`,
    type: 'review',
    title: 'Nouvel avis',
    message: `${reviewData.customerName || 'Client'} a laissé un avis ${reviewData.rating}★`,
    link: '/admin/reviews',
    createdAt: new Date(),
  });

  logger.debug('Emitted new review event', { restaurantId, reviewId: reviewData.reviewId });
}

/**
 * Broadcast menu update to all customers viewing the menu
 */
export function emitMenuUpdate(restaurantId: string, updateType: 'dish' | 'category' | 'availability'): void {
  if (!io) {return;}

  io.to(`restaurant:${restaurantId}:public`).emit('menu:updated', {
    type: updateType,
    timestamp: new Date(),
  });

  logger.debug('Emitted menu update', { restaurantId, updateType });
}

/**
 * Get connected clients count for a restaurant
 */
export function getRestaurantClientsCount(restaurantId: string): number {
  if (!io) {return 0;}

  const adminRoom = io.sockets.adapter.rooms.get(`restaurant:${restaurantId}:admin`);
  const publicRoom = io.sockets.adapter.rooms.get(`restaurant:${restaurantId}:public`);

  return (adminRoom?.size || 0) + (publicRoom?.size || 0);
}

// ===========================================
// Delivery Event Emitters
// ===========================================

/**
 * Emit delivery status update
 */
export function emitDeliveryStatusUpdate(deliveryId: string, data: {
  status: string;
  driverName?: string;
  eta?: number;
  updatedAt: Date;
}): void {
  if (!io) {return;}

  io.to(`delivery:${deliveryId}`).emit('delivery:status', data);
  logger.debug('Emitted delivery status update', { deliveryId, status: data.status });
}

/**
 * Emit delivery assignment to driver
 */
export function emitDeliveryAssignment(driverId: string, deliveryData: {
  deliveryId: string;
  orderId: string;
  pickupAddress: { street: string; city: string };
  deliveryAddress: { street: string; city: string };
  estimatedEarnings: number;
  restaurantName: string;
}): void {
  if (!io) {return;}

  io.to(`user:${driverId}`).emit('delivery:assigned', deliveryData);
  logger.debug('Emitted delivery assignment', { driverId, deliveryId: deliveryData.deliveryId });
}

/**
 * Emit driver location update to delivery subscribers
 */
export function emitDriverLocation(deliveryId: string, location: {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  eta?: number;
}): void {
  if (!io) {return;}

  io.to(`delivery:${deliveryId}`).emit('driver:location', {
    deliveryId,
    location,
    timestamp: Date.now(),
  });
}

/**
 * Emit delivery completed event
 */
export function emitDeliveryCompleted(deliveryId: string, data: {
  orderId: string;
  completedAt: Date;
  podType?: string;
}): void {
  if (!io) {return;}

  io.to(`delivery:${deliveryId}`).emit('delivery:completed', data);
  logger.debug('Emitted delivery completed', { deliveryId });
}

export default {
  initializeSocket,
  getIO,
  emitNewOrder,
  emitOrderUpdate,
  emitOrderReady,
  emitNotification,
  emitUserNotification,
  emitNewReservation,
  emitReservationUpdate,
  emitNewReview,
  emitMenuUpdate,
  getRestaurantClientsCount,
  emitDeliveryStatusUpdate,
  emitDeliveryAssignment,
  emitDriverLocation,
  emitDeliveryCompleted,
};
