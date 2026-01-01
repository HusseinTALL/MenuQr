/**
 * Reservation Controller for MenuQR
 * Handles reservation operations for both customers and admin
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Restaurant, Reservation } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as reservationService from '../services/reservationService.js';
import { emitNewReservation } from '../services/socketService.js';
import type { ReservationStatus, LocationPreference } from '../models/Reservation.js';
import * as auditService from '../services/auditService.js';

// ============================================================================
// Customer Endpoints
// ============================================================================

/**
 * Get available dates for reservation
 */
export const getAvailableDates = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const { partySize, days = '30', location = 'no_preference' } = req.query;

    if (!partySize || isNaN(Number(partySize))) {
      throw new ApiError(400, 'Le nombre de personnes est requis');
    }

    const partySizeNum = Number(partySize);
    if (partySizeNum < 1) {
      throw new ApiError(400, 'Le nombre de personnes doit être au moins 1');
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    if (!restaurant.settings.reservations?.enabled) {
      throw new ApiError(400, 'Les réservations ne sont pas activées');
    }

    const maxPartySize = restaurant.settings.reservations.maxPartySize || 20;
    if (partySizeNum > maxPartySize) {
      throw new ApiError(400, `Le nombre maximum de personnes est ${maxPartySize}`);
    }

    const dates = await reservationService.getAvailableDates(
      new mongoose.Types.ObjectId(restaurantId),
      Number(partySize),
      new Date(),
      Number(days),
      location as LocationPreference
    );

    res.json({
      success: true,
      data: {
        dates,
        settings: {
          maxPartySize: restaurant.settings.reservations.maxPartySize,
          maxAdvanceDays: restaurant.settings.reservations.maxAdvanceDays,
          minAdvanceHours: restaurant.settings.reservations.minAdvanceHours,
          allowPreOrder: restaurant.settings.reservations.allowPreOrder,
        },
      },
    });
  }
);

/**
 * Get available time slots for a specific date
 */
export const getAvailableSlots = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const { date, partySize, location = 'no_preference' } = req.query;

    if (!date) {
      throw new ApiError(400, 'La date est requise');
    }

    if (!partySize || isNaN(Number(partySize))) {
      throw new ApiError(400, 'Le nombre de personnes est requis');
    }

    const partySizeNum = Number(partySize);
    if (partySizeNum < 1) {
      throw new ApiError(400, 'Le nombre de personnes doit être au moins 1');
    }

    // Validate against restaurant settings
    const restaurant = await Restaurant.findById(restaurantId);
    if (restaurant?.settings.reservations?.maxPartySize) {
      if (partySizeNum > restaurant.settings.reservations.maxPartySize) {
        throw new ApiError(400, `Le nombre maximum de personnes est ${restaurant.settings.reservations.maxPartySize}`);
      }
    }

    const slots = await reservationService.getAvailableSlots(
      new mongoose.Types.ObjectId(restaurantId),
      new Date(date as string),
      Number(partySize),
      location as LocationPreference
    );

    res.json({
      success: true,
      data: slots,
    });
  }
);

/**
 * Create a new reservation (customer)
 */
export const createReservation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const customer = req.customer;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    if (!restaurant.settings.reservations?.enabled) {
      throw new ApiError(400, 'Les réservations ne sont pas activées');
    }

    // Validate partySize
    const partySize = Number(req.body.partySize);
    if (!partySize || isNaN(partySize) || partySize < 1) {
      throw new ApiError(400, 'Le nombre de personnes doit être au moins 1');
    }

    const maxPartySize = restaurant.settings.reservations.maxPartySize || 20;
    if (partySize > maxPartySize) {
      throw new ApiError(400, `Le nombre maximum de personnes est ${maxPartySize}`);
    }

    const reservationData = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      customerId: customer?._id,
      reservationDate: new Date(req.body.reservationDate),
      timeSlot: req.body.timeSlot,
      partySize: partySize,
      duration: req.body.duration,
      locationPreference: req.body.locationPreference || 'no_preference',
      specialRequests: req.body.specialRequests,
      customerName: req.body.customerName || customer?.name,
      customerPhone: req.body.customerPhone || customer?.phone,
      customerEmail: req.body.customerEmail || customer?.email,
      preOrder: req.body.preOrder,
    };

    // Validate required fields
    if (!reservationData.customerName || !reservationData.customerPhone) {
      throw new ApiError(400, 'Le nom et le téléphone sont requis');
    }

    const reservation = await reservationService.createReservation(reservationData);

    // Emit real-time event for new reservation
    emitNewReservation(restaurantId, {
      reservationId: reservation._id.toString(),
      customerName: reservation.customerName,
      partySize: reservation.partySize,
      timeSlot: reservation.timeSlot,
      status: reservation.status,
      tableId: reservation.tableId?.toString(),
    });

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: reservation,
    });
  }
);

