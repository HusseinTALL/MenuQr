import mongoose from 'mongoose';
import crypto from 'crypto';
import { Room, IRoom, RoomStatus } from '../models/Room.js';
import { HotelGuest } from '../models/HotelGuest.js';
import logger from '../utils/logger.js';

// ============================================
// Room CRUD Operations
// ============================================

/**
 * Create a new room
 */
export const createRoom = async (
  hotelId: mongoose.Types.ObjectId | string,
  data: Partial<IRoom>
): Promise<IRoom> => {
  // Generate QR code if not provided
  const qrCode = data.qrCode || generateRoomQRCode(hotelId.toString(), data.roomNumber || '');

  const room = await Room.create({
    ...data,
    hotelId,
    qrCode,
  });

  logger.info('Room created', { hotelId, roomNumber: room.roomNumber });
  return room;
};

/**
 * Generate QR code for room
 */
const generateRoomQRCode = (hotelId: string, roomNumber: string): string => {
  const uniqueId = crypto.randomBytes(8).toString('hex');
  return `room_${hotelId}_${roomNumber}_${uniqueId}`;
};

/**
 * Get room by ID
 */
export const getRoomById = async (
  roomId: mongoose.Types.ObjectId | string
): Promise<IRoom | null> => {
  return Room.findById(roomId).populate('currentGuestId');
};

/**
 * Get room by QR code
 */
export const getRoomByQRCode = async (qrCode: string): Promise<IRoom | null> => {
  return Room.findOne({ qrCode }).populate('currentGuestId');
};

/**
 * Get rooms by hotel
 */
export const getRoomsByHotel = async (
  hotelId: mongoose.Types.ObjectId | string,
  options?: {
    floor?: number;
    status?: RoomStatus;
    building?: string;
    type?: string;
  }
): Promise<IRoom[]> => {
  const query: Record<string, unknown> = { hotelId };

  if (options?.floor !== undefined) {query.floor = options.floor;}
  if (options?.status) {query.status = options.status;}
  if (options?.building) {query.building = options.building;}
  if (options?.type) {query.type = options.type;}

  return Room.find(query)
    .populate('currentGuestId', 'name email phone')
    .sort({ building: 1, floor: 1, roomNumber: 1 });
};

/**
 * Update room
 */
export const updateRoom = async (
  roomId: mongoose.Types.ObjectId | string,
  data: Partial<IRoom>
): Promise<IRoom | null> => {
  const room = await Room.findByIdAndUpdate(roomId, data, {
    new: true,
    runValidators: true,
  });

  if (room) {
    logger.info('Room updated', { roomId, roomNumber: room.roomNumber });
  }

  return room;
};

/**
 * Delete room (soft delete - mark as blocked)
 */
export const deleteRoom = async (
  roomId: mongoose.Types.ObjectId | string
): Promise<boolean> => {
  const room = await Room.findById(roomId);
  if (!room) {return false;}

  // Check if room has active guest
  if (room.currentGuest?.guestId) {
    throw new Error('Cannot delete room with active guest');
  }

  room.status = 'blocked';
  room.isActive = false;
  await room.save();

  logger.info('Room deleted (blocked)', { roomId, roomNumber: room.roomNumber });
  return true;
};

// ============================================
// Room Status Management
// ============================================

/**
 * Update room status
 */
export const updateRoomStatus = async (
  roomId: mongoose.Types.ObjectId | string,
  status: RoomStatus,
  notes?: string
): Promise<IRoom | null> => {
  const room = await Room.findById(roomId);
  if (!room) {return null;}

  room.status = status;
  if (notes) {room.specialInstructions = notes;}

  await room.save();
  logger.info('Room status updated', { roomId, status });
  return room;
};

/**
 * Get room status summary for hotel
 */
