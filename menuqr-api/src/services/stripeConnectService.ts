/**
 * Stripe Connect Service - Driver Payouts
 * Handles connected accounts, transfers, and payouts for delivery drivers
 */

import Stripe from 'stripe';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { DriverPayout } from '../models/DriverPayout.js';
import mongoose from 'mongoose';

// ============================================
// Types
// ============================================

export interface CreateConnectedAccountParams {
  driverId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: {
    day: number;
    month: number;
    year: number;
  };
  address?: {
    line1: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface OnboardingResult {
  success: boolean;
  accountId?: string;
  onboardingUrl?: string;
  message: string;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  amount?: number;
  message: string;
}

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  amount?: number;
  arrivalDate?: Date;
  message: string;
}

export interface AccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

// ============================================
// Service Class
// ============================================

class StripeConnectService {
  private stripe: Stripe | null = null;
  private enabled: boolean;
  private platformFeePercent: number;
  private currency: string;
  private country: string;

  constructor() {
    this.enabled = config.stripe.connectEnabled;
    this.platformFeePercent = config.stripe.platformFeePercent;
    this.currency = config.stripe.currency;
    this.country = config.stripe.country;

    if (this.enabled && config.stripe.secretKey) {
      this.stripe = new Stripe(config.stripe.secretKey);
      logger.info('Stripe Connect service initialized');
    } else {
      logger.warn('Stripe Connect service not configured - driver payouts disabled');
    }
  }

  /**
   * Check if Stripe Connect is available
   */
  isEnabled(): boolean {
    return this.enabled && this.stripe !== null;
  }

