import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Dish, Category, Restaurant } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as auditService from '../services/auditService.js';
import { subscriptionService } from '../services/subscriptionService.js';

export const createDish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  // Get restaurant
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Verify category belongs to restaurant
  const category = await Category.findOne({
    _id: req.body.categoryId,
    restaurantId: restaurant._id,
  });
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Get highest order in category
  const lastDish = await Dish.findOne({ categoryId: category._id })
    .sort({ order: -1 })
    .select('order');
  const order = lastDish ? lastDish.order + 1 : 0;

  // Extract only allowed fields to prevent field injection
  const allowedFields = [
    'name', 'description', 'price', 'image', 'images', 'categoryId',
    'allergens', 'tags', 'preparationTime', 'isAvailable', 'isVegetarian',
    'isVegan', 'isGlutenFree', 'isSpicy', 'spicyLevel', 'calories',
    'nutritionInfo', 'options', 'variants', 'trackStock', 'stock', 'lowStockThreshold'
  ];
  const dishData: Record<string, unknown> = {
    restaurantId: restaurant._id,
    order,
  };
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      dishData[field] = req.body[field];
    }
  }

  // Create dish with sanitized data
  const dish = await Dish.create(dishData);

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    const dishDoc = Array.isArray(dish) ? dish[0] : dish;
    const dishName = (dishDoc.name as Record<string, string>).fr;
    await auditService.auditCreate(
      'dish',
      auditUser,
      { type: 'Dish', id: dishDoc._id, name: dishName },
      `Dish "${dishName}" created`,
      auditService.getRequestInfo(req),
      { categoryId: dishDoc.categoryId, price: dishDoc.price }
    );
  }

  // Track dish usage for subscription
  try {
    await subscriptionService.incrementUsage(
      new mongoose.Types.ObjectId(restaurant._id.toString()),
      'dishes'
    );
  } catch (usageError) {
    console.error('Failed to track dish usage:', usageError);
    // Don't fail the request if usage tracking fails
  }

  res.status(201).json({
    success: true,
    message: 'Dish created successfully',
    data: dish,
  });
});

export const getDishesByRestaurant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const { categoryId, isAvailable, isVegetarian, isVegan, search } = req.query;

    const query: Record<string, unknown> = { restaurantId };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === 'true';
    }

    if (isVegetarian === 'true') {
      query.isVegetarian = true;
    }

    if (isVegan === 'true') {
      query.isVegan = true;
    }

    if (search) {
      query.$or = [
        { 'name.fr': { $regex: search, $options: 'i' } },
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'description.fr': { $regex: search, $options: 'i' } },
      ];
    }

    const dishes = await Dish.find(query)
      .populate('categoryId', 'name slug')
      .sort({ categoryId: 1, order: 1 });

    res.json({
      success: true,
      data: dishes,
    });
  }
);

export const getMyDishes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { categoryId, isAvailable } = req.query;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const query: Record<string, unknown> = { restaurantId: restaurant._id };

  if (categoryId) {
    query.categoryId = categoryId;
  }

  if (isAvailable !== undefined) {
    query.isAvailable = isAvailable === 'true';
  }

  const dishes = await Dish.find(query)
    .populate('categoryId', 'name slug')
    .sort({ categoryId: 1, order: 1 });

  res.json({
    success: true,
    data: dishes,
  });
});

export const getDishById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const dish = await Dish.findById(id).populate('categoryId', 'name slug');
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  res.json({
    success: true,
    data: dish,
  });
});