export const getRoomStatusSummary = async (
  hotelId: mongoose.Types.ObjectId | string
): Promise<{
  total: number;
  byStatus: Record<RoomStatus, number>;
  byFloor: Array<{ floor: number; total: number; occupied: number; available: number }>;
}> => {
  const [statusCounts, floorCounts] = await Promise.all([
    Room.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId.toString()), isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Room.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId.toString()), isActive: true } },
      {
        $group: {
          _id: '$floor',
          total: { $sum: 1 },
          occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
          available: { $sum: { $cond: [{ $eq: ['$status', 'vacant'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byStatus: Record<string, number> = {
    vacant: 0,
    occupied: 0,
    checkout: 0,
    maintenance: 0,
    blocked: 0,
    cleaning: 0,
  };

  let total = 0;
  for (const stat of statusCounts) {
    byStatus[stat._id] = stat.count;
    total += stat.count;
  }

  return {
    total,
    byStatus: byStatus as Record<RoomStatus, number>,
    byFloor: floorCounts.map((f) => ({
      floor: f._id,
      total: f.total,
      occupied: f.occupied,
      available: f.available,
    })),
  };
};

// ============================================
// Guest Assignment
// ============================================

/**
 * Check in guest to room
 */
export const checkInGuest = async (
  roomId: mongoose.Types.ObjectId | string,
  guestId: mongoose.Types.ObjectId | string
): Promise<IRoom | null> => {
  const room = await Room.findById(roomId);
  if (!room) {return null;}

  if (room.status === 'occupied') {
    throw new Error('Room is already occupied');
  }

  if (room.status === 'maintenance' || room.status === 'blocked') {
    throw new Error('Room is not available');
  }

  room.status = 'occupied';
  room.currentGuestId = new mongoose.Types.ObjectId(guestId.toString());
  room.lastCheckIn = new Date();

  await room.save();
  logger.info('Guest checked in', { roomId, guestId });
  return room;
};

/**
 * Check out guest from room
 */
export const checkOutGuest = async (
  roomId: mongoose.Types.ObjectId | string
): Promise<IRoom | null> => {
  const room = await Room.findById(roomId);
  if (!room) {return null;}

  // Mark guest as checked out
  if (room.currentGuestId) {
    await HotelGuest.findByIdAndUpdate(room.currentGuestId, {
      isActive: false,
      checkedOutAt: new Date(),
    });
  }

  room.status = 'checkout';
  room.currentGuestId = undefined;
  room.lastCheckOut = new Date();

  await room.save();
  logger.info('Guest checked out', { roomId });
  return room;
};

/**
 * Mark room as cleaned
 */
export const markRoomCleaned = async (
  roomId: mongoose.Types.ObjectId | string,
  cleanedBy?: string
): Promise<IRoom | null> => {
  const room = await Room.findById(roomId);
  if (!room) {return null;}

  room.status = 'vacant';
  room.lastCleaned = new Date();
  if (cleanedBy) {room.specialInstructions = `Cleaned by ${cleanedBy}`;}

  await room.save();
  logger.info('Room marked as cleaned', { roomId });
  return room;
};

// ============================================
// QR Code Management
// ============================================

/**
 * Regenerate room QR code
 */
export const regenerateQRCode = async (
  roomId: mongoose.Types.ObjectId | string
): Promise<string | null> => {
  const room = await Room.findById(roomId);
  if (!room) {return null;}

  const newQRCode = generateRoomQRCode(room.hotelId.toString(), room.roomNumber);
  room.qrCode = newQRCode;
  await room.save();

  logger.info('Room QR code regenerated', { roomId, roomNumber: room.roomNumber });
  return newQRCode;
};

/**
 * Bulk create rooms
 */
export const bulkCreateRooms = async (
  hotelId: mongoose.Types.ObjectId | string,
  rooms: Array<{
    roomNumber: string;
    floor: number;
    type?: 'standard' | 'superior' | 'deluxe' | 'suite' | 'penthouse' | 'studio' | 'apartment';
    building?: string;
  }>
): Promise<{ created: number; errors: Array<{ roomNumber: string; error: string }> }> => {
  const results = {
    created: 0,
    errors: [] as Array<{ roomNumber: string; error: string }>,
  };

  for (const roomData of rooms) {
    try {
      await createRoom(hotelId, roomData);
      results.created++;
    } catch (error) {
      results.errors.push({
        roomNumber: roomData.roomNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info('Bulk room creation completed', {
    hotelId,
    created: results.created,
    errors: results.errors.length,
  });

  return results;
};

/**
 * Get rooms requiring attention
 */
export const getRoomsRequiringAttention = async (
  hotelId: mongoose.Types.ObjectId | string
): Promise<{
  needsCleaning: IRoom[];
  maintenance: IRoom[];
  checkingOutToday: IRoom[];
}> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [needsCleaning, maintenance, checkingOutTodayGuests] = await Promise.all([
    Room.find({
      hotelId,
      status: { $in: ['checkout', 'cleaning'] },
      isActive: true,
    }),
    Room.find({
      hotelId,
      status: 'maintenance',
      isActive: true,
    }),
    HotelGuest.find({
      hotelId,
      isActive: true,
      checkOutDate: { $gte: today, $lt: tomorrow },
    }).select('roomId'),
  ]);

  const checkoutRoomIds = checkingOutTodayGuests.map((g) => g.roomId);
  const checkingOutToday = await Room.find({
    _id: { $in: checkoutRoomIds },
    status: 'occupied',
  }).populate('currentGuestId', 'name checkOutDate');

  return {
    needsCleaning,
    maintenance,
    checkingOutToday,
  };
};

export default {
  createRoom,
  getRoomById,
  getRoomByQRCode,
  getRoomsByHotel,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  getRoomStatusSummary,
  checkInGuest,
  checkOutGuest,
  markRoomCleaned,
  regenerateQRCode,
  bulkCreateRooms,
  getRoomsRequiringAttention,
};
