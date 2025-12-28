/**
 * Reservation Service for MenuQR
 * Handles table reservations, availability, table assignment, and notifications
 */

import mongoose from 'mongoose';
import {
  Reservation,
  type IReservation,
  type ReservationStatus,
  type LocationPreference,
} from '../models/Reservation.js';
import { Table, type ITable } from '../models/Table.js';
import { Restaurant, type IRestaurant } from '../models/Restaurant.js';
import { Dish } from '../models/Dish.js';
import { smsService } from './smsService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface TimeSlot {
  time: string;
  available: boolean;
  tablesAvailable: number;
}

export interface AvailableDate {
  date: string; // YYYY-MM-DD
  available: boolean;
  slotsAvailable: number;
}

export interface ReservationStats {
  total: number;
  byStatus: Record<ReservationStatus, number>;
  byLocation: Record<LocationPreference, number>;
  avgPartySize: number;
  noShowRate: number;
  preOrderRate: number;
  preOrderRevenue: number;
}

export interface CreateReservationData {
  restaurantId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  reservationDate: Date;
  timeSlot: string;
  partySize: number;
  duration?: number;
  locationPreference?: LocationPreference;
  specialRequests?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  preOrder?: {
    items: {
      dishId: mongoose.Types.ObjectId;
      quantity: number;
      options?: { name: string; choice: string; price: number }[];
      notes?: string;
    }[];
    notes?: string;
  };
}

export interface UpdateReservationData {
  reservationDate?: Date;
  timeSlot?: string;
  partySize?: number;
  duration?: number;
  locationPreference?: LocationPreference;
  specialRequests?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  tableId?: mongoose.Types.ObjectId;
}

// ============================================================================
// Helper Functions
// ============================================================================

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
 * Get restaurant opening hours for a specific day
 */
const getOpeningHoursForDay = (
  restaurant: IRestaurant,
  date: Date
): { open: string; close: string } | null => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[date.getDay()];

  const dayHours = restaurant.openingHours?.find((h) => h.day === dayName);
  if (!dayHours || dayHours.isClosed) {
    return null;
  }

  return { open: dayHours.open, close: dayHours.close };
};

/**
 * Check if two time ranges overlap
 */
const rangesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && end1 > start2;
};

/**
 * Format date for display (French)
 */
const formatDateFr = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  return date.toLocaleDateString('fr-FR', options);
};

// ============================================================================
// Availability Functions
// ============================================================================

/**
 * Get available time slots for a specific date
 */
export const getAvailableSlots = async (
  restaurantId: mongoose.Types.ObjectId,
  date: Date,
  partySize: number,
  locationPreference: LocationPreference = 'no_preference'
): Promise<TimeSlot[]> => {
  // Get restaurant settings
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.settings.reservations?.enabled) {
    return [];
  }

  const settings = restaurant.settings.reservations;
  const slotDuration = settings.slotDuration || 30;
  const defaultDuration = settings.defaultDuration || 90;
  const minAdvanceHours = settings.minAdvanceHours || 2;

  // Get opening hours for this day
  const hours = getOpeningHoursForDay(restaurant, date);
  if (!hours) {
    return []; // Restaurant closed on this day
  }

  const openMinutes = timeToMinutes(hours.open);
  const closeMinutes = timeToMinutes(hours.close);

  // Get available tables for this party size and location
  const tableQuery: Record<string, unknown> = {
    restaurantId,
    isActive: true,
    capacity: { $gte: partySize },
    minCapacity: { $lte: partySize },
  };

  if (locationPreference !== 'no_preference') {
    tableQuery.location = locationPreference;
  }

  const tables = await Table.find(tableQuery);
  if (tables.length === 0) {
    return [];
  }

  // Get existing reservations for this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingReservations = await Reservation.find({
    restaurantId,
    reservationDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'no_show'] },
  });

  // Calculate minimum time (now + minAdvanceHours)
  const now = new Date();
  const minTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);
  const isToday = date.toDateString() === now.toDateString();

  // Generate all possible slots
  const slots: TimeSlot[] = [];

  for (let time = openMinutes; time <= closeMinutes - defaultDuration; time += slotDuration) {
    const timeStr = minutesToTime(time);
    const slotEndMinutes = time + defaultDuration;

    // Check if this slot is in the past for today
    if (isToday) {
      const slotDate = new Date(date);
      slotDate.setHours(Math.floor(time / 60), time % 60, 0, 0);
      if (slotDate < minTime) {
        continue;
      }
    }

    // Count available tables for this slot
    let tablesAvailable = 0;

    for (const table of tables) {
      // Check if this table is already reserved during this slot
      const isReserved = existingReservations.some((res) => {
        // Only check if table is assigned or if capacity matches
        if (res.tableId && !res.tableId.equals(table._id)) {
          return false;
        }

        const resStart = timeToMinutes(res.timeSlot);
        const resEnd = timeToMinutes(res.endTime);

        return rangesOverlap(time, slotEndMinutes, resStart, resEnd);
      });

      if (!isReserved) {
        tablesAvailable++;
      }
    }

    slots.push({
      time: timeStr,
      available: tablesAvailable > 0,
      tablesAvailable,
    });
  }

  return slots;
};

