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
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
import { validate } from '../middleware/validate.js';
import {
  createDishValidator,
  updateDishValidator,
  dishIdValidator,
  dishQueryValidator,
} from '../validators/dish.js';

const router = Router();

// Protected routes - MUST be before /:id to avoid conflict
router.get(
  '/me/dishes',
  authenticate,
  hasPermission(PERMISSIONS.DISHES_READ),
  validate(dishQueryValidator),
  getMyDishes
);
router.put(
  '/reorder',
  authenticate,
  hasPermission(PERMISSIONS.DISHES_UPDATE),
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
  hasPermission(PERMISSIONS.DISHES_UPDATE),
  validate(updateDishValidator),
  updateDish
);
router.delete(
  '/:id',
  authenticate,
  hasPermission(PERMISSIONS.DISHES_DELETE),
  validate(dishIdValidator),
  deleteDish
);
router.patch(
  '/:id/availability',
  authenticate,
  hasPermission(PERMISSIONS.DISHES_AVAILABILITY),
  validate(dishIdValidator),
  toggleAvailability
);

// POST routes
router.post(
  '/',
  authenticate,
  hasPermission(PERMISSIONS.DISHES_CREATE),
  validate(createDishValidator),
  createDish
);

export default router;
