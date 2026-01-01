/**
 * Subscription Routes
 *
 * API endpoints for subscription management, feature access, and usage tracking.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import subscriptionController from '../controllers/subscriptionController.js';

const router = Router();

// ============================================
// Public Routes (no auth required)
// ============================================

/**
 * @swagger
 * /api/v1/subscription/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of subscription plans
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /api/v1/subscription/plans/{slug}:
 *   get:
 *     summary: Get a specific plan by slug
 *     tags: [Subscription]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan details
 *       404:
 *         description: Plan not found
 */
router.get('/plans/:slug', subscriptionController.getPlanBySlug);

// ============================================
// Authenticated Routes
// ============================================

/**
 * @swagger
 * /api/v1/subscription/current:
 *   get:
 *     summary: Get current restaurant's subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 *       404:
 *         description: No subscription found
 */
router.get('/current', authenticate, subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /api/v1/subscription/features:
 *   get:
 *     summary: Get available features for current subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available features
 */
router.get('/features', authenticate, subscriptionController.getAvailableFeatures);

/**
 * @swagger
 * /api/v1/subscription/check-feature:
 *   post:
 *     summary: Check if a specific feature is available
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feature
 *             properties:
 *               feature:
 *                 type: string
 *                 description: Feature key to check
 *     responses:
 *       200:
 *         description: Feature access status
 */
router.post('/check-feature', authenticate, subscriptionController.checkFeature);

/**
 * @swagger
 * /api/v1/subscription/check-features:
 *   post:
 *     summary: Check multiple features at once
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - features
 *             properties:
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Feature access statuses
 */
router.post('/check-features', authenticate, subscriptionController.checkFeatures);

// ============================================
// Usage Tracking Routes
// ============================================

/**
 * @swagger
 * /api/v1/subscription/usage:
 *   get:
 *     summary: Get usage summary for current subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage summary for all resources
 */
router.get('/usage', authenticate, subscriptionController.getUsageSummary);

/**
 * @swagger
 * /api/v1/subscription/usage/{resource}:
 *   get:
 *     summary: Get usage for a specific resource
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *           enum: [dishes, orders, users, smsCredits, storage, tables, campaigns, locations]
 *     responses:
 *       200:
 *         description: Resource usage details
 */
router.get('/usage/:resource', authenticate, subscriptionController.getResourceUsage);

// ============================================
// Plan Change Routes (Owner only)
// ============================================

/**
 * @swagger
 * /api/v1/subscription/preview-upgrade:
 *   post:
 *     summary: Preview upgrade to a new plan
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planSlug
 *             properties:
 *               planSlug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Upgrade preview with new features
 */
router.post(
  '/preview-upgrade',
  authenticate,
  authorize('owner'),
  subscriptionController.previewUpgrade
);

/**
 * @swagger
 * /api/v1/subscription/preview-downgrade:
 *   post:
 *     summary: Preview downgrade to a lower plan
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planSlug
 *             properties:
 *               planSlug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Downgrade preview with lost features
 */
router.post(
  '/preview-downgrade',
  authenticate,
  authorize('owner'),
  subscriptionController.previewDowngrade
);

/**
 * @swagger
 * /api/v1/subscription/change-plan:
 *   post:
 *     summary: Change subscription plan
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *               immediate:
 *                 type: boolean
 *                 description: Apply change immediately instead of at next billing cycle
 *     responses:
 *       200:
 *         description: Plan change confirmation
 */
router.post(
  '/change-plan',
  authenticate,
  authorize('owner'),
  subscriptionController.changePlan
);

/**
 * @swagger
 * /api/v1/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Cancellation confirmation
 */
router.post(
  '/cancel',
  authenticate,
  authorize('owner'),
  subscriptionController.cancelSubscription
);

/**
 * @swagger
 * /api/v1/subscription/reactivate:
 *   post:
 *     summary: Reactivate a cancelled subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reactivation confirmation
 */
router.post(
  '/reactivate',
  authenticate,
  authorize('owner'),
  subscriptionController.reactivateSubscription
);

// ============================================
// Downgrade Handling Routes (Owner only)
// ============================================

/**
 * @swagger
 * /api/v1/subscription/analyze-downgrade:
 *   post:
 *     summary: Analyze impact of downgrading to a specific plan
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planSlug
 *             properties:
 *               planSlug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Detailed downgrade impact analysis
 */
router.post(
  '/analyze-downgrade',
  authenticate,
  authorize('owner'),
  subscriptionController.analyzeDowngrade
);

/**
 * @swagger
 * /api/v1/subscription/schedule-downgrade:
 *   post:
 *     summary: Schedule a downgrade for end of billing period
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planSlug
 *             properties:
 *               planSlug:
 *                 type: string
 *               reason:
 *                 type: string
 *               immediate:
 *                 type: boolean
 *                 description: Apply downgrade immediately
 *     responses:
 *       200:
 *         description: Downgrade scheduled successfully
 *       400:
 *         description: Downgrade blocked due to active deliveries or other issues
 */
router.post(
  '/schedule-downgrade',
  authenticate,
  authorize('owner'),
  subscriptionController.scheduleDowngrade
);

/**
 * @swagger
 * /api/v1/subscription/cancel-scheduled-downgrade:
 *   post:
 *     summary: Cancel a pending scheduled downgrade
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduled downgrade cancelled
 *       400:
 *         description: No pending downgrade to cancel
 */
router.post(
  '/cancel-scheduled-downgrade',
  authenticate,
  authorize('owner'),
  subscriptionController.cancelScheduledDowngrade
);

/**
 * @swagger
 * /api/v1/subscription/pending-changes:
 *   get:
 *     summary: Get pending subscription changes
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending change details if any
 */
router.get(
  '/pending-changes',
  authenticate,
  subscriptionController.getPendingChanges
);

/**
 * @swagger
 * /api/v1/subscription/grace-period:
 *   get:
 *     summary: Get grace period status
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grace period status and details
 */
router.get(
  '/grace-period',
  authenticate,
  subscriptionController.getGracePeriodStatus
);

/**
 * @swagger
 * /api/v1/subscription/downgrade-history:
 *   get:
 *     summary: Get history of past downgrades
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of past downgrades with archived items
 */
router.get(
  '/downgrade-history',
  authenticate,
  subscriptionController.getDowngradeHistory
);

export default router;
