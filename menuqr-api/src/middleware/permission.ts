/**
 * Permission-based Authorization Middleware
 *
 * This middleware checks if the authenticated user has the required permissions
 * to access a resource. It supports:
 * - Single permission checks
 * - Multiple permissions with AND/OR logic
 * - Custom permissions override
 * - Role-based permission defaults
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler.js';
import type { Permission, Role } from '../config/permissions.js';
import {
  PERMISSIONS,
  ROLES,
  getRolePermissions,
} from '../config/permissions.js';
import type { IUser } from '../models/User.js';

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

/**
 * Get effective permissions for a user
 * Custom permissions override role-based permissions if set
 */
export function getUserPermissions(user: IUser): Permission[] {
  // If user has custom permissions set, use those
  if (user.customPermissions && user.customPermissions.length > 0) {
    return user.customPermissions;
  }

  // Otherwise, get permissions based on role
  return getRolePermissions(user.role as Role);
}

/**
 * Check if user has a specific permission
 */
export function userHasPermission(user: IUser, permission: Permission): boolean {
  const permissions = getUserPermissions(user);
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function userHasAnyPermission(user: IUser, permissions: Permission[]): boolean {
  const userPerms = getUserPermissions(user);
  return permissions.some(perm => userPerms.includes(perm));
}

/**
 * Check if user has all of the specified permissions
 */
export function userHasAllPermissions(user: IUser, permissions: Permission[]): boolean {
  const userPerms = getUserPermissions(user);
  return permissions.every(perm => userPerms.includes(perm));
}

/**
 * Middleware to require a single permission
 *
 * Usage:
 * router.get('/dishes', authenticate, hasPermission(PERMISSIONS.DISHES_READ), getDishes);
 */
export function hasPermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    // Superadmin bypasses all permission checks
    if (req.user.role === ROLES.SUPERADMIN) {
      return next();
    }

    if (!userHasPermission(req.user, permission)) {
      return next(
        new ApiError(403, `Permission denied: ${permission} is required`)
      );
    }

    next();
  };
}

/**
 * Middleware to require ANY of the specified permissions (OR logic)
 *
 * Usage:
 * router.get('/orders', authenticate, hasAnyPermission([PERMISSIONS.ORDERS_READ, PERMISSIONS.KDS_ACCESS]), getOrders);
 */
export function hasAnyPermission(permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    // Superadmin bypasses all permission checks
    if (req.user.role === ROLES.SUPERADMIN) {
      return next();
    }

    if (!userHasAnyPermission(req.user, permissions)) {
      return next(
        new ApiError(403, 'Permission denied: You do not have the required permissions')
      );
    }

    next();
  };
}

/**
 * Middleware to require ALL of the specified permissions (AND logic)
 *
 * Usage:
 * router.delete('/dishes/:id', authenticate, hasAllPermissions([PERMISSIONS.DISHES_READ, PERMISSIONS.DISHES_DELETE]), deleteDish);
 */
export function hasAllPermissions(permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    // Superadmin bypasses all permission checks
    if (req.user.role === ROLES.SUPERADMIN) {
      return next();
    }

    if (!userHasAllPermissions(req.user, permissions)) {
      return next(
        new ApiError(403, 'Permission denied: Missing required permissions')
      );
    }

    next();
  };
}

/**
 * Middleware to require owner or admin role (for backwards compatibility)
 * Can be replaced with hasPermission for specific actions
 */
export function isOwnerOrAdmin() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const allowedRoles: Role[] = [ROLES.SUPERADMIN, ROLES.OWNER, ROLES.ADMIN];
    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(new ApiError(403, 'Access denied: Owner or Admin role required'));
    }

    next();
  };
}

/**
 * Middleware to check if user can manage staff (owner or admin)
 */
export function canManageStaff() {
  return hasAnyPermission([
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DELETE,
  ]);
}

/**
 * Middleware to check restaurant context
 * Ensures user belongs to a restaurant (for non-superadmin users)
 */
export function requireRestaurant() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    // Superadmin doesn't need restaurant context
    if (req.user.role === ROLES.SUPERADMIN) {
      return next();
    }

    if (!req.user.restaurantId) {
      return next(new ApiError(403, 'No restaurant associated with this account'));
    }

    next();
  };
}

/**
 * Combined middleware: authenticate + permission check
 * Convenience wrapper for common pattern
 *
 * Usage:
 * router.get('/dishes', requirePermission(PERMISSIONS.DISHES_READ), getDishes);
 */
export function requirePermission(permission: Permission) {
  return [hasPermission(permission)];
}

/**
 * Export permission constants for easy access
 */
export { PERMISSIONS, ROLES, Permission, Role };

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isOwnerOrAdmin,
  canManageStaff,
  requireRestaurant,
  requirePermission,
  getUserPermissions,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
  PERMISSIONS,
  ROLES,
};
