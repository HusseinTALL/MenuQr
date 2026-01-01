import mongoose from 'mongoose';
import { Delivery } from '../models/Delivery.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { DriverPayout, IDriverPayout } from '../models/DriverPayout.js';
import { DriverShift } from '../models/DriverShift.js';

// Types
interface EarningsBreakdown {
  baseFees: number;
  distanceBonuses: number;
  waitTimeBonuses: number;
  peakHourBonuses: number;
  tips: number;
  incentiveBonuses: number;
  referralBonuses: number;
  adjustments: number;
  deductions: number;
  grossTotal: number;
  netTotal: number;
}

interface DailyEarnings {
  date: string;
  deliveries: number;
  earnings: EarningsBreakdown;
  hoursWorked: number;
}

interface WeeklyEarnings {
  weekStart: Date;
  weekEnd: Date;
  totalDeliveries: number;
  totalHours: number;
  earnings: EarningsBreakdown;
  dailyBreakdown: DailyEarnings[];
}

interface PayoutSummary {
  currentBalance: number;
  pendingPayout: number;
  lastPayoutDate?: Date;
  lastPayoutAmount?: number;
  lifetimeEarnings: number;
}

// Constants
const PEAK_HOURS = {
  lunch: { start: 11, end: 14 },
  dinner: { start: 18, end: 22 },
};

const PEAK_HOUR_MULTIPLIER = 1.2;
const DISTANCE_BONUS_PER_KM = 0.5; // €0.50 per km after 3km
const DISTANCE_BONUS_THRESHOLD = 3; // First 3km included in base
const WAIT_TIME_BONUS_PER_MIN = 0.15; // €0.15 per minute after 10 min
const WAIT_TIME_THRESHOLD = 10; // 10 minutes wait before bonus

/**
 * Check if current time is during peak hours
 */
function isPeakHour(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return (
    (hour >= PEAK_HOURS.lunch.start && hour < PEAK_HOURS.lunch.end) ||
    (hour >= PEAK_HOURS.dinner.start && hour < PEAK_HOURS.dinner.end)
  );
}

/**
 * Calculate earnings for a single delivery
 */
export function calculateDeliveryEarnings(
  baseFee: number,
  distanceKm: number,
  waitTimeMinutes: number,
  tipAmount: number,
  deliveryDate: Date
): {
  baseFee: number;
  distanceBonus: number;
  waitTimeBonus: number;
  peakHourBonus: number;
  tip: number;
  total: number;
} {
  // Distance bonus
  const extraDistance = Math.max(0, distanceKm - DISTANCE_BONUS_THRESHOLD);
  const distanceBonus = Math.round(extraDistance * DISTANCE_BONUS_PER_KM * 100) / 100;

  // Wait time bonus
  const extraWaitTime = Math.max(0, waitTimeMinutes - WAIT_TIME_THRESHOLD);
  const waitTimeBonus = Math.round(extraWaitTime * WAIT_TIME_BONUS_PER_MIN * 100) / 100;

  // Peak hour bonus
  const peakHourBonus = isPeakHour(deliveryDate)
    ? Math.round((baseFee + distanceBonus) * (PEAK_HOUR_MULTIPLIER - 1) * 100) / 100
    : 0;

  // Total
  const total =
    Math.round((baseFee + distanceBonus + waitTimeBonus + peakHourBonus + tipAmount) * 100) / 100;

  return {
    baseFee,
    distanceBonus,
    waitTimeBonus,
    peakHourBonus,
    tip: tipAmount,
    total,
  };
}

/**
 * Get earnings summary for a driver
 */
