import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as hotelService from '../services/hotelService.js';
import { Hotel, User } from '../models/index.js';

// ============================================
// Hotel CRUD
// ============================================

/**
 * Create a new hotel
 * POST /api/hotels
 */
export const createHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  // Check if user already has a hotel
  const existingHotel = await Hotel.findOne({ ownerId: user._id });
  if (existingHotel) {
    throw new ApiError(409, 'You already have a hotel');
  }

  const hotel = await hotelService.createHotel(req.body, user._id);

  // Update user with hotel ID
  await User.findByIdAndUpdate(user._id, { hotelId: hotel._id });

  res.status(201).json({
    success: true,
    message: 'Hotel created successfully',
    data: hotel,
  });
});

/**
 * Get current user's hotel
 * GET /api/hotels/me
 */
export const getMyHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  if (!user.hotelId) {
    throw new ApiError(404, 'No hotel associated with your account');
  }

  const hotel = await hotelService.getHotelById(user.hotelId);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  res.json({
    success: true,
    data: hotel,
  });
});

/**
 * Get hotel by ID
 * GET /api/hotels/:id
 */
export const getHotelById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const hotel = await hotelService.getHotelById(id);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  res.json({
    success: true,
    data: hotel,
  });
});

/**
 * Get hotel by slug (public)
 * GET /api/hotels/slug/:slug
 */
export const getHotelBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const hotel = await hotelService.getHotelBySlug(slug);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  // Return limited public data
  res.json({
    success: true,
    data: {
      _id: hotel._id,
      name: hotel.name,
      slug: hotel.slug,
      description: hotel.description,
      logo: hotel.logo,
      images: hotel.images,
      address: hotel.address,
      phone: hotel.phone,
      email: hotel.email,
      starRating: hotel.starRating,
      settings: {
        defaultLanguage: hotel.settings?.defaultLanguage,
        supportedLanguages: (hotel.settings as unknown as Record<string, unknown>)?.supportedLanguages,
        currency: hotel.settings?.currency,
        roomService: (hotel.settings?.roomService as unknown as Record<string, unknown>)?.enabled
          ? {
              isEnabled: true,
              availableFrom: (hotel.settings?.roomService as unknown as Record<string, unknown>)?.availableFrom,
              availableTo: (hotel.settings?.roomService as unknown as Record<string, unknown>)?.availableTo,
              minOrderAmount: (hotel.settings?.roomService as unknown as Record<string, unknown>)?.minOrderAmount,
            }
          : undefined,
      },
    },
  });
});

/**
 * Update hotel
 * PUT /api/hotels/:id
 */
export const updateHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  // Check authorization
  const isOwner = hotel.ownerId.toString() === user._id.toString();
  const isSuperAdmin = user.role === 'superadmin';
  const isHotelManager = user.role === 'hotel_manager' && user.hotelId?.toString() === hotel._id.toString();

  if (!isOwner && !isSuperAdmin && !isHotelManager) {
    throw new ApiError(403, 'Not authorized to update this hotel');
  }

  const updatedHotel = await hotelService.updateHotel(id, req.body);

  res.json({
    success: true,
    message: 'Hotel updated successfully',
    data: updatedHotel,
  });
});

/**
 * Update hotel settings
 * PATCH /api/hotels/:id/settings
 */
export const updateHotelSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  // Check authorization - only owner or hotel manager
  const isOwner = hotel.ownerId.toString() === user._id.toString();
  const isSuperAdmin = user.role === 'superadmin';
  const isHotelManager = user.role === 'hotel_manager' && user.hotelId?.toString() === hotel._id.toString();

  if (!isOwner && !isSuperAdmin && !isHotelManager) {
    throw new ApiError(403, 'Not authorized to update hotel settings');
  }

  const updatedHotel = await hotelService.updateHotelSettings(id, req.body);

  res.json({
    success: true,
    message: 'Hotel settings updated successfully',
    data: updatedHotel,
  });
});

/**
 * Delete hotel (soft delete)
 * DELETE /api/hotels/:id
 */
export const deleteHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  // Only owner or super admin can delete
  const isOwner = hotel.ownerId.toString() === user._id.toString();
  const isSuperAdmin = user.role === 'superadmin';

  if (!isOwner && !isSuperAdmin) {
    throw new ApiError(403, 'Not authorized to delete this hotel');
  }

  await Hotel.findByIdAndUpdate(id, { isActive: false });

  res.json({
    success: true,
    message: 'Hotel deleted successfully',
  });
});

