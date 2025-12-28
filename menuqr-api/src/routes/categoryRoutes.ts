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
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
import { validate } from '../middleware/validate.js';
import {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
  reorderCategoriesValidator,
} from '../validators/category.js';

const router = Router();

// Protected routes - MUST be before /:id to avoid conflict
router.get(
  '/me/categories',
  authenticate,
  hasPermission(PERMISSIONS.CATEGORIES_READ),
  getMyCategories
);
router.put(
  '/reorder',
  authenticate,
  hasPermission(PERMISSIONS.CATEGORIES_UPDATE),
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
  hasPermission(PERMISSIONS.CATEGORIES_UPDATE),
  validate(updateCategoryValidator),
  updateCategory
);
router.delete(
  '/:id',
  authenticate,
  hasPermission(PERMISSIONS.CATEGORIES_DELETE),
  validate(categoryIdValidator),
  deleteCategory
);

// POST routes
router.post(
  '/',
  authenticate,
  hasPermission(PERMISSIONS.CATEGORIES_CREATE),
  validate(createCategoryValidator),
  createCategory
);

export default router;
