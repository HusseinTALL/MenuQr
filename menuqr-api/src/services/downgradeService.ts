/**
 * Downgrade Service
 *
 * Handles subscription downgrades, data archiving, grace periods,
 * and related notifications.
 */

import mongoose from 'mongoose';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionPlan, ISubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Dish } from '../models/Dish.js';
import { Campaign } from '../models/Campaign.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { invalidateSubscriptionCache } from '../middleware/feature.js';
import emailService from './emailService.js';
import { logger } from '../utils/logger.js';
import {
  FEATURES,
  getFeatureDisplayName,
} from '../config/features.js';

// Grace period duration in days
const GRACE_PERIOD_DAYS = 7;

// ============================================
// Types
// ============================================

export interface DataImpactAnalysis {
  dishes: {
    total: number;
    active: number;
    toArchive: number;
    newLimit: number;
  };
  campaigns: {
    total: number;
    active: number;
    toArchive: number;
    newLimit: number;
  };
  features: {
    losing: Array<{ key: string; name: string; impact: string }>;
    keeping: Array<{ key: string; name: string }>;
  };
  warnings: string[];
  blockers: string[];
  canProceed: boolean;
}

export interface DowngradeResult {
  success: boolean;
  scheduled: boolean;
  effectiveDate: Date;
  archivedItems: {
    dishes: number;
    campaigns: number;
  };
  message: string;
}

// ============================================
// Downgrade Service
// ============================================