/**
 * Get available dates for reservations
 */
export const getAvailableDates = async (
  restaurantId: mongoose.Types.ObjectId,
  partySize: number,
  fromDate: Date,
  days: number = 30,
  locationPreference: LocationPreference = 'no_preference'
): Promise<AvailableDate[]> => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.settings.reservations?.enabled) {
    return [];
  }

  const maxAdvanceDays = restaurant.settings.reservations.maxAdvanceDays || 30;
  const daysToCheck = Math.min(days, maxAdvanceDays);

  const dates: AvailableDate[] = [];

  for (let i = 0; i < daysToCheck; i++) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + i);

    const slots = await getAvailableSlots(restaurantId, date, partySize, locationPreference);
    const availableSlots = slots.filter((s) => s.available);

    dates.push({
      date: date.toISOString().slice(0, 10),
      available: availableSlots.length > 0,
      slotsAvailable: availableSlots.length,
    });
  }

  return dates;
};

/**
 * Check if a specific slot is available
 */
export const isSlotAvailable = async (
  restaurantId: mongoose.Types.ObjectId,
  date: Date,
  timeSlot: string,
  partySize: number,
  locationPreference: LocationPreference = 'no_preference',
  excludeReservationId?: mongoose.Types.ObjectId
): Promise<boolean> => {
  const slots = await getAvailableSlots(restaurantId, date, partySize, locationPreference);
  const slot = slots.find((s) => s.time === timeSlot);

  if (!slot) {
    return false;
  }

  // If we're updating a reservation, we need to check if the slot would be available
  // without counting the current reservation
  if (excludeReservationId) {
    const existingRes = await Reservation.findById(excludeReservationId);
    if (
      existingRes &&
      existingRes.timeSlot === timeSlot &&
      existingRes.reservationDate.toDateString() === date.toDateString()
    ) {
      return true; // Same slot as before
    }
  }

  return slot.available;
};

// ============================================================================
// Table Assignment
// ============================================================================

/**
 * Find an available table for a reservation
 */
export const findAvailableTable = async (
  restaurantId: mongoose.Types.ObjectId,
  date: Date,
  timeSlot: string,
  duration: number,
  partySize: number,
  locationPreference: LocationPreference = 'no_preference'
): Promise<ITable | null> => {
  // Get tables matching criteria, sorted by capacity (smallest first for efficiency)
  const tableQuery: Record<string, unknown> = {
    restaurantId,
    isActive: true,
    capacity: { $gte: partySize },
    minCapacity: { $lte: partySize },
  };

  // Map location preference to table location
  if (locationPreference !== 'no_preference') {
    tableQuery.location = locationPreference;
  }

  const tables = await Table.find(tableQuery).sort({ capacity: 1, order: 1 });

  if (tables.length === 0) {
    return null;
  }

  // Get reservations that might conflict
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingReservations = await Reservation.find({
    restaurantId,
    reservationDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'no_show'] },
    tableId: { $in: tables.map((t) => t._id) },
  });

  const slotStart = timeToMinutes(timeSlot);
  const slotEnd = slotStart + duration;

  // Find first available table
  for (const table of tables) {
    const isAvailable = !existingReservations.some((res) => {
      if (!res.tableId || !res.tableId.equals(table._id)) {
        return false;
      }

      const resStart = timeToMinutes(res.timeSlot);
      const resEnd = timeToMinutes(res.endTime);

      return rangesOverlap(slotStart, slotEnd, resStart, resEnd);
    });

    if (isAvailable) {
      return table;
    }
  }

  return null;
};

/**
 * Assign a table to a reservation
 */
