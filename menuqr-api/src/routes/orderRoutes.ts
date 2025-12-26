import { Router } from 'express';
import {
  createOrder,
  getOrdersByRestaurant,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  updateOrderItems,
  getActiveOrders,
  getOrderStats,
} from '../controllers/orderController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createOrderValidator,
  updateOrderStatusValidator,
  updateOrderItemsValidator,
  orderIdValidator,
  orderQueryValidator,
} from '../validators/order.js';

const router = Router();

// Public routes (customers can create orders without auth)
router.post('/', validate(createOrderValidator), createOrder);
router.get('/number/:orderNumber', getOrderByNumber);

// Protected routes - static paths MUST come before dynamic /:id
router.get(
  '/',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  validate(orderQueryValidator),
  getOrdersByRestaurant
);
router.get(
  '/active',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  getActiveOrders
);
router.get(
  '/stats',
  authenticate,
  authorize('owner', 'admin'),
  getOrderStats
);

// Dynamic routes with :id must come AFTER static routes
router.get('/:id', validate(orderIdValidator), getOrderById);
router.patch(
  '/:id/status',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  validate(updateOrderStatusValidator),
  updateOrderStatus
);

router.put(
  '/:id/items',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  validate(updateOrderItemsValidator),
  updateOrderItems
);

export default router;
