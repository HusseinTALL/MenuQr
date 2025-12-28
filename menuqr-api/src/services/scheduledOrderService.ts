/**
 * Scheduled Order Service for MenuQR
 * Handles scheduled order availability, slots, and management
 */

import mongoose from 'mongoose';
import { Order, type IOrder, type FulfillmentType } from '../models/Order.js';
import { Restaurant, type IRestaurant } from '../models/Restaurant.js';
import { ApiError } from '../middleware/errorHandler.js';

// ============================================================================
// Types
// ============================================================================

export interface ScheduledSlot {
  time: string;
  available: boolean;
  remainingCapacity: number;
}

export interface AvailableDate {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  isOpen: boolean;
  slotsAvailable: number;
}

export interface ScheduledOrderSettings {
  enabled: boolean;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  slotDuration: number;
  maxOrdersPerSlot: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryRadius?: number;
  deliveryFee?: number;
  deliveryMinOrder?: number;
}

export interface CalendarDay {
  date: string;
  pickupCount: number;
  deliveryCount: number;
  totalRevenue: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * Parse time string to minutes from midnight
 */
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes to time string
 */
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get opening hours for a specific day
 */
const getOpeningHoursForDay = (
  restaurant: IRestaurant,
  dayOfWeek: number
): { open: string; close: string; isClosed: boolean } | null => {
  const dayName = DAYS_OF_WEEK[dayOfWeek];
  const hours = restaurant.openingHours?.find((h) => h.day === dayName);

  if (!hours || hours.isClosed) {
    return null;
  }

  return {
    open: hours.open,
    close: hours.close,
    isClosed: hours.isClosed,
  };
};

/**
 * Generate time slots for a given day
 */
const generateTimeSlots = (
  openTime: string,
  closeTime: string,
  slotDuration: number,
  minAdvanceMinutes: number,
  targetDate: Date
): string[] => {
  const slots: string[] = [];
  const now = new Date();
  const isToday = formatDate(targetDate) === formatDate(now);

  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);

  // Calculate earliest available slot time
  let startMinutes = openMinutes;
  if (isToday) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const earliestMinutes = currentMinutes + minAdvanceMinutes;
    startMinutes = Math.max(openMinutes, earliestMinutes);
    // Round up to next slot
    startMinutes = Math.ceil(startMinutes / slotDuration) * slotDuration;
  }

  // Generate slots
  for (let mins = startMinutes; mins < closeMinutes - slotDuration; mins += slotDuration) {
    slots.push(minutesToTime(mins));
  }

  return slots;
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get scheduled order settings for a restaurant
 */
export const getSettings = async (
  restaurantId: mongoose.Types.ObjectId
): Promise<ScheduledOrderSettings> => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouve');
  }

  const settings = restaurant.settings.scheduledOrders || {
    enabled: false,
    minAdvanceMinutes: 60,
    maxAdvanceDays: 7,
    slotDuration: 30,
    maxOrdersPerSlot: 5,
    pickupEnabled: true,
    deliveryEnabled: false,
  };

  return settings as ScheduledOrderSettings;
};

/**
 * Update scheduled order settings for a restaurant
 */
export const updateSettings = async (
  restaurantId: mongoose.Types.ObjectId,
  updates: Partial<ScheduledOrderSettings>
): Promise<ScheduledOrderSettings> => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouve');
  }

  // Merge with existing settings
  const currentSettings = restaurant.settings.scheduledOrders || {};
  const newSettings = { ...currentSettings, ...updates };

  restaurant.settings.scheduledOrders = newSettings as any;
  await restaurant.save();

  return newSettings as ScheduledOrderSettings;
};

/**
 * Get available dates for scheduled orders
 */
export const getAvailability = async (
  restaurantId: mongoose.Types.ObjectId,
  days: number = 14
): Promise<{ dates: AvailableDate[]; settings: Partial<ScheduledOrderSettings> }> => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouve');
  }

  const settings = restaurant.settings.scheduledOrders;
  if (!settings?.enabled) {
    throw new ApiError(400, 'Les commandes planifiees ne sont pas activees');
  }

  const maxDays = Math.min(days, settings.maxAdvanceDays || 7);
  const dates: AvailableDate[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < maxDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    const hours = getOpeningHoursForDay(restaurant, dayOfWeek);
    const isOpen = hours !== null;

    // Count available slots
    let slotsAvailable = 0;
    if (isOpen && hours) {
      const slots = generateTimeSlots(
        hours.open,
        hours.close,
        settings.slotDuration || 30,
        settings.minAdvanceMinutes || 60,
        date
      );

      // For each slot, check remaining capacity
      for (const slot of slots) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const ordersInSlot = await Order.countDocuments({
          restaurantId,
          isScheduled: true,
          scheduledFor: { $gte: startOfDay, $lte: endOfDay },
          scheduledSlot: slot,
          status: { $nin: ['cancelled', 'completed'] },
        });

        if (ordersInSlot < (settings.maxOrdersPerSlot || 5)) {
          slotsAvailable++;
        }
      }
    }

    dates.push({
      date: formatDate(date),
      dayOfWeek: DAYS_FR[dayOfWeek],
      isOpen,
      slotsAvailable,
    });
  }

  return {
    dates,
    settings: {
      maxAdvanceDays: settings.maxAdvanceDays,
      minAdvanceMinutes: settings.minAdvanceMinutes,
      slotDuration: settings.slotDuration,
    },
  };
};

/**
 * Get available time slots for a specific date
 */
