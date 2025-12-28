/**
 * Inventory Controller for MenuQR
 * Handles stock management API endpoints
 */

import { Request, Response } from 'express';
import { Restaurant } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as inventoryService from '../services/inventoryService.js';

/**
 * Get inventory statistics for the restaurant
 */
export const getInventoryStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  const stats = await inventoryService.getInventoryStats(restaurant._id.toString());

  res.json({
    success: true,
    message: 'Statistiques de stock récupérées',
    data: stats,
  });
});

/**
 * Get all low stock items
 */
export const getLowStockItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  const items = await inventoryService.getLowStockItems(restaurant._id.toString());

  res.json({
    success: true,
    message: 'Articles en stock faible récupérés',
    data: items,
  });
});

/**
 * Get all out of stock items
 */
export const getOutOfStockItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  const items = await inventoryService.getOutOfStockItems(restaurant._id.toString());

  res.json({
    success: true,
    message: 'Articles en rupture de stock récupérés',
    data: items,
  });
});

/**
 * Get stock level for a specific dish
 */
export const getDishStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { dishId } = req.params;

  const stockLevel = await inventoryService.getStockLevel(dishId);

  if (stockLevel === null) {
    throw new ApiError(404, 'Plat non trouvé');
  }

  res.json({
    success: true,
    data: {
      dishId,
      stock: stockLevel,
      isUnlimited: stockLevel === -1,
    },
  });
});

/**
 * Update stock for a dish
 */
export const updateDishStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { dishId } = req.params;
  const { stock, action } = req.body;

  // Validate input
  if (stock === undefined && !action) {
    throw new ApiError(400, 'Stock ou action requis');
  }

  let result;

  if (action === 'add') {
    if (typeof stock !== 'number' || stock <= 0) {
      throw new ApiError(400, 'Quantité à ajouter doit être un nombre positif');
    }
    result = await inventoryService.addStock(dishId, stock, user._id.toString());
  } else if (action === 'reduce') {
    if (typeof stock !== 'number' || stock <= 0) {
      throw new ApiError(400, 'Quantité à réduire doit être un nombre positif');
    }
    result = await inventoryService.reduceStock(dishId, stock, user._id.toString());
  } else if (action === 'disable') {
    await inventoryService.disableStockTracking(dishId, user._id.toString());
    res.json({
      success: true,
      message: 'Suivi de stock désactivé (stock illimité)',
    });
    return;
  } else {
    // Set stock to specific value
    if (typeof stock !== 'number' || stock < -1) {
      throw new ApiError(400, 'Stock doit être un nombre >= -1 (-1 = illimité)');
    }
    result = await inventoryService.setStock(dishId, stock, user._id.toString());
  }

  res.json({
    success: true,
    message: 'Stock mis à jour',
    data: result,
  });
});

/**
 * Bulk update stock for multiple dishes
 */
export const bulkUpdateStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new ApiError(400, 'Liste de mises à jour requise');
  }

  const results = [];

  for (const update of updates) {
    const { dishId, stock, action } = update;

    if (!dishId) {
      continue;
    }

    try {
      let result;

      if (action === 'add') {
        result = await inventoryService.addStock(dishId, stock, user._id.toString());
      } else if (action === 'reduce') {
        result = await inventoryService.reduceStock(dishId, stock, user._id.toString());
      } else {
        result = await inventoryService.setStock(dishId, stock, user._id.toString());
      }

      results.push({ dishId, success: true, data: result });
    } catch (error) {
      results.push({
        dishId,
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  res.json({
    success: true,
    message: `${results.filter(r => r.success).length}/${results.length} mises à jour effectuées`,
    data: results,
  });
});

/**
 * Trigger low stock alert check manually
 */
export const triggerLowStockAlerts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  const alertCount = await inventoryService.checkAndSendLowStockAlerts(restaurant._id.toString());

  res.json({
    success: true,
    message: alertCount > 0
      ? `${alertCount} alerte(s) envoyée(s)`
      : 'Aucune nouvelle alerte à envoyer',
    data: { alertsSent: alertCount },
  });
});

/**
 * Validate stock for an order (before placing)
 */
export const validateOrderStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Liste des articles requise');
  }

  const validation = await inventoryService.validateOrderStock(items);

  res.json({
    success: true,
    data: validation,
  });
});

export default {
  getInventoryStats,
  getLowStockItems,
  getOutOfStockItems,
  getDishStock,
  updateDishStock,
  bulkUpdateStock,
  triggerLowStockAlerts,
  validateOrderStock,
};
