import { Request, Response } from 'express';
import { Category, Restaurant } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as auditService from '../services/auditService.js';

export const createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  // Get restaurant
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Get highest order
  const lastCategory = await Category.findOne({ restaurantId: restaurant._id })
    .sort({ order: -1 })
    .select('order');
  const order = lastCategory ? lastCategory.order + 1 : 0;

  // Create category
  const category = await Category.create({
    ...req.body,
    restaurantId: restaurant._id,
    order,
  });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    const categoryDoc = Array.isArray(category) ? category[0] : category;
    const categoryName = (categoryDoc.name as Record<string, string>).fr;
    await auditService.auditCreate(
      'category',
      auditUser,
      { type: 'Category', id: categoryDoc._id, name: categoryName },
      `Category "${categoryName}" created`,
      auditService.getRequestInfo(req)
    );
  }

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
});

export const getCategoriesByRestaurant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;

    const categories = await Category.find({
      restaurantId,
      isActive: true,
    }).sort({ order: 1 });

    res.json({
      success: true,
      data: categories,
    });
  }
);

export const getMyCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const categories = await Category.find({ restaurantId: restaurant._id }).sort({ order: 1 });

  res.json({
    success: true,
    data: categories,
  });
});

export const getCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  res.json({
    success: true,
    data: category,
  });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  // Find category
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Check ownership
  const restaurant = await Restaurant.findById(category.restaurantId);
  if (!restaurant || (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin')) {
    throw new ApiError(403, 'Not authorized to update this category');
  }

  // Store old values for audit
  const oldName = (category.name as Record<string, string>).fr;

  // Update category
  const updatedCategory = await Category.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser && updatedCategory) {
    const changes = [];
    if (req.body.name) {
      changes.push({ field: 'name', oldValue: oldName, newValue: (updatedCategory.name as Record<string, string>).fr });
    }
    await auditService.auditUpdate(
      'category',
      auditUser,
      { type: 'Category', id: category._id, name: (updatedCategory.name as Record<string, string>).fr },
      changes.length > 0 ? changes : undefined,
      `Category "${(updatedCategory.name as Record<string, string>).fr}" updated`,
      auditService.getRequestInfo(req)
    );
  }

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: updatedCategory,
  });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  // Find category
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Check ownership
  const restaurant = await Restaurant.findById(category.restaurantId);
  if (!restaurant || (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin')) {
    throw new ApiError(403, 'Not authorized to delete this category');
  }

  // Store name for audit
  const categoryName = (category.name as Record<string, string>).fr;

  // Soft delete
  await Category.findByIdAndUpdate(id, { isActive: false });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    await auditService.auditDelete(
      'category',
      auditUser,
      { type: 'Category', id: category._id, name: categoryName },
      `Category "${categoryName}" deleted (soft delete)`,
      auditService.getRequestInfo(req)
    );
  }

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

export const reorderCategories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { categories } = req.body;

    // Get restaurant
    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    // Update order for each category
    const updates = categories.map(
      (item: { id: string; order: number }) =>
        Category.findOneAndUpdate(
          { _id: item.id, restaurantId: restaurant._id },
          { order: item.order }
        )
    );

    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Categories reordered successfully',
    });
  }
);
