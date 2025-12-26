import { Request, Response } from 'express';
import { Dish, Category, Restaurant } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

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

  // Create dish
  const dish = await Dish.create({
    ...req.body,
    restaurantId: restaurant._id,
    order,
  });

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

  // Update dish
  const updatedDish = await Dish.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).populate('categoryId', 'name slug');

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

  // Hard delete
  await Dish.findByIdAndDelete(id);

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
    dish.isAvailable = !dish.isAvailable;
    await dish.save();

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
