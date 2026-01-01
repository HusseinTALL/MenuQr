import mongoose from 'mongoose';
import { HotelMenu, IHotelMenu, HotelMenuType, IPricingRules } from '../models/HotelMenu.js';
import { HotelCategory, IHotelCategory } from '../models/HotelCategory.js';
import { HotelDish, IHotelDish } from '../models/HotelDish.js';
import { Dish } from '../models/Dish.js';
import { Category } from '../models/Category.js';
import logger from '../utils/logger.js';

// ============================================
// Menu CRUD Operations
// ============================================

/**
 * Create a new hotel menu
 */
export const createMenu = async (
  hotelId: mongoose.Types.ObjectId | string,
  data: Partial<IHotelMenu>
): Promise<IHotelMenu> => {
  const menu = await HotelMenu.create({
    ...data,
    hotelId,
  });

  logger.info('Hotel menu created', { hotelId, menuId: menu._id, name: menu.name.fr });
  return menu;
};

/**
 * Get menu by ID
 */
export const getMenuById = async (
  menuId: mongoose.Types.ObjectId | string
): Promise<IHotelMenu | null> => {
  return HotelMenu.findById(menuId);
};

/**
 * Get menus by hotel
 */
export const getMenusByHotel = async (
  hotelId: mongoose.Types.ObjectId | string,
  options?: {
    type?: HotelMenuType;
    isActive?: boolean;
    includeCategories?: boolean;
  }
): Promise<IHotelMenu[]> => {
  const query: Record<string, unknown> = { hotelId };

  if (options?.type) {query.type = options.type;}
  if (options?.isActive !== undefined) {query.isActive = options.isActive;}

  const menus = await HotelMenu.find(query).sort({ order: 1 });

  if (options?.includeCategories) {
    // Attach categories to each menu
    const menuIds = menus.map((m) => m._id);
    const categories = await HotelCategory.find({
      menuId: { $in: menuIds },
      isActive: true,
    }).sort({ order: 1 });

    const categoriesByMenu = new Map<string, IHotelCategory[]>();
    for (const cat of categories) {
      const menuIdStr = cat.menuId.toString();
      if (!categoriesByMenu.has(menuIdStr)) {
        categoriesByMenu.set(menuIdStr, []);
      }
      categoriesByMenu.get(menuIdStr)!.push(cat);
    }

    return menus.map((menu) => {
      const menuObj = menu.toObject() as unknown as Record<string, unknown>;
      menuObj.categories = categoriesByMenu.get(menu._id.toString()) || [];
      return menuObj as unknown as IHotelMenu;
    });
  }

  return menus;
};

/**
 * Update menu
 */
export const updateMenu = async (
  menuId: mongoose.Types.ObjectId | string,
  data: Partial<IHotelMenu>
): Promise<IHotelMenu | null> => {
  const menu = await HotelMenu.findByIdAndUpdate(menuId, data, {
    new: true,
    runValidators: true,
  });

  if (menu) {
    logger.info('Hotel menu updated', { menuId, name: menu.name.fr });
  }

  return menu;
};

/**
 * Delete menu
 */
export const deleteMenu = async (
  menuId: mongoose.Types.ObjectId | string
): Promise<boolean> => {
  // Delete all categories and dishes first
  const categories = await HotelCategory.find({ menuId });
  const categoryIds = categories.map((c) => c._id);

  await Promise.all([
    HotelDish.deleteMany({ categoryId: { $in: categoryIds } }),
    HotelCategory.deleteMany({ menuId }),
    HotelMenu.findByIdAndDelete(menuId),
  ]);

  logger.info('Hotel menu deleted', { menuId });
  return true;
};

// ============================================
// Category Operations
// ============================================

/**
 * Create category
 */
export const createCategory = async (
  menuId: mongoose.Types.ObjectId | string,
  data: Partial<IHotelCategory>
): Promise<IHotelCategory> => {
  const menu = await HotelMenu.findById(menuId);
  if (!menu) {throw new Error('Menu not found');}

  const category = await HotelCategory.create({
    ...data,
    menuId,
    hotelId: menu.hotelId,
  });

  logger.info('Hotel category created', { menuId, categoryId: category._id });
  return category;
};

/**
 * Get categories by menu
 */
