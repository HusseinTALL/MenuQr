/**
 * Subscription Controller
 *
 * Handles all subscription-related API endpoints including
 * plan management, feature checks, and usage tracking.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { subscriptionService } from '../services/subscriptionService.js';
import { downgradeService } from '../services/downgradeService.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Subscription } from '../models/Subscription.js';
import { Feature, FEATURES, getFeatureDisplayName, getTierDisplayName } from '../config/features.js';

// ============================================
// Plan Endpoints
// ============================================

/**
 * GET /api/v1/subscription/plans
 * Get all available subscription plans
 */
export async function getPlans(_req: Request, res: Response): Promise<void> {
  try {
    const plans = await subscriptionService.getActivePlans();

    const formattedPlans = plans.map(plan => ({
      id: plan._id,
      name: plan.name,
      slug: plan.slug,
      tier: plan.tier,
      tierDisplayName: getTierDisplayName(plan.tier),
      description: plan.description,
      displayFeatures: plan.displayFeatures,
      limits: plan.limits,
      pricing: {
        monthly: plan.pricing.monthly,
        yearly: plan.pricing.yearly,
        currency: plan.pricing.currency,
        monthlyFormatted: `€${(plan.pricing.monthly / 100).toFixed(2)}`,
        yearlyFormatted: `€${(plan.pricing.yearly / 100).toFixed(2)}`,
        yearlySavings: plan.pricing.monthly * 12 - plan.pricing.yearly,
      },
      trialDays: plan.trialDays,
      isPopular: plan.isPopular,
    }));

    res.json({
      success: true,
      data: { plans: formattedPlans },
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription plans',
    });
  }
}

/**
 * GET /api/v1/subscription/plans/:slug
 * Get a specific plan by slug
 */
export async function getPlanBySlug(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const plan = await subscriptionService.getPlanBySlug(slug);

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: plan._id,
        name: plan.name,
        slug: plan.slug,
        tier: plan.tier,
        tierDisplayName: getTierDisplayName(plan.tier),
        description: plan.description,
        displayFeatures: plan.displayFeatures,
        enabledFeatures: plan.getEnabledFeatures().map(f => ({
          key: f,
          name: getFeatureDisplayName(f),
        })),
        limits: plan.limits,
        pricing: plan.pricing,
        trialDays: plan.trialDays,
      },
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plan',
    });
  }
}

// ============================================
// Current Subscription Endpoints
// ============================================

/**
 * GET /api/v1/subscription/current
 * Get current restaurant's subscription
 */
export async function getCurrentSubscription(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const info = await subscriptionService.getSubscriptionInfo(
      new mongoose.Types.ObjectId(restaurantId)
    );

    if (!info) {
      res.status(404).json({
        success: false,
        message: 'No subscription found',
        code: 'NO_SUBSCRIPTION',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: info.id,
        plan: {
          ...info.plan,
          tierDisplayName: getTierDisplayName(info.plan.tier),
        },
        status: info.status,
        isValid: info.isValid,
        isInTrial: info.isInTrial,
        trialEndsAt: info.trialEndsAt,
        currentPeriodEnd: info.currentPeriodEnd,
        features: info.features.map(f => ({
          key: f,
          name: getFeatureDisplayName(f),
        })),
        limits: info.limits,
        usage: info.usage,
      },
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
    });
  }
}

/**
 * GET /api/v1/subscription/features
 * Get available features for current subscription
 */
export async function getAvailableFeatures(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const features = await subscriptionService.getAvailableFeatures(
      new mongoose.Types.ObjectId(restaurantId)
    );

    res.json({
      success: true,
      data: {
        features: features.map(f => ({
          key: f,
          name: getFeatureDisplayName(f),
        })),
        featureKeys: features,
      },
    });
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching features',
    });
  }
}

/**
 * POST /api/v1/subscription/check-feature
 * Check if a specific feature is available
 */
export async function checkFeature(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { feature } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    if (!feature || !Object.values(FEATURES).includes(feature)) {
      res.status(400).json({
        success: false,
        message: 'Invalid feature',
      });
      return;
    }

    const hasFeature = await subscriptionService.hasFeature(
      new mongoose.Types.ObjectId(restaurantId),
      feature as Feature
    );

    res.json({
      success: true,
      data: {
        feature,
        featureName: getFeatureDisplayName(feature as Feature),
        hasAccess: hasFeature,
      },
    });
  } catch (error) {
    console.error('Check feature error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking feature',
    });
  }
}

/**
 * POST /api/v1/subscription/check-features
 * Check multiple features at once
 */
export async function checkFeatures(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { features } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    if (!Array.isArray(features) || features.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Features array required',
      });
      return;
    }

    const validFeatures = features.filter(f => Object.values(FEATURES).includes(f)) as Feature[];
    const results = await subscriptionService.checkFeatures(
      new mongoose.Types.ObjectId(restaurantId),
      validFeatures
    );

    res.json({
      success: true,
      data: {
        features: Object.entries(results).map(([key, hasAccess]) => ({
          key,
          name: getFeatureDisplayName(key as Feature),
          hasAccess,
        })),
      },
    });
  } catch (error) {
    console.error('Check features error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking features',
    });
  }
}

