/**
 * Feature Access Middleware
 *
 * Provides middleware functions to restrict access based on subscription features.
 * Works in conjunction with the subscription service to enforce feature gates.
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Subscription } from '../models/Subscription.js';
import { ISubscriptionPlan } from '../models/SubscriptionPlan.js';
import {
  Feature,
  FEATURES,
  getFeatureDisplayName,
  getRequiredTierForFeature,
  getTierDisplayName,
} from '../config/features.js';

// Extend Express Request with subscription info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      subscription?: {
        id: mongoose.Types.ObjectId;
        planId: mongoose.Types.ObjectId;
        plan: ISubscriptionPlan;
        status: string;
        isValid: boolean;
        features: Feature[];
      };
    }
  }
}

// ============================================
// Subscription Cache
// ============================================

interface CacheEntry {
  data: {
    subscription: any;
    plan: ISubscriptionPlan;
    features: Feature[];
  };
  expiresAt: Date;
}

const subscriptionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(restaurantId: string): string {
  return `sub:${restaurantId}`;
}

function invalidateCache(restaurantId: string): void {
  subscriptionCache.delete(getCacheKey(restaurantId));
}

// Export for use when subscription changes
export { invalidateCache as invalidateSubscriptionCache };

// ============================================
// Helper Functions
// ============================================

/**
 * Get subscription with caching
 */
async function getSubscriptionWithCache(restaurantId: string): Promise<CacheEntry['data'] | null> {
  const cacheKey = getCacheKey(restaurantId);
  const cached = subscriptionCache.get(cacheKey);

  // Return cached data if still valid
  if (cached && cached.expiresAt > new Date()) {
    return cached.data;
  }

  // Fetch from database
  const subscription = await Subscription.findOne({
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  }).populate<{ planId: ISubscriptionPlan }>('planId');

  if (!subscription || !subscription.planId) {
    return null;
  }

  const plan = subscription.planId as ISubscriptionPlan;
  const features = plan.getEnabledFeatures();

  const data = {
    subscription,
    plan,
    features,
  };

  // Cache the result
  subscriptionCache.set(cacheKey, {
    data,
    expiresAt: new Date(Date.now() + CACHE_TTL_MS),
  });

  return data;
}

/**
 * Check if subscription is valid (active or in trial)
 */
function isSubscriptionValid(subscription: any): boolean {
  if (!subscription) { return false; }

  const status = subscription.status;

  if (status === 'active') { return true; }

  if (status === 'trial' && subscription.trialEndsAt) {
    return new Date() < new Date(subscription.trialEndsAt);
  }

  return false;
}

// ============================================
// Middleware Functions
// ============================================

/**
 * Load subscription data and attach to request
 * Should be used after authenticate middleware
 */
export function loadSubscription() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        // No restaurant context - skip subscription loading
        return next();
      }

      const data = await getSubscriptionWithCache(restaurantId.toString());

      if (data) {
        req.subscription = {
          id: data.subscription._id,
          planId: data.plan._id,
          plan: data.plan,
          status: data.subscription.status,
          isValid: isSubscriptionValid(data.subscription),
          features: data.features,
        };
      }

      next();
    } catch (error) {
      console.error('Error loading subscription:', error);
      // Continue without subscription data
      next();
    }
  };
}

/**
 * Require a valid subscription to access the route
 */
