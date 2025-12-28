import { Router } from 'express';
import {
  registerDriver,
  loginDriver,
  getDrivers,
  getDriverById,
  updateDriver,
  verifyDriver,
  suspendDriver,
  reactivateDriver,
  deleteDriver,
  getAvailableDrivers,
  getDriverStats,
  getPendingDrivers,
  uploadDriverDocument,
  verifyDriverDocument,
} from '../controllers/deliveryDriverController.js';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, hasAnyPermission } from '../middleware/permission.js';

const router = Router();

// ============================================
// Public Routes (Driver Registration & Auth)
// ============================================

// POST /api/drivers/register - Register new driver
router.post('/register', registerDriver);

// POST /api/drivers/login - Driver login
router.post('/login', loginDriver);

// ============================================
// Admin Routes (Driver Management)
// ============================================

// GET /api/drivers - List all drivers (with filters)
router.get(
  '/',
  authenticate,
  hasPermission('drivers:read'),
  getDrivers
);

// GET /api/drivers/pending - Get pending driver applications
router.get(
  '/pending',
  authenticate,
  hasPermission('drivers:verify'),
  getPendingDrivers
);

// GET /api/drivers/available - Get available drivers near location
router.get(
  '/available',
  authenticate,
  hasAnyPermission(['drivers:read', 'deliveries:assign']),
  getAvailableDrivers
);

// GET /api/drivers/:id - Get driver details
router.get(
  '/:id',
  authenticate,
  hasPermission('drivers:read'),
  getDriverById
);

// GET /api/drivers/:id/stats - Get driver statistics
router.get(
  '/:id/stats',
  authenticate,
  hasPermission('drivers:read'),
  getDriverStats
);

// PUT /api/drivers/:id - Update driver
router.put(
  '/:id',
  authenticate,
  hasPermission('drivers:update'),
  updateDriver
);

// POST /api/drivers/:id/verify - Verify/approve driver
router.post(
  '/:id/verify',
  authenticate,
  hasPermission('drivers:verify'),
  verifyDriver
);

// POST /api/drivers/:id/suspend - Suspend driver
router.post(
  '/:id/suspend',
  authenticate,
  hasPermission('drivers:suspend'),
  suspendDriver
);

// POST /api/drivers/:id/reactivate - Reactivate suspended driver
router.post(
  '/:id/reactivate',
  authenticate,
  hasPermission('drivers:suspend'),
  reactivateDriver
);

// DELETE /api/drivers/:id - Delete driver
router.delete(
  '/:id',
  authenticate,
  hasPermission('drivers:delete'),
  deleteDriver
);

// POST /api/drivers/:id/documents - Upload driver document
router.post(
  '/:id/documents',
  authenticate,
  hasAnyPermission(['drivers:update', 'driver:self:update']),
  uploadDriverDocument
);

// POST /api/drivers/:id/documents/:docType/verify - Verify driver document
router.post(
  '/:id/documents/:docType/verify',
  authenticate,
  hasPermission('drivers:verify'),
  verifyDriverDocument
);

export default router;