  /**
   * Create a Stripe Connect account for a driver
   */
  async createConnectedAccount(
    params: CreateConnectedAccountParams
  ): Promise<OnboardingResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        message: 'Service de paiement non disponible',
      };
    }

    try {
      // Create Express connected account
      const account = await this.stripe!.accounts.create({
        type: 'express',
        country: this.country,
        email: params.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: params.firstName,
          last_name: params.lastName,
          email: params.email,
          phone: params.phone,
          dob: params.dateOfBirth,
          address: params.address ? {
            line1: params.address.line1,
            city: params.address.city,
            postal_code: params.address.postalCode,
            country: params.address.country || this.country,
          } : undefined,
        },
        metadata: {
          driverId: params.driverId,
        },
      });

      // Update driver with Stripe account ID
      await DeliveryDriver.findByIdAndUpdate(params.driverId, {
        stripeAccountId: account.id,
        stripeOnboardingComplete: false,
      });

      logger.info(`Stripe Connect account created: ${account.id} for driver ${params.driverId}`);

      return {
        success: true,
        accountId: account.id,
        message: 'Compte Stripe créé avec succès',
      };
    } catch (error) {
      logger.error('Error creating Stripe Connect account:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la création du compte',
      };
    }
  }

  /**
   * Generate onboarding link for a driver to complete their Stripe account setup
   */
  async createOnboardingLink(
    driverId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<OnboardingResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        message: 'Service de paiement non disponible',
      };
    }

    try {
      const driver = await DeliveryDriver.findById(driverId);

      if (!driver) {
        return { success: false, message: 'Livreur non trouvé' };
      }

      let accountId = driver.stripeAccountId;

      // Create account if doesn't exist
      if (!accountId) {
        const result = await this.createConnectedAccount({
          driverId,
          email: driver.email,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phone: driver.phone,
        });

        if (!result.success || !result.accountId) {
          return result;
        }

        accountId = result.accountId;
      }

      // Create account link for onboarding
      const accountLink = await this.stripe!.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return {
        success: true,
        accountId,
        onboardingUrl: accountLink.url,
        message: 'Lien d\'onboarding généré',
      };
    } catch (error) {
      logger.error('Error creating onboarding link:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la génération du lien',
      };
    }
  }

  /**
   * Generate login link for driver to access their Stripe dashboard
   */
  async createDashboardLink(driverId: string): Promise<{ success: boolean; url?: string; message: string }> {
    if (!this.isEnabled()) {
      return { success: false, message: 'Service de paiement non disponible' };
    }

    try {
      const driver = await DeliveryDriver.findById(driverId);

      if (!driver?.stripeAccountId) {
        return { success: false, message: 'Compte Stripe non configuré' };
      }

      const loginLink = await this.stripe!.accounts.createLoginLink(driver.stripeAccountId);

      return {
        success: true,
        url: loginLink.url,
        message: 'Lien du tableau de bord généré',
      };
    } catch (error) {
      logger.error('Error creating dashboard link:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur',
      };
    }
  }

  /**
   * Get driver's Stripe account status
   */
  async getAccountStatus(driverId: string): Promise<AccountStatus | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const driver = await DeliveryDriver.findById(driverId);

      if (!driver?.stripeAccountId) {
        return null;
      }

      const account = await this.stripe!.accounts.retrieve(driver.stripeAccountId);

      // Update driver's onboarding status
      if (account.details_submitted && !driver.stripeOnboardingComplete) {
        await DeliveryDriver.findByIdAndUpdate(driverId, {
          stripeOnboardingComplete: true,
        });
      }

      return {
        accountId: account.id,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        requiresAction: (account.requirements?.currently_due?.length || 0) > 0,
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          eventuallyDue: account.requirements?.eventually_due || [],
          pastDue: account.requirements?.past_due || [],
        },
      };
    } catch (error) {
      logger.error('Error getting account status:', error);
      return null;
    }
  }

  /**
   * Transfer funds to a driver's connected account
   * This is used when a delivery is completed
   */
  async transferToDriver(
    driverId: string,
    amountCents: number,
    deliveryId: string,
    description: string
  ): Promise<TransferResult> {
    if (!this.isEnabled()) {
      return { success: false, message: 'Service de paiement non disponible' };
    }

    try {
      const driver = await DeliveryDriver.findById(driverId);

      if (!driver?.stripeAccountId) {
        return { success: false, message: 'Compte Stripe non configuré pour ce livreur' };
      }

      // Check if account is ready for transfers
      const status = await this.getAccountStatus(driverId);
      if (!status?.chargesEnabled) {
        return { success: false, message: 'Le compte Stripe n\'est pas encore activé' };
      }

      // Calculate platform fee
      const platformFee = Math.round(amountCents * (this.platformFeePercent / 100));
      const driverAmount = amountCents - platformFee;

      // Create transfer
      const transfer = await this.stripe!.transfers.create({
        amount: driverAmount,
        currency: this.currency,
        destination: driver.stripeAccountId,
        description,
        metadata: {
          driverId,
          deliveryId,
          platformFee: platformFee.toString(),
          originalAmount: amountCents.toString(),
        },
      });

      // Record payout in database
      const now = new Date();
      await DriverPayout.create({
        driverId: new mongoose.Types.ObjectId(driverId),
        payoutNumber: `PAY-${Date.now()}`,
        type: 'instant',
        status: 'completed',
        periodStart: now,
        periodEnd: now,
        grossAmount: amountCents,
        breakdown: {
          deliveryFees: driverAmount,
          distanceBonuses: 0,
          waitTimeBonuses: 0,
          peakHourBonuses: 0,
          tips: 0,
          incentiveBonuses: 0,
          referralBonuses: 0,
          adjustments: 0,
          deductions: platformFee,
        },
        netAmount: driverAmount,
        currency: this.currency,
        deliveryCount: 1,
        deliveries: [{
          deliveryId: new mongoose.Types.ObjectId(deliveryId),
          deliveryNumber: deliveryId,
          completedAt: now,
          earnings: driverAmount,
          tip: 0,
        }],
        shiftIds: [],
        adjustments: [],
        paymentMethod: 'instant',
        processedAt: now,
        transactionId: transfer.id,
        retryCount: 0,
      });

      logger.info(`Transfer completed: ${transfer.id} - ${driverAmount} cents to driver ${driverId}`);

      return {
        success: true,
        transferId: transfer.id,
        amount: driverAmount,
        message: 'Transfert effectué avec succès',
      };
    } catch (error) {
      logger.error('Error transferring to driver:', error);

      // Record failed payout
      const now = new Date();
      await DriverPayout.create({
        driverId: new mongoose.Types.ObjectId(driverId),
        payoutNumber: `PAY-${Date.now()}`,
        type: 'instant',
        status: 'failed',
        periodStart: now,
        periodEnd: now,
        grossAmount: amountCents,
        breakdown: {
          deliveryFees: amountCents,
          distanceBonuses: 0,
          waitTimeBonuses: 0,
          peakHourBonuses: 0,
          tips: 0,
          incentiveBonuses: 0,
          referralBonuses: 0,
          adjustments: 0,
          deductions: 0,
        },
        netAmount: amountCents,
        currency: this.currency,
        deliveryCount: 1,
        deliveries: [{
          deliveryId: new mongoose.Types.ObjectId(deliveryId),
          deliveryNumber: deliveryId,
          completedAt: now,
          earnings: amountCents,
          tip: 0,
        }],
        shiftIds: [],
        adjustments: [],
        paymentMethod: 'instant',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors du transfert',
      };
    }
  }

  /**
   * Process batch payout to multiple drivers
   */
  async processBatchPayout(
    payouts: Array<{ driverId: string; amountCents: number; description: string }>
  ): Promise<{ successful: number; failed: number; results: TransferResult[] }> {
    const results: TransferResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const payout of payouts) {
      const result = await this.transferToDriver(
        payout.driverId,
        payout.amountCents,
        'batch_payout',
        payout.description
      );

      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { successful, failed, results };
  }

  /**
   * Get driver's payout history
   */
  async getDriverPayoutHistory(
    driverId: string,
    options: { page?: number; limit?: number; startDate?: Date; endDate?: Date } = {}
  ) {
    const { page = 1, limit = 20, startDate, endDate } = options;

    const query: Record<string, unknown> = { driverId: new mongoose.Types.ObjectId(driverId) };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {(query.createdAt as Record<string, Date>).$gte = startDate;}
      if (endDate) {(query.createdAt as Record<string, Date>).$lte = endDate;}
    }

    const [payouts, total] = await Promise.all([
      DriverPayout.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('driverId', 'firstName lastName email'),
      DriverPayout.countDocuments(query),
    ]);

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get driver's earnings summary
   */
  async getDriverEarningsSummary(driverId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const driverObjectId = new mongoose.Types.ObjectId(driverId);

    const [today, thisWeek, thisMonth, allTime] = await Promise.all([
      DriverPayout.aggregate([
        { $match: { driverId: driverObjectId, status: 'completed', createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      DriverPayout.aggregate([
        { $match: { driverId: driverObjectId, status: 'completed', createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      DriverPayout.aggregate([
        { $match: { driverId: driverObjectId, status: 'completed', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      DriverPayout.aggregate([
        { $match: { driverId: driverObjectId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      today: { amount: today[0]?.total || 0, deliveries: today[0]?.count || 0 },
      thisWeek: { amount: thisWeek[0]?.total || 0, deliveries: thisWeek[0]?.count || 0 },
      thisMonth: { amount: thisMonth[0]?.total || 0, deliveries: thisMonth[0]?.count || 0 },
      allTime: { amount: allTime[0]?.total || 0, deliveries: allTime[0]?.count || 0 },
      currency: this.currency,
    };
  }

  /**
   * Get pending balance for a driver
   */
  async getDriverPendingBalance(driverId: string): Promise<number> {
    const result = await DriverPayout.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const driverId = account.metadata?.driverId;

        if (driverId) {
          await DeliveryDriver.findByIdAndUpdate(driverId, {
            stripeOnboardingComplete: account.details_submitted,
            stripePayoutsEnabled: account.payouts_enabled,
          });
          logger.info(`Driver ${driverId} Stripe account updated`);
        }
        break;
      }

      case 'transfer.created':
      case 'transfer.updated': {
        const transfer = event.data.object as Stripe.Transfer;
        const deliveryId = transfer.metadata?.deliveryId;

        if (deliveryId) {
          await DriverPayout.findOneAndUpdate(
            { stripeTransferId: transfer.id },
            { status: transfer.reversed ? 'reversed' : 'completed' }
          );
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        logger.info(`Payout ${payout.id} paid to bank account`);
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        logger.error(`Payout ${payout.id} failed: ${payout.failure_message}`);
        break;
      }

      default:
        // Handle transfer.failed (valid Stripe event but not in TS types)
        if ((event.type as string) === 'transfer.failed') {
          const transfer = (event as unknown as Stripe.TransferCreatedEvent).data.object;
          await DriverPayout.findOneAndUpdate(
            { stripeTransferId: transfer.id },
            { status: 'failed' }
          );
        } else {
          logger.debug(`Unhandled Stripe event type: ${event.type}`);
        }
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event | null {
    if (!this.stripe || !config.stripe.webhookSecret) {
      return null;
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      return null;
    }
  }

  /**
   * Get Stripe publishable key for frontend
   */
  getPublishableKey(): string {
    return config.stripe.publishableKey;
  }
}

// Export singleton instance
export const stripeConnectService = new StripeConnectService();
export default stripeConnectService;
