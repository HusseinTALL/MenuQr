import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Campaign, Customer, Restaurant } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { sendCampaignMessages } from '../services/campaignService.js';
import { subscriptionService } from '../services/subscriptionService.js';

/**
 * Create a new campaign (draft)
 * POST /api/v1/campaigns
 */
export const createCampaign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { name, message, scheduledAt } = req.body;

  // Get restaurant
  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  // Count customers to show preview
  const customerCount = await Customer.countDocuments({
    restaurantId: restaurant._id,
    isActive: true,
  });

  if (customerCount === 0) {
    throw new ApiError(400, 'No active customers to send campaign to');
  }

  const campaign = await Campaign.create({
    restaurantId: restaurant._id,
    name,
    message,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    status: 'draft',
    stats: {
      totalRecipients: customerCount,
      sent: 0,
      success: 0,
      failed: 0,
    },
    createdBy: user._id,
  });

  // Track campaign usage for subscription
  try {
    await subscriptionService.incrementUsage(
      new mongoose.Types.ObjectId(restaurant._id.toString()),
      'campaigns'
    );
  } catch (usageError) {
    console.error('Failed to track campaign usage:', usageError);
    // Don't fail the request if usage tracking fails
  }

  res.status(201).json({
    success: true,
    message: 'Campaign created successfully',
    data: {
      campaign,
      estimatedRecipients: customerCount,
    },
  });
});

/**
 * Get all campaigns for the restaurant
 * GET /api/v1/campaigns
 */
export const getCampaigns = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { status, page = 1, limit = 20 } = req.query;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const query: Record<string, unknown> = { restaurantId: restaurant._id };
  if (status) {
    query.status = status;
  }

  const campaigns = await Campaign.find(query)
    .select('-recipients')
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Campaign.countDocuments(query);

  res.json({
    success: true,
    data: {
      campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * Get single campaign with full details
 * GET /api/v1/campaigns/:id
 */
export const getCampaignById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const campaign = await Campaign.findOne({
    _id: id,
    restaurantId: restaurant._id,
  });

  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  res.json({
    success: true,
    data: campaign,
  });
});

/**
 * Update a draft campaign
 * PUT /api/v1/campaigns/:id
 */
export const updateCampaign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { name, message, scheduledAt } = req.body;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const campaign = await Campaign.findOne({
    _id: id,
    restaurantId: restaurant._id,
  });

  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  // Only allow updating draft or scheduled campaigns
  if (!['draft', 'scheduled'].includes(campaign.status)) {
    throw new ApiError(400, 'Cannot update campaign that is already being sent or completed');
  }

  if (name) {campaign.name = name;}
  if (message) {campaign.message = message;}
  if (scheduledAt !== undefined) {
    campaign.scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
  }

  await campaign.save();

  res.json({
    success: true,
    message: 'Campaign updated successfully',
    data: campaign,
  });
});

/**
 * Delete a campaign
 * DELETE /api/v1/campaigns/:id
 */
export const deleteCampaign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const campaign = await Campaign.findOne({
    _id: id,
    restaurantId: restaurant._id,
  });

  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  // Prevent deleting campaigns that are currently sending
  if (campaign.status === 'sending') {
    throw new ApiError(400, 'Cannot delete campaign while it is being sent');
  }

  await campaign.deleteOne();

  res.json({
    success: true,
    message: 'Campaign deleted successfully',
  });
});

/**
 * Send a campaign (immediately or scheduled)
 * POST /api/v1/campaigns/:id/send
 */
export const sendCampaign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { scheduledAt } = req.body || {};

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const campaign = await Campaign.findOne({
    _id: id,
    restaurantId: restaurant._id,
  });

  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  if (!['draft', 'scheduled'].includes(campaign.status)) {
    throw new ApiError(400, 'Campaign has already been sent or is being sent');
  }

  // Get all active customers
  const customers = await Customer.find({
    restaurantId: restaurant._id,
    isActive: true,
  }).select('_id phone');

  if (customers.length === 0) {
    throw new ApiError(400, 'No active customers to send campaign to');
  }

  // Populate recipients
  campaign.recipients = customers.map((customer) => ({
    customerId: customer._id,
    phone: customer.phone,
    status: 'pending' as const,
  }));

  campaign.stats.totalRecipients = customers.length;

  // Determine if scheduled or immediate
  if (scheduledAt) {
    campaign.scheduledAt = new Date(scheduledAt);
    campaign.status = 'scheduled';
    await campaign.save();

    res.json({
      success: true,
      message: `Campaign scheduled for ${campaign.scheduledAt.toISOString()}`,
      data: {
        campaign: {
          _id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          scheduledAt: campaign.scheduledAt,
          stats: campaign.stats,
        },
      },
    });
  } else {
    // Send immediately
    campaign.status = 'sending';
    campaign.startedAt = new Date();
    await campaign.save();

    // Start sending in background (non-blocking)
    sendCampaignMessages(campaign._id, restaurant.name).catch((error) => {
      console.error(`Campaign ${campaign._id} sending failed:`, error);
    });

    res.json({
      success: true,
      message: 'Campaign sending started',
      data: {
        campaign: {
          _id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          stats: campaign.stats,
        },
      },
    });
  }
});

/**
 * Cancel a scheduled campaign
 * POST /api/v1/campaigns/:id/cancel
 */
export const cancelCampaign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const campaign = await Campaign.findOne({
    _id: id,
    restaurantId: restaurant._id,
  });

  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  if (campaign.status !== 'scheduled') {
    throw new ApiError(400, 'Only scheduled campaigns can be cancelled');
  }

  campaign.status = 'cancelled';
  await campaign.save();

  res.json({
    success: true,
    message: 'Campaign cancelled successfully',
    data: campaign,
  });
});

/**
 * Get aggregate campaign statistics
 * GET /api/v1/campaigns/stats
 */
export const getCampaignStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const stats = await Campaign.aggregate([
    { $match: { restaurantId: restaurant._id } },
    {
      $group: {
        _id: null,
        totalCampaigns: { $sum: 1 },
        completedCampaigns: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        totalMessagesSent: { $sum: '$stats.sent' },
        totalSuccess: { $sum: '$stats.success' },
        totalFailed: { $sum: '$stats.failed' },
      },
    },
  ]);

  const statusCounts = await Campaign.aggregate([
    { $match: { restaurantId: restaurant._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      summary: stats[0] || {
        totalCampaigns: 0,
        completedCampaigns: 0,
        totalMessagesSent: 0,
        totalSuccess: 0,
        totalFailed: 0,
      },
      statusCounts: statusCounts.reduce(
        (acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  });
});