/**
 * Get customer's reservations
 */
export const getMyReservations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const customer = req.customer!;
    const { upcoming = 'false', page = '1', limit = '10' } = req.query;

    const result = await reservationService.getCustomerReservations(customer._id, {
      upcoming: upcoming === 'true',
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: {
        reservations: result.reservations,
        pagination: result.pagination,
      },
    });
  }
);

/**
 * Get a specific reservation (customer)
 */
export const getMyReservation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const customer = req.customer!;
    const { id } = req.params;

    const reservation = await reservationService.getReservationById(
      new mongoose.Types.ObjectId(id)
    );

    if (!reservation) {
      throw new ApiError(404, 'Réservation non trouvée');
    }

    // Verify ownership
    if (
      !reservation.customerId ||
      reservation.customerId.toString() !== customer._id.toString()
    ) {
      throw new ApiError(403, 'Non autorisé');
    }

    res.json({
      success: true,
      data: reservation,
    });
  }
);

/**
 * Cancel a reservation (customer)
 */
export const cancelMyReservation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const customer = req.customer!;
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new ApiError(404, 'Réservation non trouvée');
    }

    // Verify ownership
    if (
      !reservation.customerId ||
      reservation.customerId.toString() !== customer._id.toString()
    ) {
      throw new ApiError(403, 'Non autorisé');
    }

    // Check cancellation policy (e.g., cannot cancel less than 2 hours before)
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    const minAdvanceHours = restaurant?.settings.reservations?.minAdvanceHours || 2;

    const reservationDateTime = new Date(reservation.reservationDate);
    const [hours, minutes] = reservation.timeSlot.split(':').map(Number);
    reservationDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilReservation =
      (reservationDateTime.getTime() - Date.now()) / (60 * 60 * 1000);

    if (hoursUntilReservation < minAdvanceHours) {
      throw new ApiError(
        400,
        `Les annulations doivent être effectuées au moins ${minAdvanceHours}h à l'avance`
      );
    }

    const updated = await reservationService.cancelReservation(
      new mongoose.Types.ObjectId(id),
      reason,
      'customer'
    );

    res.json({
      success: true,
      message: 'Réservation annulée avec succès',
      data: updated,
    });
  }
);

// ============================================================================
// Admin Endpoints
// ============================================================================

/**
 * Get all reservations (admin)
 */
export const getReservations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const {
      status,
      dateFrom,
      dateTo,
      tableId,
      page = '1',
      limit = '20',
      sortBy = 'reservationDate',
      sortOrder = 'asc',
    } = req.query;

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    const result = await reservationService.getReservations(restaurant._id, {
      status: status ? (status as string).split(',') as ReservationStatus[] : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      tableId: tableId ? new mongoose.Types.ObjectId(tableId as string) : undefined,
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: {
        reservations: result.reservations,
        pagination: result.pagination,
      },
    });
  }
);

/**
 * Get a single reservation (admin)
 */
export const getReservation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;

    const reservation = await reservationService.getReservationById(
      new mongoose.Types.ObjectId(id)
    );

    if (!reservation) {
      throw new ApiError(404, 'Réservation non trouvée');
    }

    // Verify ownership
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Non autorisé');
    }

    res.json({
      success: true,
      data: reservation,
    });
  }
);

/**
 * Update a reservation (admin)
 */