export const updateDish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  // Find dish
  const dish = await Dish.findById(id);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  // Check ownership
  const restaurant = await Restaurant.findById(dish.restaurantId);
  if (!restaurant || (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin')) {
    throw new ApiError(403, 'Not authorized to update this dish');
  }

  // If changing category, verify it belongs to same restaurant
  if (req.body.categoryId && req.body.categoryId !== dish.categoryId.toString()) {
    const category = await Category.findOne({
      _id: req.body.categoryId,
      restaurantId: restaurant._id,
    });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
  }

  // Store old values for audit
  const oldName = (dish.name as Record<string, string>).fr;
  const oldPrice = dish.price;
  const oldAvailable = dish.isAvailable;

  // Extract only allowed fields to prevent field injection
  const allowedFields = [
    'name', 'description', 'price', 'image', 'images', 'categoryId',
    'allergens', 'tags', 'preparationTime', 'isAvailable', 'isVegetarian',
    'isVegan', 'isGlutenFree', 'isSpicy', 'spicyLevel', 'calories',
    'nutritionInfo', 'options', 'variants', 'trackStock', 'stock', 'lowStockThreshold'
  ];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  // Update dish with sanitized data
  const updatedDish = await Dish.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate('categoryId', 'name slug');

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser && updatedDish) {
    const changes = [];
    if (req.body.name) {changes.push({ field: 'name', oldValue: oldName, newValue: (updatedDish.name as Record<string, string>).fr });}
    if (req.body.price !== undefined && req.body.price !== oldPrice) {changes.push({ field: 'price', oldValue: oldPrice, newValue: updatedDish.price });}
    if (req.body.isAvailable !== undefined && req.body.isAvailable !== oldAvailable) {changes.push({ field: 'isAvailable', oldValue: oldAvailable, newValue: updatedDish.isAvailable });}

    await auditService.auditUpdate(
      'dish',
      auditUser,
      { type: 'Dish', id: dish._id, name: (updatedDish.name as Record<string, string>).fr },
      changes.length > 0 ? changes : undefined,
      `Dish "${(updatedDish.name as Record<string, string>).fr}" updated`,
      auditService.getRequestInfo(req)
    );
  }

  res.json({
    success: true,
    message: 'Dish updated successfully',
    data: updatedDish,
  });
});

export const deleteDish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  // Find dish
  const dish = await Dish.findById(id);
  if (!dish) {
    throw new ApiError(404, 'Dish not found');
  }

  // Check ownership
  const restaurant = await Restaurant.findById(dish.restaurantId);
  if (!restaurant || (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin')) {
    throw new ApiError(403, 'Not authorized to delete this dish');
  }

  // Store dish info for audit before deletion
  const dishName = (dish.name as Record<string, string>).fr;

  // Hard delete
  await Dish.findByIdAndDelete(id);

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    await auditService.auditDelete(
      'dish',
      auditUser,
      { type: 'Dish', id: dish._id, name: dishName },
      `Dish "${dishName}" deleted`,
      auditService.getRequestInfo(req)
    );
  }

  // Track dish usage for subscription (decrement)
  try {
    await subscriptionService.decrementUsage(
      new mongoose.Types.ObjectId(restaurant._id.toString()),
      'dishes'
    );
  } catch (usageError) {
    console.error('Failed to track dish deletion:', usageError);
    // Don't fail the request if usage tracking fails
  }

  res.json({
    success: true,
    message: 'Dish deleted successfully',
  });
});

export const toggleAvailability = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;

    // Find dish
    const dish = await Dish.findById(id);
    if (!dish) {
      throw new ApiError(404, 'Dish not found');
    }

    // Check ownership
    const restaurant = await Restaurant.findById(dish.restaurantId);
    if (!restaurant || (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin')) {
      throw new ApiError(403, 'Not authorized to update this dish');
    }

    // Toggle availability
    const oldAvailable = dish.isAvailable;
    dish.isAvailable = !dish.isAvailable;
    await dish.save();

    // Audit log
    const auditUser = auditService.getUserFromRequest(req);
    if (auditUser) {
      await auditService.auditUpdate(
        'dish',
        auditUser,
        { type: 'Dish', id: dish._id, name: (dish.name as Record<string, string>).fr },
        [{ field: 'isAvailable', oldValue: oldAvailable, newValue: dish.isAvailable }],
        `Dish "${(dish.name as Record<string, string>).fr}" ${dish.isAvailable ? 'enabled' : 'disabled'}`,
        auditService.getRequestInfo(req)
      );
    }

    res.json({
      success: true,
      message: `Dish ${dish.isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: { isAvailable: dish.isAvailable },
    });
  }
);

export const reorderDishes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { dishes } = req.body;

  // Get restaurant
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Update order for each dish
  const updates = dishes.map(
    (item: { id: string; order: number }) =>
      Dish.findOneAndUpdate(
        { _id: item.id, restaurantId: restaurant._id },
        { order: item.order }
      )
  );

  await Promise.all(updates);

  res.json({
    success: true,
    message: 'Dishes reordered successfully',
  });
});
