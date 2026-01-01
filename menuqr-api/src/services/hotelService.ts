import mongoose from 'mongoose';
import { Hotel, IHotel, IHotelSettings } from '../models/Hotel.js';
import { Room } from '../models/Room.js';
import { HotelGuest } from '../models/HotelGuest.js';
import { HotelOrder } from '../models/HotelOrder.js';
import { HotelMenu } from '../models/HotelMenu.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

// ============================================
// Hotel CRUD Operations
// ============================================

/**
 * Create a new hotel
 */
export const createHotel = async (
  data: Partial<IHotel>,
  ownerId: mongoose.Types.ObjectId
): Promise<IHotel> => {
  const hotel = await Hotel.create({
    ...data,
    ownerId,
  });

  logger.info('Hotel created', { hotelId: hotel._id, name: hotel.name });
  return hotel;
};

/**
 * Get hotel by ID
 */
export const getHotelById = async (
  hotelId: mongoose.Types.ObjectId | string
): Promise<IHotel | null> => {
  return Hotel.findById(hotelId);
};

/**
 * Get hotel by slug
 */
export const getHotelBySlug = async (slug: string): Promise<IHotel | null> => {
  return Hotel.findOne({ slug, isActive: true });
};

/**
 * Update hotel
 */
export const updateHotel = async (
  hotelId: mongoose.Types.ObjectId | string,
  data: Partial<IHotel>
): Promise<IHotel | null> => {
  const hotel = await Hotel.findByIdAndUpdate(hotelId, data, {
    new: true,
    runValidators: true,
  });

  if (hotel) {
    logger.info('Hotel updated', { hotelId: hotel._id });
  }

  return hotel;
};

/**
 * Update hotel settings
 */
export const updateHotelSettings = async (
  hotelId: mongoose.Types.ObjectId | string,
  settings: Partial<IHotelSettings>
): Promise<IHotel | null> => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {return null;}

  hotel.settings = {
    ...hotel.settings,
    ...settings,
  };

  await hotel.save();
  logger.info('Hotel settings updated', { hotelId });
  return hotel;
};

/**
 * Get hotels by owner
 */
export const getHotelsByOwner = async (
  ownerId: mongoose.Types.ObjectId | string
): Promise<IHotel[]> => {
  return Hotel.find({ ownerId, isActive: true }).sort({ createdAt: -1 });
};

/**
 * Get all hotels (admin)
 */
