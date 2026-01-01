/**
 * Stripe Connect Routes - Driver Payouts
 */

import { Router, raw } from 'express';
import {
  startOnboarding,
  getStripeStatus,
  getDashboardLink,
  getEarningsSummary,
  getPayoutHistory,
  adminTransferToDriver,
  adminGetPayoutSummary,
  handleWebhook,
  isStripeEnabled,
} from '../controllers/stripeConnectController.js';
import { authenticateDriver } from '../middleware/auth.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// ============================================
// Public Endpoints
// ============================================

// Check if Stripe is enabled
router.get('/enabled', isStripeEnabled);

// ============================================
// Stripe Webhook (raw body required)
// ============================================

// Note: This needs raw body for signature verification
// Must be registered with raw body parser in main app
router.post('/webhook', raw({ type: 'application/json' }), handleWebhook);

// ============================================
// Driver Self-Service Endpoints
// ============================================

// Start Stripe onboarding
router.post('/driver/onboarding', authenticateDriver, startOnboarding);

// Get Stripe account status
router.get('/driver/status', authenticateDriver, getStripeStatus);

// Get Stripe dashboard link
router.get('/driver/dashboard', authenticateDriver, getDashboardLink);

// Get earnings summary
router.get('/driver/earnings', authenticateDriver, getEarningsSummary);

// Get payout history
router.get('/driver/payouts', authenticateDriver, getPayoutHistory);

// ============================================
// Admin Endpoints
// ============================================

// Transfer to driver (admin only)
router.post(
  '/admin/transfer',
  authenticate,
  authorize('owner', 'admin'),
  adminTransferToDriver
);

// Get payout summary (admin only)
router.get(
  '/admin/summary',
  authenticate,
  authorize('owner', 'admin'),
  adminGetPayoutSummary
);

export default router;
