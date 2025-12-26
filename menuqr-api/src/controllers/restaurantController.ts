import { Request, Response } from 'express';
import { Restaurant, User } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

export const createRestaurant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  // Check if user already has a restaurant
  const existingRestaurant = await Restaurant.findOne({ ownerId: user._id });
  if (existingRestaurant) {
    throw new ApiError(409, 'You already have a restaurant');
  }

  // Create restaurant
  const restaurant = new Restaurant({
    ...req.body,
    ownerId: user._id,
  });
  await restaurant.save();

  // Update user with restaurant ID
  await User.findByIdAndUpdate(user._id, { restaurantId: restaurant._id });

  res.status(201).json({
    success: true,
    message: 'Restaurant created successfully',
    data: restaurant,
  });
});

export const getMyRestaurant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  res.json({
    success: true,
    data: restaurant,
  });
});

export const getRestaurantBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;

    const restaurant = await Restaurant.findOne({ slug, isActive: true });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    res.json({
      success: true,
      data: {
        id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        logo: restaurant.logo,
        coverImage: restaurant.coverImage,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        website: restaurant.website,
        openingHours: restaurant.openingHours,
        settings: {
          currency: restaurant.settings.currency,
          defaultLanguage: restaurant.settings.defaultLanguage,
          availableLanguages: restaurant.settings.availableLanguages,
          tablePrefix: restaurant.settings.tablePrefix,
        },
      },
    });
  }
);

export const getRestaurantById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    res.json({
      success: true,
      data: restaurant,
    });
  }
);

export const updateRestaurant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;

    // Find restaurant
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    // Check ownership
    if (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to update this restaurant');
    }

    // Update restaurant
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Restaurant updated successfully',
      data: updatedRestaurant,
    });
  }
);

export const deleteRestaurant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;

    // Find restaurant
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    // Check ownership
    if (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to delete this restaurant');
    }

    // Soft delete
    await Restaurant.findByIdAndUpdate(id, { isActive: false });

    res.json({
      success: true,
      message: 'Restaurant deleted successfully',
    });
  }
);

export const getAllRestaurants = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, search } = req.query;

    const query: Record<string, unknown> = { isActive: true };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const restaurants = await Restaurant.find(query)
      .select('name slug logo description address')
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Restaurant.countDocuments(query);

    res.json({
      success: true,
      data: {
        restaurants,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  }
);
