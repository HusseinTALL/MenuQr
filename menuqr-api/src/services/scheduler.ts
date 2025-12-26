import { processScheduledCampaigns } from './campaignService.js';
import { processExpiredPoints } from './loyaltyService.js';
import { processReminders as processReservationReminders } from './reservationService.js';
import { Restaurant } from '../models/index.js';

const SCHEDULER_INTERVAL_MS = 60000; // Check every minute
const LOYALTY_EXPIRY_HOUR = 2; // Run at 2 AM
const RESERVATION_REMINDER_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

let schedulerInterval: NodeJS.Timeout | null = null;
let loyaltyExpiryInterval: NodeJS.Timeout | null = null;
let reservationReminderInterval: NodeJS.Timeout | null = null;
let lastLoyaltyProcessDate: string | null = null;

/**
 * Process expired loyalty points for all restaurants
 */
async function processAllExpiredPoints(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Only process once per day
  if (lastLoyaltyProcessDate === today) {
    return;
  }

  // Only run at the specified hour (2 AM by default)
  const currentHour = new Date().getHours();
  if (currentHour !== LOYALTY_EXPIRY_HOUR) {
    return;
  }

  console.log('[Scheduler] Processing expired loyalty points...');
  lastLoyaltyProcessDate = today;

  try {
    // Get all active restaurants
    const restaurants = await Restaurant.find({ isActive: true }).select('_id');

    let totalCustomers = 0;
    let totalPoints = 0;

    for (const restaurant of restaurants) {
      const result = await processExpiredPoints(restaurant._id);
      totalCustomers += result.customersProcessed;
      totalPoints += result.totalPointsExpired;
    }

    if (totalPoints > 0) {
      console.log(
        `[Scheduler] Loyalty expiry complete: ${totalCustomers} customers, ${totalPoints} points expired`
      );
    }
  } catch (error) {
    console.error('[Scheduler] Error processing expired points:', error);
    // Reset date so it tries again next hour
    lastLoyaltyProcessDate = null;
  }
}

/**
 * Start the campaign scheduler
 */
export function startScheduler(): void {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }

  console.log('[Scheduler] Starting scheduler (campaigns every 60s, loyalty expiry daily at 2AM, reservation reminders every 15min)');

  // Run campaigns immediately on start
  processScheduledCampaigns().catch((error) => {
    console.error('[Scheduler] Error processing campaigns:', error);
  });

  // Then run campaigns at intervals
  schedulerInterval = setInterval(() => {
    processScheduledCampaigns().catch((error) => {
      console.error('[Scheduler] Error processing campaigns:', error);
    });
  }, SCHEDULER_INTERVAL_MS);

  // Check for loyalty expiry every hour
  loyaltyExpiryInterval = setInterval(() => {
    processAllExpiredPoints().catch((error) => {
      console.error('[Scheduler] Error in loyalty expiry check:', error);
    });
  }, 60 * 60 * 1000); // Every hour

  // Also check on startup (in case server starts at 2 AM)
  processAllExpiredPoints().catch((error) => {
    console.error('[Scheduler] Error in initial loyalty expiry check:', error);
  });

  // Process reservation reminders every 15 minutes
  reservationReminderInterval = setInterval(() => {
    processReservationReminders().catch((error) => {
      console.error('[Scheduler] Error processing reservation reminders:', error);
    });
  }, RESERVATION_REMINDER_INTERVAL_MS);

  // Also check reminders on startup
  processReservationReminders().catch((error) => {
    console.error('[Scheduler] Error in initial reservation reminder check:', error);
  });
}

/**
 * Stop the campaign scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (loyaltyExpiryInterval) {
    clearInterval(loyaltyExpiryInterval);
    loyaltyExpiryInterval = null;
  }
  if (reservationReminderInterval) {
    clearInterval(reservationReminderInterval);
    reservationReminderInterval = null;
  }
  console.log('[Scheduler] Stopped');
}