export const updateReservation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new ApiError(404, 'Réservation non trouvée');
    }

    // Verify ownership
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Non autorisé');
    }

    // Store old values for audit
    const oldTimeSlot = reservation.timeSlot;
    const oldPartySize = reservation.partySize;

    const updated = await reservationService.updateReservation(
      new mongoose.Types.ObjectId(id),
      {
        reservationDate: req.body.reservationDate
          ? new Date(req.body.reservationDate)
          : undefined,
        timeSlot: req.body.timeSlot,
        partySize: req.body.partySize,
        duration: req.body.duration,
        locationPreference: req.body.locationPreference,
        specialRequests: req.body.specialRequests,
        customerName: req.body.customerName,
        customerPhone: req.body.customerPhone,
        customerEmail: req.body.customerEmail,
        tableId: req.body.tableId
          ? new mongoose.Types.ObjectId(req.body.tableId)
          : undefined,
      }
    );

    // Audit log
    const auditUser = auditService.getUserFromRequest(req);
    if (auditUser && updated) {
      const changes = [];
      if (req.body.timeSlot && req.body.timeSlot !== oldTimeSlot) {changes.push({ field: 'timeSlot', oldValue: oldTimeSlot, newValue: updated.timeSlot });}
      if (req.body.partySize && req.body.partySize !== oldPartySize) {changes.push({ field: 'partySize', oldValue: oldPartySize, newValue: updated.partySize });}

      await auditService.auditUpdate(
        'reservation',
        auditUser,
        { type: 'Reservation', id: reservation._id, name: `${reservation.customerName} - ${reservation.timeSlot}` },
        changes.length > 0 ? changes : undefined,
        `Reservation for ${updated.customerName} updated`,
        auditService.getRequestInfo(req)
      );
    }

    res.json({
      success: true,
      message: 'Réservation mise à jour avec succès',
      data: updated,
    });
  }
);

/**
 * Confirm a reservation (admin)
 */
export const confirmReservation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new ApiError(404, 'Réservation non trouvée');
    }

    // Verify ownership
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Non autorisé');
    }

    const oldStatus = reservation.status;
    const updated = await reservationService.confirmReservation(
      new mongoose.Types.ObjectId(id)
    );

    // Audit log
    const auditUser = auditService.getUserFromRequest(req);
    if (auditUser && updated) {
      await auditService.auditStatusChange(
        'reservation',
        auditUser,
        { type: 'Reservation', id: reservation._id, name: `${reservation.customerName} - ${reservation.timeSlot}` },
        oldStatus,
        'confirmed',
        auditService.getRequestInfo(req)
      );
    }

    res.json({
      success: true,
      message: 'Réservation confirmée',
      data: updated,
    });
  }
);

/**
 * Assign a table to a reservation (admin)
 */
export const assignTable = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { tableId } = req.body;

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(reservation.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé');
  }

  const updated = await reservationService.assignTable(
    new mongoose.Types.ObjectId(id),
    tableId ? new mongoose.Types.ObjectId(tableId) : undefined
  );

  res.json({
    success: true,
    message: 'Table assignée avec succès',
    data: updated,
  });
});

/**
 * Mark reservation as arrived (admin)
 */
export const markArrived = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(reservation.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé');
  }

  const updated = await reservationService.markArrived(new mongoose.Types.ObjectId(id));

  res.json({
    success: true,
    message: 'Client arrivé',
    data: updated,
  });
});

/**
 * Mark reservation as seated (admin)
 */
export const markSeated = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { tableId } = req.body;

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(reservation.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé');
  }

  const updated = await reservationService.markSeated(
    new mongoose.Types.ObjectId(id),
    tableId ? new mongoose.Types.ObjectId(tableId) : undefined
  );

  res.json({
    success: true,
    message: 'Client placé',
    data: updated,
  });
});

/**
 * Mark reservation as completed (admin)
 */
export const markCompleted = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(reservation.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé');
  }

  const updated = await reservationService.markCompleted(new mongoose.Types.ObjectId(id));

  res.json({
    success: true,
    message: 'Réservation terminée',
    data: updated,
  });
});

/**
 * Mark reservation as no-show (admin)
 */
export const markNoShow = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new ApiError(404, 'Réservation non trouvée');
  }

  // Verify ownership
  const restaurant = await Restaurant.findById(reservation.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé');
  }

  const updated = await reservationService.markNoShow(new mongoose.Types.ObjectId(id));

  res.json({
    success: true,
    message: 'Marqué comme absent',
    data: updated,
  });
});

/**
 * Cancel a reservation (admin)
 */
export const cancelReservation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new ApiError(404, 'Réservation non trouvée');
    }

    // Verify ownership
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Non autorisé');
    }

    const oldStatus = reservation.status;
    const updated = await reservationService.cancelReservation(
      new mongoose.Types.ObjectId(id),
      reason,
      'restaurant'
    );

    // Audit log
    const auditUser = auditService.getUserFromRequest(req);
    if (auditUser && updated) {
      await auditService.auditStatusChange(
        'reservation',
        auditUser,
        { type: 'Reservation', id: reservation._id, name: `${reservation.customerName} - ${reservation.timeSlot}` },
        oldStatus,
        'cancelled',
        auditService.getRequestInfo(req),
        { reason, cancelledBy: 'restaurant' }
      );
    }

    res.json({
      success: true,
      message: 'Réservation annulée',
      data: updated,
    });
  }
);

