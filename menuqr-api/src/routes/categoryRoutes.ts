import { Router } from 'express';
import {
  createCategory,
  getCategoriesByRestaurant,
  getMyCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
  reorderCategoriesValidator,
} from '../validators/category.js';

const router = Router();

// Protected routes - MUST be before /:id to avoid conflict
router.get('/me/categories', authenticate, getMyCategories);
router.put(
  '/reorder',
  authenticate,
  authorize('owner', 'admin'),
  validate(reorderCategoriesValidator),
  reorderCategories
);

// Public routes
router.get('/restaurant/:restaurantId', getCategoriesByRestaurant);

// Generic :id routes - MUST be after specific routes like /me/categories
router.get('/:id', validate(categoryIdValidator), getCategoryById);
router.put(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  validate(updateCategoryValidator),
  updateCategory
);
router.delete(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  validate(categoryIdValidator),
  deleteCategory
);

// POST routes
router.post(
  '/',
  authenticate,
  authorize('owner', 'admin'),
  validate(createCategoryValidator),
  createCategory
);

export default router;
