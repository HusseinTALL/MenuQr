import { Router } from 'express';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getOrderHistory,
  getOrderDetails,
  reorder,
  getCustomerStats,
} from '../controllers/customerController.js';
import { authenticateCustomer } from '../middleware/customerAuth.js';
import { validate } from '../middleware/validate.js';
import { addressValidator, addressIdValidator, dishIdValidator } from '../validators/customerAuth.js';
import { param, query } from 'express-validator';

const router = Router();

// All routes require customer authentication
router.use(authenticateCustomer);

// ============================================
// FAVORITES
// ============================================
router.get('/favorites', getFavorites);
router.post('/favorites/:dishId', validate(dishIdValidator), addFavorite);
router.delete('/favorites/:dishId', validate(dishIdValidator), removeFavorite);
router.get('/favorites/:dishId/check', validate(dishIdValidator), checkFavorite);

// ============================================
// ADDRESSES
// ============================================
router.get('/addresses', getAddresses);
router.post('/addresses', validate(addressValidator), addAddress);
router.put('/addresses/:addressId', validate(addressIdValidator), updateAddress);
router.delete('/addresses/:addressId', validate(addressIdValidator), deleteAddress);
router.put('/addresses/:addressId/default', validate(addressIdValidator), setDefaultAddress);

// ============================================
// ORDER HISTORY
// ============================================
router.get('/orders', validate([
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite invalide'),
  query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled']).withMessage('Statut invalide'),
]), getOrderHistory);

router.get('/orders/:orderId', validate([
  param('orderId').isMongoId().withMessage('ID de commande invalide'),
]), getOrderDetails);

router.post('/orders/:orderId/reorder', validate([
  param('orderId').isMongoId().withMessage('ID de commande invalide'),
]), reorder);

// ============================================
// STATISTICS
// ============================================
router.get('/stats', getCustomerStats);

export default router;