export async function getDriverEarnings(
  driverId: mongoose.Types.ObjectId,
  period: 'today' | 'week' | 'month' | 'all' = 'week'
): Promise<EarningsBreakdown> {
  let startDate: Date;
  const endDate = new Date();

  switch (period) {
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'all':
      startDate = new Date(0);
      break;
  }

  const deliveries = await Delivery.find({
    driverId,
    status: 'delivered',
    actualDeliveryTime: { $gte: startDate, $lte: endDate },
  });

  const breakdown: EarningsBreakdown = {
    baseFees: 0,
    distanceBonuses: 0,
    waitTimeBonuses: 0,
    peakHourBonuses: 0,
    tips: 0,
    incentiveBonuses: 0,
    referralBonuses: 0,
    adjustments: 0,
    deductions: 0,
    grossTotal: 0,
    netTotal: 0,
  };

  for (const delivery of deliveries) {
    if (delivery.earnings) {
      breakdown.baseFees += delivery.earnings.baseFee || 0;
      breakdown.distanceBonuses += delivery.earnings.distanceBonus || 0;
      breakdown.waitTimeBonuses += delivery.earnings.waitTimeBonus || 0;
      breakdown.peakHourBonuses += delivery.earnings.peakHourBonus || 0;
      breakdown.tips += delivery.earnings.tip || 0;
    }
  }

  // Get adjustments from payouts
  const payouts = await DriverPayout.find({
    driverId,
    createdAt: { $gte: startDate, $lte: endDate },
  });

  for (const payout of payouts) {
    if (payout.breakdown) {
      breakdown.incentiveBonuses += payout.breakdown.incentiveBonuses || 0;
      breakdown.referralBonuses += payout.breakdown.referralBonuses || 0;
      breakdown.adjustments += payout.breakdown.adjustments || 0;
      breakdown.deductions += payout.breakdown.deductions || 0;
    }
  }

  // Calculate totals
  breakdown.grossTotal =
    breakdown.baseFees +
    breakdown.distanceBonuses +
    breakdown.waitTimeBonuses +
    breakdown.peakHourBonuses +
    breakdown.tips +
    breakdown.incentiveBonuses +
    breakdown.referralBonuses +
    breakdown.adjustments;

  breakdown.netTotal = breakdown.grossTotal - breakdown.deductions;

  // Round all values
  Object.keys(breakdown).forEach((key) => {
    breakdown[key as keyof EarningsBreakdown] =
      Math.round(breakdown[key as keyof EarningsBreakdown] * 100) / 100;
  });

  return breakdown;
}

/**
 * Get daily earnings breakdown
 */
export async function getDailyEarnings(
  driverId: mongoose.Types.ObjectId,
  date: Date
): Promise<DailyEarnings> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get deliveries
  const deliveries = await Delivery.find({
    driverId,
    status: 'delivered',
    actualDeliveryTime: { $gte: startOfDay, $lte: endOfDay },
  });

  // Get shifts
  const shifts = await DriverShift.find({
    driverId,
    startedAt: { $gte: startOfDay, $lte: endOfDay },
  });

  // Calculate hours worked
  let hoursWorked = 0;
  for (const shift of shifts) {
    if (shift.duration) {
      hoursWorked += shift.duration / 60; // Convert minutes to hours
    }
  }

  // Calculate earnings
  const earnings: EarningsBreakdown = {
    baseFees: 0,
    distanceBonuses: 0,
    waitTimeBonuses: 0,
    peakHourBonuses: 0,
    tips: 0,
    incentiveBonuses: 0,
    referralBonuses: 0,
    adjustments: 0,
    deductions: 0,
    grossTotal: 0,
    netTotal: 0,
  };

  for (const delivery of deliveries) {
    if (delivery.earnings) {
      earnings.baseFees += delivery.earnings.baseFee || 0;
      earnings.distanceBonuses += delivery.earnings.distanceBonus || 0;
      earnings.waitTimeBonuses += delivery.earnings.waitTimeBonus || 0;
      earnings.peakHourBonuses += delivery.earnings.peakHourBonus || 0;
      earnings.tips += delivery.earnings.tip || 0;
    }
  }

  earnings.grossTotal =
    earnings.baseFees +
    earnings.distanceBonuses +
    earnings.waitTimeBonuses +
    earnings.peakHourBonuses +
    earnings.tips;
  earnings.netTotal = earnings.grossTotal - earnings.deductions;

  return {
    date: startOfDay.toISOString().split('T')[0],
    deliveries: deliveries.length,
    earnings,
    hoursWorked: Math.round(hoursWorked * 10) / 10,
  };
}