// ============================================
// Usage Endpoints
// ============================================

/**
 * GET /api/v1/subscription/usage
 * Get usage summary for current subscription
 */
export async function getUsageSummary(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const summary = await subscriptionService.getUsageSummary(
      new mongoose.Types.ObjectId(restaurantId)
    );

    res.json({
      success: true,
      data: { usage: summary },
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching usage',
    });
  }
}

/**
 * GET /api/v1/subscription/usage/:resource
 * Get usage for a specific resource
 */
export async function getResourceUsage(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { resource } = req.params;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const validResources = ['dishes', 'orders', 'users', 'smsCredits', 'storage', 'tables', 'campaigns', 'locations'];
    if (!validResources.includes(resource)) {
      res.status(400).json({
        success: false,
        message: 'Invalid resource',
      });
      return;
    }

    const usage = await subscriptionService.checkUsageLimit(
      new mongoose.Types.ObjectId(restaurantId),
      resource as any
    );

    res.json({
      success: true,
      data: {
        resource,
        ...usage,
        isUnlimited: usage.limit === -1,
      },
    });
  } catch (error) {
    console.error('Get resource usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching resource usage',
    });
  }
}

// ============================================
// Upgrade/Downgrade Endpoints
// ============================================

/**
 * POST /api/v1/subscription/preview-upgrade
 * Preview what you get when upgrading to a new plan
 */
export async function previewUpgrade(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { planSlug } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    if (!planSlug) {
      res.status(400).json({
        success: false,
        message: 'Plan slug required',
      });
      return;
    }

    const preview = await subscriptionService.previewUpgrade(
      new mongoose.Types.ObjectId(restaurantId),
      planSlug
    );

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error('Preview upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error previewing upgrade',
    });
  }
}

/**
 * POST /api/v1/subscription/preview-downgrade
 * Preview what you lose when downgrading
 */
export async function previewDowngrade(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { planSlug } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    if (!planSlug) {
      res.status(400).json({
        success: false,
        message: 'Plan slug required',
      });
      return;
    }

    const preview = await subscriptionService.previewDowngrade(
      new mongoose.Types.ObjectId(restaurantId),
      planSlug
    );

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error('Preview downgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error previewing downgrade',
    });
  }
}

/**
 * POST /api/v1/subscription/change-plan
 * Change to a new subscription plan
 * Note: In production, this would integrate with Stripe
 */
export async function changePlan(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { planId, immediate } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    if (!planId) {
      res.status(400).json({
        success: false,
        message: 'Plan ID required',
      });
      return;
    }

    // Validate plan exists
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    // TODO: In production, create Stripe checkout session here
    // For now, just change the plan directly

    const subscription = await subscriptionService.changePlan(
      new mongoose.Types.ObjectId(restaurantId),
      new mongoose.Types.ObjectId(planId),
      { immediate: immediate === true }
    );

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
      return;
    }

    res.json({
      success: true,
      message: `Successfully changed to ${plan.name} plan`,
      data: {
        subscriptionId: subscription._id,
        newPlan: plan.name,
        effectiveDate: immediate ? new Date() : subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing plan',
    });
  }
}

/**
 * POST /api/v1/subscription/cancel
 * Cancel subscription
 */
export async function cancelSubscription(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { reason } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const subscription = await subscriptionService.cancelSubscription(
      new mongoose.Types.ObjectId(restaurantId),
      reason
    );

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Subscription cancelled. You can still use the service until the current period ends.',
      data: {
        status: subscription.status,
        accessUntil: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
    });
  }
}

/**
 * POST /api/v1/subscription/reactivate
 * Reactivate a cancelled subscription
 */
export async function reactivateSubscription(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const subscription = await subscriptionService.reactivateSubscription(
      new mongoose.Types.ObjectId(restaurantId)
    );

    if (!subscription) {
      res.status(400).json({
        success: false,
        message: 'Cannot reactivate subscription. It may not be cancelled.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating subscription',
    });
  }
}

// ============================================
// Downgrade Handling Endpoints
// ============================================

/**
 * POST /api/v1/subscription/analyze-downgrade
 * Get detailed analysis of downgrade impact
 */
export async function analyzeDowngrade(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { planSlug } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    if (!planSlug) {
      res.status(400).json({
        success: false,
        message: 'Plan slug required',
      });
      return;
    }

    const plan = await subscriptionService.getPlanBySlug(planSlug);
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    const analysis = await downgradeService.analyzeDowngradeImpact(
      new mongoose.Types.ObjectId(restaurantId),
      plan._id
    );

    res.json({
      success: true,
      data: {
        ...analysis,
        newPlan: {
          id: plan._id,
          name: plan.name,
          slug: plan.slug,
          tier: plan.tier,
        },
      },
    });
  } catch (error) {
    console.error('Analyze downgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing downgrade impact',
    });
  }
}

/**
 * POST /api/v1/subscription/schedule-downgrade
 * Schedule a downgrade to take effect at end of billing period
 */
