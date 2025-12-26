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
import { authenticate, authorize } from '../middleware/auth.js';
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

// All routes require authentication and owner/admin role
adminLoyaltyRouter.use(authenticate);
adminLoyaltyRouter.use(authorize('owner', 'admin'));

// Get loyalty program stats
adminLoyaltyRouter.get('/stats', getLoyaltyStats);

// Get all customers with loyalty info
adminLoyaltyRouter.get('/customers', validate(loyaltyCustomersQueryValidator), getCustomersLoyalty);

// Get specific customer loyalty info
adminLoyaltyRouter.get(
  '/customers/:customerId',
  validate(customerIdValidator),
  getCustomerLoyaltyAdmin
);

// Get specific customer history
adminLoyaltyRouter.get(
  '/customers/:customerId/history',
  validate([...customerIdValidator, ...pointsHistoryQueryValidator]),
  getCustomerHistoryAdmin
);

// Adjust customer points
adminLoyaltyRouter.post(
  '/customers/:customerId/adjust',
  validate(adjustPointsValidator),
  adjustCustomerPoints
);

// Add bonus points
adminLoyaltyRouter.post(
  '/customers/:customerId/bonus',
  validate(bonusPointsValidator),
  addBonusPoints
);

// Trigger point expiration (maintenance)
adminLoyaltyRouter.post('/expire-points', triggerExpirePoints);

export default { customerLoyaltyRouter, adminLoyaltyRouter };