/**
 * Get reservation statistics (admin)
 */
export const getReservationStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { dateFrom, dateTo } = req.query;

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    // Default to last 30 days if no dates provided
    const from = dateFrom
      ? new Date(dateFrom as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo as string) : new Date();

    const stats = await reservationService.getReservationStats(restaurant._id, from, to);

    res.json({
      success: true,
      data: stats,
    });
  }
);

/**
 * Get today's reservations (admin - quick view)
 */
export const getTodayReservations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await reservationService.getReservations(restaurant._id, {
      dateFrom: today,
      dateTo: tomorrow,
      limit: 100,
      sortBy: 'timeSlot',
      sortOrder: 'asc',
    });

    res.json({
      success: true,
      data: result.reservations,
    });
  }
);

/**
 * Create reservation as admin (for walk-ins or phone bookings)
 */
export const createReservationAdmin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    if (!restaurant.settings.reservations?.enabled) {
      throw new ApiError(400, 'Les réservations ne sont pas activées');
    }

    // Validate partySize
    const partySize = Number(req.body.partySize);
    if (!partySize || isNaN(partySize) || partySize < 1) {
      throw new ApiError(400, 'Le nombre de personnes doit être au moins 1');
    }

    const maxPartySize = restaurant.settings.reservations.maxPartySize || 20;
    if (partySize > maxPartySize) {
      throw new ApiError(400, `Le nombre maximum de personnes est ${maxPartySize}`);
    }

    const reservationData = {
      restaurantId: restaurant._id,
      customerId: req.body.customerId
        ? new mongoose.Types.ObjectId(req.body.customerId)
        : undefined,
      reservationDate: new Date(req.body.reservationDate),
      timeSlot: req.body.timeSlot,
      partySize: partySize,
      duration: req.body.duration,
      locationPreference: req.body.locationPreference || 'no_preference',
      specialRequests: req.body.specialRequests,
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      customerEmail: req.body.customerEmail,
      preOrder: req.body.preOrder,
    };

    // Validate required fields
    if (!reservationData.customerName || !reservationData.customerPhone) {
      throw new ApiError(400, 'Le nom et le téléphone sont requis');
    }

    const reservation = await reservationService.createReservation(reservationData);

    // Emit real-time event for new reservation
    emitNewReservation(restaurant._id.toString(), {
      reservationId: reservation._id.toString(),
      customerName: reservation.customerName,
      partySize: reservation.partySize,
      timeSlot: reservation.timeSlot,
      status: reservation.status,
      tableId: reservation.tableId?.toString(),
    });

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: reservation,
    });
  }
);

/**
 * Get daily reservation statistics (for dashboard charts)
 * @swagger
 * /reservations/admin/stats/daily:
 *   get:
 *     summary: Get daily reservation statistics
 *     tags: [Reservations]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           maximum: 90
 *     responses:
 *       200:
 *         description: Daily reservation statistics
 */
export const getDailyReservationStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { days = 7 } = req.query;
    const numDays = Math.min(Math.max(1, Number(days)), 90);

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays + 1);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate reservations by day
    const dailyStats = await Reservation.aggregate([
      {
        $match: {
          restaurantId: restaurant._id,
          reservationDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$reservationDate' },
          },
          count: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $in: ['$status', ['confirmed', 'arrived', 'seated', 'completed']] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          noShow: {
            $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
          },
          totalGuests: { $sum: '$partySize' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Create a map for quick lookup
    const statsMap = new Map(dailyStats.map((s) => [s._id, s]));

    // Fill in missing days
    const result = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayStats = statsMap.get(dateStr);
      result.push({
        date: dateStr,
        dayOfWeek: current.toLocaleDateString('fr-FR', { weekday: 'short' }),
        count: dayStats?.count || 0,
        confirmed: dayStats?.confirmed || 0,
        cancelled: dayStats?.cancelled || 0,
        noShow: dayStats?.noShow || 0,
        totalGuests: dayStats?.totalGuests || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: result,
    });
  }
);
