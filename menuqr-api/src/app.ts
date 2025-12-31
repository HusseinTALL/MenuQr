import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import config from './config/env.js';
import { logger, requestIdMiddleware, httpLoggerMiddleware } from './utils/logger.js';
import { sentryErrorHandler } from './services/sentryService.js';
import { setupSwagger } from './docs/swagger.js';

const app: Application = express();

// ===========================================
// Request Tracking & Logging
// ===========================================

// Request ID middleware - must be first for tracking
app.use(requestIdMiddleware);

// HTTP request logging
app.use(httpLoggerMiddleware);

// ===========================================
// Security Middleware
// ===========================================

// Helmet - Set security HTTP headers
// Swagger UI CSP needs relaxed settings in development
const swaggerCspDirectives = config.isDevelopment ? {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'", 'data:'],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
} : {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: swaggerCspDirectives,
    },
    crossOriginEmbedderPolicy: false, // Disable for API
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Rate limiting - General API limiter
const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // 15 minutes by default
  max: config.isDevelopment ? 1000 : config.rateLimitMaxRequests, // Higher limit in development
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in test mode
    if (config.isTest) {return true;}
    // Skip rate limiting for health check and public GET endpoints
    const publicPaths = [
      '/api/v1/health',
      '/api/v1/restaurants',
      '/api/v1/menu',
    ];
    // Skip for exact match or path starts with public paths (for nested routes)
    return publicPaths.some(path =>
      req.path === path || req.path.startsWith(path + '/')
    ) && req.method === 'GET';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes, veuillez réessayer plus tard.',
    });
  },
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
    });
  },
});

// Very strict rate limit for OTP endpoints
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 OTP requests per minute
  message: {
    success: false,
    message: 'Trop de demandes OTP, veuillez réessayer dans 1 minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
});

// Rate limit for password reset/forgot password
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset requests per hour
  message: {
    success: false,
    message: 'Trop de demandes de réinitialisation, veuillez réessayer dans 1 heure.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (req: Request, res: Response) => {
    logger.warn('Password reset rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      message: 'Trop de demandes de réinitialisation, veuillez réessayer dans 1 heure.',
    });
  },
});

// Rate limit for sensitive operations (order creation, reviews, etc.)
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez patienter.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
});

// Very strict rate limit for super admin operations
const superAdminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for admins
  message: {
    success: false,
    message: 'Rate limit exceeded for admin operations.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (req: Request, res: Response) => {
    logger.warn('Super admin rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded for admin operations.',
    });
  },
});

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// Apply stricter limits to auth routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/change-password', authLimiter);
app.use('/api/v1/customer/auth/login', authLimiter);
app.use('/api/v1/customer/auth/register', authLimiter);
app.use('/api/v1/customer/auth/send-otp', otpLimiter);
app.use('/api/v1/customer/auth/verify-otp', otpLimiter);

// Password reset rate limiting
app.use('/api/v1/customer/auth/forgot-password', passwordResetLimiter);
app.use('/api/v1/customer/auth/reset-password', passwordResetLimiter);

// Sensitive operations rate limiting
app.use('/api/v1/orders', sensitiveLimiter);
app.use('/api/v1/customer/reviews', sensitiveLimiter);
app.use('/api/v1/customer/reservations', sensitiveLimiter);

// Super admin rate limiting
app.use('/api/v1/superadmin', superAdminLimiter);

// ===========================================
// Input Sanitization
// ===========================================

// Custom NoSQL injection sanitizer (Express 5 compatible - req.query is read-only)
const sanitizeNoSQL = (obj: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Block keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) {
      logger.warn('NoSQL injection attempt blocked', { key });
      continue;
    }
    if (typeof value === 'string') {
      // Replace $ at start of string values
      sanitized[key] = value.replace(/^\$/, '_');
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeNoSQL(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeNoSQL(item as Record<string, unknown>)
          : typeof item === 'string' ? item.replace(/^\$/, '_') : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Apply NoSQL sanitization to request body only (req.query is read-only in Express 5)
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSQL(req.body);
  }
  next();
});

// Prevent HTTP Parameter Pollution (only on body, skip query for Express 5 compatibility)
app.use((req: Request, _res: Response, next: NextFunction) => {
  // HPP for body params only
  if (req.body && typeof req.body === 'object') {
    const whitelist = ['status', 'category', 'tag'];
    for (const [key, value] of Object.entries(req.body)) {
      if (Array.isArray(value) && !whitelist.includes(key)) {
        // Take last value for non-whitelisted array params
        req.body[key] = value[value.length - 1];
      }
    }
  }
  next();
});

// ===========================================
// CORS Configuration
// ===========================================
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  })
);

// ===========================================
// Body Parsing with Size Limits
// ===========================================
app.use(express.json({
  limit: '1mb', // Reduce from 10mb to 1mb for security
  verify: (req: Request, _res, buf) => {
    // Store raw body for webhook signature verification if needed
    (req as Request & { rawBody?: Buffer }).rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ===========================================
// XSS Protection Middleware
// ===========================================
const xssClean = (req: Request, _res: Response, next: NextFunction): void => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? sanitizeString(item) :
          typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) : item
        );
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Note: req.query is immutable in Express 5, so we skip query sanitization.
  // Query params are URL-parsed and less prone to XSS. Body sanitization above handles user input.

  next();
};

// Apply XSS protection to all routes except file uploads
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip XSS sanitization for file upload routes
  if (req.path.startsWith('/api/v1/upload')) {
    return next();
  }
  xssClean(req, res, next);
});

// ===========================================
// HTTP Caching Headers
// ===========================================

// Cache control middleware for different route patterns
const cacheMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip caching for non-GET requests
  if (req.method !== 'GET') {
    res.set('Cache-Control', 'no-store');
    return next();
  }

  // Define caching rules based on route patterns
  const path = req.path;

  // Public menu data - cache for 5 minutes
  if (path.match(/^\/api\/v1\/menu\/[^/]+$/) ||
      path.match(/^\/api\/v1\/menu\/[^/]+\/categories/) ||
      path.match(/^\/api\/v1\/menu\/[^/]+\/dishes/) ||
      path.match(/^\/api\/v1\/hotel\/guest\/menu/)) {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return next();
  }

  // Restaurant list and public info - cache for 1 minute
  if (path.match(/^\/api\/v1\/restaurants/) && !req.headers.authorization) {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    return next();
  }

  // Health check - no caching needed
  if (path === '/api/v1/health') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return next();
  }

  // Static documentation - cache for 1 hour
  if (path.startsWith('/api/v1/docs') || path.startsWith('/api-docs')) {
    res.set('Cache-Control', 'public, max-age=3600');
    return next();
  }

  // Authenticated/dynamic endpoints - prevent caching
  if (req.headers.authorization) {
    res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return next();
  }

  // Default: short cache for public GET requests
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=10');
  next();
};

app.use(cacheMiddleware);

// ===========================================
// API Documentation (Swagger)
// ===========================================

setupSwagger(app);

// ===========================================
// API Routes
// ===========================================

app.use('/api/v1', routes);

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'MenuQR API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

// ===========================================
// Error Handling
// ===========================================

// 404 handler
app.use(notFoundHandler);

// Sentry error handler - must be before other error handlers
app.use(sentryErrorHandler());

// Error handler
app.use(errorHandler);

export default app;
