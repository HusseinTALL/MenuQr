/**
 * Enhanced Logger with Winston
 * Provides structured logging with request ID tracking and Sentry integration
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';
import config from '../config/env.js';
import { captureException, captureMessage, addBreadcrumb } from '../services/sentryService.js';

// Extend Express Request to include requestId - using module augmentation
declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

// Sensitive keys to mask in logs
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'phone',
  'email',
  'otp',
  'code',
  'refreshToken',
  'accessToken',
  'apiKey',
  'creditCard',
  'cvv',
];

/**
 * Mask sensitive data recursively
 */
function maskSensitiveData(data: unknown, depth = 0): unknown {
  if (depth > 10) {return '[MAX_DEPTH]';}
  if (data === null || data === undefined) {return data;}
  if (typeof data !== 'object') {return data;}

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, depth + 1));
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      masked[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, depth + 1);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * Custom format for pretty printing in development
 */
const prettyFormat = winston.format.printf(({ level, message, timestamp, requestId, ...meta }) => {
  const reqIdStr = requestId ? `[${requestId}] ` : '';
  const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} ${level.toUpperCase().padEnd(5)} ${reqIdStr}${message}${metaStr}`;
});

/**
 * Create Winston logger instance
 */
const winstonLogger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: {
    service: 'menuqr-api',
    environment: config.nodeEnv,
  },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    config.logging.format === 'json'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), prettyFormat)
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Add file transport in production
if (config.isProduction) {
  winstonLogger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );
  winstonLogger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );
}

// Store for async local storage of request context
let currentRequestId: string | undefined;

/**
 * Set current request ID for context
 */
export function setRequestId(requestId: string): void {
  currentRequestId = requestId;
}

/**
 * Get current request ID
 */
export function getRequestId(): string | undefined {
  return currentRequestId;
}

/**
 * Logger interface with request ID support
 */
export const logger = {
  debug: (message: string, data?: unknown): void => {
    const masked = maskSensitiveData(data);
    winstonLogger.debug(message, { requestId: currentRequestId, ...((masked as object) || {}) });
  },

  info: (message: string, data?: unknown): void => {
    const masked = maskSensitiveData(data);
    winstonLogger.info(message, { requestId: currentRequestId, ...((masked as object) || {}) });

    // Add Sentry breadcrumb
    addBreadcrumb({
      category: 'log',
      message,
      level: 'info',
      data: masked as Record<string, unknown>,
    });
  },

  warn: (message: string, data?: unknown): void => {
    const masked = maskSensitiveData(data);
    winstonLogger.warn(message, { requestId: currentRequestId, ...((masked as object) || {}) });

    // Send warning to Sentry
    captureMessage(message, 'warning');
  },

  error: (message: string, error?: unknown): void => {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    winstonLogger.error(message, {
      requestId: currentRequestId,
      error: maskSensitiveData(errorData),
    });

    // Capture error in Sentry
    if (error instanceof Error) {
      captureException(error, { message, requestId: currentRequestId });
    } else {
      captureMessage(`${message}: ${JSON.stringify(errorData)}`, 'error');
    }
  },

  // HTTP request logging
  http: (message: string, data?: unknown): void => {
    const masked = maskSensitiveData(data);
    winstonLogger.http(message, { requestId: currentRequestId, ...((masked as object) || {}) });
  },

  // Special method for SMS service - only logs in development
  sms: (_message: string, data?: { phone?: string; content?: string }): void => {
    if (config.isDevelopment) {
      winstonLogger.info('Mock SMS sent', {
        phone: data?.phone ? `${data.phone.slice(0, 4)}****` : undefined,
        contentLength: data?.content?.length,
      });
    }
  },

  // Create child logger with additional context
  child: (meta: Record<string, unknown>) => {
    return winstonLogger.child(meta);
  },

  // Get the underlying Winston logger
  getWinstonLogger: () => winstonLogger,
};

/**
 * Request ID middleware
 * Generates or extracts request ID for each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check for existing request ID in headers (from load balancer, etc.)
  const existingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = (Array.isArray(existingId) ? existingId[0] : existingId) || uuidv4();

  // Attach to request object
  req.requestId = requestId;

  // Set in response header
  res.setHeader('X-Request-ID', requestId);

  // Set in logger context
  setRequestId(requestId);

  next();
}

/**
 * HTTP request logging middleware
 */
export function httpLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request client error', logData);
    } else {
      logger.http('Request completed', logData);
    }
  });

  next();
}

export default logger;
