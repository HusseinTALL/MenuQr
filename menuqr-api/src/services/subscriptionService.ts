/**
 * Subscription Service
 *
 * Comprehensive service for managing restaurant subscriptions,
 * feature access, usage tracking, and plan management.
 */

import mongoose from 'mongoose';
import { Subscription, ISubscription, SubscriptionStatus } from '../models/Subscription.js';
import { SubscriptionPlan, ISubscriptionPlan, IPlanLimits } from '../models/SubscriptionPlan.js';
import {
  Feature,
  FEATURES,
  Tier,
  TIERS,
  getFeaturesForTier,
  getFeatureDisplayName,
  DEFAULT_PLAN_LIMITS,
} from '../config/features.js';
import { invalidateSubscriptionCache } from '../middleware/feature.js';

// ============================================
// Types
// ============================================

export interface SubscriptionInfo {
  id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  plan: {
    id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    tier: Tier;
  };
  status: SubscriptionStatus;
  isValid: boolean;
  isInTrial: boolean;
  trialEndsAt?: Date;
  currentPeriodEnd: Date;
  features: Feature[];
  limits: IPlanLimits;
  usage: {
    dishes: number;
    orders: number;
    smsCredits: number;
    storage: number;
    campaigns: number;
  };
}

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}

export interface DowngradePreview {
  lostFeatures: Array<{
    feature: Feature;
    displayName: string;
  }>;
  overLimits: Array<{
    resource: string;
    current: number;
    newLimit: number;
  }>;
  warnings: string[];
}

export interface UpgradePreview {
  newFeatures: Array<{
    feature: Feature;
    displayName: string;
  }>;
  newLimits: IPlanLimits;
  priceDifference: {
    monthly: number;
    yearly: number;
  };
}

// ============================================
// Subscription Service
// ============================================

