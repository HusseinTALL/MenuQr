import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { HotelGuest, IHotelGuest } from '../models/HotelGuest.js';
import { Room } from '../models/Room.js';
import { HotelOrder } from '../models/HotelOrder.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// ============================================
// Guest Registration & Authentication
// ============================================

/**
 * Register a new hotel guest
 */
export const registerGuest = async (data: {
  hotelId: mongoose.Types.ObjectId | string;
  roomId: mongoose.Types.ObjectId | string;
  name: string;
  email?: string;
  phone?: string;
  reservationNumber?: string;
  checkInDate: Date;
  checkOutDate: Date;
  pin?: string;
}): Promise<{ guest: IHotelGuest; accessCode: string }> => {
  const room = await Room.findById(data.roomId);
  if (!room) {
    throw new Error('Room not found');
  }

  // Generate access code for first-time login
  const accessCode = generateAccessCode();

  const guest = await HotelGuest.create({
    hotelId: data.hotelId,
    roomId: data.roomId,
    roomNumber: room.roomNumber,
    name: data.name,
    email: data.email,
    phone: data.phone,
    reservationNumber: data.reservationNumber,
    checkInDate: data.checkInDate,
    checkOutDate: data.checkOutDate,
    pin: data.pin,
    accessCode,
    isVerified: false,
  });

  // Assign guest to room
  await Room.findByIdAndUpdate(data.roomId, {
    status: 'occupied',
    currentGuestId: guest._id,
    lastCheckIn: new Date(),
  });

  logger.info('Guest registered', { guestId: guest._id, roomNumber: room.roomNumber });

  return { guest, accessCode };
};

/**
 * Generate access code for guest
 */
const generateAccessCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Authenticate guest with access code (first login)
 * Includes rate limiting to prevent brute force attacks
 */
export const authenticateWithAccessCode = async (
  hotelId: mongoose.Types.ObjectId | string,
  roomNumber: string,
  accessCode: string
): Promise<{ guest: IHotelGuest; token: string; refreshToken: string; remainingAttempts?: number } | null> => {
  const guest = await HotelGuest.findOne({
    hotelId,
    roomNumber,
    isActive: true,
  }).select('+accessCode +pin +failedAccessCodeAttempts +accessCodeLockedUntil');

  if (!guest) {return null;}

  // Check if account is locked
  if (guest.isAccessCodeLocked()) {
    const unlockTime = guest.accessCodeLockedUntil!;
    const minutesRemaining = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);
    throw new Error(`Account locked. Try again in ${minutesRemaining} minutes.`);
  }

  const isValid = await guest.compareAccessCode(accessCode);
  if (!isValid) {
    // Record failed attempt
    await guest.recordFailedAccessCodeAttempt();
    const remainingAttempts = Math.max(0, 5 - guest.failedAccessCodeAttempts);

    if (remainingAttempts === 0) {
      throw new Error('Too many failed attempts. Account locked for 30 minutes.');
    }

    logger.warn('Failed access code attempt', {
      hotelId,
      roomNumber,
      attempts: guest.failedAccessCodeAttempts,
      remainingAttempts
    });
    return null;
  }

  // Reset failed attempts on successful login
  if (guest.failedAccessCodeAttempts > 0) {
    await guest.resetAccessCodeAttempts();
  }

  // Mark as verified
  guest.isVerified = true;
  guest.lastLoginAt = new Date();

  // Generate tokens
  const { token, refreshToken } = generateGuestTokens(guest);
  guest.refreshToken = refreshToken;
  await guest.save();

  logger.info('Guest authenticated with access code', { guestId: guest._id });

  // Return guest without sensitive fields
  const guestObj = guest.toObject();
  const {
    accessCode: _ac,
    pin: _pin,
    refreshToken: _rt,
    failedAccessCodeAttempts: _faca,
    accessCodeLockedUntil: _aclu,
    failedPinAttempts: _fpa,
    pinLockedUntil: _plu,
    ...safeGuest
  } = guestObj;

  return { guest: safeGuest as unknown as IHotelGuest, token, refreshToken };
};

/**
 * Authenticate guest with PIN
 * Includes rate limiting to prevent brute force attacks
 * - 5 attempts allowed before lockout
 * - 15 minute lockout after 5 failed attempts
 */
