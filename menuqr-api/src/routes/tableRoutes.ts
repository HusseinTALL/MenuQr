/**
 * Table Routes for MenuQR
 * Admin endpoints for managing restaurant tables
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
import {
  getTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  toggleTableStatus,
  reorderTables,
  bulkCreateTables,
  getTablesByLocation,
  getTableStats,
} from '../controllers/tableController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Table read operations
router.get('/', hasPermission(PERMISSIONS.TABLES_READ), getTables);
router.get('/stats', hasPermission(PERMISSIONS.TABLES_READ), getTableStats);
router.get('/location/:location', hasPermission(PERMISSIONS.TABLES_READ), getTablesByLocation);
router.get('/:id', hasPermission(PERMISSIONS.TABLES_READ), getTableById);

// Table create operations
router.post('/', hasPermission(PERMISSIONS.TABLES_CREATE), createTable);
router.post('/bulk', hasPermission(PERMISSIONS.TABLES_CREATE), bulkCreateTables);

// Table update operations
router.put('/reorder', hasPermission(PERMISSIONS.TABLES_UPDATE), reorderTables);
router.put('/:id', hasPermission(PERMISSIONS.TABLES_UPDATE), updateTable);
router.put('/:id/toggle', hasPermission(PERMISSIONS.TABLES_UPDATE), toggleTableStatus);

// Table delete operations
router.delete('/:id', hasPermission(PERMISSIONS.TABLES_DELETE), deleteTable);

export default router;
