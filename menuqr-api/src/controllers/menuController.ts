import { Request, Response } from 'express';
import { Restaurant, Category, Dish } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

export const getFullMenu = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Get restaurant
  const restaurant = await Restaurant.findById(id);
  if (!restaurant || !restaurant.isActive) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Get active categories sorted by order
  const categories = await Category.find({
    restaurantId: id,
    isActive: true,
  }).sort({ order: 1 });

  // Get all available dishes for this restaurant
  const dishes = await Dish.find({
    restaurantId: id,
    isAvailable: true,
  }).sort({ order: 1 });

  // Group dishes by category
  const dishesMap = new Map<string, typeof dishes>();
  dishes.forEach((dish) => {
    const categoryId = dish.categoryId.toString();
    if (!dishesMap.has(categoryId)) {
      dishesMap.set(categoryId, []);
    }
    dishesMap.get(categoryId)!.push(dish);
  });

  // Build menu structure
  const menu = categories.map((category) => ({
    id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    image: category.image,
    dishes: (dishesMap.get(category._id.toString()) || []).map((dish) => ({
      id: dish._id,
      name: dish.name,
      slug: dish.slug,
      description: dish.description,
      price: dish.price,
      image: dish.image,
      allergens: dish.allergens,
      tags: dish.tags,
      nutritionalInfo: dish.nutritionalInfo,
      options: dish.options,
      variants: dish.variants,
      isVegetarian: dish.isVegetarian,
      isVegan: dish.isVegan,
      isGlutenFree: dish.isGlutenFree,
      isSpicy: dish.isSpicy,
      spicyLevel: dish.spicyLevel,
      isPopular: dish.isPopular,
      isNewDish: dish.isNewDish,
      preparationTime: dish.preparationTime,
    })),
  }));

  res.json({
    success: true,
    data: {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        logo: restaurant.logo,
        coverImage: restaurant.coverImage,
        settings: {
          currency: restaurant.settings.currency,
          defaultLanguage: restaurant.settings.defaultLanguage,
          availableLanguages: restaurant.settings.availableLanguages,
          tablePrefix: restaurant.settings.tablePrefix,
        },
      },
      categories: menu,
      totalDishes: dishes.length,
      totalCategories: categories.length,
    },
  });
});

export const getMenuBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  // Get restaurant by slug
  const restaurant = await Restaurant.findOne({ slug, isActive: true });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Get active categories sorted by order
  const categories = await Category.find({
    restaurantId: restaurant._id,
    isActive: true,
  }).sort({ order: 1 });

  // Get all available dishes for this restaurant
  const dishes = await Dish.find({
    restaurantId: restaurant._id,
    isAvailable: true,
  }).sort({ order: 1 });

  // Group dishes by category
  const dishesMap = new Map<string, typeof dishes>();
  dishes.forEach((dish) => {
    const categoryId = dish.categoryId.toString();
    if (!dishesMap.has(categoryId)) {
      dishesMap.set(categoryId, []);
    }
    dishesMap.get(categoryId)!.push(dish);
  });

  // Build menu structure
  const menu = categories.map((category) => ({
    id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    image: category.image,
    dishes: (dishesMap.get(category._id.toString()) || []).map((dish) => ({
      id: dish._id,
      name: dish.name,
      slug: dish.slug,
      description: dish.description,
      price: dish.price,
      image: dish.image,
      allergens: dish.allergens,
      tags: dish.tags,
      nutritionalInfo: dish.nutritionalInfo,
      options: dish.options,
      variants: dish.variants,
      isVegetarian: dish.isVegetarian,
      isVegan: dish.isVegan,
      isGlutenFree: dish.isGlutenFree,
      isSpicy: dish.isSpicy,
      spicyLevel: dish.spicyLevel,
      isPopular: dish.isPopular,
      isNewDish: dish.isNewDish,
      preparationTime: dish.preparationTime,
    })),
  }));

  res.json({
    success: true,
    data: {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        logo: restaurant.logo,
        coverImage: restaurant.coverImage,
        address: restaurant.address,
        phone: restaurant.phone,
        openingHours: restaurant.openingHours,
        settings: {
          currency: restaurant.settings.currency,
          defaultLanguage: restaurant.settings.defaultLanguage,
          availableLanguages: restaurant.settings.availableLanguages,
          tablePrefix: restaurant.settings.tablePrefix,
          tableCount: restaurant.settings.tableCount,
        },
      },
      categories: menu,
      totalDishes: dishes.length,
      totalCategories: categories.length,
    },
  });
});