// ============================================
// Hotel Statistics
// ============================================

/**
 * Get hotel dashboard stats
 * GET /api/hotels/:id/stats
 */
export const getHotelStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  // Verify access
  if (user.hotelId?.toString() !== id && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to view hotel stats');
  }

  const stats = await hotelService.getHotelStats(id);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Get hotel revenue analytics
 * GET /api/hotels/:id/analytics/revenue
 */
export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { startDate, endDate, groupBy = 'day' } = req.query;

  // Verify access
  if (user.hotelId?.toString() !== id && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to view analytics');
  }

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const analytics = await hotelService.getHotelRevenueAnalytics(
    id,
    start,
    end,
    groupBy as 'day' | 'week' | 'month'
  );

  res.json({
    success: true,
    data: analytics,
  });
});

// ============================================
// Hotel Staff Management
// ============================================

/**
 * Get hotel staff members
 * GET /api/hotels/:id/staff
 */
export const getHotelStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  // Verify access - owner, manager, or super admin
  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  const isOwner = hotel.ownerId.toString() === user._id.toString();
  const isSuperAdmin = user.role === 'superadmin';
  const isHotelManager = ['hotel_owner', 'hotel_manager'].includes(user.role) &&
    user.hotelId?.toString() === hotel._id.toString();

  if (!isOwner && !isSuperAdmin && !isHotelManager) {
    throw new ApiError(403, 'Not authorized to view staff');
  }

  const staff = await hotelService.getHotelStaff(id);

  res.json({
    success: true,
    data: staff,
  });
});

/**
 * Assign staff to hotel
 * POST /api/hotels/:id/staff
 */
export const assignStaffToHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { userId, role } = req.body;

  // Verify access
  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  const isOwner = hotel.ownerId.toString() === user._id.toString();
  const isSuperAdmin = user.role === 'superadmin';
  const isHotelManager = user.role === 'hotel_manager' && user.hotelId?.toString() === hotel._id.toString();

  if (!isOwner && !isSuperAdmin && !isHotelManager) {
    throw new ApiError(403, 'Not authorized to assign staff');
  }

  // Validate role is a hotel role
  const validHotelRoles = ['hotel_manager', 'reception', 'room_service', 'hotel_kitchen', 'concierge'];
  if (!validHotelRoles.includes(role)) {
    throw new ApiError(400, 'Invalid hotel role');
  }

  const success = await hotelService.assignStaffToHotel(userId, id, role);
  if (!success) {
    throw new ApiError(400, 'Failed to assign staff');
  }

  res.json({
    success: true,
    message: 'Staff assigned successfully',
  });
});

/**
 * Remove staff from hotel
 * DELETE /api/hotels/:id/staff/:userId
 */
export const removeStaffFromHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id, userId } = req.params;

  // Verify access
  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, 'Hotel not found');
  }

  const isOwner = hotel.ownerId.toString() === user._id.toString();
  const isSuperAdmin = user.role === 'superadmin';

  if (!isOwner && !isSuperAdmin) {
    throw new ApiError(403, 'Not authorized to remove staff');
  }

  await User.findByIdAndUpdate(userId, {
    $unset: { hotelId: 1 },
    role: 'owner', // Reset to default role
  });

  res.json({
    success: true,
    message: 'Staff removed successfully',
  });
});

// ============================================
// Hotel Menus (summary)
// ============================================

/**
 * Get active menus for hotel
 * GET /api/hotels/:id/menus
 */
export const getActiveMenus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const hotel = await Hotel.findById(id);
  if (!hotel || !hotel.isActive) {
    throw new ApiError(404, 'Hotel not found');
  }

  const menus = await hotelService.getActiveMenus(id);

  res.json({
    success: true,
    data: menus,
  });
});

// ============================================
// Super Admin Routes
// ============================================

/**
 * Get all hotels (super admin only)
 * GET /api/superadmin/hotels
 */
export const getAllHotels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page, limit, search, isActive } = req.query;

  const result = await hotelService.getAllHotels({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string | undefined,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });

  res.json({
    success: true,
    data: {
      hotels: result.hotels,
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        total: result.total,
        pages: result.pages,
      },
    },
  });
});

export default {
  createHotel,
  getMyHotel,
  getHotelById,
  getHotelBySlug,
  updateHotel,
  updateHotelSettings,
  deleteHotel,
  getHotelStats,
  getRevenueAnalytics,
  getHotelStaff,
  assignStaffToHotel,
  removeStaffFromHotel,
  getActiveMenus,
  getAllHotels,
};
