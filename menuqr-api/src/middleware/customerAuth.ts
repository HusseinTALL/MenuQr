import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Customer, ICustomer } from '../models/Customer.js';
import config from '../config/env.js';

interface CustomerJwtPayload {
  customerId: string;
  phone: string;
  restaurantId: string;
  type?: string;
}

/**
 * Authenticate customer from JWT token
 */
export const authenticateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Accès refusé. Aucun token fourni.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwtSecret) as CustomerJwtPayload;

    // Verify this is a customer token (has customerId, not userId)
    if (!decoded.customerId) {
      res.status(401).json({
        success: false,
        message: 'Token invalide.',
      });
      return;
    }

    const customer = await Customer.findById(decoded.customerId);

    if (!customer || !customer.isActive) {
      res.status(401).json({
        success: false,
        message: 'Token invalide ou compte désactivé.',
      });
      return;
    }

    req.customer = customer;
    req.restaurantId = customer.restaurantId.toString();
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expiré.',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token invalide.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification.',
    });
  }
};

/**
 * Optional customer authentication - attach customer if valid token, continue anyway
 */
export const optionalCustomerAuth = async (
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

    const decoded = jwt.verify(token, config.jwtSecret) as CustomerJwtPayload;

    // Only process if this is a customer token
    if (decoded.customerId) {
      const customer = await Customer.findById(decoded.customerId);

      if (customer && customer.isActive) {
        req.customer = customer;
        req.restaurantId = customer.restaurantId.toString();
      }
    }

    next();
  } catch {
    next();
  }
};

/**
 * Generate JWT tokens for customer
 */
export const generateCustomerTokens = (customer: ICustomer): { accessToken: string; refreshToken: string } => {
  const accessToken = jwt.sign(
    {
      customerId: customer._id.toString(),
      phone: customer.phone,
      restaurantId: customer.restaurantId.toString(),
    },
    config.jwtSecret,
    { expiresIn: config.jwtCustomerExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    {
      customerId: customer._id.toString(),
      type: 'customer_refresh',
    },
    config.jwtSecret,
    { expiresIn: config.jwtCustomerRefreshExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
};

/**
 * Verify customer refresh token
 */
export const verifyCustomerRefreshToken = (token: string): CustomerJwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as CustomerJwtPayload;
    if (decoded.type !== 'customer_refresh') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Generate temporary OTP verification token (short-lived)
 */
export const generateOtpVerificationToken = (phone: string, restaurantId: string): string => {
  return jwt.sign(
    {
      phone,
      restaurantId,
      type: 'otp_verified',
    },
    config.jwtSecret,
    { expiresIn: '10m' } // Valid for 10 minutes to complete registration
  );
};

/**
 * Verify OTP verification token
 */
export const verifyOtpToken = (token: string): { phone: string; restaurantId: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      phone: string;
      restaurantId: string;
      type: string;
    };
    if (decoded.type !== 'otp_verified') {
      return null;
    }
    return { phone: decoded.phone, restaurantId: decoded.restaurantId };
  } catch {
    return null;
  }
};