export const subscriptionService = {
  // ==========================================
  // Subscription Retrieval
  // ==========================================

  /**
   * Get subscription for a restaurant
   */
  async getSubscription(restaurantId: mongoose.Types.ObjectId): Promise<ISubscription | null> {
    return Subscription.findOne({ restaurantId }).populate('planId');
  },

  /**
   * Get subscription info with all relevant data
   */
  async getSubscriptionInfo(restaurantId: mongoose.Types.ObjectId): Promise<SubscriptionInfo | null> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    if (!subscription || !subscription.planId) {
      return null;
    }

    const plan = subscription.planId as ISubscriptionPlan;
    const isValid = this.isSubscriptionValid(subscription);
    const isInTrial = subscription.status === 'trial' &&
      subscription.trialEndsAt !== undefined &&
      new Date() < subscription.trialEndsAt;

    return {
      id: subscription._id,
      restaurantId: subscription.restaurantId,
      plan: {
        id: plan._id,
        name: plan.name,
        slug: plan.slug,
        tier: plan.tier,
      },
      status: subscription.status,
      isValid,
      isInTrial,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      features: plan.getEnabledFeatures(),
      limits: plan.limits,
      usage: {
        dishes: subscription.usage.dishes,
        orders: subscription.usage.orders,
        smsCredits: subscription.usage.smsCredits,
        storage: subscription.usage.storage,
        campaigns: subscription.usage.campaigns,
      },
    };
  },

  /**
   * Check if subscription is valid
   */
  isSubscriptionValid(subscription: { status: SubscriptionStatus; trialEndsAt?: Date }): boolean {
    if (!subscription) { return false; }

    if (subscription.status === 'active') { return true; }

    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      return new Date() < subscription.trialEndsAt;
    }

    return false;
  },

  // ==========================================
  // Feature Access
  // ==========================================

  /**
   * Check if restaurant has access to a feature
   */
  async hasFeature(restaurantId: mongoose.Types.ObjectId, feature: Feature): Promise<boolean> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    if (!subscription || !this.isSubscriptionValid(subscription)) {
      return false;
    }

    const plan = subscription.planId as ISubscriptionPlan;
    return plan.hasFeature(feature);
  },

  /**
   * Get all available features for restaurant
   */
  async getAvailableFeatures(restaurantId: mongoose.Types.ObjectId): Promise<Feature[]> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    if (!subscription || !this.isSubscriptionValid(subscription)) {
      // Return free tier features
      return getFeaturesForTier(TIERS.FREE);
    }

    const plan = subscription.planId as ISubscriptionPlan;
    return plan.getEnabledFeatures();
  },

  /**
   * Check multiple features at once
   */
  async checkFeatures(
    restaurantId: mongoose.Types.ObjectId,
    features: Feature[]
  ): Promise<Record<Feature, boolean>> {
    const availableFeatures = await this.getAvailableFeatures(restaurantId);

    return features.reduce((acc, feature) => {
      acc[feature] = availableFeatures.includes(feature);
      return acc;
    }, {} as Record<Feature, boolean>);
  },

  // ==========================================
  // Usage Tracking
  // ==========================================

  /**
   * Check usage limit for a resource
   */
  async checkUsageLimit(
    restaurantId: mongoose.Types.ObjectId,
    resource: keyof IPlanLimits
  ): Promise<UsageCheckResult> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    if (!subscription) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        percentUsed: 100,
      };
    }

    const plan = subscription.planId as ISubscriptionPlan;
    const limit = plan.limits[resource];
    const used = (subscription.usage as any)[resource] || 0;

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        used,
        limit: -1,
        remaining: -1,
        percentUsed: 0,
      };
    }

    const remaining = Math.max(0, limit - used);
    const percentUsed = limit > 0 ? Math.round((used / limit) * 100) : 0;

    return {
      allowed: used < limit,
      used,
      limit,
      remaining,
      percentUsed,
    };
  },

  /**
   * Increment usage counter
   */
  async incrementUsage(
    restaurantId: mongoose.Types.ObjectId,
    resource: 'dishes' | 'orders' | 'smsCredits' | 'campaigns' | 'storage',
    amount: number = 1
  ): Promise<ISubscription | null> {
    const result = await Subscription.findOneAndUpdate(
      { restaurantId },
      { $inc: { [`usage.${resource}`]: amount } },
      { new: true }
    );

    // Invalidate cache
    invalidateSubscriptionCache(restaurantId.toString());

    return result;
  },

  /**
   * Decrement usage counter
   */
  async decrementUsage(
    restaurantId: mongoose.Types.ObjectId,
    resource: 'dishes' | 'orders' | 'smsCredits' | 'campaigns' | 'storage',
    amount: number = 1
  ): Promise<ISubscription | null> {
    const result = await Subscription.findOneAndUpdate(
      { restaurantId },
      { $inc: { [`usage.${resource}`]: -amount } },
      { new: true }
    );

    // Ensure usage doesn't go negative
    if (result && (result.usage as any)[resource] < 0) {
      await Subscription.updateOne(
        { restaurantId },
        { $set: { [`usage.${resource}`]: 0 } }
      );
    }

    invalidateSubscriptionCache(restaurantId.toString());

    return result;
  },

  /**
   * Set usage counter to specific value
   */
  async setUsage(
    restaurantId: mongoose.Types.ObjectId,
    resource: 'dishes' | 'orders' | 'smsCredits' | 'campaigns' | 'storage',
    value: number
  ): Promise<ISubscription | null> {
    const result = await Subscription.findOneAndUpdate(
      { restaurantId },
      { $set: { [`usage.${resource}`]: Math.max(0, value) } },
      { new: true }
    );

    invalidateSubscriptionCache(restaurantId.toString());

    return result;
  },

  /**
   * Reset monthly usage counters
   */
  async resetMonthlyUsage(restaurantId: mongoose.Types.ObjectId): Promise<ISubscription | null> {
    const result = await Subscription.findOneAndUpdate(
      { restaurantId },
      {
        $set: {
          'usage.orders': 0,
          'usage.smsCredits': 0,
          'usage.campaigns': 0,
          'usage.lastResetAt': new Date(),
        },
      },
      { new: true }
    );

    invalidateSubscriptionCache(restaurantId.toString());

    return result;
  },

  /**
   * Get usage summary
   */
  async getUsageSummary(restaurantId: mongoose.Types.ObjectId): Promise<Record<string, UsageCheckResult>> {
    const resources: Array<keyof IPlanLimits> = [
      'dishes', 'orders', 'users', 'smsCredits', 'storage', 'tables', 'campaigns', 'locations'
    ];

    const summary: Record<string, UsageCheckResult> = {};

    for (const resource of resources) {
      summary[resource] = await this.checkUsageLimit(restaurantId, resource);
    }

    return summary;
  },

  // ==========================================
  // Plan Management
  // ==========================================

  /**
   * Preview downgrade impact
   */
  async previewDowngrade(
    restaurantId: mongoose.Types.ObjectId,
    newPlanSlug: string
  ): Promise<DowngradePreview> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    const newPlan = await SubscriptionPlan.findOne({ slug: newPlanSlug });

    if (!subscription || !newPlan) {
      return { lostFeatures: [], overLimits: [], warnings: [] };
    }

    const currentPlan = subscription.planId as ISubscriptionPlan;

    // Get lost features
    const currentFeatures = currentPlan.getEnabledFeatures();
    const newFeatures = newPlan.getEnabledFeatures();
    const lostFeaturesList = currentFeatures.filter(f => !newFeatures.includes(f));

    const lostFeatures = lostFeaturesList.map(f => ({
      feature: f,
      displayName: getFeatureDisplayName(f),
    }));

    // Check over-limit resources
    const overLimits: DowngradePreview['overLimits'] = [];
    const warnings: string[] = [];

    const resourceChecks = [
      { key: 'dishes', label: 'menu items', current: subscription.usage.dishes },
      { key: 'orders', label: 'monthly orders', current: subscription.usage.orders },
      { key: 'smsCredits', label: 'SMS credits', current: subscription.usage.smsCredits },
      { key: 'campaigns', label: 'campaigns', current: subscription.usage.campaigns },
    ];

    for (const check of resourceChecks) {
      const newLimit = (newPlan.limits as any)[check.key];
      if (newLimit !== -1 && check.current > newLimit) {
        overLimits.push({
          resource: check.key,
          current: check.current,
          newLimit,
        });
        warnings.push(
          `You have ${check.current} ${check.label} but the new plan allows only ${newLimit}. ` +
          `Excess items will be archived.`
        );
      }
    }

    // Add feature-specific warnings
    if (lostFeaturesList.includes(FEATURES.LOYALTY_PROGRAM)) {
      warnings.push('Customer loyalty points will be preserved but the program will be paused.');
    }

    if (lostFeaturesList.includes(FEATURES.DELIVERY_MODULE)) {
      warnings.push('Active deliveries will complete but new delivery orders will be disabled.');
    }

    return { lostFeatures, overLimits, warnings };
  },

  /**
   * Preview upgrade benefits
   */
  async previewUpgrade(
    restaurantId: mongoose.Types.ObjectId,
    newPlanSlug: string
  ): Promise<UpgradePreview> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    const newPlan = await SubscriptionPlan.findOne({ slug: newPlanSlug });

    if (!newPlan) {
      return {
        newFeatures: [],
        newLimits: DEFAULT_PLAN_LIMITS[TIERS.FREE],
        priceDifference: { monthly: 0, yearly: 0 },
      };
    }

    let currentPlan: ISubscriptionPlan | null = null;
    if (subscription) {
      currentPlan = subscription.planId as ISubscriptionPlan;
    }

    // Get new features
    const currentFeatures = currentPlan ? currentPlan.getEnabledFeatures() : getFeaturesForTier(TIERS.FREE);
    const newFeatures = newPlan.getEnabledFeatures();
    const gainedFeatures = newFeatures.filter(f => !currentFeatures.includes(f));

    return {
      newFeatures: gainedFeatures.map(f => ({
        feature: f,
        displayName: getFeatureDisplayName(f),
      })),
      newLimits: newPlan.limits,
      priceDifference: {
        monthly: newPlan.pricing.monthly - (currentPlan?.pricing.monthly || 0),
        yearly: newPlan.pricing.yearly - (currentPlan?.pricing.yearly || 0),
      },
    };
  },

  /**
   * Change subscription plan
   */
  async changePlan(
    restaurantId: mongoose.Types.ObjectId,
    newPlanId: mongoose.Types.ObjectId,
    options: {
      immediate?: boolean;
      resetUsage?: boolean;
    } = {}
  ): Promise<ISubscription | null> {
    const newPlan = await SubscriptionPlan.findById(newPlanId);
    if (!newPlan) {
      throw new Error('Plan not found');
    }

    const updateData: any = {
      planId: newPlanId,
    };

    if (options.immediate) {
      updateData.currentPeriodStart = new Date();
      // Calculate new period end based on billing cycle
      const subscription = await Subscription.findOne({ restaurantId });
      if (subscription) {
        const periodEnd = new Date();
        if (subscription.billingCycle === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        updateData.currentPeriodEnd = periodEnd;
      }
    }

    if (options.resetUsage) {
      updateData['usage.orders'] = 0;
      updateData['usage.smsCredits'] = 0;
      updateData['usage.campaigns'] = 0;
      updateData['usage.lastResetAt'] = new Date();
    }

    const result = await Subscription.findOneAndUpdate(
      { restaurantId },
      { $set: updateData },
      { new: true }
    );

    invalidateSubscriptionCache(restaurantId.toString());

    return result;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    restaurantId: mongoose.Types.ObjectId,
    reason?: string
  ): Promise<ISubscription | null> {
    const result = await Subscription.findOneAndUpdate(
      { restaurantId },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      },
      { new: true }
    );

    invalidateSubscriptionCache(restaurantId.toString());

    return result;
  },

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(restaurantId: mongoose.Types.ObjectId): Promise<ISubscription | null> {
    const subscription = await Subscription.findOne({ restaurantId });

    if (!subscription || subscription.status !== 'cancelled') {
      return null;
    }

    const result = await Subscription.findOneAndUpdate(
      { restaurantId },
      {
        $set: {
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
        $unset: {
          cancelledAt: 1,
          cancelReason: 1,
        },
      },
      { new: true }
    );

    invalidateSubscriptionCache(restaurantId.toString());

    return result;
  },

  // ==========================================
  // Subscription Creation
  // ==========================================

  /**
   * Create a new subscription for a restaurant
   */
  async createSubscription(
    restaurantId: mongoose.Types.ObjectId,
    planId: mongoose.Types.ObjectId,
    options: {
      billingCycle?: 'monthly' | 'yearly';
      startTrial?: boolean;
    } = {}
  ): Promise<ISubscription> {
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const now = new Date();
    const periodEnd = new Date(now);

    if (options.billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    let trialEndsAt: Date | undefined;
    let status: SubscriptionStatus = 'active';

    if (options.startTrial && plan.trialDays > 0) {
      status = 'trial';
      trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + plan.trialDays);
    }

    const subscription = await Subscription.create({
      restaurantId,
      planId,
      status,
      billingCycle: options.billingCycle || 'monthly',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt,
      usage: {
        dishes: 0,
        orders: 0,
        smsCredits: 0,
        storage: 0,
        campaigns: 0,
        lastResetAt: now,
      },
    });

    return subscription;
  },

  // ==========================================
  // Plan Queries
  // ==========================================

  /**
   * Get all active plans
   */
  async getActivePlans(): Promise<ISubscriptionPlan[]> {
    return SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });
  },

  /**
   * Get plan by slug
   */
  async getPlanBySlug(slug: string): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlan.findOne({ slug, isActive: true });
  },

  /**
   * Get plan by tier
   */
  async getPlanByTier(tier: Tier): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlan.findOne({ tier, isActive: true });
  },

  // ==========================================
  // Batch Operations
  // ==========================================

  /**
   * Process expired trials (scheduled job)
   */
  async processExpiredTrials(): Promise<number> {
    const expiredTrials = await Subscription.find({
      status: 'trial',
      trialEndsAt: { $lt: new Date() },
    });

    let processed = 0;

    for (const subscription of expiredTrials) {
      // Downgrade to free plan
      const freePlan = await SubscriptionPlan.findOne({ tier: TIERS.FREE });

      if (freePlan) {
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'expired',
              planId: freePlan._id,
            },
          }
        );

        invalidateSubscriptionCache(subscription.restaurantId.toString());
        processed++;
      }
    }

    return processed;
  },

  /**
   * Reset monthly usage for all subscriptions (scheduled job)
   */
  async resetAllMonthlyUsage(): Promise<number> {
    const result = await Subscription.updateMany(
      {},
      {
        $set: {
          'usage.orders': 0,
          'usage.smsCredits': 0,
          'usage.campaigns': 0,
          'usage.lastResetAt': new Date(),
        },
      }
    );

    return result.modifiedCount;
  },
};

export default subscriptionService;
