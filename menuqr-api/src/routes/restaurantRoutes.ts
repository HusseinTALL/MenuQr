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
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createRestaurantValidator,
  updateRestaurantValidator,
  restaurantIdValidator,
} from '../validators/restaurant.js';

const router = Router();

// Public routes
router.get('/', getAllRestaurants);
router.get('/slug/:slug', getRestaurantBySlug);
router.get('/:id', validate(restaurantIdValidator), getRestaurantById);
router.get('/:id/menu', validate(restaurantIdValidator), getFullMenu);

// Protected routes
router.post(
  '/',
  authenticate,
  authorize('owner', 'admin'),
  validate(createRestaurantValidator),
  createRestaurant
);
router.get('/me/restaurant', authenticate, getMyRestaurant);
router.put(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  validate(updateRestaurantValidator),
  updateRestaurant
);
router.delete(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  validate(restaurantIdValidator),
  deleteRestaurant
);

export default router;