export const assignTable = async (
  reservationId: mongoose.Types.ObjectId,
  tableId?: mongoose.Types.ObjectId
): Promise<IReservation> => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  let assignedTable: ITable | null = null;

  if (tableId) {
    // Verify the specified table is available
    const table = await Table.findById(tableId);
    if (!table) {
      throw new ApiError(404, 'Table non trouvée');
    }

    if (table.capacity < reservation.partySize) {
      throw new ApiError(400, 'La table est trop petite pour ce groupe');
    }

    // Check availability
    const startOfDay = new Date(reservation.reservationDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reservation.reservationDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all reservations for this table on this day
    const dayReservations = await Reservation.find({
      _id: { $ne: reservationId },
      restaurantId: reservation.restaurantId,
      tableId,
      reservationDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled', 'no_show'] },
    });

    // Check for time conflicts using proper minute comparison
    const reqStart = timeToMinutes(reservation.timeSlot);
    const reqEnd = timeToMinutes(reservation.endTime);

    const conflictingRes = dayReservations.find((res) => {
      const resStart = timeToMinutes(res.timeSlot);
      const resEnd = timeToMinutes(res.endTime);
      return rangesOverlap(reqStart, reqEnd, resStart, resEnd);
    });

    if (conflictingRes) {
      throw new ApiError(409, 'Cette table est déjà réservée pour ce créneau');
    }

    assignedTable = table;
  } else {
    // Auto-assign table
    assignedTable = await findAvailableTable(
      reservation.restaurantId,
      reservation.reservationDate,
      reservation.timeSlot,
      reservation.duration,
      reservation.partySize,
      reservation.locationPreference
    );

    if (!assignedTable) {
      throw new ApiError(404, 'Aucune table disponible pour ce créneau');
    }
  }

  reservation.tableId = assignedTable._id;
  await reservation.save();

  return reservation;
};

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new reservation
 */
export const createReservation = async (data: CreateReservationData): Promise<IReservation> => {
  // Get restaurant settings
  const restaurant = await Restaurant.findById(data.restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  if (!restaurant.settings.reservations?.enabled) {
    throw new ApiError(400, 'Les réservations ne sont pas activées pour ce restaurant');
  }

  const settings = restaurant.settings.reservations;

  // Validate party size
  if (data.partySize > settings.maxPartySize) {
    throw new ApiError(400, `Le nombre maximum de personnes est ${settings.maxPartySize}`);
  }

  // Validate duration
  const duration = data.duration || settings.defaultDuration;

  // Check slot availability
  const isAvailable = await isSlotAvailable(
    data.restaurantId,
    data.reservationDate,
    data.timeSlot,
    data.partySize,
    data.locationPreference
  );

  if (!isAvailable) {
    throw new ApiError(409, 'Ce créneau n\'est plus disponible');
  }

  // Process pre-order if provided
  let preOrder = undefined;
  if (data.preOrder && data.preOrder.items.length > 0 && settings.allowPreOrder) {
    const items = [];
    let subtotal = 0;

    for (const item of data.preOrder.items) {
      const dish = await Dish.findById(item.dishId);
      if (!dish) {
        throw new ApiError(404, `Plat non trouvé: ${item.dishId}`);
      }

      let itemPrice = dish.price * item.quantity;

      // Add option prices
      const options = [];
      if (item.options) {
        for (const opt of item.options) {
          itemPrice += opt.price * item.quantity;
          options.push(opt);
        }
      }

      items.push({
        dishId: item.dishId,
        name: dish.name,
        quantity: item.quantity,
        unitPrice: dish.price,
        totalPrice: itemPrice,
        options: options.length > 0 ? options : undefined,
        notes: item.notes,
      });

      subtotal += itemPrice;
    }

    preOrder = {
      items,
      subtotal,
      notes: data.preOrder.notes,
    };
  }

  // Create reservation
  const reservation = new Reservation({
    restaurantId: data.restaurantId,
    customerId: data.customerId,
    reservationDate: data.reservationDate,
    timeSlot: data.timeSlot,
    duration,
    partySize: data.partySize,
    locationPreference: data.locationPreference || 'no_preference',
    specialRequests: data.specialRequests,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    preOrder,
    status: settings.autoConfirm ? 'confirmed' : 'pending',
  });

  await reservation.save();

  // Send confirmation SMS
  await sendConfirmationSMS(reservation, restaurant.name);

  return reservation;
};

/**
 * Update a reservation
 */
export const updateReservation = async (
  reservationId: mongoose.Types.ObjectId,
  data: UpdateReservationData
): Promise<IReservation> => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  // Check if changing time/date and if new slot is available
  if (data.reservationDate || data.timeSlot || data.partySize) {
    const newDate = data.reservationDate || reservation.reservationDate;
    const newTime = data.timeSlot || reservation.timeSlot;
    const newPartySize = data.partySize || reservation.partySize;

    const isAvailable = await isSlotAvailable(
      reservation.restaurantId,
      newDate,
      newTime,
      newPartySize,
      data.locationPreference || reservation.locationPreference,
      reservationId
    );

    if (!isAvailable) {
      throw new ApiError(409, 'Ce créneau n\'est plus disponible');
    }
  }

  // Update fields
  if (data.reservationDate) {reservation.reservationDate = data.reservationDate;}
  if (data.timeSlot) {reservation.timeSlot = data.timeSlot;}
  if (data.partySize) {reservation.partySize = data.partySize;}
  if (data.duration) {reservation.duration = data.duration;}
  if (data.locationPreference) {reservation.locationPreference = data.locationPreference;}
  if (data.specialRequests !== undefined) {reservation.specialRequests = data.specialRequests;}
  if (data.customerName) {reservation.customerName = data.customerName;}
  if (data.customerPhone) {reservation.customerPhone = data.customerPhone;}
  if (data.customerEmail !== undefined) {reservation.customerEmail = data.customerEmail;}
  if (data.tableId) {reservation.tableId = data.tableId;}

  await reservation.save();

  return reservation;
};

