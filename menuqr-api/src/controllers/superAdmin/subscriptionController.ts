import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SubscriptionPlan, Subscription, Invoice, Restaurant } from '../../models/index.js';

// ==========================================
// SUBSCRIPTION PLANS
// ==========================================

/**
 * GET /superadmin/subscription-plans
 * Get all subscription plans
 */
export const getPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const { active } = req.query;

    const filter: Record<string, unknown> = {};
    if (active === 'true') {filter.isActive = true;}
    if (active === 'false') {filter.isActive = false;}

    const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1, createdAt: 1 });

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
    });
  }
};

/**
 * GET /superadmin/subscription-plans/:id
 * Get a single subscription plan
 */
export const getPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid plan ID' });
      return;
    }

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }

    // Get subscription count for this plan
    const subscriptionCount = await Subscription.countDocuments({ planId: id });

    res.json({
      success: true,
      data: {
        plan,
        subscriptionCount,
      },
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plan',
    });
  }
};

/**
 * POST /superadmin/subscription-plans
 * Create a new subscription plan
 */
export const createPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, features, limits, pricing, trialDays, isActive, isPopular, sortOrder } = req.body;

    if (!name || !description || !pricing) {
      res.status(400).json({
        success: false,
        message: 'Name, description, and pricing are required',
      });
      return;
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existing = await SubscriptionPlan.findOne({ slug });
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'A plan with this name already exists',
      });
      return;
    }

    const plan = new SubscriptionPlan({
      name,
      slug,
      description,
      features: features || [],
      limits: limits || {},
      pricing,
      trialDays: trialDays ?? 14,
      isActive: isActive ?? true,
      isPopular: isPopular ?? false,
      sortOrder: sortOrder ?? 0,
    });

    await plan.save();

    res.status(201).json({
      success: true,
      data: { plan },
      message: 'Plan created successfully',
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription plan',
    });
  }
};

/**
 * PUT /superadmin/subscription-plans/:id
 * Update a subscription plan
 */
export const updatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid plan ID' });
      return;
    }

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }

    // Update allowed fields
    const allowedFields = ['name', 'description', 'features', 'limits', 'pricing', 'trialDays', 'isActive', 'isPopular', 'sortOrder'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (plan as any)[field] = updates[field];
      }
    }

    // Update slug if name changed
    if (updates.name && updates.name !== plan.name) {
      plan.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    await plan.save();

    res.json({
      success: true,
      data: { plan },
      message: 'Plan updated successfully',
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
    });
  }
};

/**
 * DELETE /superadmin/subscription-plans/:id
 * Delete a subscription plan
 */
