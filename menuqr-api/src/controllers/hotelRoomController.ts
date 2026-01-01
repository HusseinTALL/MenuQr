import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as roomService from '../services/hotelRoomService.js';
import { Hotel } from '../models/index.js';
import { RoomStatus } from '../models/Room.js';

// ============================================
// Room CRUD
// ============================================

/**
 * Create a new room
 * POST /api/hotels/:hotelId/rooms
 */
export const createRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to create rooms for this hotel');
  }

  const room = await roomService.createRoom(hotelId, req.body);

  // Update hotel total rooms count
  await Hotel.findByIdAndUpdate(hotelId, { $inc: { totalRooms: 1 } });

  res.status(201).json({
    success: true,
    message: 'Room created successfully',
    data: room,
  });
});

/**
 * Get room by ID
 * GET /api/hotels/:hotelId/rooms/:roomId
 */
export const getRoomById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { roomId } = req.params;

  const room = await roomService.getRoomById(roomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.json({
    success: true,
    data: room,
  });
});

/**
 * Get room by QR code (public - for guest app)
 * GET /api/hotels/rooms/qr/:qrCode
 */
export const getRoomByQRCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { qrCode } = req.params;

  const room = await roomService.getRoomByQRCode(qrCode);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  // Get hotel info for the room
  const hotel = await Hotel.findById(room.hotelId);
  if (!hotel || !hotel.isActive) {
    throw new ApiError(404, 'Hotel not found');
  }

  res.json({
    success: true,
    data: {
      room: {
        _id: room._id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        building: room.building,
        type: room.type,
        amenities: room.amenities,
      },
      hotel: {
        _id: hotel._id,
        name: hotel.name,
        slug: hotel.slug,
        logo: hotel.logo,
        settings: {
          defaultLanguage: hotel.settings?.defaultLanguage,
          supportedLanguages: (hotel.settings as unknown as Record<string, unknown>)?.supportedLanguages,
          currency: hotel.settings?.currency,
          roomService: hotel.settings?.roomService,
        },
      },
    },
  });
});

/**
 * Get rooms by hotel
 * GET /api/hotels/:hotelId/rooms
 */
export const getRoomsByHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { hotelId } = req.params;
  const { floor, status, building, type } = req.query;

  const rooms = await roomService.getRoomsByHotel(hotelId, {
    floor: floor ? Number(floor) : undefined,
    status: status as RoomStatus | undefined,
    building: building as string | undefined,
    type: type as string | undefined,
  });

  res.json({
    success: true,
    data: rooms,
  });
});

/**
 * Update room
 * PUT /api/hotels/:hotelId/rooms/:roomId
 */
export const updateRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to update rooms');
  }

  const room = await roomService.updateRoom(roomId, req.body);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.json({
    success: true,
    message: 'Room updated successfully',
    data: room,
  });
});

/**
 * Delete room (soft delete)
 * DELETE /api/hotels/:hotelId/rooms/:roomId
 */
export const deleteRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;

  // Verify hotel access - only owner or manager can delete
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to delete rooms');
  }

  const success = await roomService.deleteRoom(roomId);
  if (!success) {
    throw new ApiError(404, 'Room not found');
  }

  // Update hotel total rooms count
  await Hotel.findByIdAndUpdate(hotelId, { $inc: { totalRooms: -1 } });

  res.json({
    success: true,
    message: 'Room deleted successfully',
  });
});

// ============================================
// Room Status Management
// ============================================

/**
 * Update room status
 * PATCH /api/hotels/:hotelId/rooms/:roomId/status
 */
export const updateRoomStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;
  const { status, notes } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to update room status');
  }

  const room = await roomService.updateRoomStatus(roomId, status, notes);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.json({
    success: true,
    message: 'Room status updated successfully',
    data: room,
  });
});

/**
 * Get room status summary
 * GET /api/hotels/:hotelId/rooms/status-summary
 */
export const getRoomStatusSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to view room status');
  }

  const summary = await roomService.getRoomStatusSummary(hotelId);

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * Mark room as cleaned
 * POST /api/hotels/:hotelId/rooms/:roomId/cleaned
 */
export const markRoomCleaned = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const room = await roomService.markRoomCleaned(roomId, user.name);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.json({
    success: true,
    message: 'Room marked as cleaned',
    data: room,
  });
});

// ============================================
// Guest Assignment
// ============================================

/**
 * Check in guest to room
 * POST /api/hotels/:hotelId/rooms/:roomId/check-in
 */
export const checkInGuest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;
  const { guestId } = req.body;

  // Verify hotel access - reception, manager, or owner
  const validRoles = ['hotel_owner', 'hotel_manager', 'reception', 'superadmin'];
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to check in guests');
  }

  if (!validRoles.includes(user.role)) {
    throw new ApiError(403, 'Only reception staff can check in guests');
  }

  const room = await roomService.checkInGuest(roomId, guestId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.json({
    success: true,
    message: 'Guest checked in successfully',
    data: room,
  });
});

/**
 * Check out guest from room
 * POST /api/hotels/:hotelId/rooms/:roomId/check-out
 */
export const checkOutGuest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;

  // Verify hotel access
  const validRoles = ['hotel_owner', 'hotel_manager', 'reception', 'superadmin'];
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to check out guests');
  }

  if (!validRoles.includes(user.role)) {
    throw new ApiError(403, 'Only reception staff can check out guests');
  }

  const room = await roomService.checkOutGuest(roomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.json({
    success: true,
    message: 'Guest checked out successfully',
    data: room,
  });
});

// ============================================
// QR Code Management
// ============================================

/**
 * Regenerate room QR code
 * POST /api/hotels/:hotelId/rooms/:roomId/regenerate-qr
 */
export const regenerateQRCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;

  // Verify hotel access - only manager or owner
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (!['hotel_owner', 'hotel_manager', 'superadmin'].includes(user.role)) {
    throw new ApiError(403, 'Only managers can regenerate QR codes');
  }

  const qrCode = await roomService.regenerateQRCode(roomId);
  if (!qrCode) {
    throw new ApiError(404, 'Room not found');
  }

  res.json({
    success: true,
    message: 'QR code regenerated successfully',
    data: { qrCode },
  });
});

// ============================================
// Bulk Operations
// ============================================

/**
 * Bulk create rooms
 * POST /api/hotels/:hotelId/rooms/bulk
 */
export const bulkCreateRooms = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;
  const { rooms } = req.body;

  // Verify hotel access - only manager or owner
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (!['hotel_owner', 'hotel_manager', 'superadmin'].includes(user.role)) {
    throw new ApiError(403, 'Only managers can bulk create rooms');
  }

  if (!Array.isArray(rooms) || rooms.length === 0) {
    throw new ApiError(400, 'Rooms array is required');
  }

  const result = await roomService.bulkCreateRooms(hotelId, rooms);

  // Update hotel total rooms count
  await Hotel.findByIdAndUpdate(hotelId, { $inc: { totalRooms: result.created } });

  res.status(201).json({
    success: true,
    message: `Created ${result.created} rooms`,
    data: result,
  });
});

/**
 * Get rooms requiring attention
 * GET /api/hotels/:hotelId/rooms/attention
 */
export const getRoomsRequiringAttention = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const result = await roomService.getRoomsRequiringAttention(hotelId);

  res.json({
    success: true,
    data: result,
  });
});

export default {
  createRoom,
  getRoomById,
  getRoomByQRCode,
  getRoomsByHotel,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  getRoomStatusSummary,
  markRoomCleaned,
  checkInGuest,
  checkOutGuest,
  regenerateQRCode,
  bulkCreateRooms,
  getRoomsRequiringAttention,
};