/**
 * Cancel a reservation
 */
export const cancelReservation = async (
  reservationId: mongoose.Types.ObjectId,
  reason?: string,
  cancelledBy: 'customer' | 'restaurant' = 'customer'
): Promise<IReservation> => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  if (reservation.status === 'cancelled') {
    throw new ApiError(400, 'Cette réservation est déjà annulée');
  }

  if (['completed', 'no_show'].includes(reservation.status)) {
    throw new ApiError(400, 'Cette réservation ne peut plus être annulée');
  }

  reservation.status = 'cancelled';
  reservation.cancelReason = reason;
  reservation.cancelledBy = cancelledBy;
  await reservation.save();

  // Send cancellation SMS
  const restaurant = await Restaurant.findById(reservation.restaurantId);
  if (restaurant) {
    await sendCancellationSMS(reservation, restaurant.name, reason);
  }

  return reservation;
};

/**
 * Confirm a reservation
 */
export const confirmReservation = async (
  reservationId: mongoose.Types.ObjectId
): Promise<IReservation> => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  if (reservation.status !== 'pending') {
    throw new ApiError(400, 'Seules les réservations en attente peuvent être confirmées');
  }

  reservation.status = 'confirmed';
  await reservation.save();

  // Send confirmation SMS if not already sent
  if (!reservation.confirmationSentAt) {
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    if (restaurant) {
      await sendConfirmationSMS(reservation, restaurant.name);
    }
  }

  return reservation;
};

// ============================================================================
// Status Management
// ============================================================================

/**
 * Mark reservation as arrived
 */
export const markArrived = async (
  reservationId: mongoose.Types.ObjectId
): Promise<IReservation> => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  if (!['pending', 'confirmed'].includes(reservation.status)) {
    throw new ApiError(400, 'Cette réservation ne peut pas être marquée comme arrivée');
  }

  reservation.status = 'arrived';
  await reservation.save();

  return reservation;
};

/**
 * Mark reservation as seated
 */
export const markSeated = async (
  reservationId: mongoose.Types.ObjectId,
  tableId?: mongoose.Types.ObjectId
): Promise<IReservation> => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  if (!['pending', 'confirmed', 'arrived'].includes(reservation.status)) {
    throw new ApiError(400, 'Cette réservation ne peut pas être marquée comme placée');
  }

  // Assign table if provided or auto-assign
  if (tableId) {
    reservation.tableId = tableId;
  } else if (!reservation.tableId) {
    await assignTable(reservationId);
  }

  reservation.status = 'seated';
  await reservation.save();

  return reservation;
};

/**
 * Mark reservation as completed
 */
export const markCompleted = async (
  reservationId: mongoose.Types.ObjectId
): Promise<IReservation> => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  if (!['arrived', 'seated'].includes(reservation.status)) {
    throw new ApiError(400, 'Cette réservation ne peut pas être terminée');
  }

  reservation.status = 'completed';
  await reservation.save();

  return reservation;
};

/**
 * Mark reservation as no-show
 */
