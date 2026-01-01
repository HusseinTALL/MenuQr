/**
 * Stripe Connect Controller
 * Handles driver onboarding, payouts, and earnings
 */

import { Request, Response } from 'express';
import { stripeConnectService } from '../services/stripeConnectService.js';
import { logger } from '../utils/logger.js';

// ============================================
// Driver Endpoints (Driver Self-Service)
// ============================================

/**
 * Start Stripe onboarding for driver
 * POST /api/driver/stripe/onboarding
 */
export const startOnboarding = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.driverId;
    const { returnUrl, refreshUrl: _refreshUrl } = req.body;

    if (!driverId) {
      res.status(401).json({
        success: false,
        message: 'Authentification livreur requise',
      });
      return;
    }

    const baseUrl = returnUrl || `${req.protocol}://${req.get('host')}`;

    const result = await stripeConnectService.createOnboardingLink(
      driverId,
      `${baseUrl}/driver/stripe/return`,
      `${baseUrl}/driver/stripe/refresh`
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('Error in startOnboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initialisation de l\'onboarding',
    });
  }
};

/**
 * Get driver's Stripe account status
 * GET /api/driver/stripe/status
 */
export const getStripeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.driverId;

    if (!driverId) {
      res.status(401).json({
        success: false,
        message: 'Authentification livreur requise',
      });
      return;
    }

    const status = await stripeConnectService.getAccountStatus(driverId);

    if (!status) {
      res.json({
        success: true,
        data: {
          hasAccount: false,
          message: 'Aucun compte Stripe configuré',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        hasAccount: true,
        ...status,
      },
    });
  } catch (error) {
    logger.error('Error in getStripeStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
    });
  }
};

/**
 * Get Stripe dashboard login link
 * GET /api/driver/stripe/dashboard
 */
export const getDashboardLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.driverId;

    if (!driverId) {
      res.status(401).json({
        success: false,
        message: 'Authentification livreur requise',
      });
      return;
    }

    const result = await stripeConnectService.createDashboardLink(driverId);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('Error in getDashboardLink:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du lien',
    });
  }
};

/**
 * Get driver's earnings summary
 * GET /api/driver/stripe/earnings
 */
export const getEarningsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.driverId;

    if (!driverId) {
      res.status(401).json({
        success: false,
        message: 'Authentification livreur requise',
      });
      return;
    }

    const summary = await stripeConnectService.getDriverEarningsSummary(driverId);
    const pendingBalance = await stripeConnectService.getDriverPendingBalance(driverId);

    res.json({
      success: true,
      data: {
        ...summary,
        pendingBalance,
      },
    });
  } catch (error) {
    logger.error('Error in getEarningsSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des gains',
    });
  }
};

/**
 * Get driver's payout history
 * GET /api/driver/stripe/payouts
 */
export const getPayoutHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.driverId;
    const { page = '1', limit = '20', startDate, endDate } = req.query;

    if (!driverId) {
      res.status(401).json({
        success: false,
        message: 'Authentification livreur requise',
      });
      return;
    }

    const result = await stripeConnectService.getDriverPayoutHistory(driverId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({
      success: true,
      data: result.payouts,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error in getPayoutHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
    });
  }
};

// ============================================
// Admin Endpoints
// ============================================

/**
 * Admin: Transfer to driver after delivery completion
 * POST /api/admin/stripe/transfer
 */
export const adminTransferToDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driverId, amountCents, deliveryId, description } = req.body;

    if (!driverId || !amountCents || !deliveryId) {
      res.status(400).json({
        success: false,
        message: 'driverId, amountCents et deliveryId sont requis',
      });
      return;
    }

    const result = await stripeConnectService.transferToDriver(
      driverId,
      amountCents,
      deliveryId,
      description || 'Paiement livraison'
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('Error in adminTransferToDriver:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du transfert',
    });
  }
};

/**
 * Admin: Get all drivers' payout summary
 * GET /api/admin/stripe/summary
 */
export const adminGetPayoutSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    // This would typically aggregate across all drivers
    // For now, return a placeholder
    res.json({
      success: true,
      data: {
        message: 'Not implemented yet',
        startDate,
        endDate,
      },
    });
  } catch (error) {
    logger.error('Error in adminGetPayoutSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur',
    });
  }
};

// ============================================
// Webhook Endpoint
// ============================================

/**
 * Handle Stripe webhooks
 * POST /api/stripe/webhook
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({ success: false, message: 'No signature' });
      return;
    }

    const event = stripeConnectService.verifyWebhookSignature(
      req.body, // Must be raw body
      signature
    );

    if (!event) {
      res.status(400).json({ success: false, message: 'Invalid signature' });
      return;
    }

    await stripeConnectService.handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).json({ success: false, message: 'Webhook error' });
  }
};

/**
 * Check if Stripe Connect is enabled
 * GET /api/stripe/enabled
 */
export const isStripeEnabled = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    enabled: stripeConnectService.isEnabled(),
    publishableKey: stripeConnectService.getPublishableKey(),
  });
};