export const getSlots = async (
  restaurantId: mongoose.Types.ObjectId,
  dateStr: string,
  fulfillmentType: FulfillmentType = 'pickup'
): Promise<ScheduledSlot[]> => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouve');
  }

  const settings = restaurant.settings.scheduledOrders;
  if (!settings?.enabled) {
    throw new ApiError(400, 'Les commandes planifiees ne sont pas activees');
  }

  // Check if fulfillment type is enabled
  if (fulfillmentType === 'pickup' && !settings.pickupEnabled) {
    throw new ApiError(400, 'Le retrait sur place nest pas active');
  }
  if (fulfillmentType === 'delivery' && !settings.deliveryEnabled) {
    throw new ApiError(400, 'La livraison nest pas activee');
  }

  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const hours = getOpeningHoursForDay(restaurant, dayOfWeek);

  if (!hours) {
    return [];
  }

  const slots = generateTimeSlots(
    hours.open,
    hours.close,
    settings.slotDuration || 30,
    settings.minAdvanceMinutes || 60,
    date
  );

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result: ScheduledSlot[] = [];

  for (const slot of slots) {
    const ordersInSlot = await Order.countDocuments({
      restaurantId,
      isScheduled: true,
      scheduledFor: { $gte: startOfDay, $lte: endOfDay },
      scheduledSlot: slot,
      status: { $nin: ['cancelled', 'completed'] },
    });

    const maxOrders = settings.maxOrdersPerSlot || 5;
    const remaining = Math.max(0, maxOrders - ordersInSlot);

    result.push({
      time: slot,
      available: remaining > 0,
      remainingCapacity: remaining,
    });
  }

  return result;
};

/**
 * Get scheduled orders for admin
 */
export const getScheduledOrders = async (
  restaurantId: mongoose.Types.ObjectId,
  params: {
    status?: string;
    fulfillmentType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ orders: IOrder[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
  const { status, fulfillmentType, dateFrom, dateTo, page = 1, limit = 20 } = params;

  const query: Record<string, unknown> = {
    restaurantId,
    isScheduled: true,
  };

  if (status) {
    query.status = status;
  }

  if (fulfillmentType) {
    query.fulfillmentType = fulfillmentType;
  }

  if (dateFrom || dateTo) {
    query.scheduledFor = {};
    if (dateFrom) {
      (query.scheduledFor as Record<string, Date>).$gte = new Date(dateFrom);
    }
    if (dateTo) {
      (query.scheduledFor as Record<string, Date>).$lte = new Date(dateTo);
    }
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .sort({ scheduledFor: 1, scheduledSlot: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    orders: orders as IOrder[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get calendar data for scheduled orders
 */
export const getCalendarData = async (
  restaurantId: mongoose.Types.ObjectId,
  monthStr?: string
): Promise<CalendarDay[]> => {
  // Parse month string or use current month
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (monthStr) {
    const parts = monthStr.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  }

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const orders = await Order.find({
    restaurantId,
    isScheduled: true,
    scheduledFor: { $gte: startOfMonth, $lte: endOfMonth },
  }).lean();

  // Group by date
  const dataByDate: Map<string, CalendarDay> = new Map();

  for (const order of orders) {
    if (!order.scheduledFor) {continue;}

    const dateStr = formatDate(order.scheduledFor);

    if (!dataByDate.has(dateStr)) {
      dataByDate.set(dateStr, {
        date: dateStr,
        pickupCount: 0,
        deliveryCount: 0,
        totalRevenue: 0,
      });
    }

    const dayData = dataByDate.get(dateStr)!;

    if (order.fulfillmentType === 'pickup') {
      dayData.pickupCount++;
    } else if (order.fulfillmentType === 'delivery') {
      dayData.deliveryCount++;
    }

    dayData.totalRevenue += order.total || 0;
  }

  return Array.from(dataByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get customer's scheduled orders
 */
export const getCustomerScheduledOrders = async (
  customerId: mongoose.Types.ObjectId,
  restaurantId: mongoose.Types.ObjectId,
  params: { page?: number; limit?: number }
): Promise<{ orders: IOrder[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
  const { page = 1, limit = 10 } = params;

  const query = {
    customerId,
    restaurantId,
    isScheduled: true,
  };

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .sort({ scheduledFor: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    orders: orders as IOrder[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Cancel a customer's scheduled order
 */
export const cancelCustomerScheduledOrder = async (
  orderId: mongoose.Types.ObjectId,
  customerId: mongoose.Types.ObjectId,
  reason?: string
): Promise<IOrder> => {
  const order = await Order.findOne({
    _id: orderId,
    customerId,
    isScheduled: true,
  });

  if (!order) {
    throw new ApiError(404, 'Commande non trouvee');
  }

  if (['completed', 'cancelled'].includes(order.status)) {
    throw new ApiError(400, 'Cette commande ne peut plus etre annulee');
  }

  // Check if it's too late to cancel (e.g., within 2 hours of scheduled time)
  if (order.scheduledFor) {
    const hoursUntilOrder = (order.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilOrder < 2) {
      throw new ApiError(400, 'Lannulation nest plus possible moins de 2h avant le retrait');
    }
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = reason || 'Annulee par le client';

  await order.save();

  return order;
};

export default {
  getSettings,
  updateSettings,
  getAvailability,
  getSlots,
  getScheduledOrders,
  getCalendarData,
  getCustomerScheduledOrders,
  cancelCustomerScheduledOrder,
};
