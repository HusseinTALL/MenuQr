/**
 * Sentry Error Tracking Plugin
 * Integrates Sentry for production error monitoring in the Vue frontend
 */

import * as Sentry from '@sentry/vue';
import type { App } from 'vue';
import type { Router } from 'vue-router';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development';
const SENTRY_ENABLED = import.meta.env.VITE_SENTRY_ENABLED === 'true' || import.meta.env.PROD;

let isInitialized = false;

/**
 * Initialize Sentry for Vue
 */
export function initializeSentry(app: App, router: Router): void {
  if (!SENTRY_DSN) {
    console.info('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  if (!SENTRY_ENABLED) {
    console.info('[Sentry] Disabled by configuration');
    return;
  }

  Sentry.init({
    app,
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Vue-specific integrations
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        // Mask all text content for privacy
        maskAllText: true,
        // Block all media for privacy
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session Replay - lower sample rates in production
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,

    // Filter sensitive data from breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Mask sensitive URLs
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        const sensitiveEndpoints = ['/auth/', '/login', '/otp', '/password'];
        if (sensitiveEndpoints.some(ep => breadcrumb.data?.url?.includes(ep))) {
          if (breadcrumb.data) {
            breadcrumb.data.body = '[REDACTED]';
          }
        }
      }
      return breadcrumb;
    },

    // Filter sensitive data from events
    beforeSend(event) {
      // Remove sensitive form data
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'otp', 'code', 'phone', 'email'];
        try {
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
          // Ignore parse errors
        }
      }

      return event;
    },

    // Ignore common non-actionable errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      // AbortController
      'AbortError',
      // ResizeObserver - common browser quirk
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Generic loading errors
      'Loading chunk',
      'Loading CSS chunk',
    ],

    // Deny URLs - ignore errors from third-party scripts
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
      // Safari extensions
      /^safari-extension:\/\//i,
      // Analytics and ads
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
    ],
  });

  isInitialized = true;
  console.info(`[Sentry] Initialized for environment: ${SENTRY_ENVIRONMENT}`);
}

/**
 * Capture exception and send to Sentry
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>): string | undefined {
  if (!isInitialized) {
    console.error('[Sentry] Not initialized, logging error locally:');
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
 * Set custom tags for filtering
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized) {
    return;
  }

  Sentry.setTag(key, value);
}

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  setTag,
};