export const downgradeService = {
  /**
   * Analyze the full impact of a downgrade
   * @param restaurantId - The restaurant's ObjectId
   * @param newPlanIdOrSlug - Either the plan's ObjectId or slug string
   */
  async analyzeDowngradeImpact(
    restaurantId: mongoose.Types.ObjectId,
    newPlanIdOrSlug: mongoose.Types.ObjectId | string
  ): Promise<DataImpactAnalysis> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    // Support both ObjectId and slug lookup
    let newPlan;
    if (typeof newPlanIdOrSlug === 'string' && !mongoose.Types.ObjectId.isValid(newPlanIdOrSlug)) {
      newPlan = await SubscriptionPlan.findOne({ slug: newPlanIdOrSlug });
    } else {
      newPlan = await SubscriptionPlan.findById(newPlanIdOrSlug);
    }

    if (!subscription || !newPlan) {
      return {
        dishes: { total: 0, active: 0, toArchive: 0, newLimit: 0 },
        campaigns: { total: 0, active: 0, toArchive: 0, newLimit: 0 },
        features: { losing: [], keeping: [] },
        warnings: [],
        blockers: ['Subscription or plan not found'],
        canProceed: false,
      };
    }

    const currentPlan = subscription.planId as ISubscriptionPlan;

    // Count dishes
    const totalDishes = await Dish.countDocuments({ restaurantId, isDeleted: { $ne: true } });
    const activeDishes = await Dish.countDocuments({ restaurantId, isAvailable: true, isDeleted: { $ne: true } });
    const dishLimit = newPlan.limits.dishes;
    const dishesToArchive = dishLimit === -1 ? 0 : Math.max(0, activeDishes - dishLimit);

    // Count campaigns
    const totalCampaigns = await Campaign.countDocuments({ restaurantId });
    const activeCampaigns = await Campaign.countDocuments({
      restaurantId,
      status: { $in: ['draft', 'scheduled'] },
    });
    const campaignLimit = newPlan.limits.campaigns;
    const campaignsToArchive = campaignLimit === -1 ? 0 : Math.max(0, activeCampaigns - campaignLimit);

    // Analyze features
    const currentFeatures = currentPlan.getEnabledFeatures();
    const newFeatures = newPlan.getEnabledFeatures();

    const losingFeatures = currentFeatures
      .filter(f => !newFeatures.includes(f))
      .map(f => ({
        key: f,
        name: getFeatureDisplayName(f),
        impact: getFeatureImpact(f),
      }));

    const keepingFeatures = newFeatures.map(f => ({
      key: f,
      name: getFeatureDisplayName(f),
    }));

    // Generate warnings
    const warnings: string[] = [];
    const blockers: string[] = [];

    if (dishesToArchive > 0) {
      warnings.push(
        `${dishesToArchive} plat(s) seront archivés car la nouvelle limite est de ${dishLimit} plats.`
      );
    }

    if (campaignsToArchive > 0) {
      warnings.push(
        `${campaignsToArchive} campagne(s) en attente seront annulées.`
      );
    }

    // Check for active features that will be lost
    if (losingFeatures.some(f => f.key === FEATURES.LOYALTY_PROGRAM)) {
      warnings.push(
        'Le programme de fidélité sera suspendu. Les points des clients seront conservés mais ne pourront plus être utilisés.'
      );
    }

    if (losingFeatures.some(f => f.key === FEATURES.RESERVATIONS)) {
      const pendingReservations = await checkPendingReservations(restaurantId);
      if (pendingReservations > 0) {
        warnings.push(
          `${pendingReservations} réservation(s) en attente. Les nouvelles réservations seront désactivées après le changement.`
        );
      }
    }

    if (losingFeatures.some(f => f.key === FEATURES.DELIVERY_MODULE)) {
      const activeDeliveries = await checkActiveDeliveries(restaurantId);
      if (activeDeliveries > 0) {
        blockers.push(
          `${activeDeliveries} livraison(s) en cours. Veuillez attendre leur achèvement avant de changer de plan.`
        );
      }
    }

    if (losingFeatures.some(f => f.key === FEATURES.SMS_CAMPAIGNS)) {
      const scheduledCampaigns = await Campaign.countDocuments({
        restaurantId,
        status: 'scheduled',
      });
      if (scheduledCampaigns > 0) {
        warnings.push(
          `${scheduledCampaigns} campagne(s) SMS programmée(s) seront annulées.`
        );
      }
    }

    return {
      dishes: {
        total: totalDishes,
        active: activeDishes,
        toArchive: dishesToArchive,
        newLimit: dishLimit,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        toArchive: campaignsToArchive,
        newLimit: campaignLimit,
      },
      features: {
        losing: losingFeatures,
        keeping: keepingFeatures,
      },
      warnings,
      blockers,
      canProceed: blockers.length === 0,
    };
  },

  /**
   * Schedule a downgrade for end of billing period
   * @param restaurantId - The restaurant's ObjectId
   * @param newPlanIdOrSlug - Either the plan's ObjectId or slug string
   * @param reason - Optional reason for the downgrade
   * @param immediate - If true, execute immediately instead of scheduling
   */
  async scheduleDowngrade(
    restaurantId: mongoose.Types.ObjectId,
    newPlanIdOrSlug: mongoose.Types.ObjectId | string,
    reason?: string,
    immediate?: boolean
  ): Promise<DowngradeResult> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    // Support both ObjectId and slug lookup
    let newPlan;
    if (typeof newPlanIdOrSlug === 'string' && !mongoose.Types.ObjectId.isValid(newPlanIdOrSlug)) {
      newPlan = await SubscriptionPlan.findOne({ slug: newPlanIdOrSlug });
    } else {
      newPlan = await SubscriptionPlan.findById(newPlanIdOrSlug);
    }

    if (!subscription || !newPlan) {
      return {
        success: false,
        scheduled: false,
        effectiveDate: new Date(),
        archivedItems: { dishes: 0, campaigns: 0 },
        message: 'Subscription or plan not found',
      };
    }

    // Check impact
    const impact = await this.analyzeDowngradeImpact(restaurantId, newPlanIdOrSlug);
    if (!impact.canProceed) {
      return {
        success: false,
        scheduled: false,
        effectiveDate: new Date(),
        archivedItems: { dishes: 0, campaigns: 0 },
        message: impact.blockers.join(' '),
      };
    }

    // If immediate execution is requested, execute now
    if (immediate) {
      // Archive excess dishes and campaigns
      const archivedDishes = await this.archiveExcessDishes(restaurantId, newPlan.limits.dishes);
      const cancelledCampaigns = await this.cancelExcessCampaigns(restaurantId, newPlan.limits.campaigns);

      // Update subscription
      await Subscription.updateOne(
        { _id: subscription._id },
        {
          $set: {
            planId: newPlan._id,
            previousPlanId: subscription.planId,
          },
          $unset: { pendingChange: 1 },
          $push: {
            downgradeHistory: {
              fromPlanId: subscription.planId,
              toPlanId: newPlan._id,
              effectiveDate: new Date(),
              archivedItems: {
                dishes: archivedDishes,
                campaigns: cancelledCampaigns,
              },
            },
          },
        }
      );

      // Send completion email
      const currentPlan = subscription.planId as ISubscriptionPlan;
      await this.sendDowngradeCompletedEmail(restaurantId, currentPlan, newPlan, {
        dishes: archivedDishes,
        campaigns: cancelledCampaigns,
      });

      invalidateSubscriptionCache(restaurantId.toString());

      return {
        success: true,
        scheduled: false,
        effectiveDate: new Date(),
        archivedItems: {
          dishes: archivedDishes,
          campaigns: cancelledCampaigns,
        },
        message: 'Downgrade executed immediately',
      };
    }

    // Schedule the downgrade for end of billing period
    const effectiveDate = subscription.currentPeriodEnd;

    await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          pendingChange: {
            type: 'downgrade',
            newPlanId: newPlan._id,
            effectiveDate,
            requestedAt: new Date(),
            reason,
          },
        },
      }
    );

    // Send notification email
    await this.sendDowngradeScheduledEmail(restaurantId, newPlan, effectiveDate, impact);

    invalidateSubscriptionCache(restaurantId.toString());

    return {
      success: true,
      scheduled: true,
      effectiveDate,
      archivedItems: {
        dishes: impact.dishes.toArchive,
        campaigns: impact.campaigns.toArchive,
      },
      message: `Downgrade scheduled for ${effectiveDate.toLocaleDateString('fr-FR')}`,
    };
  },

  /**
   * Execute a pending downgrade (called by scheduler)
   */
  async executeDowngrade(subscriptionId: mongoose.Types.ObjectId): Promise<DowngradeResult> {
    const subscription = await Subscription.findById(subscriptionId)
      .populate<{ planId: ISubscriptionPlan }>('planId');

    if (!subscription || !subscription.pendingChange || subscription.pendingChange.type !== 'downgrade') {
      return {
        success: false,
        scheduled: false,
        effectiveDate: new Date(),
        archivedItems: { dishes: 0, campaigns: 0 },
        message: 'No pending downgrade found',
      };
    }

    const newPlan = await SubscriptionPlan.findById(subscription.pendingChange.newPlanId);
    if (!newPlan) {
      return {
        success: false,
        scheduled: false,
        effectiveDate: new Date(),
        archivedItems: { dishes: 0, campaigns: 0 },
        message: 'New plan not found',
      };
    }

    const currentPlan = subscription.planId as ISubscriptionPlan;
    const restaurantId = subscription.restaurantId;

    // Archive excess dishes
    const archivedDishes = await this.archiveExcessDishes(restaurantId, newPlan.limits.dishes);

    // Cancel excess campaigns
    const cancelledCampaigns = await this.cancelExcessCampaigns(restaurantId, newPlan.limits.campaigns);

    // Update subscription
    await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          previousPlanId: currentPlan._id,
          planId: newPlan._id,
          'usage.dishes': Math.min(subscription.usage.dishes, newPlan.limits.dishes === -1 ? Infinity : newPlan.limits.dishes),
        },
        $unset: {
          pendingChange: 1,
        },
        $push: {
          downgradeHistory: {
            fromPlanId: currentPlan._id,
            toPlanId: newPlan._id,
            effectiveDate: new Date(),
            archivedItems: {
              dishes: archivedDishes,
              campaigns: cancelledCampaigns,
            },
          },
        },
      }
    );

    // Send completion email
    await this.sendDowngradeCompletedEmail(restaurantId, currentPlan, newPlan, {
      dishes: archivedDishes,
      campaigns: cancelledCampaigns,
    });

    invalidateSubscriptionCache(restaurantId.toString());

    logger.info('[Downgrade] Executed', {
      restaurantId: restaurantId.toString(),
      fromPlan: currentPlan.slug,
      toPlan: newPlan.slug,
      archivedDishes,
      cancelledCampaigns,
    });

    return {
      success: true,
      scheduled: false,
      effectiveDate: new Date(),
      archivedItems: {
        dishes: archivedDishes,
        campaigns: cancelledCampaigns,
      },
      message: 'Downgrade completed successfully',
    };
  },

  /**
   * Cancel a scheduled downgrade
   */
  async cancelScheduledDowngrade(restaurantId: mongoose.Types.ObjectId): Promise<boolean> {
    const result = await Subscription.updateOne(
      { restaurantId, 'pendingChange.type': 'downgrade' },
      { $unset: { pendingChange: 1 } }
    );

    if (result.modifiedCount > 0) {
      invalidateSubscriptionCache(restaurantId.toString());
      return true;
    }

    return false;
  },

  /**
   * Archive excess dishes beyond the plan limit
   */
  async archiveExcessDishes(
    restaurantId: mongoose.Types.ObjectId,
    limit: number
  ): Promise<number> {
    if (limit === -1) {
      return 0; // Unlimited
    }

    // Get dishes sorted by least recently updated
    const activeDishes = await Dish.find({
      restaurantId,
      isAvailable: true,
      isDeleted: { $ne: true },
    })
      .sort({ updatedAt: 1 })
      .limit(1000);

    if (activeDishes.length <= limit) {
      return 0;
    }

    // Archive dishes beyond the limit (keep the most recently updated)
    const dishesToArchive = activeDishes.slice(0, activeDishes.length - limit);
    const dishIds = dishesToArchive.map(d => d._id);

    await Dish.updateMany(
      { _id: { $in: dishIds } },
      {
        $set: {
          isAvailable: false,
          archivedAt: new Date(),
          archivedReason: 'subscription_downgrade',
        },
      }
    );

    return dishIds.length;
  },

  /**
   * Cancel excess campaigns beyond the plan limit
   */
  async cancelExcessCampaigns(
    restaurantId: mongoose.Types.ObjectId,
    limit: number
  ): Promise<number> {
    if (limit === -1) {
      return 0; // Unlimited
    }

    // Cancel scheduled campaigns (oldest first)
    const scheduledCampaigns = await Campaign.find({
      restaurantId,
      status: 'scheduled',
    })
      .sort({ scheduledAt: 1 })
      .limit(1000);

    if (scheduledCampaigns.length <= limit) {
      return 0;
    }

    const campaignsToCancel = scheduledCampaigns.slice(0, scheduledCampaigns.length - limit);
    const campaignIds = campaignsToCancel.map(c => c._id);

    await Campaign.updateMany(
      { _id: { $in: campaignIds } },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'subscription_downgrade',
        },
      }
    );

    return campaignIds.length;
  },

  /**
   * Start a grace period for the subscription
   */
  async startGracePeriod(
    restaurantId: mongoose.Types.ObjectId,
    reason: 'payment_failed' | 'downgrade' | 'trial_ended'
  ): Promise<void> {
    const startedAt = new Date();
    const endsAt = new Date(startedAt);
    endsAt.setDate(endsAt.getDate() + GRACE_PERIOD_DAYS);

    await Subscription.updateOne(
      { restaurantId },
      {
        $set: {
          'gracePeriod.isActive': true,
          'gracePeriod.startedAt': startedAt,
          'gracePeriod.endsAt': endsAt,
          'gracePeriod.reason': reason,
          'gracePeriod.notificationsSent': 0,
        },
      }
    );

    // Send grace period started email
    await this.sendGracePeriodEmail(restaurantId, 'started', endsAt, reason);

    invalidateSubscriptionCache(restaurantId.toString());
  },

  /**
   * End the grace period and apply consequences
   */
  async endGracePeriod(subscriptionId: mongoose.Types.ObjectId): Promise<void> {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription || !subscription.gracePeriod?.isActive) {
      return;
    }

    const reason = subscription.gracePeriod.reason;

    if (reason === 'payment_failed') {
      // Downgrade to free plan
      const freePlan = await SubscriptionPlan.findOne({ slug: 'free' });
      if (freePlan) {
        await this.executeImmediateDowngrade(subscription.restaurantId, freePlan._id);
      }
    } else if (reason === 'trial_ended') {
      // Change status to expired
      await Subscription.updateOne(
        { _id: subscriptionId },
        {
          $set: {
            status: 'expired',
            'gracePeriod.isActive': false,
          },
        }
      );
    }

    // Send grace period ended email
    await this.sendGracePeriodEmail(subscription.restaurantId, 'ended', new Date(), reason);

    invalidateSubscriptionCache(subscription.restaurantId.toString());
  },

  /**
   * Execute immediate downgrade (for grace period expiry)
   */
  async executeImmediateDowngrade(
    restaurantId: mongoose.Types.ObjectId,
    newPlanId: mongoose.Types.ObjectId
  ): Promise<void> {
    const subscription = await Subscription.findOne({ restaurantId })
      .populate<{ planId: ISubscriptionPlan }>('planId');

    const newPlan = await SubscriptionPlan.findById(newPlanId);

    if (!subscription || !newPlan) {
      return;
    }

    const currentPlan = subscription.planId as ISubscriptionPlan;

    // Archive excess items
    const archivedDishes = await this.archiveExcessDishes(restaurantId, newPlan.limits.dishes);
    const cancelledCampaigns = await this.cancelExcessCampaigns(restaurantId, newPlan.limits.campaigns);

    // Update subscription
    await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          previousPlanId: currentPlan._id,
          planId: newPlanId,
          status: 'active',
          'gracePeriod.isActive': false,
        },
        $push: {
          downgradeHistory: {
            fromPlanId: currentPlan._id,
            toPlanId: newPlanId,
            effectiveDate: new Date(),
            archivedItems: {
              dishes: archivedDishes,
              campaigns: cancelledCampaigns,
            },
          },
        },
      }
    );

    invalidateSubscriptionCache(restaurantId.toString());
  },

  /**
   * Process all pending downgrades (scheduled job)
   */
  async processPendingDowngrades(): Promise<number> {
    const now = new Date();

    const pendingDowngrades = await Subscription.find({
      'pendingChange.type': 'downgrade',
      'pendingChange.effectiveDate': { $lte: now },
    });

    let processed = 0;

    for (const subscription of pendingDowngrades) {
      try {
        await this.executeDowngrade(subscription._id);
        processed++;
      } catch (error) {
        logger.error('[Downgrade] Failed to execute', {
          subscriptionId: subscription._id.toString(),
          error,
        });
      }
    }

    return processed;
  },

  /**
   * Process all expired grace periods (scheduled job)
   */
  async processExpiredGracePeriods(): Promise<number> {
    const now = new Date();

    const expiredGracePeriods = await Subscription.find({
      'gracePeriod.isActive': true,
      'gracePeriod.endsAt': { $lte: now },
    });

    let processed = 0;

    for (const subscription of expiredGracePeriods) {
      try {
        await this.endGracePeriod(subscription._id);
        processed++;
      } catch (error) {
        logger.error('[GracePeriod] Failed to end', {
          subscriptionId: subscription._id.toString(),
          error,
        });
      }
    }

    return processed;
  },

  /**
   * Send grace period reminder emails (scheduled job)
   */
  async sendGracePeriodReminders(): Promise<number> {
    const now = new Date();
    const reminderThreshold = new Date(now);
    reminderThreshold.setDate(reminderThreshold.getDate() + 3); // 3 days before expiry

    const subscriptionsNeedingReminder = await Subscription.find({
      'gracePeriod.isActive': true,
      'gracePeriod.endsAt': { $lte: reminderThreshold, $gt: now },
      'gracePeriod.notificationsSent': { $lt: 2 },
    });

    let sent = 0;

    for (const subscription of subscriptionsNeedingReminder) {
      try {
        await this.sendGracePeriodEmail(
          subscription.restaurantId,
          'reminder',
          subscription.gracePeriod!.endsAt!,
          subscription.gracePeriod!.reason!
        );

        await Subscription.updateOne(
          { _id: subscription._id },
          { $inc: { 'gracePeriod.notificationsSent': 1 } }
        );

        sent++;
      } catch (error) {
        logger.error('[GracePeriod] Failed to send reminder', {
          subscriptionId: subscription._id.toString(),
          error,
        });
      }
    }

    return sent;
  },

  // ============================================
  // Email Notifications
  // ============================================

  async sendDowngradeScheduledEmail(
    restaurantId: mongoose.Types.ObjectId,
    newPlan: ISubscriptionPlan,
    effectiveDate: Date,
    impact: DataImpactAnalysis
  ): Promise<void> {
    const restaurant = await Restaurant.findById(restaurantId);
    const owner = await User.findOne({ restaurantId, role: 'owner' });

    if (!restaurant || !owner) {
      return;
    }

    const warningsHtml = impact.warnings
      .map(w => `<li style="color: #92400e; margin-bottom: 8px;">${w}</li>`)
      .join('');

    const losingFeaturesHtml = impact.features.losing
      .map(f => `<li style="color: #dc2626; margin-bottom: 4px;">${f.name}</li>`)
      .join('');

    await emailService.sendEmail({
      to: owner.email,
      subject: `Changement de plan programmé - ${restaurant.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Changement de plan programmé</h2>
          <p>Bonjour ${owner.name},</p>
          <p>Votre demande de changement vers le plan <strong>${newPlan.name}</strong> a été enregistrée.</p>

          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-weight: 600; color: #92400e;">
              📅 Date d'effet : ${effectiveDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          ${impact.warnings.length > 0 ? `
            <h3 style="color: #92400e;">⚠️ Points d'attention</h3>
            <ul style="padding-left: 20px;">${warningsHtml}</ul>
          ` : ''}

          ${impact.features.losing.length > 0 ? `
            <h3 style="color: #dc2626;">Fonctionnalités qui seront désactivées</h3>
            <ul style="padding-left: 20px;">${losingFeaturesHtml}</ul>
          ` : ''}

          <p style="margin-top: 20px;">
            Vous pouvez annuler ce changement à tout moment avant la date d'effet depuis votre espace facturation.
          </p>

          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            L'équipe MenuQR
          </p>
        </div>
      `,
    });
  },

  async sendDowngradeCompletedEmail(
    restaurantId: mongoose.Types.ObjectId,
    fromPlan: ISubscriptionPlan,
    toPlan: ISubscriptionPlan,
    archivedItems: { dishes: number; campaigns: number }
  ): Promise<void> {
    const restaurant = await Restaurant.findById(restaurantId);
    const owner = await User.findOne({ restaurantId, role: 'owner' });

    if (!restaurant || !owner) {
      return;
    }

    await emailService.sendEmail({
      to: owner.email,
      subject: `Votre plan a été modifié - ${restaurant.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Changement de plan effectué</h2>
          <p>Bonjour ${owner.name},</p>
          <p>Votre abonnement est passé du plan <strong>${fromPlan.name}</strong> au plan <strong>${toPlan.name}</strong>.</p>

          ${archivedItems.dishes > 0 || archivedItems.campaigns > 0 ? `
            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px 0; color: #92400e;">Éléments archivés</h3>
              ${archivedItems.dishes > 0 ? `<p style="margin: 4px 0;">📦 ${archivedItems.dishes} plat(s) archivé(s)</p>` : ''}
              ${archivedItems.campaigns > 0 ? `<p style="margin: 4px 0;">📧 ${archivedItems.campaigns} campagne(s) annulée(s)</p>` : ''}
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #78716c;">
                Ces éléments seront restaurés automatiquement si vous repassez à un plan supérieur.
              </p>
            </div>
          ` : ''}

          <p>
            Votre nouveau plan vous donne accès à :
          </p>
          <ul style="padding-left: 20px;">
            ${toPlan.displayFeatures.slice(0, 5).map(f => `<li>${f}</li>`).join('')}
          </ul>

          <p style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/admin/billing"
               style="background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
              Gérer mon abonnement
            </a>
          </p>

          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            L'équipe MenuQR
          </p>
        </div>
      `,
    });
  },

  async sendGracePeriodEmail(
    restaurantId: mongoose.Types.ObjectId,
    type: 'started' | 'reminder' | 'ended',
    endsAt: Date,
    reason?: string
  ): Promise<void> {
    const restaurant = await Restaurant.findById(restaurantId);
    const owner = await User.findOne({ restaurantId, role: 'owner' });

    if (!restaurant || !owner) {
      return;
    }

    const reasonLabels: Record<string, string> = {
      payment_failed: 'un échec de paiement',
      downgrade: 'un changement de plan',
      trial_ended: 'la fin de votre période d\'essai',
    };

    const subjects: Record<string, string> = {
      started: `Action requise : Période de grâce activée`,
      reminder: `Rappel : Votre période de grâce expire bientôt`,
      ended: `Votre période de grâce a expiré`,
    };

    const contents: Record<string, string> = {
      started: `
        <p>Suite à ${reasonLabels[reason || 'payment_failed']}, une période de grâce de ${GRACE_PERIOD_DAYS} jours a été activée.</p>
        <p>Pendant cette période, vous conservez l'accès à toutes vos fonctionnalités.</p>
        <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-weight: 600; color: #92400e;">
            ⏰ Expire le : ${endsAt.toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <p>Veuillez régulariser votre situation pour continuer à profiter de vos services.</p>
      `,
      reminder: `
        <p>Votre période de grâce expire dans moins de 3 jours.</p>
        <div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-weight: 600; color: #dc2626;">
            ⚠️ Expire le : ${endsAt.toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <p>Après cette date, votre compte sera rétrogradé au plan gratuit et certaines fonctionnalités seront désactivées.</p>
      `,
      ended: `
        <p>Votre période de grâce a expiré.</p>
        <p>Votre compte a été rétrogradé au plan gratuit. Certaines fonctionnalités ont été désactivées et des données ont pu être archivées.</p>
        <p>Vous pouvez à tout moment réactiver un plan payant pour restaurer l'accès complet.</p>
      `,
    };

    await emailService.sendEmail({
      to: owner.email,
      subject: `${subjects[type]} - ${restaurant.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">${subjects[type]}</h2>
          <p>Bonjour ${owner.name},</p>
          ${contents[type]}

          <p style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/admin/billing"
               style="background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
              Gérer mon abonnement
            </a>
          </p>

          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            L'équipe MenuQR
          </p>
        </div>
      `,
    });
  },
};

