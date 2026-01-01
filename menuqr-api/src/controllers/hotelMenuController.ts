import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as menuService from '../services/hotelMenuService.js';
import { HotelMenuType } from '../models/HotelMenu.js';

// ============================================
// Menu CRUD
// ============================================

/**
 * Create a new menu
 * POST /api/hotels/:hotelId/menus
 */
export const createMenu = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to create menus');
  }

  const menu = await menuService.createMenu(hotelId, req.body);

  res.status(201).json({
    success: true,
    message: 'Menu created successfully',
    data: menu,
  });
});

/**
 * Get menu by ID
 * GET /api/hotels/:hotelId/menus/:menuId
 */
export const getMenuById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { menuId } = req.params;

  const menu = await menuService.getMenuById(menuId);
  if (!menu) {
    throw new ApiError(404, 'Menu not found');
  }

  res.json({
    success: true,
    data: menu,
  });
});

/**
 * Get menus by hotel
 * GET /api/hotels/:hotelId/menus
 */
export const getMenusByHotel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { hotelId } = req.params;
  const { type, isActive, includeCategories } = req.query;

  const menus = await menuService.getMenusByHotel(hotelId, {
    type: type as HotelMenuType | undefined,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    includeCategories: includeCategories === 'true',
  });

  res.json({
    success: true,
    data: menus,
  });
});

/**
 * Update menu
 * PUT /api/hotels/:hotelId/menus/:menuId
 */
export const updateMenu = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, menuId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to update menus');
  }

  const menu = await menuService.updateMenu(menuId, req.body);
  if (!menu) {
    throw new ApiError(404, 'Menu not found');
  }

  res.json({
    success: true,
    message: 'Menu updated successfully',
    data: menu,
  });
});

/**
 * Delete menu
 * DELETE /api/hotels/:hotelId/menus/:menuId
 */
export const deleteMenu = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, menuId } = req.params;

  // Verify hotel access - only manager or owner
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized to delete menus');
  }

  if (!['hotel_owner', 'hotel_manager', 'superadmin'].includes(user.role)) {
    throw new ApiError(403, 'Only managers can delete menus');
  }

  await menuService.deleteMenu(menuId);

  res.json({
    success: true,
    message: 'Menu deleted successfully',
  });
});

/**
 * Link menu to restaurant
 * POST /api/hotels/:hotelId/menus/:menuId/link-restaurant
 */
export const linkMenuToRestaurant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, menuId } = req.params;
  const { restaurantId, pricingRules } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (!restaurantId) {
    throw new ApiError(400, 'Restaurant ID is required');
  }

  const menu = await menuService.linkToRestaurantMenu(menuId, restaurantId, pricingRules);
  if (!menu) {
    throw new ApiError(404, 'Menu not found');
  }

  res.json({
    success: true,
    message: 'Menu linked to restaurant successfully',
    data: menu,
  });
});

/**
 * Sync menu from linked restaurant
 * POST /api/hotels/:hotelId/menus/:menuId/sync
 */
export const syncFromRestaurant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, menuId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const result = await menuService.syncFromRestaurantMenu(menuId);

  res.json({
    success: true,
    message: `Synced ${result.categories} categories and ${result.dishes} dishes`,
    data: result,
  });
});

// ============================================
// Category CRUD
// ============================================

/**
 * Create a new category
 * POST /api/hotels/:hotelId/menus/:menuId/categories
 */
export const createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, menuId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const category = await menuService.createCategory(menuId, req.body);

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
});

/**
 * Get categories by menu
 * GET /api/hotels/:hotelId/menus/:menuId/categories
 */
export const getCategoriesByMenu = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { menuId } = req.params;
  const { includeDishes, isActive } = req.query;

  const categories = await menuService.getCategoriesByMenu(menuId, {
    includeDishesFew: includeDishes === 'true',
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });

  res.json({
    success: true,
    data: categories,
  });
});

/**
 * Update category
 * PUT /api/hotels/:hotelId/menus/:menuId/categories/:categoryId
 */
export const updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, categoryId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const category = await menuService.updateCategory(categoryId, req.body);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
});

/**
 * Delete category
 * DELETE /api/hotels/:hotelId/menus/:menuId/categories/:categoryId
 */
export const deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, categoryId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  await menuService.deleteCategory(categoryId);

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

/**
 * Reorder categories
 * POST /api/hotels/:hotelId/menus/:menuId/categories/reorder
 */
export const reorderCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, menuId } = req.params;
  const { categoryOrders } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (!Array.isArray(categoryOrders)) {
    throw new ApiError(400, 'categoryOrders array is required');
  }

  await menuService.reorderCategories(menuId, categoryOrders);

  res.json({
    success: true,
    message: 'Categories reordered successfully',
  });
});

