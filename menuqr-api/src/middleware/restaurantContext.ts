import { Request, Response, NextFunction } from 'express';
import { Restaurant } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Middleware to verify and attach restaurant context to requests.
 * Ensures users can only access data from restaurants they own or are assigned to.
 */

/**
 * Get the authenticated user's restaurant, verifying ownership/assignment.
 * For owners: finds restaurant by ownerId
 * For staff/admin: uses their assigned restaurantId
 * Caches the result on the request object.
 */
export const getAuthenticatedRestaurant = async (req: Request) => {
  // Return cached result if already resolved
  if ((req as Request & { _restaurant?: unknown })._restaurant !== undefined) {
    return (req as Request & { _restaurant: typeof restaurant })._restaurant;
  }

  const user = req.user;
  if (!user) {
    return null;
  }

  let restaurant = null;

  // For staff/admin with assigned restaurantId, verify the assignment is valid
  if (user.restaurantId) {
    restaurant = await Restaurant.findById(user.restaurantId);
    if (restaurant) {
      // Verify user is either the owner or has a valid assignment
      const isOwner = restaurant.ownerId.toString() === user._id.toString();
      const isAssignedStaff = user.restaurantId?.toString() === restaurant._id.toString();

      if (!isOwner && !isAssignedStaff) {
        logger.warn('Restaurant access denied - invalid assignment', {
          userId: user._id,
          restaurantId: user.restaurantId,
          ownerId: restaurant.ownerId,
        });
        restaurant = null;
      }
    }
  }

  // For owners without restaurantId, find their restaurant
  if (!restaurant && user.role === 'owner') {
    restaurant = await Restaurant.findOne({ ownerId: user._id });
  }

  // Cache the result
  (req as Request & { _restaurant: typeof restaurant })._restaurant = restaurant;

  return restaurant;
};

/**
 * Middleware that requires a valid restaurant context.
 * Attaches the restaurant to req.restaurant for downstream use.
 */
export const requireRestaurantContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const restaurant = await getAuthenticatedRestaurant(req);

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: 'Restaurant not found or access denied',
      });
      return;
    }

    // Attach restaurant to request for downstream use
    (req as Request & { restaurant: typeof restaurant }).restaurant = restaurant;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Verify that a specific restaurantId belongs to the authenticated user.
 * Use this when the restaurantId comes from request params or body.
 */
export const verifyRestaurantAccess = async (
  userId: string,
  userRole: string,
  userRestaurantId: string | undefined,
  targetRestaurantId: string
): Promise<boolean> => {
  // Super admin can access any restaurant
  if (userRole === 'superadmin') {
    return true;
  }

  const restaurant = await Restaurant.findById(targetRestaurantId);
  if (!restaurant) {
    return false;
  }

  // Check if user is the owner
  if (restaurant.ownerId.toString() === userId) {
    return true;
  }

  // Check if user is assigned to this restaurant (staff/admin)
  if (userRestaurantId && userRestaurantId === targetRestaurantId) {
    return true;
  }

  logger.warn('Restaurant access verification failed', {
    userId,
    userRole,
    userRestaurantId,
    targetRestaurantId,
    ownerId: restaurant.ownerId.toString(),
  });

  return false;
};

/**
 * Middleware factory for routes that accept restaurantId as a parameter.
 * Verifies the user has access to the specified restaurant.
 */
export const validateRestaurantParam = (paramName: string = 'restaurantId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetRestaurantId = req.params[paramName];

      if (!targetRestaurantId) {
        res.status(400).json({
          success: false,
          message: `Missing ${paramName} parameter`,
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const hasAccess = await verifyRestaurantAccess(
        req.user._id.toString(),
        req.user.role,
        req.user.restaurantId?.toString(),
        targetRestaurantId
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this restaurant',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Type augmentation for request with restaurant
declare module 'express-serve-static-core' {
  interface Request {
    restaurant?: InstanceType<typeof Restaurant>;
  }
}
