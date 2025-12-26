import { Router } from 'express';
import {
  createDish,
  getDishesByRestaurant,
  getMyDishes,
  getDishById,
  updateDish,
  deleteDish,
  toggleAvailability,
  reorderDishes,
} from '../controllers/dishController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createDishValidator,
  updateDishValidator,
  dishIdValidator,
  dishQueryValidator,
} from '../validators/dish.js';

const router = Router();

// Protected routes - MUST be before /:id to avoid conflict
router.get('/me/dishes', authenticate, validate(dishQueryValidator), getMyDishes);
router.put(
  '/reorder',
  authenticate,
  authorize('owner', 'admin'),
  reorderDishes
);

// Public routes
router.get(
  '/restaurant/:restaurantId',
  validate(dishQueryValidator),
  getDishesByRestaurant
);

// Generic :id routes - MUST be after specific routes like /me/dishes
router.get('/:id', validate(dishIdValidator), getDishById);
router.put(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  validate(updateDishValidator),
  updateDish
);
router.delete(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  validate(dishIdValidator),
  deleteDish
);
router.patch(
  '/:id/availability',
  authenticate,
  authorize('owner', 'admin', 'staff'),
  validate(dishIdValidator),
  toggleAvailability
);

// POST routes
router.post(
  '/',
  authenticate,
  authorize('owner', 'admin'),
  validate(createDishValidator),
  createDish
);

export default router;
