import { processScheduledCampaigns } from './campaignService.js';
import { processExpiredPoints } from './loyaltyService.js';
import { processReminders as processReservationReminders } from './reservationService.js';
import AlertService from './alertService.js';
import { runLowStockAlertJob } from './inventoryService.js';
import { downgradeService } from './downgradeService.js';
import { Restaurant } from '../models/index.js';
import logger from '../utils/logger.js';

const SCHEDULER_INTERVAL_MS = 60000; // Check every minute
const LOYALTY_EXPIRY_HOUR = 2; // Run at 2 AM
const RESERVATION_REMINDER_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes
const ALERT_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const LOW_STOCK_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // Check every 4 hours
const SUBSCRIPTION_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const GRACE_PERIOD_REMINDER_HOUR = 10; // Run at 10 AM

let schedulerInterval: NodeJS.Timeout | null = null;
let loyaltyExpiryInterval: NodeJS.Timeout | null = null;
let reservationReminderInterval: NodeJS.Timeout | null = null;
let alertCheckInterval: NodeJS.Timeout | null = null;
let lowStockAlertInterval: NodeJS.Timeout | null = null;
let subscriptionInterval: NodeJS.Timeout | null = null;
let gracePeriodReminderInterval: NodeJS.Timeout | null = null;
let lastLoyaltyProcessDate: string | null = null;
let lastGracePeriodReminderDate: string | null = null;

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

  logger.info('Processing expired loyalty points...');
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
      logger.info('Loyalty expiry complete', {
        customersProcessed: totalCustomers,
        pointsExpired: totalPoints
      });
    }
  } catch (error) {
    logger.error('Error processing expired points', error);
    // Reset date so it tries again next hour
    lastLoyaltyProcessDate = null;
  }
}

/**
 * Process pending downgrades and expired grace periods
 */
async function processSubscriptionChanges(): Promise<void> {
  try {
    // Process pending downgrades that are due
    const downgradesProcessed = await downgradeService.processPendingDowngrades();
    if (downgradesProcessed > 0) {
      logger.info('Processed pending downgrades', {
        count: downgradesProcessed,
      });
    }

    // Process expired grace periods
    const gracePeriodsProcessed = await downgradeService.processExpiredGracePeriods();
    if (gracePeriodsProcessed > 0) {
      logger.info('Processed expired grace periods', {
        count: gracePeriodsProcessed,
      });
    }
  } catch (error) {
    logger.error('Error processing subscription changes', error);
  }
}

/**
 * Send grace period reminder emails (once daily at 10 AM)
 */
async function sendGracePeriodReminders(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Only process once per day
  if (lastGracePeriodReminderDate === today) {
    return;
  }

  // Only run at the specified hour (10 AM by default)
  const currentHour = new Date().getHours();
  if (currentHour !== GRACE_PERIOD_REMINDER_HOUR) {
    return;
  }

  logger.info('Sending grace period reminders...');
  lastGracePeriodReminderDate = today;

  try {
    const remindersSent = await downgradeService.sendGracePeriodReminders();
    if (remindersSent > 0) {
      logger.info('Grace period reminders sent', {
        count: remindersSent,
      });
    }
  } catch (error) {
    logger.error('Error sending grace period reminders', error);
    // Reset date so it tries again next hour
    lastGracePeriodReminderDate = null;
  }
}

/**
 * Start the campaign scheduler
 */
export function startScheduler(): void {
  if (schedulerInterval) {
    logger.warn('Scheduler already running');
    return;
  }

  logger.info('Starting scheduler', {
    campaignInterval: '60s',
    loyaltyExpiry: '2AM daily',
    reservationReminders: '15min'
  });

  // Run campaigns immediately on start
  processScheduledCampaigns().catch((error) => {
    logger.error('Error processing campaigns', error);
  });

  // Then run campaigns at intervals
  schedulerInterval = setInterval(() => {
    processScheduledCampaigns().catch((error) => {
      logger.error('Error processing campaigns', error);
    });
  }, SCHEDULER_INTERVAL_MS);

  // Check for loyalty expiry every hour
  loyaltyExpiryInterval = setInterval(() => {
    processAllExpiredPoints().catch((error) => {
      logger.error('Error in loyalty expiry check', error);
    });
  }, 60 * 60 * 1000); // Every hour

  // Also check on startup (in case server starts at 2 AM)
  processAllExpiredPoints().catch((error) => {
    logger.error('Error in initial loyalty expiry check', error);
  });

  // Process reservation reminders every 15 minutes
  reservationReminderInterval = setInterval(() => {
    processReservationReminders().catch((error) => {
      logger.error('Error processing reservation reminders', error);
    });
  }, RESERVATION_REMINDER_INTERVAL_MS);

  // Also check reminders on startup
  processReservationReminders().catch((error) => {
    logger.error('Error in initial reservation reminder check', error);
  });

  // Run alert checks every hour
  alertCheckInterval = setInterval(() => {
    AlertService.runAllChecks().catch((error) => {
      logger.error('Error running alert checks', error);
    });
  }, ALERT_CHECK_INTERVAL_MS);

  // Also run alert checks on startup (after a delay to let DB connect)
  setTimeout(() => {
    AlertService.runAllChecks().catch((error) => {
      logger.error('Error in initial alert check', error);
    });
  }, 30000); // 30 second delay

  // Run low stock alert checks every 4 hours
  lowStockAlertInterval = setInterval(() => {
    runLowStockAlertJob()
      .then((result) => {
        if (result.alertsSent > 0) {
          logger.info('Low stock alerts sent', {
            restaurantsChecked: result.restaurantsChecked,
            alertsSent: result.alertsSent,
          });
        }
      })
      .catch((error) => {
        logger.error('Error running low stock alert job', error);
      });
  }, LOW_STOCK_CHECK_INTERVAL_MS);

  // Also run low stock check on startup (after a delay)
  setTimeout(() => {
    runLowStockAlertJob()
      .then((result) => {
        if (result.alertsSent > 0) {
          logger.info('Initial low stock alerts sent', result);
        }
      })
      .catch((error) => {
        logger.error('Error in initial low stock alert check', error);
      });
  }, 60000); // 1 minute delay

  // Process subscription changes (downgrades, grace periods) every hour
  subscriptionInterval = setInterval(() => {
    processSubscriptionChanges().catch((error) => {
      logger.error('Error processing subscription changes', error);
    });
  }, SUBSCRIPTION_CHECK_INTERVAL_MS);

  // Also check subscription changes on startup (after a delay)
  setTimeout(() => {
    processSubscriptionChanges().catch((error) => {
      logger.error('Error in initial subscription check', error);
    });
  }, 45000); // 45 second delay

  // Check for grace period reminders every hour (only sends at 10 AM)
  gracePeriodReminderInterval = setInterval(() => {
    sendGracePeriodReminders().catch((error) => {
      logger.error('Error in grace period reminder check', error);
    });
  }, 60 * 60 * 1000); // Every hour

  // Also check on startup
  sendGracePeriodReminders().catch((error) => {
    logger.error('Error in initial grace period reminder check', error);
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
  if (alertCheckInterval) {
    clearInterval(alertCheckInterval);
    alertCheckInterval = null;
  }
  if (lowStockAlertInterval) {
    clearInterval(lowStockAlertInterval);
    lowStockAlertInterval = null;
  }
  if (subscriptionInterval) {
    clearInterval(subscriptionInterval);
    subscriptionInterval = null;
  }
  if (gracePeriodReminderInterval) {
    clearInterval(gracePeriodReminderInterval);
    gracePeriodReminderInterval = null;
  }
  logger.info('Scheduler stopped');
}
