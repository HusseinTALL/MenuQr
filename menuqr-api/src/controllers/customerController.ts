import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Customer, Order, Dish } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

// ============================================
// FAVORITES
// ============================================

/**
 * Get customer's favorite dishes
 * GET /customer/favorites
 */
export const getFavorites = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;

  // Populate favorite dishes with their details
  const populatedCustomer = await Customer.findById(customer._id).populate({
    path: 'favoriteDishes',
    select: 'name slug description price image isAvailable isPopular preparationTime categoryId',
    populate: {
      path: 'categoryId',
      select: 'name slug',
    },
  });

  const favorites = populatedCustomer?.favoriteDishes || [];

  res.json({
    success: true,
    data: favorites,
  });
});

/**
 * Add dish to favorites
 * POST /customer/favorites/:dishId
 */
export const addFavorite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { dishId } = req.params;

  // Verify dish exists and belongs to the same restaurant
  const dish = await Dish.findOne({
    _id: dishId,
    restaurantId: customer.restaurantId,
  });

  if (!dish) {
    throw new ApiError(404, 'Plat non trouvé');
  }

  // Check if already in favorites
  if (customer.favoriteDishes.some((id) => id.toString() === dishId)) {
    throw new ApiError(409, 'Ce plat est déjà dans vos favoris');
  }

  // Check max favorites limit
  if (customer.favoriteDishes.length >= 50) {
    throw new ApiError(400, 'Vous avez atteint la limite de 50 favoris');
  }

  // Add to favorites
  await Customer.findByIdAndUpdate(customer._id, {
    $push: { favoriteDishes: dishId },
  });

  res.json({
    success: true,
    message: 'Plat ajouté aux favoris',
  });
});

/**
 * Remove dish from favorites
 * DELETE /customer/favorites/:dishId
 */
export const removeFavorite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { dishId } = req.params;

  // Check if in favorites
  if (!customer.favoriteDishes.some((id) => id.toString() === dishId)) {
    throw new ApiError(404, 'Ce plat n\'est pas dans vos favoris');
  }

  // Remove from favorites
  await Customer.findByIdAndUpdate(customer._id, {
    $pull: { favoriteDishes: new mongoose.Types.ObjectId(dishId) },
  });

  res.json({
    success: true,
    message: 'Plat retiré des favoris',
  });
});

/**
 * Check if dish is in favorites
 * GET /customer/favorites/:dishId/check
 */
export const checkFavorite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { dishId } = req.params;

  const isFavorite = customer.favoriteDishes.some((id) => id.toString() === dishId);

  res.json({
    success: true,
    data: { isFavorite },
  });
});

// ============================================
// ADDRESSES
// ============================================

/**
 * Get customer's saved addresses
 * GET /customer/addresses
 */
export const getAddresses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;

  res.json({
    success: true,
    data: {
      defaultAddress: customer.defaultAddress,
      savedAddresses: customer.savedAddresses,
    },
  });
});

/**
 * Add new address
 * POST /customer/addresses
 */
export const addAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { label, street, city, postalCode, country, instructions, isDefault } = req.body;

  // Check max addresses limit
  if (customer.savedAddresses.length >= 5) {
    throw new ApiError(400, 'Vous avez atteint la limite de 5 adresses');
  }

  const newAddress = {
    _id: new mongoose.Types.ObjectId(),
    label,
    street,
    city,
    postalCode,
    country: country || 'Burkina Faso',
    instructions,
    isDefault: isDefault || false,
  };

  // If setting as default, unset other defaults
  if (newAddress.isDefault) {
    await Customer.findByIdAndUpdate(customer._id, {
      $set: {
        'savedAddresses.$[].isDefault': false,
        defaultAddress: newAddress,
      },
    });
  }

  // Add new address
  await Customer.findByIdAndUpdate(customer._id, {
    $push: { savedAddresses: newAddress },
    ...(newAddress.isDefault && { defaultAddress: newAddress }),
  });

  res.status(201).json({
    success: true,
    message: 'Adresse ajoutée',
    data: newAddress,
  });
});

/**
 * Update address
 * PUT /customer/addresses/:addressId
 */
export const updateAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { addressId } = req.params;
  const { label, street, city, postalCode, country, instructions, isDefault } = req.body;

  // Find address index
  const addressIndex = customer.savedAddresses.findIndex(
    (addr) => addr._id?.toString() === addressId
  );

  if (addressIndex === -1) {
    throw new ApiError(404, 'Adresse non trouvée');
  }

  const updatedAddress = {
    _id: customer.savedAddresses[addressIndex]._id,
    label: label || customer.savedAddresses[addressIndex].label,
    street: street || customer.savedAddresses[addressIndex].street,
    city: city || customer.savedAddresses[addressIndex].city,
    postalCode: postalCode ?? customer.savedAddresses[addressIndex].postalCode,
    country: country || customer.savedAddresses[addressIndex].country,
    instructions: instructions ?? customer.savedAddresses[addressIndex].instructions,
    isDefault: isDefault ?? customer.savedAddresses[addressIndex].isDefault,
  };

  // Update address in array
  const updateQuery: Record<string, unknown> = {
    [`savedAddresses.${addressIndex}`]: updatedAddress,
  };

  // If setting as default, update default address and unset others
  if (updatedAddress.isDefault) {
    // First unset all defaults
    await Customer.findByIdAndUpdate(customer._id, {
      $set: { 'savedAddresses.$[].isDefault': false },
    });
    updateQuery.defaultAddress = updatedAddress;
  }

  await Customer.findByIdAndUpdate(customer._id, {
    $set: updateQuery,
  });

  res.json({
    success: true,
    message: 'Adresse mise à jour',
    data: updatedAddress,
  });
});

