import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as guestService from '../services/hotelGuestService.js';

// ============================================
// Guest Authentication (Public)
// ============================================

/**
 * Authenticate guest with access code (first login)
 * POST /api/hotels/:hotelId/guest/auth/access-code
 * Rate limited: 5 attempts before 30 minute lockout
 */
export const authenticateWithAccessCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { hotelId } = req.params;
  const { roomNumber, accessCode } = req.body;

  if (!roomNumber || !accessCode) {
    throw new ApiError(400, 'Room number and access code are required');
  }

  try {
    const result = await guestService.authenticateWithAccessCode(hotelId, roomNumber, accessCode);
    if (!result) {
      throw new ApiError(401, 'Invalid room number or access code');
    }

    res.json({
      success: true,
      message: 'Authentication successful',
      data: result,
    });
  } catch (error) {
    // Handle lockout errors with 429 Too Many Requests
    if (error instanceof Error && error.message.includes('locked')) {
      throw new ApiError(429, error.message);
    }
    throw error;
  }
});

/**
 * Authenticate guest with PIN
 * POST /api/hotels/:hotelId/guest/auth/pin
 * Rate limited: 5 attempts before 15 minute lockout
 */
export const authenticateWithPIN = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { hotelId } = req.params;
  const { roomNumber, pin } = req.body;

  if (!roomNumber || !pin) {
    throw new ApiError(400, 'Room number and PIN are required');
  }

  // Basic PIN format validation
  if (!/^\d{4}$/.test(pin)) {
    throw new ApiError(400, 'PIN must be exactly 4 digits');
  }

  try {
    const result = await guestService.authenticateWithPIN(hotelId, roomNumber, pin);
    if (!result) {
      throw new ApiError(401, 'Invalid room number or PIN');
    }

    res.json({
      success: true,
      message: 'Authentication successful',
      data: result,
    });
  } catch (error) {
    // Handle lockout errors with 429 Too Many Requests
    if (error instanceof Error && error.message.includes('locked') ||
        error instanceof Error && error.message.includes('Too many')) {
      throw new ApiError(429, error.message);
    }
    throw error;
  }
});

/**
 * Refresh guest token
 * POST /api/hotels/guest/auth/refresh
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  const result = await guestService.refreshGuestToken(refreshToken);
  if (!result) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Set or update guest PIN
 * POST /api/hotels/guest/auth/set-pin
 */
export const setGuestPIN = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const guest = req.hotelGuest;
  if (!guest) {
    throw new ApiError(401, 'Guest authentication required');
  }

  const { pin } = req.body;

  if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
    throw new ApiError(400, 'PIN must be 4 digits');
  }

  const success = await guestService.setGuestPIN(guest._id, pin);
  if (!success) {
    throw new ApiError(400, 'Failed to set PIN');
  }

  res.json({
    success: true,
    message: 'PIN set successfully',
  });
});

// ============================================
// Guest Profile (Authenticated Guest)
// ============================================

/**
 * Get current guest profile
 * GET /api/hotels/guest/me
 */
export const getMyProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const guest = req.hotelGuest;
  if (!guest) {
    throw new ApiError(401, 'Guest authentication required');
  }

  const guestData = await guestService.getGuestById(guest._id);
  if (!guestData) {
    throw new ApiError(404, 'Guest not found');
  }

  res.json({
    success: true,
    data: guestData,
  });
});

/**
 * Update guest preferences
 * PATCH /api/hotels/guest/me/preferences
 */
export const updateMyPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const guest = req.hotelGuest;
  if (!guest) {
    throw new ApiError(401, 'Guest authentication required');
  }

  const updatedGuest = await guestService.updateGuestPreferences(guest._id, req.body);
  if (!updatedGuest) {
    throw new ApiError(404, 'Guest not found');
  }

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: updatedGuest,
  });
});

/**
 * Get guest order history
 * GET /api/hotels/guest/me/orders
 */
export const getMyOrderHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const guest = req.hotelGuest;
  if (!guest) {
    throw new ApiError(401, 'Guest authentication required');
  }

  const history = await guestService.getGuestOrderHistory(guest._id);

  res.json({
    success: true,
    data: history,
  });
});

// ============================================
// Guest Management (Staff)
// ============================================

/**
 * Register a new guest
 * POST /api/hotels/:hotelId/guests
 */