/**
 * Get weekly earnings with daily breakdown
 */
export async function getWeeklyEarnings(
  driverId: mongoose.Types.ObjectId,
  weekStart?: Date
): Promise<WeeklyEarnings> {
  // Default to current week
  const start = weekStart || new Date();
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday
  end.setHours(23, 59, 59, 999);

  // Get daily breakdown
  const dailyBreakdown: DailyEarnings[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dayEarnings = await getDailyEarnings(driverId, new Date(currentDate));
    dailyBreakdown.push(dayEarnings);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Aggregate totals
  const totalEarnings: EarningsBreakdown = {
    baseFees: 0,
    distanceBonuses: 0,
    waitTimeBonuses: 0,
    peakHourBonuses: 0,
    tips: 0,
    incentiveBonuses: 0,
    referralBonuses: 0,
    adjustments: 0,
    deductions: 0,
    grossTotal: 0,
    netTotal: 0,
  };

  let totalDeliveries = 0;
  let totalHours = 0;

  for (const day of dailyBreakdown) {
    totalDeliveries += day.deliveries;
    totalHours += day.hoursWorked;

    Object.keys(totalEarnings).forEach((key) => {
      totalEarnings[key as keyof EarningsBreakdown] +=
        day.earnings[key as keyof EarningsBreakdown];
    });
  }

  return {
    weekStart: start,
    weekEnd: end,
    totalDeliveries,
    totalHours: Math.round(totalHours * 10) / 10,
    earnings: totalEarnings,
    dailyBreakdown,
  };
}

/**
 * Get payout summary for a driver
 */
export async function getPayoutSummary(
  driverId: mongoose.Types.ObjectId
): Promise<PayoutSummary> {
  const driver = await DeliveryDriver.findById(driverId);
  if (!driver) {
    throw new Error('Driver not found');
  }

  // Get pending payout amount
  const pendingPayouts = await DriverPayout.find({
    driverId,
    status: 'pending',
  });

  const pendingPayout = pendingPayouts.reduce((sum, p) => sum + p.netAmount, 0);

  // Get last completed payout
  const lastPayout = await DriverPayout.findOne({
    driverId,
    status: 'completed',
  }).sort({ processedAt: -1 });

  return {
    currentBalance: driver.currentBalance || 0,
    pendingPayout,
    lastPayoutDate: lastPayout?.processedAt,
    lastPayoutAmount: lastPayout?.netAmount,
    lifetimeEarnings: driver.lifetimeEarnings || 0,
  };
}

/**
 * Create weekly payout for a driver
 */
export async function createWeeklyPayout(
  driverId: mongoose.Types.ObjectId
): Promise<IDriverPayout | null> {
  const driver = await DeliveryDriver.findById(driverId);
  if (!driver) {
    throw new Error('Driver not found');
  }

  // Get last Sunday to Saturday period
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() - periodEnd.getDay()); // Last Sunday
  periodEnd.setHours(23, 59, 59, 999);

  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 6); // Previous Monday
  periodStart.setHours(0, 0, 0, 0);

  // Check if payout already exists for this period
  const existingPayout = await DriverPayout.findOne({
    driverId,
    periodStart: { $gte: periodStart },
    periodEnd: { $lte: periodEnd },
  });

  if (existingPayout) {
    return null; // Payout already created
  }

  // Get deliveries for the period
  const deliveries = await Delivery.find({
    driverId,
    status: 'delivered',
    actualDeliveryTime: { $gte: periodStart, $lte: periodEnd },
  });

  if (deliveries.length === 0) {
    return null; // No deliveries to pay out
  }

  // Calculate breakdown
  const breakdown = {
    deliveryFees: 0,
    distanceBonuses: 0,
    waitTimeBonuses: 0,
    peakHourBonuses: 0,
    tips: 0,
    incentiveBonuses: 0,
    referralBonuses: 0,
    adjustments: 0,
    deductions: 0,
  };

  const deliveryIds: mongoose.Types.ObjectId[] = [];

  for (const delivery of deliveries) {
    deliveryIds.push(delivery._id);
    if (delivery.earnings) {
      breakdown.deliveryFees += delivery.earnings.baseFee || 0;
      breakdown.distanceBonuses += delivery.earnings.distanceBonus || 0;
      breakdown.waitTimeBonuses += delivery.earnings.waitTimeBonus || 0;
      breakdown.peakHourBonuses += delivery.earnings.peakHourBonus || 0;
      breakdown.tips += delivery.earnings.tip || 0;
    }
  }

  const grossAmount =
    breakdown.deliveryFees +
    breakdown.distanceBonuses +
    breakdown.waitTimeBonuses +
    breakdown.peakHourBonuses +
    breakdown.tips +
    breakdown.incentiveBonuses +
    breakdown.referralBonuses +
    breakdown.adjustments;

  const netAmount = grossAmount - breakdown.deductions;

  // Create payout
  const payout = new DriverPayout({
    driverId,
    type: 'weekly',
    status: 'pending',
    periodStart,
    periodEnd,
    deliveryCount: deliveries.length,
    grossAmount: Math.round(grossAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    breakdown,
    deliveries: deliveryIds,
    bankAccount: driver.bankAccount
      ? {
          accountHolder: driver.bankAccount.accountHolder,
          iban: driver.bankAccount.iban,
          bic: driver.bankAccount.bic,
          bankName: driver.bankAccount.bankName,
          isVerified: driver.bankAccount.isVerified || false,
        }
      : undefined,
    paymentMethod: 'bank_transfer',
  });

  await payout.save();

  return payout;
}

