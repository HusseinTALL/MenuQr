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
  id: string;
  type: 'order' | 'reservation' | 'review' | 'system';
  title: string;
  message: string;
  link?: string;
  createdAt: Date;
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

    // Handle leaving rooms
    socket.on('leave:restaurant', (restaurantId: string) => {
      socket.leave(`restaurant:${restaurantId}:public`);
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
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
};