export function requireSubscription() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        res.status(401).json({
          success: false,
          message: 'Restaurant context required',
          code: 'NO_RESTAURANT_CONTEXT',
        });
        return;
      }

      const data = await getSubscriptionWithCache(restaurantId.toString());

      if (!data) {
        res.status(403).json({
          success: false,
          message: 'No subscription found. Please subscribe to a plan.',
          code: 'NO_SUBSCRIPTION',
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      if (!isSubscriptionValid(data.subscription)) {
        res.status(403).json({
          success: false,
          message: 'Your subscription has expired or is inactive.',
          code: 'SUBSCRIPTION_INACTIVE',
          status: data.subscription.status,
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      // Attach subscription to request
      req.subscription = {
        id: data.subscription._id,
        planId: data.plan._id,
        plan: data.plan,
        status: data.subscription.status,
        isValid: true,
        features: data.features,
      };

      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking subscription status',
      });
    }
  };
}

/**
 * Require a specific feature to access the route
 */
export function requireFeature(feature: Feature) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        res.status(401).json({
          success: false,
          message: 'Restaurant context required',
          code: 'NO_RESTAURANT_CONTEXT',
        });
        return;
      }

      const data = await getSubscriptionWithCache(restaurantId.toString());

      if (!data) {
        res.status(403).json({
          success: false,
          message: 'No subscription found. Please subscribe to a plan.',
          code: 'NO_SUBSCRIPTION',
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      if (!isSubscriptionValid(data.subscription)) {
        res.status(403).json({
          success: false,
          message: 'Your subscription has expired or is inactive.',
          code: 'SUBSCRIPTION_INACTIVE',
          status: data.subscription.status,
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      // Check if feature is enabled
      const hasFeature = data.plan.hasFeature(feature);

      if (!hasFeature) {
        const requiredTier = getRequiredTierForFeature(feature);
        const featureName = getFeatureDisplayName(feature);
        const tierName = getTierDisplayName(requiredTier);

        res.status(403).json({
          success: false,
          message: `${featureName} requires the ${tierName} plan or higher.`,
          code: 'FEATURE_NOT_AVAILABLE',
          feature,
          featureName,
          requiredTier,
          currentPlan: data.plan.slug,
          upgradeUrl: `/settings/billing/upgrade?feature=${feature}`,
        });
        return;
      }

      // Attach subscription to request
      req.subscription = {
        id: data.subscription._id,
        planId: data.plan._id,
        plan: data.plan,
        status: data.subscription.status,
        isValid: true,
        features: data.features,
      };

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature access',
      });
    }
  };
}

/**
 * Require any of the specified features (OR logic)
 */
export function requireAnyFeature(features: Feature[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        res.status(401).json({
          success: false,
          message: 'Restaurant context required',
          code: 'NO_RESTAURANT_CONTEXT',
        });
        return;
      }

      const data = await getSubscriptionWithCache(restaurantId.toString());

      if (!data) {
        res.status(403).json({
          success: false,
          message: 'No subscription found.',
          code: 'NO_SUBSCRIPTION',
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      if (!isSubscriptionValid(data.subscription)) {
        res.status(403).json({
          success: false,
          message: 'Your subscription has expired.',
          code: 'SUBSCRIPTION_INACTIVE',
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      // Check if ANY feature is enabled
      const hasAny = features.some(f => data.plan.hasFeature(f));

      if (!hasAny) {
        const featureNames = features.map(f => getFeatureDisplayName(f));

        res.status(403).json({
          success: false,
          message: `This feature requires one of: ${featureNames.join(', ')}`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiredFeatures: features,
          currentPlan: data.plan.slug,
          upgradeUrl: '/settings/billing/upgrade',
        });
        return;
      }

      req.subscription = {
        id: data.subscription._id,
        planId: data.plan._id,
        plan: data.plan,
        status: data.subscription.status,
        isValid: true,
        features: data.features,
      };

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature access',
      });
    }
  };
}

/**
 * Require all of the specified features (AND logic)
 */
export function requireAllFeatures(features: Feature[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        res.status(401).json({
          success: false,
          message: 'Restaurant context required',
          code: 'NO_RESTAURANT_CONTEXT',
        });
        return;
      }

      const data = await getSubscriptionWithCache(restaurantId.toString());

      if (!data || !isSubscriptionValid(data.subscription)) {
        res.status(403).json({
          success: false,
          message: 'Valid subscription required.',
          code: 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      // Check if ALL features are enabled
      const missingFeatures = features.filter(f => !data.plan.hasFeature(f));

      if (missingFeatures.length > 0) {
        const missingNames = missingFeatures.map(f => getFeatureDisplayName(f));

        res.status(403).json({
          success: false,
          message: `Missing required features: ${missingNames.join(', ')}`,
          code: 'FEATURES_NOT_AVAILABLE',
          missingFeatures,
          currentPlan: data.plan.slug,
          upgradeUrl: '/settings/billing/upgrade',
        });
        return;
      }

      req.subscription = {
        id: data.subscription._id,
        planId: data.plan._id,
        plan: data.plan,
        status: data.subscription.status,
        isValid: true,
        features: data.features,
      };

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature access',
      });
    }
  };
}

/**
 * Check usage limits for a specific resource
 */
export function checkUsageLimit(resource: 'dishes' | 'orders' | 'smsCredits' | 'campaigns' | 'users' | 'tables') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        res.status(401).json({
          success: false,
          message: 'Restaurant context required',
          code: 'NO_RESTAURANT_CONTEXT',
        });
        return;
      }

      const subscription = await Subscription.findOne({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      }).populate<{ planId: ISubscriptionPlan }>('planId');

      if (!subscription || !isSubscriptionValid(subscription)) {
        res.status(403).json({
          success: false,
          message: 'Valid subscription required.',
          code: 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      const plan = subscription.planId as ISubscriptionPlan;
      const limit = plan.limits[resource];
      const usedRaw = subscription.usage[resource as keyof typeof subscription.usage];
      const used = typeof usedRaw === 'number' ? usedRaw : 0;

      // -1 means unlimited
      if (limit !== -1 && used >= limit) {
        const resourceNames: Record<string, string> = {
          dishes: 'menu items',
          orders: 'monthly orders',
          smsCredits: 'SMS credits',
          campaigns: 'marketing campaigns',
          users: 'staff accounts',
          tables: 'tables',
        };

        res.status(403).json({
          success: false,
          message: `You have reached your ${resourceNames[resource]} limit (${used}/${limit}). Please upgrade your plan for more.`,
          code: 'USAGE_LIMIT_EXCEEDED',
          resource,
          used,
          limit,
          upgradeUrl: `/settings/billing/upgrade?resource=${resource}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking usage limits',
      });
    }
  };
}

/**
 * Soft feature check - doesn't block, but attaches feature availability to request
 * Useful for conditional UI rendering based on features
 */
export function checkFeatures(featuresToCheck: Feature[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        return next();
      }

      const data = await getSubscriptionWithCache(restaurantId.toString());

      if (data && isSubscriptionValid(data.subscription)) {
        // Filter available features to only those being checked
        const availableFeatures = data.features.filter(f => featuresToCheck.includes(f));
        req.subscription = {
          id: data.subscription._id,
          planId: data.plan._id,
          plan: data.plan,
          status: data.subscription.status,
          isValid: true,
          features: availableFeatures,
        };
      }

      next();
    } catch (_error) {
      // Don't fail on soft check
      next();
    }
  };
}

// ============================================
// Utility Middleware
// ============================================

/**
 * Log feature access attempts (for analytics)
 */
export function logFeatureAccess(feature: Feature) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const restaurantId = req.user?.restaurantId;
    const hasAccess = req.subscription?.features.includes(feature) || false;

    // TODO: Send to analytics service
    console.log('Feature access:', {
      feature,
      restaurantId,
      hasAccess,
      plan: req.subscription?.plan?.slug,
      timestamp: new Date().toISOString(),
    });

    next();
  };
}

// ============================================
// Export Commonly Used Feature Middleware
// ============================================

// Pre-configured middleware for common features
export const features = {
  // Professional features
  reservations: requireFeature(FEATURES.RESERVATIONS),
  reviews: requireFeature(FEATURES.REVIEWS),
  inventory: requireFeature(FEATURES.INVENTORY),
  scheduledOrders: requireFeature(FEATURES.SCHEDULED_ORDERS),
  kds: requireFeature(FEATURES.KDS),

  // Business features
  loyalty: requireFeature(FEATURES.LOYALTY_PROGRAM),
  campaigns: requireFeature(FEATURES.SMS_CAMPAIGNS),
  advancedAnalytics: requireFeature(FEATURES.ADVANCED_ANALYTICS),
  dataExport: requireFeature(FEATURES.DATA_EXPORT),
  apiRead: requireFeature(FEATURES.API_READ),
  webhooks: requireFeature(FEATURES.WEBHOOKS),

  // Enterprise features
  delivery: requireFeature(FEATURES.DELIVERY_MODULE),
  drivers: requireFeature(FEATURES.DRIVER_MANAGEMENT),
  hotel: requireFeature(FEATURES.HOTEL_MODULE),
  twoFactor: requireFeature(FEATURES.TWO_FACTOR_AUTH),
  auditLogs: requireFeature(FEATURES.AUDIT_LOGS),
  apiWrite: requireFeature(FEATURES.API_WRITE),
};

export default {
  loadSubscription,
  requireSubscription,
  requireFeature,
  requireAnyFeature,
  requireAllFeatures,
  checkUsageLimit,
  checkFeatures,
  logFeatureAccess,
  invalidateSubscriptionCache: invalidateCache,
  features,
};