export const markNoShow = async (
  reservationId: mongoose.Types.ObjectId
): Promise<IReservation> => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  if (!['pending', 'confirmed'].includes(reservation.status)) {
    throw new ApiError(400, 'Cette réservation ne peut pas être marquée comme no-show');
  }

  reservation.status = 'no_show';
  await reservation.save();

  return reservation;
};

// ============================================================================
// SMS Notifications
// ============================================================================

/**
 * Send confirmation SMS
 */
export const sendConfirmationSMS = async (
  reservation: IReservation,
  restaurantName: string
): Promise<void> => {
  const date = formatDateFr(reservation.reservationDate);
  const message = `[${restaurantName}] Votre réservation ${reservation.reservationNumber} est confirmée pour le ${date} à ${reservation.timeSlot} (${reservation.partySize} pers.). À bientôt!`;

  await smsService.sendSMS(reservation.customerPhone, message);

  reservation.confirmationSentAt = new Date();
  await reservation.save();
};

/**
 * Send reminder SMS
 */
export const sendReminderSMS = async (
  reservation: IReservation,
  restaurantName: string,
  hoursBeforeReminder: number
): Promise<void> => {
  const timeLabel = hoursBeforeReminder === 24 ? 'demain' : `aujourd'hui`;
  const message = `[${restaurantName}] Rappel: Votre réservation ${reservation.reservationNumber} est prévue ${timeLabel} à ${reservation.timeSlot} (${reservation.partySize} pers.).`;

  await smsService.sendSMS(reservation.customerPhone, message);

  if (hoursBeforeReminder === 24) {
    reservation.reminder24hSentAt = new Date();
  } else if (hoursBeforeReminder === 2) {
    reservation.reminder2hSentAt = new Date();
  }
  await reservation.save();
};

/**
 * Send cancellation SMS
 */
export const sendCancellationSMS = async (
  reservation: IReservation,
  restaurantName: string,
  reason?: string
): Promise<void> => {
  const date = formatDateFr(reservation.reservationDate);
  let message = `[${restaurantName}] Votre réservation ${reservation.reservationNumber} du ${date} à ${reservation.timeSlot} a été annulée.`;
  if (reason) {
    message += ` Raison: ${reason}`;
  }

  await smsService.sendSMS(reservation.customerPhone, message);
};

/**
 * Process reservation reminders (called by scheduler)
 */
export const processReminders = async (): Promise<{ sent24h: number; sent2h: number }> => {
  const now = new Date();
  let sent24h = 0;
  let sent2h = 0;

  // Get reservations needing 24h reminder (between 23-25 hours from now)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(tomorrow.getHours() - 1, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(tomorrow.getHours() + 1, 59, 59, 999);

  const reservations24h = await Reservation.find({
    status: { $in: ['pending', 'confirmed'] },
    reminder24hSentAt: null,
    reservationDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
  });

  for (const res of reservations24h) {
    try {
      const restaurant = await Restaurant.findById(res.restaurantId);
      if (restaurant) {
        await sendReminderSMS(res, restaurant.name, 24);
        sent24h++;
      }
    } catch (error) {
      console.error(`Error sending 24h reminder for ${res.reservationNumber}:`, error);
    }
  }

  // Get reservations needing 2h reminder (between 1.5-2.5 hours from now)
  const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoHoursStart = new Date(twoHours);
  twoHoursStart.setMinutes(twoHours.getMinutes() - 30, 0, 0);
  const twoHoursEnd = new Date(twoHours);
  twoHoursEnd.setMinutes(twoHours.getMinutes() + 30, 59, 999);

  // We need to check by combining date and time
  const reservations2h = await Reservation.find({
    status: { $in: ['pending', 'confirmed'] },
    reminder2hSentAt: null,
    reminder24hSentAt: { $ne: null }, // Must have received 24h reminder first
  });

  for (const res of reservations2h) {
    try {
      // Calculate actual reservation datetime
      const resDate = new Date(res.reservationDate);
      const [hours, minutes] = res.timeSlot.split(':').map(Number);
      resDate.setHours(hours, minutes, 0, 0);

      // Check if within 2h window
      const diff = resDate.getTime() - now.getTime();
      const hoursUntil = diff / (60 * 60 * 1000);

      if (hoursUntil >= 1.5 && hoursUntil <= 2.5) {
        const restaurant = await Restaurant.findById(res.restaurantId);
        if (restaurant) {
          await sendReminderSMS(res, restaurant.name, 2);
          sent2h++;
        }
      }
    } catch (error) {
      console.error(`Error sending 2h reminder for ${res.reservationNumber}:`, error);
    }
  }

  if (sent24h > 0 || sent2h > 0) {
    logger.info('[Reservations] Reminders sent', { sent24h, sent2h });
  }

  return { sent24h, sent2h };
};

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get reservation statistics
 */
