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

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     description: Create an order from a customer. No auth required (customer can order without account).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderInput'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Order created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post('/', validate(createOrderValidator), createOrder);

/**
 * @swagger
 * /orders/number/{orderNumber}:
 *   get:
 *     summary: Get order by order number
 *     tags: [Orders]
 *     description: Public endpoint to track order status by order number
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema:
 *           type: string
 *         example: "20231225-0001"
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       $ref: '#/components/schemas/Order'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/number/:orderNumber', getOrderByNumber);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders for restaurant
 *     tags: [Orders]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, served, completed, cancelled]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  validate(orderQueryValidator),
  getOrdersByRestaurant
);

/**
 * @swagger
 * /orders/active:
 *   get:
 *     summary: Get active orders
 *     tags: [Orders]
 *     security:
 *       - AdminAuth: []
 *     description: Get orders with status pending, confirmed, preparing, or ready
 *     responses:
 *       200:
 *         description: Active orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/active',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  getActiveOrders
);

/**
 * @swagger
 * /orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Orders]
 *     security:
 *       - AdminAuth: []
 *     description: Get order statistics for the restaurant (today, week, month)
 *     responses:
 *       200:
 *         description: Order statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     today:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         revenue:
 *                           type: number
 *                     week:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         revenue:
 *                           type: number
 *                     month:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         revenue:
 *                           type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/stats',
  authenticate,
  authorize('owner', 'admin'),
  getOrderStats
);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/MongoId'
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       $ref: '#/components/schemas/Order'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validate(orderIdValidator), getOrderById);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/MongoId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, preparing, ready, served, completed, cancelled]
 *               cancelReason:
 *                 type: string
 *                 description: Required if status is cancelled
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  validate(updateOrderStatusValidator),
  updateOrderStatus
);

/**
 * @swagger
 * /orders/{id}/items:
 *   put:
 *     summary: Update order items
 *     tags: [Orders]
 *     security:
 *       - AdminAuth: []
 *     description: Modify order items (add/remove/update quantities). Only for pending orders.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/MongoId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - dishId
 *                     - quantity
 *                   properties:
 *                     dishId:
 *                       $ref: '#/components/schemas/MongoId'
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       200:
 *         description: Items updated
 *       400:
 *         description: Cannot modify non-pending orders
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/:id/items',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  validate(updateOrderItemsValidator),
  updateOrderItems
);

export default router;
