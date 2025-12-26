/**
 * Table Routes for MenuQR
 * Admin endpoints for managing restaurant tables
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
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

// All routes require authentication and owner/admin role
router.use(authenticate);
router.use(authorize('owner', 'admin'));

// Table CRUD
router.get('/', getTables);
router.get('/stats', getTableStats);
router.get('/location/:location', getTablesByLocation);
router.get('/:id', getTableById);
router.post('/', createTable);
router.post('/bulk', bulkCreateTables);
router.put('/reorder', reorderTables);
router.put('/:id', updateTable);
router.put('/:id/toggle', toggleTableStatus);
router.delete('/:id', deleteTable);

export default router;