// ============================================
// Dish CRUD
// ============================================

/**
 * Create a new dish
 * POST /api/hotels/:hotelId/menus/:menuId/categories/:categoryId/dishes
 */
export const createDish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, categoryId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const dish = await menuService.createDish(categoryId, req.body);

  res.status(201).json({
    success: true,
    message: 'Dish created successfully',
    data: dish,
  });
});

/**
 * Get dishes by category
 * GET /api/hotels/:hotelId/menus/:menuId/categories/:categoryId/dishes
 */
export const getDishesByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { categoryId } = req.params;
  const { isAvailable } = req.query;

  const dishes = await menuService.getDishesByCategory(categoryId, {
    isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
  });

  res.json({
    success: true,
    data: dishes,
  });
});

/**
 * Get dish by ID
 * GET /api/hotels/:hotelId/dishes/:dishId
 */
export const getDishById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { dishId } = req.params;

  const dish = await menuService.getDishById(dishId);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  res.json({
    success: true,
    data: dish,
  });
});

/**
 * Update dish
 * PUT /api/hotels/:hotelId/dishes/:dishId
 */
export const updateDish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, dishId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const dish = await menuService.updateDish(dishId, req.body);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  res.json({
    success: true,
    message: 'Dish updated successfully',
    data: dish,
  });
});

/**
 * Delete dish
 * DELETE /api/hotels/:hotelId/dishes/:dishId
 */
export const deleteDish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, dishId } = req.params;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  await menuService.deleteDish(dishId);

  res.json({
    success: true,
    message: 'Dish deleted successfully',
  });
});

/**
 * Update dish availability
 * PATCH /api/hotels/:hotelId/dishes/:dishId/availability
 */
export const updateDishAvailability = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, dishId } = req.params;
  const { isAvailable } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (typeof isAvailable !== 'boolean') {
    throw new ApiError(400, 'isAvailable boolean is required');
  }

  const dish = await menuService.updateDishAvailability(dishId, isAvailable);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  res.json({
    success: true,
    message: `Dish ${isAvailable ? 'enabled' : 'disabled'} successfully`,
    data: dish,
  });
});

/**
 * Reorder dishes
 * POST /api/hotels/:hotelId/menus/:menuId/categories/:categoryId/dishes/reorder
 */
export const reorderDishes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { hotelId, categoryId } = req.params;
  const { dishOrders } = req.body;

  // Verify hotel access
  if (user.hotelId?.toString() !== hotelId && user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (!Array.isArray(dishOrders)) {
    throw new ApiError(400, 'dishOrders array is required');
  }

  await menuService.reorderDishes(categoryId, dishOrders);

  res.json({
    success: true,
    message: 'Dishes reordered successfully',
  });
});

// ============================================
// Guest-Facing Menu (Public)
// ============================================

/**
 * Get full menu for guest display
 * GET /api/hotels/:hotelId/menus/:menuId/guest
 */
export const getMenuForGuest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { menuId } = req.params;
  const { language } = req.query;

  const result = await menuService.getMenuForGuest(menuId, {
    language: language as string | undefined,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Search dishes
 * GET /api/hotels/:hotelId/dishes/search
 */
export const searchDishes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { hotelId } = req.params;
  const { q, menuId, limit } = req.query;

  if (!q) {
    throw new ApiError(400, 'Search query (q) is required');
  }

  const dishes = await menuService.searchDishes(hotelId, q as string, {
    menuId: menuId as string | undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json({
    success: true,
    data: dishes,
  });
});

/**
 * Get popular dishes
 * GET /api/hotels/:hotelId/dishes/popular
 */
export const getPopularDishes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { hotelId } = req.params;
  const { limit } = req.query;

  const dishes = await menuService.getPopularDishes(hotelId, limit ? Number(limit) : undefined);

  res.json({
    success: true,
    data: dishes,
  });
});

/**
 * Get featured dishes
 * GET /api/hotels/:hotelId/dishes/featured
 */
export const getFeaturedDishes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { hotelId } = req.params;

  const dishes = await menuService.getFeaturedDishes(hotelId);

  res.json({
    success: true,
    data: dishes,
  });
});

export default {
  // Menu
  createMenu,
  getMenuById,
  getMenusByHotel,
  updateMenu,
  deleteMenu,
  linkMenuToRestaurant,
  syncFromRestaurant,
  // Category
  createCategory,
  getCategoriesByMenu,
  updateCategory,
  deleteCategory,
  reorderCategories,
  // Dish
  createDish,
  getDishesByCategory,
  getDishById,
  updateDish,
  deleteDish,
  updateDishAvailability,
  reorderDishes,
  // Guest
  getMenuForGuest,
  searchDishes,
  getPopularDishes,
  getFeaturedDishes,
};