export const authenticateWithPIN = async (
  hotelId: mongoose.Types.ObjectId | string,
  roomNumber: string,
  pin: string
): Promise<{ guest: IHotelGuest; token: string; refreshToken: string; remainingAttempts?: number } | null> => {
  const guest = await HotelGuest.findOne({
    hotelId,
    roomNumber,
    isActive: true,
    isVerified: true,
  }).select('+pin +failedPinAttempts +pinLockedUntil +lastFailedPinAttempt');

  if (!guest || !guest.pin) {return null;}

  // Check if account is locked due to too many failed attempts
  if (guest.isPinLocked()) {
    const unlockTime = guest.pinLockedUntil!;
    const minutesRemaining = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);
    throw new Error(`Too many failed attempts. Account locked for ${minutesRemaining} more minutes.`);
  }

  const isValid = await guest.comparePin(pin);
  if (!isValid) {
    // Record failed attempt
    await guest.recordFailedPinAttempt();
    const remainingAttempts = Math.max(0, 5 - guest.failedPinAttempts);

    if (remainingAttempts === 0) {
      throw new Error('Too many failed attempts. Account locked for 15 minutes.');
    }

    logger.warn('Failed PIN attempt', {
      guestId: guest._id,
      roomNumber,
      attempts: guest.failedPinAttempts,
      remainingAttempts
    });
    return null;
  }

  // Reset failed attempts on successful login
  if (guest.failedPinAttempts > 0) {
    await guest.resetPinAttempts();
  }

  guest.lastLoginAt = new Date();

  // Generate tokens
  const { token, refreshToken } = generateGuestTokens(guest);
  guest.refreshToken = refreshToken;
  await guest.save();

  logger.info('Guest authenticated with PIN', { guestId: guest._id });

  // Return guest without sensitive fields
  const guestObj = guest.toObject();
  const {
    pin: _pin,
    refreshToken: _rt,
    failedPinAttempts: _fpa,
    pinLockedUntil: _plu,
    lastFailedPinAttempt: _lfpa,
    failedAccessCodeAttempts: _faca,
    accessCodeLockedUntil: _aclu,
    accessCode: _ac,
    ...safeGuest
  } = guestObj;

  return { guest: safeGuest as unknown as IHotelGuest, token, refreshToken };
};

/**
 * Generate JWT tokens for guest
 */