export const getCategoriesByMenu = async (
  menuId: mongoose.Types.ObjectId | string,
  options?: { includeDishesFew?: boolean; isActive?: boolean }
): Promise<IHotelCategory[]> => {
  const query: Record<string, unknown> = { menuId };
  if (options?.isActive !== undefined) {query.isActive = options.isActive;}

  const categories = await HotelCategory.find(query).sort({ order: 1 });

  if (options?.includeDishesFew) {
    // Include first few dishes for preview
    const categoryIds = categories.map((c) => c._id);
    const dishes = await HotelDish.find({
      categoryId: { $in: categoryIds },
      isAvailable: true,
    })
      .sort({ order: 1 })
      .limit(5);

    const dishesByCategory = new Map<string, IHotelDish[]>();
    for (const dish of dishes) {
      const catIdStr = dish.categoryId.toString();
      if (!dishesByCategory.has(catIdStr)) {
        dishesByCategory.set(catIdStr, []);
      }
      if (dishesByCategory.get(catIdStr)!.length < 3) {
        dishesByCategory.get(catIdStr)!.push(dish);
      }
    }

    return categories.map((cat) => {
      const catObj = cat.toObject() as unknown as Record<string, unknown>;
      catObj.dishes = dishesByCategory.get(cat._id.toString()) || [];
      return catObj as unknown as IHotelCategory;
    });
  }

  return categories;
};

/**
 * Update category
 */
export const updateCategory = async (
  categoryId: mongoose.Types.ObjectId | string,
  data: Partial<IHotelCategory>
): Promise<IHotelCategory | null> => {
  return HotelCategory.findByIdAndUpdate(categoryId, data, {
    new: true,
    runValidators: true,
  });
};

/**
 * Delete category
 */
export const deleteCategory = async (
  categoryId: mongoose.Types.ObjectId | string
): Promise<boolean> => {
  await Promise.all([
    HotelDish.deleteMany({ categoryId }),
    HotelCategory.findByIdAndDelete(categoryId),
  ]);

  logger.info('Hotel category deleted', { categoryId });
  return true;
};

/**
 * Reorder categories
 */
export const reorderCategories = async (
  menuId: mongoose.Types.ObjectId | string,
  categoryOrders: Array<{ categoryId: string; order: number }>
): Promise<void> => {
  const menuObjectId = new mongoose.Types.ObjectId(menuId.toString());
  const operations = categoryOrders.map((co) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(co.categoryId), menuId: menuObjectId },
      update: { $set: { order: co.order } },
    },
  }));

  await HotelCategory.bulkWrite(operations as Parameters<typeof HotelCategory.bulkWrite>[0]);
  logger.info('Categories reordered', { menuId, count: categoryOrders.length });
};

// ============================================
// Dish Operations
// ============================================

/**
 * Create dish
 */
export const createDish = async (
  categoryId: mongoose.Types.ObjectId | string,
  data: Partial<IHotelDish>
): Promise<IHotelDish> => {
  const category = await HotelCategory.findById(categoryId);
  if (!category) {throw new Error('Category not found');}

  const dish = await HotelDish.create({
    ...data,
    categoryId,
    menuId: category.menuId,
    hotelId: category.hotelId,
  });

  logger.info('Hotel dish created', { categoryId, dishId: dish._id });
  return dish;
};

/**
 * Get dishes by category
 */
export const getDishesByCategory = async (
  categoryId: mongoose.Types.ObjectId | string,
  options?: { isAvailable?: boolean }
): Promise<IHotelDish[]> => {
  const query: Record<string, unknown> = { categoryId };
  if (options?.isAvailable !== undefined) {query.isAvailable = options.isAvailable;}

  return HotelDish.find(query).sort({ order: 1 });
};

/**
 * Get dish by ID
 */
export const getDishById = async (
  dishId: mongoose.Types.ObjectId | string
): Promise<IHotelDish | null> => {
  return HotelDish.findById(dishId);
};

/**
 * Update dish
 */
export const updateDish = async (
  dishId: mongoose.Types.ObjectId | string,
  data: Partial<IHotelDish>
): Promise<IHotelDish | null> => {
  return HotelDish.findByIdAndUpdate(dishId, data, {
    new: true,
    runValidators: true,
  });
};

