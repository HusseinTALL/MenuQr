/**
 * Inventory Routes for MenuQR
 * Stock management API endpoints
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
import * as inventoryController from '../controllers/inventoryController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/inventory/stats
 * @desc    Get inventory statistics
 * @access  Private (DISHES_READ permission)
 */
router.get(
  '/stats',
  hasPermission(PERMISSIONS.DISHES_READ),
  inventoryController.getInventoryStats
);

/**
 * @route   GET /api/inventory/low-stock
 * @desc    Get all low stock items
 * @access  Private (DISHES_READ permission)
 */
router.get(
  '/low-stock',
  hasPermission(PERMISSIONS.DISHES_READ),
  inventoryController.getLowStockItems
);

/**
 * @route   GET /api/inventory/out-of-stock
 * @desc    Get all out of stock items
 * @access  Private (DISHES_READ permission)
 */
router.get(
  '/out-of-stock',
  hasPermission(PERMISSIONS.DISHES_READ),
  inventoryController.getOutOfStockItems
);

/**
 * @route   GET /api/inventory/dishes/:dishId
 * @desc    Get stock level for a specific dish
 * @access  Private (DISHES_READ permission)
 */
router.get(
  '/dishes/:dishId',
  hasPermission(PERMISSIONS.DISHES_READ),
  inventoryController.getDishStock
);

/**
 * @route   PUT /api/inventory/dishes/:dishId
 * @desc    Update stock for a dish
 * @body    { stock: number, action?: 'add' | 'reduce' | 'disable' }
 * @access  Private (DISHES_UPDATE permission)
 */
router.put(
  '/dishes/:dishId',
  hasPermission(PERMISSIONS.DISHES_UPDATE),
  inventoryController.updateDishStock
);

/**
 * @route   POST /api/inventory/bulk-update
 * @desc    Bulk update stock for multiple dishes
 * @body    { updates: [{ dishId, stock, action? }] }
 * @access  Private (DISHES_UPDATE permission)
 */
router.post(
  '/bulk-update',
  hasPermission(PERMISSIONS.DISHES_UPDATE),
  inventoryController.bulkUpdateStock
);

/**
 * @route   POST /api/inventory/alerts/trigger
 * @desc    Manually trigger low stock alerts
 * @access  Private (DISHES_UPDATE permission)
 */
router.post(
  '/alerts/trigger',
  hasPermission(PERMISSIONS.DISHES_UPDATE),
  inventoryController.triggerLowStockAlerts
);

/**
 * @route   POST /api/inventory/validate
 * @desc    Validate stock availability for order items
 * @body    { items: [{ dishId, quantity }] }
 * @access  Public (for order validation)
 */
router.post('/validate', inventoryController.validateOrderStock);

export default router;
