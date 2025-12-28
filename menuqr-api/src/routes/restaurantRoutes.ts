import { Router } from 'express';
import {
  createRestaurant,
  getMyRestaurant,
  getRestaurantBySlug,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  getAllRestaurants,
} from '../controllers/restaurantController.js';
import { getFullMenu } from '../controllers/menuController.js';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
import { validate } from '../middleware/validate.js';
import {
  createRestaurantValidator,
  updateRestaurantValidator,
  restaurantIdValidator,
} from '../validators/restaurant.js';

const router = Router();

/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: Get all restaurants
 *     tags: [Restaurants]
 *     description: List all active restaurants with pagination
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
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name
 *     responses:
 *       200:
 *         description: List of restaurants
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
 *                     restaurants:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Restaurant'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', getAllRestaurants);

/**
 * @swagger
 * /restaurants/slug/{slug}:
 *   get:
 *     summary: Get restaurant by slug
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: le-petit-bistro
 *     responses:
 *       200:
 *         description: Restaurant details
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
 *                     restaurant:
 *                       $ref: '#/components/schemas/Restaurant'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/slug/:slug', getRestaurantBySlug);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     summary: Get restaurant by ID
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/MongoId'
 *     responses:
 *       200:
 *         description: Restaurant details
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
 *                     restaurant:
 *                       $ref: '#/components/schemas/Restaurant'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validate(restaurantIdValidator), getRestaurantById);

/**
 * @swagger
 * /restaurants/{id}/menu:
 *   get:
 *     summary: Get full restaurant menu
 *     tags: [Menu]
 *     description: Get all categories and dishes for a restaurant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/MongoId'
 *     responses:
 *       200:
 *         description: Full menu with categories and dishes
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
 *                     restaurant:
 *                       $ref: '#/components/schemas/Restaurant'
 *                     categories:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Category'
 *                           - type: object
 *                             properties:
 *                               dishes:
 *                                 type: array
 *                                 items:
 *                                   $ref: '#/components/schemas/Dish'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/menu', validate(restaurantIdValidator), getFullMenu);

/**
 * @swagger
 * /restaurants:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Restaurants]
 *     security:
 *       - AdminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Le Petit Bistro
 *               description:
 *                 type: string
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Restaurant created
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
 *                     restaurant:
 *                       $ref: '#/components/schemas/Restaurant'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/',
  authenticate,
  hasPermission(PERMISSIONS.RESTAURANT_UPDATE), // Only owners can create restaurants
  validate(createRestaurantValidator),
  createRestaurant
);

/**
 * @swagger
 * /restaurants/me/restaurant:
 *   get:
 *     summary: Get current user's restaurant
 *     tags: [Restaurants]
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: User's restaurant
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
 *                     restaurant:
 *                       $ref: '#/components/schemas/Restaurant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/me/restaurant', authenticate, hasPermission(PERMISSIONS.RESTAURANT_READ), getMyRestaurant);

/**
 * @swagger
 * /restaurants/{id}:
 *   put:
 *     summary: Update a restaurant
 *     tags: [Restaurants]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/MongoId'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Restaurant updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/:id',
  authenticate,
  hasPermission(PERMISSIONS.RESTAURANT_UPDATE),
  validate(updateRestaurantValidator),
  updateRestaurant
);

/**
 * @swagger
 * /restaurants/{id}:
 *   delete:
 *     summary: Delete a restaurant
 *     tags: [Restaurants]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/MongoId'
 *     responses:
 *       200:
 *         description: Restaurant deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id',
  authenticate,
  hasPermission(PERMISSIONS.RESTAURANT_SETTINGS), // Only owners can delete restaurant
  validate(restaurantIdValidator),
  deleteRestaurant
);

export default router;