/**
 * Delete dish
 */
export const deleteDish = async (
  dishId: mongoose.Types.ObjectId | string
): Promise<boolean> => {
  await HotelDish.findByIdAndDelete(dishId);
  logger.info('Hotel dish deleted', { dishId });
  return true;
};

/**
 * Update dish availability
 */
export const updateDishAvailability = async (
  dishId: mongoose.Types.ObjectId | string,
  isAvailable: boolean
): Promise<IHotelDish | null> => {
  return HotelDish.findByIdAndUpdate(
    dishId,
    { isAvailable },
    { new: true }
  );
};

/**
 * Reorder dishes
 */
export const reorderDishes = async (
  categoryId: mongoose.Types.ObjectId | string,
  dishOrders: Array<{ dishId: string; order: number }>
): Promise<void> => {
  const categoryObjectId = new mongoose.Types.ObjectId(categoryId.toString());
  const operations = dishOrders.map((d) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(d.dishId), categoryId: categoryObjectId },
      update: { $set: { order: d.order } },
    },
  }));

  await HotelDish.bulkWrite(operations as Parameters<typeof HotelDish.bulkWrite>[0]);
  logger.info('Dishes reordered', { categoryId, count: dishOrders.length });
};

// ============================================
// Linked Restaurant Menu
// ============================================

/**
 * Link hotel menu to restaurant menu
 */
export const linkToRestaurantMenu = async (
  menuId: mongoose.Types.ObjectId | string,
  restaurantId: mongoose.Types.ObjectId | string,
  pricingRules?: IPricingRules
): Promise<IHotelMenu | null> => {
  const menu = await HotelMenu.findById(menuId);
  if (!menu) {return null;}

  menu.source = 'linked_restaurant';
  menu.linkedRestaurantId = new mongoose.Types.ObjectId(restaurantId.toString());
  menu.pricingRules = pricingRules || { type: 'same' };

  await menu.save();

  logger.info('Hotel menu linked to restaurant', { menuId, restaurantId });
  return menu;
};

/**
 * Sync dishes from linked restaurant
 */
export const syncFromRestaurantMenu = async (
  menuId: mongoose.Types.ObjectId | string
): Promise<{ categories: number; dishes: number }> => {
  const menu = await HotelMenu.findById(menuId);
  if (!menu || menu.source !== 'linked_restaurant' || !menu.linkedRestaurantId) {
    throw new Error('Menu is not linked to a restaurant');
  }

  // Get restaurant categories and dishes
  const [restaurantCategories, restaurantDishes] = await Promise.all([
    Category.find({ restaurantId: menu.linkedRestaurantId, isActive: true }),
    Dish.find({ restaurantId: menu.linkedRestaurantId, isAvailable: true }),
  ]);

  // Clear existing categories and dishes
  const existingCategories = await HotelCategory.find({ menuId });
  await HotelDish.deleteMany({ categoryId: { $in: existingCategories.map((c) => c._id) } });
  await HotelCategory.deleteMany({ menuId });

  // Create hotel categories
  const categoryMap = new Map<string, mongoose.Types.ObjectId>();

  for (const restCat of restaurantCategories) {
    const hotelCategory = await HotelCategory.create({
      hotelId: menu.hotelId,
      menuId: menu._id,
      name: restCat.name,
      slug: restCat.slug,
      description: restCat.description,
      image: restCat.image,
      order: restCat.order,
      isActive: true,
    });
    categoryMap.set(restCat._id.toString(), hotelCategory._id);
  }

  // Create hotel dishes with price adjustments
  let dishCount = 0;
  for (const restDish of restaurantDishes) {
    const hotelCategoryId = categoryMap.get(restDish.categoryId.toString());
    if (!hotelCategoryId) {continue;}

    const adjustedPrice = menu.calculatePrice(restDish.price);

    await HotelDish.create({
      hotelId: menu.hotelId,
      menuId: menu._id,
      categoryId: hotelCategoryId,
      name: restDish.name,
      slug: restDish.slug,
      description: restDish.description,
      price: adjustedPrice,
      image: restDish.image,
      images: restDish.images,
      allergens: restDish.allergens,
      tags: restDish.tags,
      nutritionalInfo: restDish.nutritionalInfo,
      options: restDish.options?.map((opt) => ({
        name: opt.name,
        price: menu.calculatePrice(opt.price),
        isDefault: opt.isDefault,
      })),
      variants: restDish.variants?.map((v) => ({
        name: v.name,
        price: menu.calculatePrice(v.price),
      })),
      isVegetarian: restDish.isVegetarian,
      isVegan: restDish.isVegan,
      isGlutenFree: restDish.isGlutenFree,
      isSpicy: restDish.isSpicy,
      spicyLevel: restDish.spicyLevel,
      isAvailable: true,
      isPopular: restDish.isPopular,
      order: restDish.order,
    });
    dishCount++;
  }

  logger.info('Menu synced from restaurant', {
    menuId,
    restaurantId: menu.linkedRestaurantId,
    categories: categoryMap.size,
    dishes: dishCount,
  });

  return {
    categories: categoryMap.size,
    dishes: dishCount,
  };
};

