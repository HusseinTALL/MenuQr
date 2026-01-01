import mongoose from 'mongoose';
import { Campaign } from '../models/index.js';
import { smsService } from './smsService.js';
import { logger } from '../utils/logger.js';
import { subscriptionService } from './subscriptionService.js';

/**
 * Send campaign messages to all recipients
 * This runs asynchronously in the background
 */
export async function sendCampaignMessages(
  campaignId: mongoose.Types.ObjectId,
  restaurantName: string
): Promise<void> {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  logger.info(`[Campaign] Starting to send messages`, { campaignId: campaignId.toString(), recipientCount: campaign.recipients.length });

  // Prefix message with restaurant name
  const fullMessage = `[${restaurantName}] ${campaign.message}`;

  for (let i = 0; i < campaign.recipients.length; i++) {
    const recipient = campaign.recipients[i];

    if (recipient.status !== 'pending') {
      continue; // Skip already processed
    }

    try {
      const result = await smsService.sendSMS(recipient.phone, fullMessage);

      if (result.success) {
        recipient.status = 'sent';
        recipient.sentAt = new Date();
        campaign.stats.success += 1;
      } else {
        recipient.status = 'failed';
        recipient.error = result.error || 'Unknown error';
        campaign.stats.failed += 1;
      }
      campaign.stats.sent += 1;

      // Save progress every 10 messages or at the end
      if ((i + 1) % 10 === 0 || i === campaign.recipients.length - 1) {
        await campaign.save();
      }

      // Add small delay to avoid rate limiting (100ms between messages)
      await delay(100);

    } catch (error) {
      recipient.status = 'failed';
      recipient.error = error instanceof Error ? error.message : 'Unknown error';
      campaign.stats.failed += 1;
      campaign.stats.sent += 1;
    }
  }

  // Mark campaign as completed
  campaign.status = campaign.stats.failed === campaign.stats.totalRecipients ? 'failed' : 'completed';
  campaign.completedAt = new Date();
  await campaign.save();

  // Track SMS credits usage (only for successfully sent messages)
  if (campaign.stats.success > 0) {
    try {
      await subscriptionService.incrementUsage(
        new mongoose.Types.ObjectId(campaign.restaurantId.toString()),
        'smsCredits',
        campaign.stats.success
      );
    } catch (usageError) {
      logger.error('[Campaign] Failed to track SMS credits usage:', usageError);
      // Don't fail - campaign already completed
    }
  }

  logger.info('[Campaign] Completed', { campaignId: campaignId.toString(), success: campaign.stats.success, failed: campaign.stats.failed });
}

/**
 * Process scheduled campaigns that are due
 * Called by the scheduler
 */
export async function processScheduledCampaigns(): Promise<void> {
  const now = new Date();

  const dueCampaigns = await Campaign.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
  }).populate('restaurantId', 'name');

  for (const campaign of dueCampaigns) {
    const restaurant = campaign.restaurantId as unknown as { name: string };

    logger.info('[Scheduler] Processing due campaign', { campaignId: campaign._id.toString() });

    campaign.status = 'sending';
    campaign.startedAt = new Date();
    await campaign.save();

    // Send in background
    sendCampaignMessages(campaign._id, restaurant.name).catch((error) => {
      console.error(`[Scheduler] Campaign ${campaign._id} failed:`, error);
    });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