export const getAllHotels = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}): Promise<{ hotels: IHotel[]; total: number; pages: number }> => {
  const { page = 1, limit = 20, search, isActive } = options;

  const query: Record<string, unknown> = {};
  if (isActive !== undefined) {query.isActive = isActive;}
  if (search) {
    query.$or = [
      { 'name.fr': { $regex: search, $options: 'i' } },
      { 'name.en': { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [hotels, total] = await Promise.all([
    Hotel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('ownerId', 'name email'),
    Hotel.countDocuments(query),
  ]);

  return {
    hotels,
    total,
    pages: Math.ceil(total / limit),
  };
};

// ============================================
// Hotel Statistics
// ============================================

/**
 * Get hotel dashboard statistics
 */
export const getHotelStats = async (
  hotelId: mongoose.Types.ObjectId | string,
  _startDate?: Date,
  _endDate?: Date
): Promise<{
  rooms: { total: number; occupied: number; available: number; maintenance: number };
  guests: { current: number; checkingOutToday: number };
  orders: { today: number; pending: number; revenue: number };
  staff: { total: number; byRole: Record<string, number> };
}> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    roomStats,
    currentGuests,
    checkingOutToday,
    todayOrders,
    pendingOrders,
    staffCount,
  ] = await Promise.all([
    // Room statistics
    Room.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId.toString()) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    // Current guests
    HotelGuest.countDocuments({
      hotelId,
      isActive: true,
      checkInDate: { $lte: new Date() },
      checkOutDate: { $gte: new Date() },
    }),
    // Checking out today
    HotelGuest.countDocuments({
      hotelId,
      isActive: true,
      checkOutDate: { $gte: today, $lt: tomorrow },
    }),
    // Today's orders
    HotelOrder.aggregate([
      {
        $match: {
          hotelId: new mongoose.Types.ObjectId(hotelId.toString()),
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]),
    // Pending orders
    HotelOrder.countDocuments({
      hotelId,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
    }),
    // Staff count by role
    User.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId.toString()), isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Process room stats
  const roomStatusMap: Record<string, number> = {};
  let totalRooms = 0;
  for (const stat of roomStats) {
    roomStatusMap[stat._id] = stat.count;
    totalRooms += stat.count;
  }

  // Process staff stats
  const staffByRole: Record<string, number> = {};
  let totalStaff = 0;
  for (const stat of staffCount) {
    staffByRole[stat._id] = stat.count;
    totalStaff += stat.count;
  }

  return {
    rooms: {
      total: totalRooms,
      occupied: roomStatusMap['occupied'] || 0,
      available: roomStatusMap['vacant'] || 0,
      maintenance: roomStatusMap['maintenance'] || 0,
    },
    guests: {
      current: currentGuests,
      checkingOutToday,
    },
    orders: {
      today: todayOrders[0]?.count || 0,
      pending: pendingOrders,
      revenue: todayOrders[0]?.revenue || 0,
    },
    staff: {
      total: totalStaff,
      byRole: staffByRole,
    },
  };
};

/**
 * Get hotel revenue analytics
 */
export const getHotelRevenueAnalytics = async (
  hotelId: mongoose.Types.ObjectId | string,
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<Array<{ date: string; orders: number; revenue: number }>> => {
  const dateFormat =
    groupBy === 'day'
      ? '%Y-%m-%d'
      : groupBy === 'week'
        ? '%Y-W%V'
        : '%Y-%m';

  const result = await HotelOrder.aggregate([
    {
      $match: {
        hotelId: new mongoose.Types.ObjectId(hotelId.toString()),
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['delivered', 'completed'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result.map((r) => ({
    date: r._id,
    orders: r.orders,
    revenue: r.revenue,
  }));
};

// ============================================
// Hotel Staff Management
// ============================================

/**
 * Get hotel staff members
 */
export const getHotelStaff = async (
  hotelId: mongoose.Types.ObjectId | string
): Promise<Array<{
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}>> => {
  return User.find({ hotelId, isActive: true })
    .select('name email role isActive createdAt')
    .sort({ role: 1, name: 1 });
};

/**
 * Assign staff to hotel
 */
export const assignStaffToHotel = async (
  userId: mongoose.Types.ObjectId | string,
  hotelId: mongoose.Types.ObjectId | string,
  role: string
): Promise<boolean> => {
  const result = await User.findByIdAndUpdate(userId, {
    hotelId,
    role,
  });

  if (result) {
    logger.info('Staff assigned to hotel', { userId, hotelId, role });
    return true;
  }
  return false;
};

// ============================================
// Hotel Menus
// ============================================

/**
 * Get active menus for hotel
 */
export const getActiveMenus = async (
  hotelId: mongoose.Types.ObjectId | string
): Promise<Array<{
  _id: mongoose.Types.ObjectId;
  name: { fr: string; en?: string };
  type: string;
  isCurrentlyAvailable: boolean;
}>> => {
  const menus = await HotelMenu.find({ hotelId, isActive: true }).sort({ order: 1 });
  return menus.map((m) => ({
    _id: m._id,
    name: m.name,
    type: m.type,
    isCurrentlyAvailable: m.isCurrentlyAvailable,
  }));
};

export default {
  createHotel,
  getHotelById,
  getHotelBySlug,
  updateHotel,
  updateHotelSettings,
  getHotelsByOwner,
  getAllHotels,
  getHotelStats,
  getHotelRevenueAnalytics,
  getHotelStaff,
  assignStaffToHotel,
  getActiveMenus,
};
