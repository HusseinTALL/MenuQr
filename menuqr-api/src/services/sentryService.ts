/**
 * Sentry Error Tracking Service
 * Integrates Sentry for production error monitoring and performance tracking
 * Compatible with @sentry/node v10+
 */

import * as Sentry from '@sentry/node';
import type { Application, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import config from '../config/env.js';

let isInitialized = false;

/**
 * Initialize Sentry with configuration
 */
export function initializeSentry(app: Application): void {
  if (!config.sentry.dsn) {
    console.info('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  if (!config.sentry.enabled) {
    console.info('[Sentry] Disabled by configuration');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    release: process.env.npm_package_version || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: config.sentry.tracesSampleRate,

    // Set sampling rate for profiling
    profilesSampleRate: config.sentry.profilesSampleRate,

    // Integrations - v10 uses auto-discovery for Express
    integrations: [
      Sentry.httpIntegration(),
      Sentry.mongoIntegration(),
    ],

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-auth-token'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        try {
          const sensitiveFields = ['password', 'token', 'secret', 'otp', 'code', 'refreshToken'];
          const data = typeof event.request.data === 'string'
            ? JSON.parse(event.request.data)
            : event.request.data;

          for (const field of sensitiveFields) {
            if (data[field]) {
              data[field] = '[REDACTED]';
            }
          }
          event.request.data = JSON.stringify(data);
        } catch {
          // Ignore JSON parse errors
        }
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Network errors
      'Network request failed',
      'Failed to fetch',
      // AbortController
      'AbortError',
    ],
  });

  // Setup Express error handler for Sentry v10
  Sentry.setupExpressErrorHandler(app);

  isInitialized = true;
  console.info(`[Sentry] Initialized for environment: ${config.sentry.environment}`);
}

/**
 * Sentry error handler middleware
 * Returns a no-op middleware if Sentry is not initialized
 */
export function sentryErrorHandler(): ErrorRequestHandler {
  if (!isInitialized) {
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => next(err);
  }
  // In Sentry v10, error handling is set up via setupExpressErrorHandler
  // This middleware is kept for compatibility but just passes through
  return (err: Error, _req: Request, _res: Response, next: NextFunction) => next(err);
}

/**
 * Capture exception and send to Sentry
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>): string | undefined {
  if (!isInitialized) {
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message and send to Sentry
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'): string | undefined {
  if (!isInitialized) {
    return undefined;
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string; role?: string } | null): void {
  if (!isInitialized) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}): void {
  if (!isInitialized) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a new span for performance monitoring
 */
export function startSpan(name: string, op: string): Sentry.Span | undefined {
  if (!isInitialized) {
    return undefined;
  }

  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Flush pending events before shutdown
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!isInitialized) {
    return true;
  }

  return Sentry.flush(timeout);
}

export default {
  initializeSentry,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startSpan,
  flushSentry,
};