// ============================================
// Helper Functions
// ============================================

function getFeatureImpact(feature: string): string {
  const impacts: Record<string, string> = {
    [FEATURES.LOYALTY_PROGRAM]: 'Les points fidélité seront conservés mais le programme sera suspendu.',
    [FEATURES.RESERVATIONS]: 'Les nouvelles réservations seront désactivées.',
    [FEATURES.SMS_CAMPAIGNS]: 'Les campagnes SMS programmées seront annulées.',
    [FEATURES.DELIVERY_MODULE]: 'Les commandes en livraison ne seront plus possibles.',
    [FEATURES.ADVANCED_ANALYTICS]: 'Les rapports avancés ne seront plus disponibles.',
    [FEATURES.INVENTORY]: 'Le suivi des stocks sera désactivé.',
    [FEATURES.MULTI_LOCATION]: 'Seul l\'établissement principal sera actif.',
  };

  return impacts[feature] || 'Cette fonctionnalité sera désactivée.';
}

async function checkPendingReservations(restaurantId: mongoose.Types.ObjectId): Promise<number> {
  try {
    const { Reservation } = await import('../models/Reservation.js');
    return Reservation.countDocuments({
      restaurantId,
      status: { $in: ['pending', 'confirmed'] },
      date: { $gte: new Date() },
    });
  } catch {
    return 0;
  }
}

async function checkActiveDeliveries(restaurantId: mongoose.Types.ObjectId): Promise<number> {
  try {
    const { Delivery } = await import('../models/Delivery.js');
    return Delivery.countDocuments({
      restaurantId,
      status: { $in: ['pending', 'assigned', 'picked_up', 'in_transit'] },
    });
  } catch {
    return 0;
  }
}

export default downgradeService;
