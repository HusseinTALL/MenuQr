import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if the authenticated user is a Super Admin
 * Must be used after the authenticate middleware
 */
export const isSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  if (req.user.role !== 'superadmin') {
    res.status(403).json({
      success: false,
      message: 'Super Admin access required.',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if the user is either a Super Admin or has a specific role
 * Useful for endpoints that can be accessed by both super admins and restaurant owners
 */
export const isSuperAdminOrRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    // Super admin can always access
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if user has one of the allowed roles
    if (roles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions.',
    });
  };
};