export async function scheduleDowngrade(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { planSlug, reason, immediate } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    if (!planSlug) {
      res.status(400).json({
        success: false,
        message: 'Plan slug required',
      });
      return;
    }

    const plan = await subscriptionService.getPlanBySlug(planSlug);
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    // First analyze to check for blockers
    const analysis = await downgradeService.analyzeDowngradeImpact(
      new mongoose.Types.ObjectId(restaurantId),
      plan._id
    );

    if (analysis.blockers.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot downgrade at this time',
        code: 'DOWNGRADE_BLOCKED',
        data: {
          blockers: analysis.blockers,
        },
      });
      return;
    }

    const result = await downgradeService.scheduleDowngrade(
      new mongoose.Types.ObjectId(restaurantId),
      plan._id,
      reason,
      immediate === true
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Failed to schedule downgrade',
      });
      return;
    }

    res.json({
      success: true,
      message: result.scheduled
        ? `Downgrade scheduled for ${result.effectiveDate?.toLocaleDateString()}`
        : 'Downgrade applied immediately',
      data: {
        scheduled: result.scheduled,
        effectiveDate: result.effectiveDate,
        archivedItems: result.archivedItems,
        newPlan: plan.name,
      },
    });
  } catch (error) {
    console.error('Schedule downgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling downgrade',
    });
  }
}

/**
 * POST /api/v1/subscription/cancel-scheduled-downgrade
 * Cancel a pending scheduled downgrade
 */
export async function cancelScheduledDowngrade(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const success = await downgradeService.cancelScheduledDowngrade(
      new mongoose.Types.ObjectId(restaurantId)
    );

    if (!success) {
      res.status(400).json({
        success: false,
        message: 'No pending downgrade to cancel',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Scheduled downgrade cancelled',
    });
  } catch (error) {
    console.error('Cancel scheduled downgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling scheduled downgrade',
    });
  }
}

/**
 * GET /api/v1/subscription/pending-changes
 * Get pending subscription changes (upgrade/downgrade)
 */
export async function getPendingChanges(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const subscription = await Subscription.findOne({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
    }).populate('pendingChange.newPlanId', 'name slug tier');

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
      return;
    }

    if (!subscription.pendingChange) {
      res.json({
        success: true,
        data: {
          hasPendingChanges: false,
        },
      });
      return;
    }

    const newPlan = subscription.pendingChange.newPlanId as unknown as {
      name: string;
      slug: string;
      tier: string;
    };

    res.json({
      success: true,
      data: {
        hasPendingChanges: true,
        pendingChange: {
          type: subscription.pendingChange.type,
          effectiveDate: subscription.pendingChange.effectiveDate,
          requestedAt: subscription.pendingChange.requestedAt,
          reason: subscription.pendingChange.reason,
          newPlan: newPlan ? {
            name: newPlan.name,
            slug: newPlan.slug,
            tier: newPlan.tier,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Get pending changes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending changes',
    });
  }
}

/**
 * GET /api/v1/subscription/grace-period
 * Get grace period status
 */
export async function getGracePeriodStatus(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const subscription = await Subscription.findOne({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
    });

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
      return;
    }

    if (!subscription.gracePeriod?.isActive) {
      res.json({
        success: true,
        data: {
          inGracePeriod: false,
        },
      });
      return;
    }

    const now = new Date();
    const endsAt = subscription.gracePeriod.endsAt;
    const daysRemaining = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    res.json({
      success: true,
      data: {
        inGracePeriod: true,
        gracePeriod: {
          reason: subscription.gracePeriod.reason,
          startedAt: subscription.gracePeriod.startedAt,
          endsAt: subscription.gracePeriod.endsAt,
          daysRemaining: Math.max(0, daysRemaining),
          notificationsSent: subscription.gracePeriod.notificationsSent,
        },
      },
    });
  } catch (error) {
    console.error('Get grace period status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grace period status',
    });
  }
}

/**
 * GET /api/v1/subscription/downgrade-history
 * Get history of past downgrades
 */
export async function getDowngradeHistory(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant context required',
      });
      return;
    }

    const subscription = await Subscription.findOne({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
    })
      .populate('downgradeHistory.fromPlanId', 'name slug tier')
      .populate('downgradeHistory.toPlanId', 'name slug tier');

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        history: subscription.downgradeHistory.map(entry => ({
          fromPlan: entry.fromPlanId,
          toPlan: entry.toPlanId,
          effectiveDate: entry.effectiveDate,
          archivedItems: entry.archivedItems,
        })),
      },
    });
  } catch (error) {
    console.error('Get downgrade history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching downgrade history',
    });
  }
}

export default {
  getPlans,
  getPlanBySlug,
  getCurrentSubscription,
  getAvailableFeatures,
  checkFeature,
  checkFeatures,
  getUsageSummary,
  getResourceUsage,
  previewUpgrade,
  previewDowngrade,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
  // Downgrade handling
  analyzeDowngrade,
  scheduleDowngrade,
  cancelScheduledDowngrade,
  getPendingChanges,
  getGracePeriodStatus,
  getDowngradeHistory,
};