export const deletePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid plan ID' });
      return;
    }

    // Check if any subscriptions use this plan
    const subscriptionCount = await Subscription.countDocuments({ planId: id });
    if (subscriptionCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete plan: ${subscriptionCount} active subscription(s) use this plan`,
      });
      return;
    }

    const plan = await SubscriptionPlan.findByIdAndDelete(id);
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscription plan',
    });
  }
};

// ==========================================
// SUBSCRIPTIONS
// ==========================================

/**
 * GET /superadmin/subscriptions
 * Get all subscriptions with filtering
 */
export const getSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, planId, search } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {filter.status = status;}
    if (planId) {filter.planId = planId;}

    // Build aggregation pipeline for search
    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      { $unwind: '$restaurant' },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: '$plan' },
    ];

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          'restaurant.name': { $regex: search, $options: 'i' },
        },
      });
    }

    // Add other filters
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    // Add sorting
    pipeline.push({ $sort: { createdAt: -1 } });

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Subscription.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push({ $skip: (pageNum - 1) * limitNum });
    pipeline.push({ $limit: limitNum });

    // Project needed fields
    pipeline.push({
      $project: {
        _id: 1,
        status: 1,
        billingCycle: 1,
        currentPeriodStart: 1,
        currentPeriodEnd: 1,
        trialEndsAt: 1,
        usage: 1,
        createdAt: 1,
        updatedAt: 1,
        restaurant: {
          _id: 1,
          name: 1,
          slug: 1,
          email: 1,
        },
        plan: {
          _id: 1,
          name: 1,
          slug: 1,
          pricing: 1,
        },
      },
    });

    const subscriptions = await Subscription.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
    });
  }
};

/**
 * GET /superadmin/subscriptions/:id
 * Get a single subscription with details
 */
export const getSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid subscription ID' });
      return;
    }

    const subscription = await Subscription.findById(id)
      .populate('restaurantId', 'name slug email phone')
      .populate('planId', 'name slug pricing limits');

    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    // Get invoice history
    const invoices = await Invoice.find({ subscriptionId: id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        subscription,
        invoices,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
    });
  }
};

/**
 * PUT /superadmin/subscriptions/:id
 * Update a subscription (change plan, status, etc.)
 */
export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { planId, status, billingCycle, currentPeriodEnd } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid subscription ID' });
      return;
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    // Update fields
    if (planId) {
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        res.status(400).json({ success: false, message: 'Invalid plan ID' });
        return;
      }
      subscription.planId = new mongoose.Types.ObjectId(planId);
    }

    if (status) {subscription.status = status;}
    if (billingCycle) {subscription.billingCycle = billingCycle;}
    if (currentPeriodEnd) {subscription.currentPeriodEnd = new Date(currentPeriodEnd);}

    await subscription.save();

    const updated = await Subscription.findById(id)
      .populate('restaurantId', 'name slug')
      .populate('planId', 'name slug pricing');

    res.json({
      success: true,
      data: { subscription: updated },
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
    });
  }
};

/**
 * POST /superadmin/subscriptions/:id/extend
 * Extend a subscription period
 */
export const extendSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { days, reason: _reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid subscription ID' });
      return;
    }

    if (!days || days < 1) {
      res.status(400).json({ success: false, message: 'Days must be at least 1' });
      return;
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    // Extend the period
    const currentEnd = new Date(subscription.currentPeriodEnd);
    currentEnd.setDate(currentEnd.getDate() + parseInt(days, 10));
    subscription.currentPeriodEnd = currentEnd;

    // If in trial, extend trial too
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      const trialEnd = new Date(subscription.trialEndsAt);
      trialEnd.setDate(trialEnd.getDate() + parseInt(days, 10));
      subscription.trialEndsAt = trialEnd;
    }

    // Reactivate if expired
    if (subscription.status === 'expired') {
      subscription.status = 'active';
    }

    await subscription.save();

    res.json({
      success: true,
      data: { subscription },
      message: `Subscription extended by ${days} days`,
    });
  } catch (error) {
    console.error('Extend subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend subscription',
    });
  }
};

/**
 * POST /superadmin/subscriptions/create
 * Create a subscription for a restaurant
 */
export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId, planId, billingCycle = 'monthly', status = 'trial' } = req.body;

    if (!restaurantId || !planId) {
      res.status(400).json({
        success: false,
        message: 'Restaurant ID and Plan ID are required',
      });
      return;
    }

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    // Check if subscription already exists
    const existing = await Subscription.findOne({ restaurantId });
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Restaurant already has a subscription',
      });
      return;
    }

    // Get plan for trial days
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    const trialEnd = new Date(now);

    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

    const subscription = new Subscription({
      restaurantId,
      planId,
      status,
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: status === 'trial' ? trialEnd : undefined,
      usage: {
        dishes: 0,
        orders: 0,
        smsCredits: 0,
        storage: 0,
        campaigns: 0,
        lastResetAt: now,
      },
    });

    await subscription.save();

    const created = await Subscription.findById(subscription._id)
      .populate('restaurantId', 'name slug')
      .populate('planId', 'name slug pricing');

    res.status(201).json({
      success: true,
      data: { subscription: created },
      message: 'Subscription created successfully',
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
    });
  }
};

// ==========================================
// INVOICES
// ==========================================

/**
 * GET /superadmin/invoices
 * Get all invoices with filtering
 */
export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, restaurantId } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {filter.status = status;}
    if (restaurantId) {filter.restaurantId = restaurantId;}

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('restaurantId', 'name slug')
        .populate('planId', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
    });
  }
};

/**
 * GET /superadmin/invoices/:id
 * Get a single invoice
 */
export const getInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' });
      return;
    }

    const invoice = await Invoice.findById(id)
      .populate('restaurantId', 'name slug email phone address')
      .populate('subscriptionId')
      .populate('planId', 'name slug');

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    res.json({
      success: true,
      data: { invoice },
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
    });
  }
};

/**
 * PUT /superadmin/invoices/:id/status
 * Update invoice status (mark as paid, failed, etc.)
 */
export const updateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, paymentMethod, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' });
      return;
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    invoice.status = status;
    if (status === 'paid') {
      invoice.paidAt = new Date();
      if (paymentMethod) {invoice.paymentMethod = paymentMethod;}

      // Update subscription status if needed
      await Subscription.findByIdAndUpdate(invoice.subscriptionId, {
        status: 'active',
        lastPaymentAt: new Date(),
      });
    }

    if (notes) {invoice.notes = notes;}

    await invoice.save();

    res.json({
      success: true,
      data: { invoice },
      message: 'Invoice status updated successfully',
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice status',
    });
  }
};

/**
 * GET /superadmin/subscriptions/stats
 * Get subscription statistics
 */
export const getSubscriptionStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      planDistribution,
      monthlyRevenue,
    ] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'trial' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.aggregate([
        { $group: { _id: '$planId', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: '_id',
            foreignField: '_id',
            as: 'plan',
          },
        },
        { $unwind: '$plan' },
        { $project: { planName: '$plan.name', count: 1 } },
      ]),
      Invoice.aggregate([
        {
          $match: {
            status: 'paid',
            paidAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        cancelledSubscriptions,
        churnRate: totalSubscriptions > 0 ? ((cancelledSubscriptions / totalSubscriptions) * 100).toFixed(2) : 0,
        planDistribution,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription statistics',
    });
  }
};
