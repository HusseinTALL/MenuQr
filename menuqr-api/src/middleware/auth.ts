import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/index.js';
import { TokenBlacklist } from '../models/TokenBlacklist.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
  // Impersonation fields
  isImpersonation?: boolean;
  originalUserId?: string;
  originalEmail?: string;
  originalRole?: string;
  impersonatedRestaurantId?: string;
}

/**
 * Check if a token is blacklisted
 */
const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const blacklisted = await TokenBlacklist.findOne({ token });
    return !!blacklisted;
  } catch (error) {
    logger.error('Error checking token blacklist', error);
    return false; // Fail open to not block legitimate requests on DB error
  }
};

/**
 * Blacklist a token
 */
export const blacklistToken = async (
  token: string,
  userId: string,
  type: 'access' | 'refresh' = 'access'
): Promise<void> => {
  try {
    // Decode token to get expiration
    const decoded = jwt.decode(token) as JwtPayload | null;
    if (!decoded?.exp) {
      logger.warn('Cannot blacklist token without expiration');
      return;
    }

    const expiresAt = new Date(decoded.exp * 1000);

    await TokenBlacklist.create({
      token,
      userId,
      type,
      expiresAt,
    });

    logger.info('Token blacklisted', { userId, type });
  } catch (error) {
    // Ignore duplicate key errors (token already blacklisted)
    if ((error as { code?: number }).code !== 11000) {
      logger.error('Error blacklisting token', error);
    }
  }
};

/**
 * Main authentication middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked.',
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Invalid token or user not found.',
      });
      return;
    }

    req.user = user;

    // Handle impersonation context
    if (decoded.isImpersonation && decoded.originalUserId) {
      req.isImpersonating = true;
      req.originalUser = {
        userId: decoded.originalUserId,
        email: decoded.originalEmail || '',
        role: decoded.originalRole || 'superadmin',
      };
      req.impersonatedRestaurantId = decoded.impersonatedRestaurantId;
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    logger.error('Authentication error', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    const user = await User.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch {
    next();
  }
};

/**
 * Generate access and refresh tokens
 */
export const generateTokens = (user: IUser): { accessToken: string; refreshToken: string } => {
  const accessToken = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    {
      userId: user._id.toString(),
      type: 'refresh',
    },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = async (token: string): Promise<JwtPayload | null> => {
  try {
    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return null;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload & { type: string };
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Generate impersonation token for super admin to act as a user
 */
export const generateImpersonationToken = (
  targetUser: IUser,
  originalUser: IUser,
  restaurantId?: string
): string => {
  const token = jwt.sign(
    {
      userId: targetUser._id.toString(),
      email: targetUser.email,
      role: targetUser.role,
      isImpersonation: true,
      originalUserId: originalUser._id.toString(),
      originalEmail: originalUser.email,
      originalRole: originalUser.role,
      impersonatedRestaurantId: restaurantId,
    },
    config.jwtSecret,
    { expiresIn: '1h' } // Short expiration for impersonation tokens
  );

  return token;
};

/**
 * Check if request is an impersonation session
 */
export const isImpersonationSession = (req: Request): boolean => {
  return req.isImpersonating === true;
};

/**
 * Get original user info from impersonation session
 */
export const getOriginalUser = (req: Request): { userId: string; email: string; role: string } | null => {
  if (!req.isImpersonating || !req.originalUser) {
    return null;
  }
  return req.originalUser;
};
