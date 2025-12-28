/**
 * Inventory Service for MenuQR
 *
 * Handles stock management, low-stock alerts, and order stock validation.
 * Stock tracking is optional per dish - when trackStock is false, stock is unlimited.
 */

import mongoose from 'mongoose';
import { Dish, Restaurant } from '../models/index.js';
import type { IDish } from '../models/Dish.js';
import { ApiError } from '../middleware/errorHandler.js';
import * as emailService from './emailService.js';
import * as auditService from './auditService.js';

// Types
export interface StockUpdateResult {
  dishId: string;
  dishName: string;
  previousStock: number;
  newStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface StockValidationResult {
  isValid: boolean;
  insufficientItems: Array<{
    dishId: string;
    dishName: string;
    requestedQuantity: number;
    availableStock: number;
  }>;
}

export interface LowStockItem {
  dishId: mongoose.Types.ObjectId;
  dishName: string;
  categoryName?: string;
  currentStock: number;
  lowStockThreshold: number;
  isOutOfStock: boolean;
}

export interface InventoryStats {
  totalTrackedDishes: number;
  totalUnlimitedDishes: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthyStockCount: number;
}

// Stock level checks

/**
 * Check if a dish has sufficient stock for a given quantity
 */
export async function hasStock(dishId: string, quantity: number): Promise<boolean> {
  const dish = await Dish.findById(dishId).lean();
  if (!dish) {
    return false;
  }

  // If stock tracking is disabled, always has stock
  if (!dish.trackStock) {
    return true;
  }

  // -1 means unlimited stock
  if (dish.stock === -1) {
    return true;
  }

  return dish.stock >= quantity;
}

/**
 * Get current stock level for a dish
 */
export async function getStockLevel(dishId: string): Promise<number | null> {
  const dish = await Dish.findById(dishId).select('stock trackStock').lean();
  if (!dish) {
    return null;
  }

  // Return -1 for unlimited/untracked
  if (!dish.trackStock || dish.stock === -1) {
    return -1;
  }

  return dish.stock;
}

/**
 * Check if a dish is low on stock
 */
export function isLowStock(dish: Pick<IDish, 'trackStock' | 'stock' | 'lowStockThreshold'>): boolean {
  if (!dish.trackStock || dish.stock === -1) {
    return false;
  }
  return dish.stock > 0 && dish.stock <= dish.lowStockThreshold;
}

/**
 * Check if a dish is out of stock
 */
export function isOutOfStock(dish: Pick<IDish, 'trackStock' | 'stock'>): boolean {
  if (!dish.trackStock || dish.stock === -1) {
    return false;
  }
  return dish.stock === 0;
}

// Stock modifications

/**
 * Reduce stock for a dish (e.g., when an order is placed)
 */
export async function reduceStock(
  dishId: string,
  quantity: number,
  userId?: string
): Promise<StockUpdateResult> {
  const dish = await Dish.findById(dishId);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  // If not tracking stock, return without changes
  if (!dish.trackStock || dish.stock === -1) {
    return {
      dishId: dish._id.toString(),
      dishName: (dish.name as Record<string, string>).fr,
      previousStock: -1,
      newStock: -1,
      isLowStock: false,
      isOutOfStock: false,
    };
  }

  const previousStock = dish.stock;

  // Prevent negative stock
  if (dish.stock < quantity) {
    throw new ApiError(400, `Insufficient stock for ${(dish.name as Record<string, string>).fr}. Available: ${dish.stock}, Requested: ${quantity}`);
  }

  dish.stock -= quantity;
  dish.lastStockUpdate = new Date();

  // Auto-disable if out of stock
  if (dish.stock === 0) {
    dish.isAvailable = false;
  }

  await dish.save();

  const result: StockUpdateResult = {
    dishId: dish._id.toString(),
    dishName: (dish.name as Record<string, string>).fr,
    previousStock,
    newStock: dish.stock,
    isLowStock: isLowStock(dish),
    isOutOfStock: dish.stock === 0,
  };

  // Audit log if userId provided
  if (userId) {
    await auditService.auditUpdate(
      'dish',
      { _id: userId, email: 'system', role: 'system' },
      { type: 'Dish', id: dish._id, name: (dish.name as Record<string, string>).fr },
      [{ field: 'stock', oldValue: previousStock, newValue: dish.stock }],
      `Stock reduced by ${quantity} (order placed)`,
      undefined
    );
  }

  return result;
}

/**
 * Add stock for a dish (e.g., restocking)
 */
export async function addStock(
  dishId: string,
  quantity: number,
  userId?: string
): Promise<StockUpdateResult> {
  const dish = await Dish.findById(dishId);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  const previousStock = dish.stock;

  // If stock was unlimited, set it to the quantity being added
  if (!dish.trackStock) {
    dish.trackStock = true;
    dish.stock = quantity;
  } else if (dish.stock === -1) {
    dish.stock = quantity;
  } else {
    dish.stock += quantity;
  }

  dish.lastStockUpdate = new Date();
  dish.stockAlertSent = false; // Reset alert flag on restock

  // Re-enable if was out of stock
  if (previousStock === 0 && dish.stock > 0) {
    dish.isAvailable = true;
  }

  await dish.save();

  const result: StockUpdateResult = {
    dishId: dish._id.toString(),
    dishName: (dish.name as Record<string, string>).fr,
    previousStock,
    newStock: dish.stock,
    isLowStock: isLowStock(dish),
    isOutOfStock: false,
  };

  // Audit log
  if (userId) {
    await auditService.auditUpdate(
      'dish',
      { _id: userId, email: 'system', role: 'system' },
      { type: 'Dish', id: dish._id, name: (dish.name as Record<string, string>).fr },
      [{ field: 'stock', oldValue: previousStock, newValue: dish.stock }],
      `Stock increased by ${quantity} (restock)`,
      undefined
    );
  }

  return result;
}

/**
 * Set stock to a specific value
 */
export async function setStock(
  dishId: string,
  newStock: number,
  userId?: string
): Promise<StockUpdateResult> {
  const dish = await Dish.findById(dishId);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  const previousStock = dish.stock;

  dish.stock = newStock;
  dish.lastStockUpdate = new Date();

  // Enable tracking if setting specific stock
  if (newStock >= 0) {
    dish.trackStock = true;
  }

  // Handle availability based on stock
  if (newStock === 0) {
    dish.isAvailable = false;
  } else if (previousStock === 0 && newStock > 0) {
    dish.isAvailable = true;
  }

  // Reset alert if restocked above threshold
  if (newStock > dish.lowStockThreshold) {
    dish.stockAlertSent = false;
  }

  await dish.save();

  // Audit log
  if (userId) {
    await auditService.auditUpdate(
      'dish',
      { _id: userId, email: 'system', role: 'system' },
      { type: 'Dish', id: dish._id, name: (dish.name as Record<string, string>).fr },
      [{ field: 'stock', oldValue: previousStock, newValue: dish.stock }],
      `Stock set to ${newStock}`,
      undefined
    );
  }

  return {
    dishId: dish._id.toString(),
    dishName: (dish.name as Record<string, string>).fr,
    previousStock,
    newStock: dish.stock,
    isLowStock: isLowStock(dish),
    isOutOfStock: dish.stock === 0,
  };
}

/**
 * Disable stock tracking for a dish (unlimited stock)
 */
export async function disableStockTracking(dishId: string, userId?: string): Promise<void> {
  const dish = await Dish.findById(dishId);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  dish.trackStock = false;
  dish.stock = -1;
  dish.stockAlertSent = false;
  dish.isAvailable = true; // Re-enable since unlimited
  await dish.save();

  if (userId) {
    await auditService.auditUpdate(
      'dish',
      { _id: userId, email: 'system', role: 'system' },
      { type: 'Dish', id: dish._id, name: (dish.name as Record<string, string>).fr },
      [{ field: 'trackStock', oldValue: true, newValue: false }],
      'Stock tracking disabled (unlimited stock)',
      undefined
    );
  }
}

// Order validation

/**
 * Validate stock availability for an order
 * Returns validation result with list of insufficient items
 */
export async function validateOrderStock(
  items: Array<{ dishId: string; quantity: number }>
): Promise<StockValidationResult> {
  const insufficientItems: StockValidationResult['insufficientItems'] = [];

  // Get all dishes in one query
  const dishIds = items.map(item => item.dishId);
  const dishes = await Dish.find({ _id: { $in: dishIds } })
    .select('_id name trackStock stock')
    .lean();

  const dishMap = new Map(dishes.map(d => [d._id.toString(), d]));

  for (const item of items) {
    const dish = dishMap.get(item.dishId);

    if (!dish) {
      insufficientItems.push({
        dishId: item.dishId,
        dishName: 'Unknown dish',
        requestedQuantity: item.quantity,
        availableStock: 0,
      });
      continue;
    }

    // Skip if not tracking stock or unlimited
    if (!dish.trackStock || dish.stock === -1) {
      continue;
    }

    if (dish.stock < item.quantity) {
      insufficientItems.push({
        dishId: dish._id.toString(),
        dishName: (dish.name as Record<string, string>).fr,
        requestedQuantity: item.quantity,
        availableStock: dish.stock,
      });
    }
  }

  return {
    isValid: insufficientItems.length === 0,
    insufficientItems,
  };
}

/**
 * Reduce stock for multiple items (for order processing)
 * Uses a transaction to ensure atomicity
 */
export async function reduceStockForOrder(
  items: Array<{ dishId: string; quantity: number }>,
  userId?: string
): Promise<StockUpdateResult[]> {
  const session = await mongoose.startSession();
  const results: StockUpdateResult[] = [];

  try {
    await session.withTransaction(async () => {
      for (const item of items) {
        const dish = await Dish.findById(item.dishId).session(session);
        if (!dish) {
          throw new ApiError(404, `Dish ${item.dishId} not found`);
        }

        // Skip if not tracking stock
        if (!dish.trackStock || dish.stock === -1) {
          results.push({
            dishId: dish._id.toString(),
            dishName: (dish.name as Record<string, string>).fr,
            previousStock: -1,
            newStock: -1,
            isLowStock: false,
            isOutOfStock: false,
          });
          continue;
        }

        if (dish.stock < item.quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for ${(dish.name as Record<string, string>).fr}. Available: ${dish.stock}, Requested: ${item.quantity}`
          );
        }

        const previousStock = dish.stock;
        dish.stock -= item.quantity;
        dish.lastStockUpdate = new Date();

        if (dish.stock === 0) {
          dish.isAvailable = false;
        }

        await dish.save({ session });

        results.push({
          dishId: dish._id.toString(),
          dishName: (dish.name as Record<string, string>).fr,
          previousStock,
          newStock: dish.stock,
          isLowStock: isLowStock(dish),
          isOutOfStock: dish.stock === 0,
        });
      }
    });

    // Audit log outside transaction
    if (userId) {
      for (const result of results) {
        if (result.previousStock !== -1) {
          await auditService.auditUpdate(
            'dish',
            { _id: userId, email: 'system', role: 'system' },
            { type: 'Dish', id: result.dishId, name: result.dishName },
            [{ field: 'stock', oldValue: result.previousStock, newValue: result.newStock }],
            `Stock reduced by ${result.previousStock - result.newStock} (order)`,
            undefined
          );
        }
      }
    }

    return results;
  } finally {
    await session.endSession();
  }
}

/**
 * Restore stock for cancelled order items
 */
export async function restoreStockForCancelledOrder(
  items: Array<{ dishId: string; quantity: number }>,
  userId?: string
): Promise<StockUpdateResult[]> {
  const results: StockUpdateResult[] = [];

  for (const item of items) {
    const dish = await Dish.findById(item.dishId);
    if (!dish) {
      continue; // Skip if dish was deleted
    }

    // Skip if not tracking stock
    if (!dish.trackStock) {
      continue;
    }

    const previousStock = dish.stock;

    // Don't restore if it was unlimited
    if (dish.stock === -1) {
      continue;
    }

    dish.stock += item.quantity;
    dish.lastStockUpdate = new Date();

    // Re-enable if was out of stock
    if (previousStock === 0) {
      dish.isAvailable = true;
    }

    await dish.save();

    results.push({
      dishId: dish._id.toString(),
      dishName: (dish.name as Record<string, string>).fr,
      previousStock,
      newStock: dish.stock,
      isLowStock: isLowStock(dish),
      isOutOfStock: false,
    });

    if (userId) {
      await auditService.auditUpdate(
        'dish',
        { _id: userId, email: 'system', role: 'system' },
        { type: 'Dish', id: dish._id, name: (dish.name as Record<string, string>).fr },
        [{ field: 'stock', oldValue: previousStock, newValue: dish.stock }],
        `Stock restored by ${item.quantity} (order cancelled)`,
        undefined
      );
    }
  }

  return results;
}

// Inventory queries

/**
 * Get all low stock items for a restaurant
 */
export async function getLowStockItems(restaurantId: string): Promise<LowStockItem[]> {
  const dishes = await Dish.find({
    restaurantId,
    trackStock: true,
    stock: { $ne: -1 },
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  })
    .populate('categoryId', 'name')
    .select('_id name stock lowStockThreshold categoryId')
    .lean();

  return dishes.map(dish => {
    const populatedCategory = dish.categoryId as unknown as { name: Record<string, string> } | null;
    return {
      dishId: dish._id,
      dishName: (dish.name as Record<string, string>).fr,
      categoryName: populatedCategory?.name?.fr || undefined,
      currentStock: dish.stock,
      lowStockThreshold: dish.lowStockThreshold,
      isOutOfStock: dish.stock === 0,
    };
  });
}

/**
 * Get out of stock items for a restaurant
 */
export async function getOutOfStockItems(restaurantId: string): Promise<LowStockItem[]> {
  const dishes = await Dish.find({
    restaurantId,
    trackStock: true,
    stock: 0,
  })
    .populate('categoryId', 'name')
    .select('_id name stock lowStockThreshold categoryId')
    .lean();

  return dishes.map(dish => {
    const populatedCategory = dish.categoryId as unknown as { name: Record<string, string> } | null;
    return {
      dishId: dish._id,
      dishName: (dish.name as Record<string, string>).fr,
      categoryName: populatedCategory?.name?.fr || undefined,
      currentStock: 0,
      lowStockThreshold: dish.lowStockThreshold,
      isOutOfStock: true,
    };
  });
}

/**
 * Get inventory statistics for a restaurant
 */
export async function getInventoryStats(restaurantId: string): Promise<InventoryStats> {
  const [tracked, untracked, lowStock, outOfStock] = await Promise.all([
    Dish.countDocuments({ restaurantId, trackStock: true, stock: { $ne: -1 } }),
    Dish.countDocuments({
      restaurantId,
      $or: [{ trackStock: false }, { stock: -1 }],
    }),
    Dish.countDocuments({
      restaurantId,
      trackStock: true,
      stock: { $ne: -1, $gt: 0 },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }),
    Dish.countDocuments({ restaurantId, trackStock: true, stock: 0 }),
  ]);

  return {
    totalTrackedDishes: tracked,
    totalUnlimitedDishes: untracked,
    lowStockCount: lowStock,
    outOfStockCount: outOfStock,
    healthyStockCount: tracked - lowStock - outOfStock,
  };
}

// Low stock alerts

/**
 * Check and send low stock alerts for a restaurant
 */
export async function checkAndSendLowStockAlerts(restaurantId: string): Promise<number> {
  // Get low stock items that haven't been alerted
  const lowStockDishes = await Dish.find({
    restaurantId,
    trackStock: true,
    stock: { $ne: -1 },
    stockAlertSent: { $ne: true },
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  })
    .populate('categoryId', 'name')
    .lean();

  if (lowStockDishes.length === 0) {
    return 0;
  }

  // Get restaurant owner email
  const restaurant = await Restaurant.findById(restaurantId)
    .populate('ownerId', 'email name')
    .lean();

  if (!restaurant || !restaurant.ownerId) {
    return 0;
  }

  const owner = restaurant.ownerId as unknown as { email: string; name: string };

  // Prepare alert data
  const alertItems = lowStockDishes.map(dish => {
    const populatedCategory = dish.categoryId as unknown as { name: Record<string, string> } | null;
    return {
      name: (dish.name as Record<string, string>).fr,
      category: populatedCategory?.name?.fr || 'Sans catégorie',
      currentStock: dish.stock,
      threshold: dish.lowStockThreshold,
      isOutOfStock: dish.stock === 0,
    };
  });

  // Send email alert
  await emailService.sendEmail({
    to: owner.email,
    subject: `🔔 Alerte Stock - ${alertItems.length} article(s) en stock faible`,
    html: generateLowStockAlertEmail(restaurant.name, alertItems),
  });

  // Mark dishes as alerted
  const dishIds = lowStockDishes.map(d => d._id);
  await Dish.updateMany(
    { _id: { $in: dishIds } },
    { $set: { stockAlertSent: true } }
  );

  return lowStockDishes.length;
}

/**
 * Generate HTML email for low stock alert
 */
function generateLowStockAlertEmail(
  restaurantName: string,
  items: Array<{
    name: string;
    category: string;
    currentStock: number;
    threshold: number;
    isOutOfStock: boolean;
  }>
): string {
  const outOfStock = items.filter(i => i.isOutOfStock);
  const lowStock = items.filter(i => !i.isOutOfStock);

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">🔔 Alerte Stock - ${restaurantName}</h2>
      <p>Les articles suivants nécessitent votre attention :</p>
  `;

  if (outOfStock.length > 0) {
    html += `
      <h3 style="color: #ef4444;">❌ Rupture de stock (${outOfStock.length})</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #fee2e2;">
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Article</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Catégorie</th>
          </tr>
        </thead>
        <tbody>
          ${outOfStock.map(item => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.category}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (lowStock.length > 0) {
    html += `
      <h3 style="color: #f59e0b;">⚠️ Stock faible (${lowStock.length})</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #fef3c7;">
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Article</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Catégorie</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Stock</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Seuil</th>
          </tr>
        </thead>
        <tbody>
          ${lowStock.map(item => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.category}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; color: #f59e0b; font-weight: bold;">${item.currentStock}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${item.threshold}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  html += `
      <p style="margin-top: 20px; color: #666;">
        Connectez-vous à votre tableau de bord pour réapprovisionner vos stocks.
      </p>
      <p style="color: #999; font-size: 12px;">
        Cet email a été envoyé automatiquement par MenuQR.
      </p>
    </div>
  `;

  return html;
}

/**
 * Scheduled job to check low stock alerts for all restaurants
 */
export async function runLowStockAlertJob(): Promise<{ restaurantsChecked: number; alertsSent: number }> {
  // Get all restaurants with at least one tracked dish
  const restaurantsWithTrackedStock = await Dish.distinct('restaurantId', {
    trackStock: true,
    stock: { $ne: -1 },
  });

  let alertsSent = 0;

  for (const restaurantId of restaurantsWithTrackedStock) {
    const sent = await checkAndSendLowStockAlerts(restaurantId.toString());
    alertsSent += sent;
  }

  return {
    restaurantsChecked: restaurantsWithTrackedStock.length,
    alertsSent,
  };
}

export default {
  hasStock,
  getStockLevel,
  isLowStock,
  isOutOfStock,
  reduceStock,
  addStock,
  setStock,
  disableStockTracking,
  validateOrderStock,
  reduceStockForOrder,
  restoreStockForCancelledOrder,
  getLowStockItems,
  getOutOfStockItems,
  getInventoryStats,
  checkAndSendLowStockAlerts,
  runLowStockAlertJob,
};