export const registerGuest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to register guests');
  }

  // Only reception, manager, or owner can register guests
  const validRoles = ['hotel_owner', 'hotel_manager', 'reception', 'superadmin'];
  if (!validRoles.includes(user.role)) {
    throw new ApiError(403, 'Only reception staff can register guests');
  }

  // Extract only allowed fields (prevent field injection)
  // Note: roomNumber is fetched from Room by service, not passed in
  const {
    name,
    email,
    phone,
    reservationNumber,
    roomId,
    checkInDate,
    checkOutDate,
    pin,
  } = req.body;

  const { guest, accessCode } = await guestService.registerGuest({
    hotelId,
    name,
    email,
    phone,
    reservationNumber,
    roomId,
    checkInDate,
    checkOutDate,
    pin,
  });

  res.status(201).json({
    success: true,
    message: 'Guest registered successfully',
    data: {
      guest,
      accessCode, // Send access code to reception for guest
    },
  });
});

/**
 * Get guest by ID
 * GET /api/hotels/:hotelId/guests/:guestId
 */
export const getGuestById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, guestId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const guest = await guestService.getGuestById(guestId);
  if (!guest) {
    throw new ApiError(404, 'Guest not found');
  }

  res.json({
    success: true,
    data: guest,
  });
});

/**
 * Get guests by hotel
 * GET /api/hotels/:hotelId/guests
 */
export const getGuestsByHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;
  const { isActive, checkingOutToday, search, page, limit } = req.query;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const result = await guestService.getGuestsByHotel(hotelId, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    checkingOutToday: checkingOutToday === 'true',
    search: search as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json({
    success: true,
    data: {
      guests: result.guests,
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        total: result.total,
        pages: Math.ceil(result.total / (Number(limit) || 20)),
      },
    },
  });
});

/**
 * Update guest information
 * PUT /api/hotels/:hotelId/guests/:guestId
 */
export const updateGuest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, guestId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const guest = await guestService.updateGuest(guestId, req.body);
  if (!guest) {
    throw new ApiError(404, 'Guest not found');
  }

  res.json({
    success: true,
    message: 'Guest updated successfully',
    data: guest,
  });
});

/**
 * Check out guest
 * POST /api/hotels/:hotelId/guests/:guestId/check-out
 */
export const checkOutGuest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, guestId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  // Only reception, manager, or owner can check out guests
  const validRoles = ['hotel_owner', 'hotel_manager', 'reception', 'superadmin'];
  if (!validRoles.includes(user.role)) {
    throw new ApiError(403, 'Only reception staff can check out guests');
  }

  const success = await guestService.checkOutGuest(guestId);
  if (!success) {
    throw new ApiError(404, 'Guest not found');
  }

  res.json({
    success: true,
    message: 'Guest checked out successfully',
  });
});

/**
 * Transfer guest to another room
 * POST /api/hotels/:hotelId/guests/:guestId/transfer
 */
export const transferGuest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, guestId } = req.params;
  const { newRoomId } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  // Only reception, manager, or owner can transfer guests
  const validRoles = ['hotel_owner', 'hotel_manager', 'reception', 'superadmin'];
  if (!validRoles.includes(user.role)) {
    throw new ApiError(403, 'Only reception staff can transfer guests');
  }

  if (!newRoomId) {
    throw new ApiError(400, 'New room ID is required');
  }

  const guest = await guestService.transferGuestToRoom(guestId, newRoomId);
  if (!guest) {
    throw new ApiError(404, 'Guest or room not found');
  }

  res.json({
    success: true,
    message: 'Guest transferred successfully',
    data: guest,
  });
});

/**
 * Get current guest for a room
 * GET /api/hotels/:hotelId/rooms/:roomId/guest
 */
export const getCurrentGuestForRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, roomId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const guest = await guestService.getCurrentGuestForRoom(roomId);

  res.json({
    success: true,
    data: guest,
  });
});

export default {
  // Authentication
  authenticateWithAccessCode,
  authenticateWithPIN,
  refreshToken,
  setGuestPIN,
  // Guest Profile
  getMyProfile,
  updateMyPreferences,
  getMyOrderHistory,
  // Staff Management
  registerGuest,
  getGuestById,
  getGuestsByHotel,
  updateGuest,
  checkOutGuest,
  transferGuest,
  getCurrentGuestForRoom,
};
