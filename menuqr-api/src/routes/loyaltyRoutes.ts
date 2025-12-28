import { Router } from 'express';
import {
  // Customer endpoints
  getCustomerLoyaltyInfo,
  getCustomerPointsHistory,
  redeemPoints,
  getExpiringPoints,
  // Admin endpoints
  getLoyaltyStats,
  getCustomersLoyalty,
  getCustomerLoyaltyAdmin,
  getCustomerHistoryAdmin,
  adjustCustomerPoints,
  addBonusPoints,
  triggerExpirePoints,
} from '../controllers/loyaltyController.js';
import { authenticateCustomer } from '../middleware/customerAuth.js';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
import { validate } from '../middleware/validate.js';
import {
  redeemPointsValidator,
  pointsHistoryQueryValidator,
  expiringPointsQueryValidator,
  customerIdValidator,
  adjustPointsValidator,
  bonusPointsValidator,
  loyaltyCustomersQueryValidator,
} from '../validators/loyalty.js';

// ============================================
// CUSTOMER LOYALTY ROUTES
// ============================================
export const customerLoyaltyRouter = Router();

// All routes require customer authentication
customerLoyaltyRouter.use(authenticateCustomer);

// Get loyalty info
customerLoyaltyRouter.get('/me', getCustomerLoyaltyInfo);

// Get points history
customerLoyaltyRouter.get('/me/history', validate(pointsHistoryQueryValidator), getCustomerPointsHistory);

// Redeem points
customerLoyaltyRouter.post('/me/redeem', validate(redeemPointsValidator), redeemPoints);

// Get expiring points
customerLoyaltyRouter.get('/me/expiring', validate(expiringPointsQueryValidator), getExpiringPoints);

// ============================================
// ADMIN LOYALTY ROUTES
// ============================================
export const adminLoyaltyRouter = Router();

// All routes require authentication
adminLoyaltyRouter.use(authenticate);

// Read routes
adminLoyaltyRouter.get('/stats', hasPermission(PERMISSIONS.LOYALTY_READ), getLoyaltyStats);
adminLoyaltyRouter.get('/customers', hasPermission(PERMISSIONS.LOYALTY_READ), validate(loyaltyCustomersQueryValidator), getCustomersLoyalty);
adminLoyaltyRouter.get(
  '/customers/:customerId',
  hasPermission(PERMISSIONS.LOYALTY_READ),
  validate(customerIdValidator),
  getCustomerLoyaltyAdmin
);
adminLoyaltyRouter.get(
  '/customers/:customerId/history',
  hasPermission(PERMISSIONS.LOYALTY_READ),
  validate([...customerIdValidator, ...pointsHistoryQueryValidator]),
  getCustomerHistoryAdmin
);

// Manage routes
adminLoyaltyRouter.post(
  '/customers/:customerId/adjust',
  hasPermission(PERMISSIONS.LOYALTY_MANAGE),
  validate(adjustPointsValidator),
  adjustCustomerPoints
);
adminLoyaltyRouter.post(
  '/customers/:customerId/bonus',
  hasPermission(PERMISSIONS.LOYALTY_MANAGE),
  validate(bonusPointsValidator),
  addBonusPoints
);

// Maintenance (requires manage permission)
adminLoyaltyRouter.post('/expire-points', hasPermission(PERMISSIONS.LOYALTY_MANAGE), triggerExpirePoints);

export default { customerLoyaltyRouter, adminLoyaltyRouter };