export const getReservationStats = async (
  restaurantId: mongoose.Types.ObjectId,
  dateFrom: Date,
  dateTo: Date
): Promise<ReservationStats> => {
  const reservations = await Reservation.find({
    restaurantId,
    reservationDate: { $gte: dateFrom, $lte: dateTo },
  });

  const stats: ReservationStats = {
    total: reservations.length,
    byStatus: {
      pending: 0,
      confirmed: 0,
      arrived: 0,
      seated: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    },
    byLocation: {
      indoor: 0,
      outdoor: 0,
      terrace: 0,
      no_preference: 0,
    },
    avgPartySize: 0,
    noShowRate: 0,
    preOrderRate: 0,
    preOrderRevenue: 0,
  };

  if (reservations.length === 0) {
    return stats;
  }

  let totalPartySize = 0;
  let totalWithPreOrder = 0;
  let totalCompleted = 0;

  for (const res of reservations) {
    stats.byStatus[res.status]++;
    stats.byLocation[res.locationPreference]++;
    totalPartySize += res.partySize;

    if (res.preOrder && res.preOrder.items.length > 0) {
      totalWithPreOrder++;
      stats.preOrderRevenue += res.preOrder.subtotal;
    }

    if (['completed', 'no_show'].includes(res.status)) {
      totalCompleted++;
    }
  }

  stats.avgPartySize = Math.round((totalPartySize / reservations.length) * 10) / 10;
  stats.noShowRate =
    totalCompleted > 0
      ? Math.round((stats.byStatus.no_show / totalCompleted) * 100)
      : 0;
  stats.preOrderRate = Math.round((totalWithPreOrder / reservations.length) * 100);

  return stats;
};

/**
 * Get reservations with filters
 */
export const getReservations = async (
  restaurantId: mongoose.Types.ObjectId,
  options: {
    status?: ReservationStatus | ReservationStatus[];
    dateFrom?: Date;
    dateTo?: Date;
    tableId?: mongoose.Types.ObjectId;
    customerId?: mongoose.Types.ObjectId;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{
  reservations: IReservation[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const {
    status,
    dateFrom,
    dateTo,
    tableId,
    customerId,
    page = 1,
    limit = 20,
    sortBy = 'reservationDate',
    sortOrder = 'asc',
  } = options;

  const query: Record<string, unknown> = { restaurantId };

  if (status) {
    query.status = Array.isArray(status) ? { $in: status } : status;
  }

  if (dateFrom || dateTo) {
    query.reservationDate = {};
    if (dateFrom) {(query.reservationDate as Record<string, Date>).$gte = dateFrom;}
    if (dateTo) {(query.reservationDate as Record<string, Date>).$lte = dateTo;}
  }

  if (tableId) {
    query.tableId = tableId;
  }

  if (customerId) {
    query.customerId = customerId;
  }

  const skip = (page - 1) * limit;
  const sortDir = sortOrder === 'asc' ? 1 : -1;

  const [reservations, total] = await Promise.all([
    Reservation.find(query)
      .populate('tableId', 'name capacity location')
      .populate('customerId', 'name phone email')
      .sort({ [sortBy]: sortDir, timeSlot: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reservation.countDocuments(query),
  ]);

  return {
    reservations: reservations as IReservation[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single reservation by ID
 */
export const getReservationById = async (
  reservationId: mongoose.Types.ObjectId
): Promise<IReservation | null> => {
  return Reservation.findById(reservationId)
    .populate('tableId', 'name capacity location')
    .populate('customerId', 'name phone email');
};

/**
 * Get customer reservations
 */
export const getCustomerReservations = async (
  customerId: mongoose.Types.ObjectId,
  options: {
    upcoming?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  reservations: IReservation[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const { upcoming = false, page = 1, limit = 10 } = options;

  const query: Record<string, unknown> = { customerId };

  if (upcoming) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    query.reservationDate = { $gte: now };
    query.status = { $nin: ['cancelled', 'no_show', 'completed'] };
  }

  const skip = (page - 1) * limit;

  const [reservations, total] = await Promise.all([
    Reservation.find(query)
      .populate('tableId', 'name capacity location')
      .sort({ reservationDate: upcoming ? 1 : -1, timeSlot: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reservation.countDocuments(query),
  ]);

  return {
    reservations: reservations as IReservation[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};
