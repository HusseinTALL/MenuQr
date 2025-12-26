/**
 * Scheduled Order Controller for MenuQR
 * Handles scheduled order operations for both customers and admin
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as scheduledOrderService from '../services/scheduledOrderService.js';

// ============================================================================
// Public Endpoints
// ============================================================================

/**
 * Get available dates for scheduled orders
 */
export const getAvailability = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const { days = '14' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ApiError(400, 'ID de restaurant invalide');
    }

    const result = await scheduledOrderService.getAvailability(
      new mongoose.Types.ObjectId(restaurantId),
      Number(days)
    );

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Get available time slots for a specific date
 */
export const getSlots = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const { date, type = 'pickup' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ApiError(400, 'ID de restaurant invalide');
    }

    if (!date) {
      throw new ApiError(400, 'La date est requise');
    }

    const slots = await scheduledOrderService.getSlots(
      new mongoose.Types.ObjectId(restaurantId),
      date as string,
      type as 'pickup' | 'delivery' | 'dine-in'
    );

    res.json({
      success: true,
      data: slots,
    });
  }
);

// ============================================================================
// Admin Endpoints
// ============================================================================

/**
 * Get scheduled order settings
 */
export const getSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const restaurantId = (req as any).user?.restaurantId;

    if (!restaurantId) {
      throw new ApiError(401, 'Restaurant non identifie');
    }

    const settings = await scheduledOrderService.getSettings(
      new mongoose.Types.ObjectId(restaurantId)
    );

    res.json({
      success: true,
      data: settings,
    });
  }
);

/**
 * Update scheduled order settings
 */
export const updateSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const restaurantId = (req as any).user?.restaurantId;

    if (!restaurantId) {
      throw new ApiError(401, 'Restaurant non identifie');
    }

    const settings = await scheduledOrderService.updateSettings(
      new mongoose.Types.ObjectId(restaurantId),
      req.body
    );

    res.json({
      success: true,
      data: settings,
    });
  }
);

/**
 * Get scheduled orders (admin view)
 */
export const getScheduledOrders = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const restaurantId = (req as any).user?.restaurantId;
    const { status, fulfillmentType, dateFrom, dateTo, page, limit } = req.query;

    if (!restaurantId) {
      throw new ApiError(401, 'Restaurant non identifie');
    }

    const result = await scheduledOrderService.getScheduledOrders(
      new mongoose.Types.ObjectId(restaurantId),
      {
        status: status as string | undefined,
        fulfillmentType: fulfillmentType as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      }
    );

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Get calendar data for scheduled orders
 */
export const getCalendarData = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const restaurantId = (req as any).user?.restaurantId;
    const { month } = req.query;

    if (!restaurantId) {
      throw new ApiError(401, 'Restaurant non identifie');
    }

    const data = await scheduledOrderService.getCalendarData(
      new mongoose.Types.ObjectId(restaurantId),
      month as string | undefined
    );

    res.json({
      success: true,
      data,
    });
  }
);

// ============================================================================
// Customer Endpoints
// ============================================================================

/**
 * Get customer's scheduled orders
 */
export const getCustomerScheduledOrders = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const customerId = (req as any).customer?._id;
    const restaurantId = (req as any).customer?.restaurantId;
    const { page, limit } = req.query;

    if (!customerId || !restaurantId) {
      throw new ApiError(401, 'Client non authentifie');
    }

    const result = await scheduledOrderService.getCustomerScheduledOrders(
      new mongoose.Types.ObjectId(customerId),
      new mongoose.Types.ObjectId(restaurantId),
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      }
    );

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Cancel a customer's scheduled order
 */
export const cancelCustomerScheduledOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const customerId = (req as any).customer?._id;
    const { reason } = req.body;

    if (!customerId) {
      throw new ApiError(401, 'Client non authentifie');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'ID de commande invalide');
    }

    const order = await scheduledOrderService.cancelCustomerScheduledOrder(
      new mongoose.Types.ObjectId(id),
      new mongoose.Types.ObjectId(customerId),
      reason
    );

    res.json({
      success: true,
      data: order,
    });
  }
);