/**
 * Delete address
 * DELETE /customer/addresses/:addressId
 */
export const deleteAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { addressId } = req.params;

  // Find address
  const address = customer.savedAddresses.find((addr) => addr._id?.toString() === addressId);

  if (!address) {
    throw new ApiError(404, 'Adresse non trouvée');
  }

  // Remove address
  await Customer.findByIdAndUpdate(customer._id, {
    $pull: { savedAddresses: { _id: new mongoose.Types.ObjectId(addressId) } },
    // If deleting the default address, clear it
    ...(address.isDefault && { defaultAddress: null }),
  });

  res.json({
    success: true,
    message: 'Adresse supprimée',
  });
});

/**
 * Set default address
 * PUT /customer/addresses/:addressId/default
 */
export const setDefaultAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { addressId } = req.params;

  // Find address
  const address = customer.savedAddresses.find((addr) => addr._id?.toString() === addressId);

  if (!address) {
    throw new ApiError(404, 'Adresse non trouvée');
  }

  // Unset all defaults and set new default
  await Customer.findByIdAndUpdate(customer._id, {
    $set: {
      'savedAddresses.$[].isDefault': false,
    },
  });

  await Customer.findByIdAndUpdate(
    customer._id,
    {
      $set: {
        'savedAddresses.$[elem].isDefault': true,
        defaultAddress: { ...address, isDefault: true },
      },
    },
    {
      arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(addressId) }],
    }
  );

  res.json({
    success: true,
    message: 'Adresse par défaut mise à jour',
  });
});

// ============================================
// ORDER HISTORY
// ============================================

/**
 * Get customer's order history
 * GET /customer/orders
 */
export const getOrderHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { page = 1, limit = 20, status } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = Math.min(parseInt(limit as string, 10), 50);

  const query: Record<string, unknown> = { customerId: customer._id };
  if (status) {
    query.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

/**
 * Get order details
 * GET /customer/orders/:orderId
 */
export const getOrderDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { orderId } = req.params;

  const order = await Order.findOne({
    _id: orderId,
    customerId: customer._id,
  });

  if (!order) {
    throw new ApiError(404, 'Commande non trouvée');
  }

  res.json({
    success: true,
    data: order,
  });
});

/**
 * Reorder - create a new order with the same items
 * POST /customer/orders/:orderId/reorder
 */
export const reorder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;
  const { orderId } = req.params;

  // Find original order
  const originalOrder = await Order.findOne({
    _id: orderId,
    customerId: customer._id,
  });

  if (!originalOrder) {
    throw new ApiError(404, 'Commande non trouvée');
  }

  // Verify all dishes are still available
  const dishIds = originalOrder.items.map((item) => item.dishId);
  const availableDishes = await Dish.find({
    _id: { $in: dishIds },
    restaurantId: customer.restaurantId,
    isAvailable: true,
  });

  const availableDishIds = availableDishes.map((d) => d._id.toString());
  const unavailableItems = originalOrder.items.filter(
    (item) => !availableDishIds.includes(item.dishId.toString())
  );

  if (unavailableItems.length > 0) {
    const unavailableNames = unavailableItems.map((i) => i.name).join(', ');
    throw new ApiError(400, `Certains plats ne sont plus disponibles: ${unavailableNames}`);
  }

  // Recalculate prices (they may have changed)
  let subtotal = 0;
  const processedItems = [];

  for (const item of originalOrder.items) {
    const dish = availableDishes.find((d) => d._id.toString() === item.dishId.toString());
    if (!dish) continue;

    // Use current prices
    let itemPrice = item.variant ? item.variant.price : dish.price;
    let optionsTotal = 0;

    if (item.options && item.options.length > 0) {
      // Try to match options with current dish options
      for (const opt of item.options) {
        const currentOpt = dish.options?.find((o) => {
          const optName = typeof o.name === 'object' ? o.name.fr : o.name;
          return optName === opt.name;
        });
        optionsTotal += currentOpt?.price || opt.price;
      }
    }

    const itemSubtotal = (itemPrice + optionsTotal) * item.quantity;
    subtotal += itemSubtotal;

    processedItems.push({
      dishId: dish._id,
      name: (dish.name as Record<string, string>).fr || item.name,
      price: itemPrice,
      quantity: item.quantity,
      options: item.options,
      variant: item.variant,
      specialInstructions: item.specialInstructions,
      subtotal: itemSubtotal,
    });
  }

  // Return the cart data for the client to review before confirming
  res.json({
    success: true,
    message: 'Commande prête à être renouvelée',
    data: {
      items: processedItems,
      subtotal,
      originalOrderNumber: originalOrder.orderNumber,
      note: 'Veuillez vérifier les prix car ils peuvent avoir changé.',
    },
  });
});

// ============================================
// STATISTICS
// ============================================

/**
 * Get customer statistics
 * GET /customer/stats
 */
export const getCustomerStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customer = req.customer!;

  const [orderStats, favoriteCount] = await Promise.all([
    Order.aggregate([
      { $match: { customerId: customer._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]),
    Customer.findById(customer._id).select('favoriteDishes'),
  ]);

  const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0 };

  res.json({
    success: true,
    data: {
      totalOrders: stats.totalOrders,
      totalSpent: Math.round(stats.totalSpent * 100) / 100,
      avgOrderValue: Math.round(stats.avgOrderValue * 100) / 100,
      favoriteCount: favoriteCount?.favoriteDishes.length || 0,
      memberSince: customer.createdAt,
    },
  });
});
