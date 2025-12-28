import { Request, Response } from 'express';
import { User, Restaurant } from '../../models/index.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import crypto from 'crypto';

/**
 * Get all users with pagination and filters (Super Admin)
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query: Record<string, unknown> = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role && role !== 'all') {
    query.role = role;
  }

  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  // Build sort
  const sort: Record<string, 1 | -1> = {};
  sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshToken')
      .populate('restaurantId', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * Get user by ID (Super Admin)
 */
export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select('-password -refreshToken')
    .populate('restaurantId', 'name slug isActive');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: user,
  });
});

/**
 * Create new user (Super Admin)
 */
export const createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, role, restaurantId, isActive = true } = req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  // Validate restaurant if provided
  if (restaurantId) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }
  }

  // Create user
  const user = new User({
    email: email.toLowerCase(),
    password,
    name,
    role: role || 'owner',
    restaurantId,
    isActive,
  });

  await user.save();

  // Return user without sensitive fields
  const userResponse = await User.findById(user._id)
    .select('-password -refreshToken')
    .populate('restaurantId', 'name slug');

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: userResponse,
  });
});

/**
 * Update user (Super Admin)
 */
export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { email, name, role, restaurantId, isActive } = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if email is being changed and if it's already taken
  if (email && email.toLowerCase() !== user.email) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, 'Email already in use');
    }
    user.email = email.toLowerCase();
  }

  // Update fields
  if (name !== undefined) {user.name = name;}
  if (role !== undefined) {user.role = role;}
  if (restaurantId !== undefined) {user.restaurantId = restaurantId || undefined;}
  if (isActive !== undefined) {user.isActive = isActive;}

  await user.save();

  const userResponse = await User.findById(user._id)
    .select('-password -refreshToken')
    .populate('restaurantId', 'name slug');

  res.json({
    success: true,
    message: 'User updated successfully',
    data: userResponse,
  });
});

/**
 * Delete user (Super Admin)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Prevent deleting super admins
  if (user.role === 'superadmin') {
    throw new ApiError(403, 'Cannot delete super admin users');
  }

  await User.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * Reset user password (Super Admin)
 */
export const resetUserPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { newPassword, generateRandom = false } = req.body;

  const user = await User.findById(id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  let password = newPassword;

  if (generateRandom) {
    // Generate a random password
    password = crypto.randomBytes(12).toString('base64').slice(0, 16);
  }

  if (!password) {
    throw new ApiError(400, 'Password is required');
  }

  user.password = password;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully',
    data: generateRandom ? { temporaryPassword: password } : undefined,
  });
});

/**
 * Get user statistics (Super Admin)
 */
export const getUserStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const [
    totalUsers,
    activeUsers,
    usersByRole,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const roleStats = usersByRole.reduce(
    (acc, { _id, count }) => ({ ...acc, [_id]: count }),
    {} as Record<string, number>
  );

  res.json({
    success: true,
    data: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: roleStats,
    },
  });
});