/**
 * Add tip to a delivery (post-delivery)
 */
export async function addTip(
  deliveryId: mongoose.Types.ObjectId,
  tipAmount: number
): Promise<void> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    throw new Error('Delivery not found');
  }

  if (delivery.status !== 'delivered') {
    throw new Error('Can only add tip to completed deliveries');
  }

  // Update delivery earnings
  delivery.earnings.tip = (delivery.earnings.tip || 0) + tipAmount;
  delivery.earnings.total = (delivery.earnings.total || 0) + tipAmount;
  await delivery.save();

  // Update driver balance
  if (delivery.driverId) {
    await DeliveryDriver.findByIdAndUpdate(delivery.driverId, {
      $inc: {
        currentBalance: tipAmount,
        lifetimeEarnings: tipAmount,
      },
    });
  }
}

/**
 * Get earnings leaderboard
 */
export async function getEarningsLeaderboard(
  period: 'week' | 'month' = 'week',
  limit = 10
): Promise<
  Array<{
    driverId: mongoose.Types.ObjectId;
    name: string;
    earnings: number;
    deliveries: number;
    rank: number;
  }>
> {
  const startDate = new Date();
  if (period === 'week') {
    startDate.setDate(startDate.getDate() - 7);
  } else {
    startDate.setMonth(startDate.getMonth() - 1);
  }

  const leaderboard = await Delivery.aggregate([
    {
      $match: {
        status: 'delivered',
        actualDeliveryTime: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$driverId',
        totalEarnings: { $sum: '$earnings.total' },
        deliveryCount: { $sum: 1 },
      },
    },
    {
      $sort: { totalEarnings: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  const result = await Promise.all(
    leaderboard.map(async (entry, index) => {
      const driver = await DeliveryDriver.findById(entry._id);
      return {
        driverId: entry._id,
        name: driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown',
        earnings: Math.round(entry.totalEarnings * 100) / 100,
        deliveries: entry.deliveryCount,
        rank: index + 1,
      };
    })
  );

  return result;
}

export default {
  calculateDeliveryEarnings,
  getDriverEarnings,
  getDailyEarnings,
  getWeeklyEarnings,
  getPayoutSummary,
  createWeeklyPayout,
  addTip,
  getEarningsLeaderboard,
  isPeakHour,
};