const generateGuestTokens = (
  guest: IHotelGuest
): { token: string; refreshToken: string } => {
  const token = jwt.sign(
    {
      guestId: guest._id,
      hotelId: guest.hotelId,
      roomId: guest.roomId,
      roomNumber: guest.roomNumber,
      type: 'hotel_guest',
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { guestId: guest._id, type: 'hotel_guest_refresh' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  return { token, refreshToken };
};

/**
 * Set or update guest PIN
 */
export const setGuestPIN = async (
  guestId: mongoose.Types.ObjectId | string,
  pin: string
): Promise<boolean> => {
  const guest = await HotelGuest.findById(guestId);
  if (!guest) {return false;}

  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    throw new Error('PIN must be 4 digits');
  }

  guest.pin = pin;
  await guest.save();

  logger.info('Guest PIN updated', { guestId });
  return true;
};

/**
 * Refresh guest token
 */
export const refreshGuestToken = async (
  refreshToken: string
): Promise<{ token: string; refreshToken: string } | null> => {
  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as {
      guestId: string;
      type: string;
    };

    if (decoded.type !== 'hotel_guest_refresh') {return null;}

    const guest = await HotelGuest.findById(decoded.guestId).select('+refreshToken');
    if (!guest || guest.refreshToken !== refreshToken) {return null;}

    // Check if stay is still active
    const now = new Date();
    if (guest.checkOutDate < now || !guest.isActive) {
      return null;
    }

    const tokens = generateGuestTokens(guest);
    guest.refreshToken = tokens.refreshToken;
    await guest.save();

    return tokens;
  } catch {
    return null;
  }
};

// ============================================
// Guest Management
// ============================================

/**
 * Get guest by ID
 */
export const getGuestById = async (
  guestId: mongoose.Types.ObjectId | string
): Promise<IHotelGuest | null> => {
  return HotelGuest.findById(guestId).populate('roomId');
};

/**
 * Get current guest for room
 */
export const getCurrentGuestForRoom = async (
  roomId: mongoose.Types.ObjectId | string
): Promise<IHotelGuest | null> => {
  return HotelGuest.findOne({
    roomId,
    isActive: true,
    checkOutDate: { $gte: new Date() },
  });
};

/**
 * Get guests by hotel
 */
export const getGuestsByHotel = async (
  hotelId: mongoose.Types.ObjectId | string,
  options?: {
    isActive?: boolean;
    checkingOutToday?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ guests: IHotelGuest[]; total: number }> => {
  const { page = 1, limit = 20 } = options || {};
  const query: Record<string, unknown> = { hotelId };

  if (options?.isActive !== undefined) {
    query.isActive = options.isActive;
  }

  if (options?.checkingOutToday) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    query.checkOutDate = { $gte: today, $lt: tomorrow };
  }

  if (options?.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { email: { $regex: options.search, $options: 'i' } },
      { roomNumber: { $regex: options.search, $options: 'i' } },
      { reservationNumber: { $regex: options.search, $options: 'i' } },
    ];
  }

  const [guests, total] = await Promise.all([
    HotelGuest.find(query)
      .populate('roomId', 'roomNumber floor building')
      .sort({ checkInDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    HotelGuest.countDocuments(query),
  ]);

  return { guests, total };
};

/**
 * Update guest information
 */
export const updateGuest = async (
  guestId: mongoose.Types.ObjectId | string,
  data: Partial<IHotelGuest>
): Promise<IHotelGuest | null> => {
  // Prevent updating sensitive fields
  const { pin: _pin, accessCode: _ac, refreshToken: _rt, ...safeData } = data as Record<string, unknown>;

  return HotelGuest.findByIdAndUpdate(guestId, safeData, {
    new: true,
    runValidators: true,
  });
};

/**
 * Update guest preferences
 */
export const updateGuestPreferences = async (
  guestId: mongoose.Types.ObjectId | string,
  preferences: {
    language?: string;
    dietaryPreferences?: string[];
    allergens?: string[];
    deliveryPreferences?: {
      leaveAtDoor?: boolean;
      callBeforeDelivery?: boolean;
      defaultTip?: number;
    };
  }
): Promise<IHotelGuest | null> => {
  const guest = await HotelGuest.findById(guestId);
  if (!guest) {return null;}

  if (preferences.language) {guest.language = preferences.language;}
  if (preferences.dietaryPreferences) {guest.dietaryPreferences = preferences.dietaryPreferences;}
  if (preferences.allergens) {guest.allergens = preferences.allergens;}
  if (preferences.deliveryPreferences) {
    guest.deliveryPreferences = {
      leaveAtDoor: guest.deliveryPreferences?.leaveAtDoor ?? false,
      callBeforeDelivery: guest.deliveryPreferences?.callBeforeDelivery ?? true,
      defaultTip: guest.deliveryPreferences?.defaultTip,
      ...preferences.deliveryPreferences,
    };
  }

  await guest.save();
  return guest;
};

/**
 * Check out guest
 */
export const checkOutGuest = async (
  guestId: mongoose.Types.ObjectId | string
): Promise<boolean> => {
  const guest = await HotelGuest.findById(guestId);
  if (!guest) {return false;}

  // Check for pending orders
  const pendingOrders = await HotelOrder.countDocuments({
    guestId,
    status: { $nin: ['delivered', 'completed', 'cancelled'] },
  });

  if (pendingOrders > 0) {
    throw new Error(`Guest has ${pendingOrders} pending orders`);
  }

  // Update guest
  guest.isActive = false;
  guest.checkedOutAt = new Date();
  await guest.save();

  // Update room
  await Room.findByIdAndUpdate(guest.roomId, {
    status: 'checkout',
    currentGuestId: null,
    lastCheckOut: new Date(),
  });

  logger.info('Guest checked out', { guestId, roomNumber: guest.roomNumber });
  return true;
};

/**
 * Transfer guest to another room
 */
export const transferGuestToRoom = async (
  guestId: mongoose.Types.ObjectId | string,
  newRoomId: mongoose.Types.ObjectId | string
): Promise<IHotelGuest | null> => {
  const [guest, newRoom] = await Promise.all([
    HotelGuest.findById(guestId),
    Room.findById(newRoomId),
  ]);

  if (!guest || !newRoom) {return null;}

  if (newRoom.status !== 'vacant') {
    throw new Error('New room is not available');
  }

  const oldRoomId = guest.roomId;

  // Update guest
  guest.roomId = newRoom._id;
  guest.roomNumber = newRoom.roomNumber;
  await guest.save();

  // Update old room
  await Room.findByIdAndUpdate(oldRoomId, {
    status: 'checkout',
    currentGuestId: null,
    lastCheckOut: new Date(),
  });

  // Update new room
  await Room.findByIdAndUpdate(newRoomId, {
    status: 'occupied',
    currentGuestId: guest._id,
    lastCheckIn: new Date(),
  });

  logger.info('Guest transferred', {
    guestId,
    fromRoom: oldRoomId,
    toRoom: newRoomId,
  });

  return guest;
};

// ============================================
// Guest Statistics
// ============================================

/**
 * Get guest order history
 */
export const getGuestOrderHistory = async (
  guestId: mongoose.Types.ObjectId | string
): Promise<{
  orders: Array<{
    _id: mongoose.Types.ObjectId;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: Date;
  }>;
  totalSpent: number;
  orderCount: number;
}> => {
  const orders = await HotelOrder.find({ guestId })
    .select('orderNumber status total createdAt')
    .sort({ createdAt: -1 });

  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);

  return {
    orders: orders.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
    })),
    totalSpent,
    orderCount: orders.length,
  };
};

export default {
  registerGuest,
  authenticateWithAccessCode,
  authenticateWithPIN,
  setGuestPIN,
  refreshGuestToken,
  getGuestById,
  getCurrentGuestForRoom,
  getGuestsByHotel,
  updateGuest,
  updateGuestPreferences,
  checkOutGuest,
  transferGuestToRoom,
  getGuestOrderHistory,
};
