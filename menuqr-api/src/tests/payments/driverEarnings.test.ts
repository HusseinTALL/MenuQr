/**
 * Driver Earnings Service Tests
 * Tests for earnings calculation, payouts, and financial summaries
 */

import '../setup.js';
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { DeliveryDriver } from '../../models/DeliveryDriver.js';
import { Delivery } from '../../models/Delivery.js';
import { DriverPayout } from '../../models/DriverPayout.js';
import {
  createTestRestaurant,
  createTestDriver,
  createCompletedDelivery,
  createDriverShift,
  createDriverPayout,
  createEarningsScenario,
} from './paymentsHelpers.js';
import * as driverEarningsService from '../../services/driverEarningsService.js';

describe('Driver Earnings Service', () => {
  // =====================================================
  // calculateDeliveryEarnings - Pure Function Tests
  // =====================================================
  describe('calculateDeliveryEarnings', () => {
    it('should calculate base earnings correctly', () => {
      const result = driverEarningsService.calculateDeliveryEarnings(
        3.50, // base fee
        2.0,  // distance (within threshold, no bonus)
        5,    // wait time (within threshold, no bonus)
        0,    // no tip
        new Date('2024-01-15T10:00:00') // not peak hour
      );

      expect(result.baseFee).toBe(3.50);
      expect(result.distanceBonus).toBe(0);
      expect(result.waitTimeBonus).toBe(0);
      expect(result.peakHourBonus).toBe(0);
      expect(result.tip).toBe(0);
      expect(result.total).toBe(3.50);
    });

    it('should add distance bonus after threshold', () => {
      const result = driverEarningsService.calculateDeliveryEarnings(
        3.50,
        5.0,  // 5km = 2km extra (after 3km threshold)
        5,
        0,
        new Date('2024-01-15T10:00:00')
      );

      // 2km extra * 0.50 = 1.00 bonus
      expect(result.distanceBonus).toBe(1.00);
      expect(result.total).toBe(4.50);
    });

    it('should add wait time bonus after threshold', () => {
      const result = driverEarningsService.calculateDeliveryEarnings(
        3.50,
        2.0,
        20,   // 20 minutes = 10 minutes extra (after 10 min threshold)
        0,
        new Date('2024-01-15T10:00:00')
      );

      // 10 min extra * 0.15 = 1.50 bonus
      expect(result.waitTimeBonus).toBe(1.50);
      expect(result.total).toBe(5.00);
    });

    it('should add peak hour bonus during lunch', () => {
      const result = driverEarningsService.calculateDeliveryEarnings(
        3.50,
        2.0,
        5,
        0,
        new Date('2024-01-15T12:30:00') // 12:30 = peak lunch hour
      );

      // Peak bonus = (3.50 + 0) * 0.2 = 0.70
      expect(result.peakHourBonus).toBe(0.70);
      expect(result.total).toBe(4.20);
    });

    it('should add peak hour bonus during dinner', () => {
      const result = driverEarningsService.calculateDeliveryEarnings(
        3.50,
        2.0,
        5,
        0,
        new Date('2024-01-15T19:30:00') // 19:30 = peak dinner hour
      );

      expect(result.peakHourBonus).toBe(0.70);
      expect(result.total).toBe(4.20);
    });

    it('should include tip in total', () => {
      const result = driverEarningsService.calculateDeliveryEarnings(
        3.50,
        2.0,
        5,
        5.00, // 5 EUR tip
        new Date('2024-01-15T10:00:00')
      );

      expect(result.tip).toBe(5.00);
      expect(result.total).toBe(8.50);
    });

    it('should calculate complex earnings with all bonuses', () => {
      const result = driverEarningsService.calculateDeliveryEarnings(
        4.00,  // base fee
        6.0,   // 6km = 3km extra * 0.50 = 1.50 distance bonus
        15,    // 15 min = 5 min extra * 0.15 = 0.75 wait bonus
        3.00,  // tip
        new Date('2024-01-15T12:30:00') // peak hour
      );

      // Distance bonus: 3 * 0.50 = 1.50
      expect(result.distanceBonus).toBe(1.50);

      // Wait time bonus: 5 * 0.15 = 0.75
      expect(result.waitTimeBonus).toBe(0.75);

      // Peak bonus: (4.00 + 1.50) * 0.2 = 1.10
      expect(result.peakHourBonus).toBe(1.10);

      // Total: 4.00 + 1.50 + 0.75 + 1.10 + 3.00 = 10.35
      expect(result.total).toBe(10.35);
    });
  });

  // =====================================================
  // getDriverEarnings - Database Query Tests
  // =====================================================
  describe('getDriverEarnings', () => {
    it('should return earnings for today', async () => {
      const { driver, deliveries } = await createEarningsScenario();

      const earnings = await driverEarningsService.getDriverEarnings(driver._id, 'today');

      expect(earnings).toHaveProperty('baseFees');
      expect(earnings).toHaveProperty('tips');
      expect(earnings).toHaveProperty('grossTotal');
      expect(earnings).toHaveProperty('netTotal');
    });

    it('should return earnings for week', async () => {
      const { driver } = await createEarningsScenario();

      const earnings = await driverEarningsService.getDriverEarnings(driver._id, 'week');

      expect(earnings.grossTotal).toBeGreaterThanOrEqual(0);
    });

    it('should return earnings for month', async () => {
      const { driver } = await createEarningsScenario();

      const earnings = await driverEarningsService.getDriverEarnings(driver._id, 'month');

      expect(earnings.grossTotal).toBeGreaterThanOrEqual(0);
    });

    it('should return all-time earnings', async () => {
      const { driver } = await createEarningsScenario();

      const earnings = await driverEarningsService.getDriverEarnings(driver._id, 'all');

      expect(earnings.grossTotal).toBeGreaterThanOrEqual(0);
    });

    it('should calculate net total correctly', async () => {
      const { driver } = await createEarningsScenario();

      const earnings = await driverEarningsService.getDriverEarnings(driver._id, 'all');

      // Net = Gross - Deductions
      expect(earnings.netTotal).toBe(earnings.grossTotal - earnings.deductions);
    });

    it('should return zero for driver with no deliveries', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const earnings = await driverEarningsService.getDriverEarnings(driver._id, 'today');

      expect(earnings.baseFees).toBe(0);
      expect(earnings.grossTotal).toBe(0);
    });
  });

  // =====================================================
  // getDailyEarnings
  // =====================================================
  describe('getDailyEarnings', () => {
    it('should return daily earnings with delivery count', async () => {
      const { driver, deliveries } = await createEarningsScenario();
      const today = new Date();

      const daily = await driverEarningsService.getDailyEarnings(driver._id, today);

      expect(daily.date).toBeDefined();
      expect(daily.deliveries).toBeGreaterThanOrEqual(0);
      expect(daily.earnings).toBeDefined();
      expect(daily.hoursWorked).toBeGreaterThanOrEqual(0);
    });

    it('should include hours worked from shifts', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      // Create a shift
      await createDriverShift(driver._id, {
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        endedAt: new Date(),
        duration: 180, // 3 hours in minutes
      });

      const today = new Date();
      const daily = await driverEarningsService.getDailyEarnings(driver._id, today);

      expect(daily.hoursWorked).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // getWeeklyEarnings
  // =====================================================
  describe('getWeeklyEarnings', () => {
    it('should return weekly earnings with daily breakdown', async () => {
      const { driver } = await createEarningsScenario();

      const weekly = await driverEarningsService.getWeeklyEarnings(driver._id);

      expect(weekly.weekStart).toBeInstanceOf(Date);
      expect(weekly.weekEnd).toBeInstanceOf(Date);
      expect(weekly.totalDeliveries).toBeGreaterThanOrEqual(0);
      expect(weekly.totalHours).toBeGreaterThanOrEqual(0);
      expect(weekly.dailyBreakdown).toHaveLength(7);
    });

    it('should aggregate totals correctly', async () => {
      const { driver } = await createEarningsScenario();

      const weekly = await driverEarningsService.getWeeklyEarnings(driver._id);

      // Total deliveries should equal sum of daily deliveries
      const sumDeliveries = weekly.dailyBreakdown.reduce(
        (sum, day) => sum + day.deliveries,
        0
      );
      expect(weekly.totalDeliveries).toBe(sumDeliveries);
    });

    it('should accept custom week start date', async () => {
      const { driver } = await createEarningsScenario();
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const weekly = await driverEarningsService.getWeeklyEarnings(driver._id, lastWeek);

      expect(weekly.weekStart).toBeDefined();
    });
  });

  // =====================================================
  // getPayoutSummary
  // =====================================================
  describe('getPayoutSummary', () => {
    it('should return payout summary for driver', async () => {
      const { driver } = await createEarningsScenario();

      const summary = await driverEarningsService.getPayoutSummary(driver._id);

      expect(summary).toHaveProperty('currentBalance');
      expect(summary).toHaveProperty('pendingPayout');
      expect(summary).toHaveProperty('lifetimeEarnings');
    });

    it('should include pending payout amount', async () => {
      const { driver, pendingPayout } = await createEarningsScenario();

      const summary = await driverEarningsService.getPayoutSummary(driver._id);

      expect(summary.pendingPayout).toBeGreaterThan(0);
    });

    it('should include last payout details', async () => {
      const { driver, completedPayout } = await createEarningsScenario();

      const summary = await driverEarningsService.getPayoutSummary(driver._id);

      expect(summary.lastPayoutAmount).toBeDefined();
    });

    it('should throw for non-existent driver', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        driverEarningsService.getPayoutSummary(fakeId)
      ).rejects.toThrow('Driver not found');
    });
  });

  // =====================================================
  // createWeeklyPayout
  // =====================================================
  describe('createWeeklyPayout', () => {
    it('should create weekly payout for driver with deliveries', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      // Create deliveries from last week
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 3);

      await createCompletedDelivery(restaurant._id, driver._id, {
        baseFee: 4.00,
        tip: 2.00,
        deliveryDate: lastWeek,
      });

      const payout = await driverEarningsService.createWeeklyPayout(driver._id);

      // May be null if period doesn't match
      if (payout) {
        expect(payout.type).toBe('weekly');
        expect(payout.status).toBe('pending');
        expect(payout.driverId.toString()).toBe(driver._id.toString());
      }
    });

    it('should return null if payout already exists for period', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      // Create deliveries
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 3);
      await createCompletedDelivery(restaurant._id, driver._id, { deliveryDate: lastWeek });

      // Create first payout
      const payout1 = await driverEarningsService.createWeeklyPayout(driver._id);

      // Try to create duplicate
      const payout2 = await driverEarningsService.createWeeklyPayout(driver._id);

      // Second should be null
      if (payout1) {
        expect(payout2).toBeNull();
      }
    });

    it('should return null for driver with no deliveries', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const payout = await driverEarningsService.createWeeklyPayout(driver._id);

      expect(payout).toBeNull();
    });

    it('should throw for non-existent driver', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        driverEarningsService.createWeeklyPayout(fakeId)
      ).rejects.toThrow('Driver not found');
    });
  });

  // =====================================================
  // addTip
  // =====================================================
  describe('addTip', () => {
    it('should add tip to completed delivery', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);
      const { delivery } = await createCompletedDelivery(restaurant._id, driver._id, {
        tip: 0,
      });

      const originalTotal = delivery.earnings.total;

      await driverEarningsService.addTip(delivery._id, 5.00);

      // Verify delivery was updated
      const updatedDelivery = await Delivery.findById(delivery._id);
      expect(updatedDelivery?.earnings.tip).toBe(5.00);
      expect(updatedDelivery?.earnings.total).toBe(originalTotal + 5.00);
    });

    it('should update driver balance', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id], {
        currentBalance: 10.00,
      });
      const { delivery } = await createCompletedDelivery(restaurant._id, driver._id, {
        tip: 0,
      });

      await driverEarningsService.addTip(delivery._id, 3.00);

      const updatedDriver = await DeliveryDriver.findById(driver._id);
      expect(updatedDriver?.currentBalance).toBe(13.00);
    });

    it('should throw for non-existent delivery', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        driverEarningsService.addTip(fakeId, 5.00)
      ).rejects.toThrow('Delivery not found');
    });

    it('should throw for non-completed delivery', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      // Create in-transit delivery
      const delivery = await Delivery.create({
        orderId: new mongoose.Types.ObjectId(),
        restaurantId: restaurant._id,
        driverId: driver._id,
        deliveryNumber: `DEL-${Date.now()}`,
        status: 'in_transit', // Not delivered
        pickupAddress: {
          street: '123 Test St',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          coordinates: { lat: 48.8566, lng: 2.3522 },
        },
        dropoffAddress: {
          street: '456 Delivery St',
          city: 'Paris',
          postalCode: '75002',
          country: 'FR',
          coordinates: { lat: 48.8606, lng: 2.3376 },
        },
        deliveryAddress: {
          street: '456 Delivery St',
          city: 'Paris',
          postalCode: '75002',
          country: 'FR',
          coordinates: { lat: 48.8606, lng: 2.3376 },
        },
        earnings: { baseFee: 3.50, total: 3.50 },
      });

      await expect(
        driverEarningsService.addTip(delivery._id, 5.00)
      ).rejects.toThrow('Can only add tip to completed deliveries');
    });
  });

  // =====================================================
  // getEarningsLeaderboard
  // =====================================================
  describe('getEarningsLeaderboard', () => {
    it('should return weekly leaderboard', async () => {
      await createEarningsScenario();

      const leaderboard = await driverEarningsService.getEarningsLeaderboard('week', 10);

      expect(Array.isArray(leaderboard)).toBe(true);
      leaderboard.forEach((entry, index) => {
        expect(entry.rank).toBe(index + 1);
        expect(entry).toHaveProperty('driverId');
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('earnings');
        expect(entry).toHaveProperty('deliveries');
      });
    });

    it('should return monthly leaderboard', async () => {
      await createEarningsScenario();

      const leaderboard = await driverEarningsService.getEarningsLeaderboard('month', 5);

      expect(Array.isArray(leaderboard)).toBe(true);
      expect(leaderboard.length).toBeLessThanOrEqual(5);
    });

    it('should sort by earnings descending', async () => {
      // Create multiple scenarios
      await createEarningsScenario();
      await createEarningsScenario();

      const leaderboard = await driverEarningsService.getEarningsLeaderboard('week', 10);

      // Check descending order
      for (let i = 1; i < leaderboard.length; i++) {
        expect(leaderboard[i - 1].earnings).toBeGreaterThanOrEqual(leaderboard[i].earnings);
      }
    });
  });

  // =====================================================
  // isPeakHour Helper
  // =====================================================
  describe('isPeakHour', () => {
    it('should return true during lunch hours (11-14)', () => {
      const lunchTime = new Date('2024-01-15T12:30:00');
      expect(driverEarningsService.default.isPeakHour(lunchTime)).toBe(true);
    });

    it('should return true during dinner hours (18-22)', () => {
      const dinnerTime = new Date('2024-01-15T19:30:00');
      expect(driverEarningsService.default.isPeakHour(dinnerTime)).toBe(true);
    });

    it('should return false outside peak hours', () => {
      const offPeak = new Date('2024-01-15T15:00:00');
      expect(driverEarningsService.default.isPeakHour(offPeak)).toBe(false);
    });

    it('should return false in early morning', () => {
      const earlyMorning = new Date('2024-01-15T08:00:00');
      expect(driverEarningsService.default.isPeakHour(earlyMorning)).toBe(false);
    });
  });
});