// ============================================
// Menu Display (Guest-facing)
// ============================================

/**
 * Get full menu for guest display
 */
export const getMenuForGuest = async (
  menuId: mongoose.Types.ObjectId | string,
  _options?: { language?: string }
): Promise<{
  menu: IHotelMenu;
  categories: Array<IHotelCategory & { dishes: IHotelDish[] }>;
}> => {
  const menu = await HotelMenu.findById(menuId);
  if (!menu || !menu.isActive) {
    throw new Error('Menu not found or not available');
  }

  // Check if menu is currently available
  if (!menu.isCurrentlyAvailable) {
    throw new Error('Menu is not currently available');
  }

  const categories = await HotelCategory.find({
    menuId,
    isActive: true,
  }).sort({ order: 1 });

  const dishes = await HotelDish.find({
    menuId,
    isAvailable: true,
  }).sort({ order: 1 });

  // Group dishes by category
  const dishesByCategory = new Map<string, IHotelDish[]>();
  for (const dish of dishes) {
    const catId = dish.categoryId.toString();
    if (!dishesByCategory.has(catId)) {
      dishesByCategory.set(catId, []);
    }
    dishesByCategory.get(catId)!.push(dish);
  }

  // Filter out categories that are not currently available
  const availableCategories = categories
    .filter((cat) => cat.isCurrentlyAvailable)
    .map((cat) => ({
      ...cat.toObject(),
      dishes: dishesByCategory.get(cat._id.toString()) || [],
    })) as unknown as Array<IHotelCategory & { dishes: IHotelDish[] }>;

  return {
    menu,
    categories: availableCategories,
  };
};

/**
 * Search dishes in hotel
 */
export const searchDishes = async (
  hotelId: mongoose.Types.ObjectId | string,
  query: string,
  options?: { menuId?: string; limit?: number }
): Promise<IHotelDish[]> => {
  const searchQuery: Record<string, unknown> = {
    hotelId,
    isAvailable: true,
    $text: { $search: query },
  };

  if (options?.menuId) {
    searchQuery.menuId = options.menuId;
  }

  return HotelDish.find(searchQuery)
    .sort({ score: { $meta: 'textScore' } })
    .limit(options?.limit || 20);
};

/**
 * Get popular dishes
 */
export const getPopularDishes = async (
  hotelId: mongoose.Types.ObjectId | string,
  limit = 10
): Promise<IHotelDish[]> => {
  return HotelDish.find({
    hotelId,
    isAvailable: true,
    isPopular: true,
  })
    .sort({ totalOrders: -1 })
    .limit(limit);
};

/**
 * Get featured dishes
 */
export const getFeaturedDishes = async (
  hotelId: mongoose.Types.ObjectId | string
): Promise<IHotelDish[]> => {
  return HotelDish.find({
    hotelId,
    isAvailable: true,
    isFeatured: true,
  }).sort({ order: 1 });
};

export default {
  // Menu
  createMenu,
  getMenuById,
  getMenusByHotel,
  updateMenu,
  deleteMenu,
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
  // Linked restaurant
  linkToRestaurantMenu,
  syncFromRestaurantMenu,
  // Guest display
  getMenuForGuest,
  searchDishes,
  getPopularDishes,
  getFeaturedDishes,
};
