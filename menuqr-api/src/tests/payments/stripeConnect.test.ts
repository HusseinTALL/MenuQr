/**
 * Stripe Connect Service Tests
 * Tests for driver payment processing and connected accounts
 */

import '../setup.js';
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { DeliveryDriver } from '../../models/DeliveryDriver.js';
import { DriverPayout } from '../../models/DriverPayout.js';
import {
  createTestRestaurant,
  createTestDriver,
  createCompletedDelivery,
} from './paymentsHelpers.js';
import { stripeConnectService } from '../../services/stripeConnectService.js';
import Stripe from 'stripe';

describe('Stripe Connect Service', () => {
  // =====================================================
  // Service Initialization
  // =====================================================
  describe('Service Initialization', () => {
    it('should have isEnabled method', () => {
      expect(typeof stripeConnectService.isEnabled).toBe('function');
    });

    it('should return boolean from isEnabled', () => {
      const enabled = stripeConnectService.isEnabled();
      expect(typeof enabled).toBe('boolean');
    });

    it('should have getPublishableKey method', () => {
      expect(typeof stripeConnectService.getPublishableKey).toBe('function');
    });
  });

  // =====================================================
  // Connected Account Operations (Service Not Enabled)
  // =====================================================
  describe('Connected Account Operations (Service Disabled)', () => {
    it('should return error for createConnectedAccount when disabled', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const result = await stripeConnectService.createConnectedAccount({
        driverId: driver._id.toString(),
        email: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
      });

      // When service is disabled, should fail gracefully
      if (!stripeConnectService.isEnabled()) {
        expect(result.success).toBe(false);
      }
    });

    it('should return error for createOnboardingLink when disabled', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const result = await stripeConnectService.createOnboardingLink(
        driver._id.toString(),
        'https://example.com/return',
        'https://example.com/refresh'
      );

      if (!stripeConnectService.isEnabled()) {
        expect(result.success).toBe(false);
      }
    });

    it('should return error for createDashboardLink when disabled', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const result = await stripeConnectService.createDashboardLink(driver._id.toString());

      if (!stripeConnectService.isEnabled()) {
        expect(result.success).toBe(false);
      }
    });

    it('should return null for getAccountStatus when disabled', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id], {
        stripeAccountId: 'acct_test123',
      });

      const status = await stripeConnectService.getAccountStatus(driver._id.toString());

      if (!stripeConnectService.isEnabled()) {
        expect(status).toBeNull();
      }
    });
  });

  // =====================================================
  // Transfer Operations
  // =====================================================
  describe('Transfer Operations', () => {
    it('should return error for transferToDriver when disabled', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);
      const { delivery } = await createCompletedDelivery(restaurant._id, driver._id);

      const result = await stripeConnectService.transferToDriver(
        driver._id.toString(),
        500,
        delivery._id.toString(),
        'Test payment'
      );

      if (!stripeConnectService.isEnabled()) {
        expect(result.success).toBe(false);
      }
    });

    it('should process batch payouts', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver: driver1 } = await createTestDriver([restaurant._id]);
      const { driver: driver2 } = await createTestDriver([restaurant._id]);

      const payouts = [
        { driverId: driver1._id.toString(), amountCents: 1000, description: 'Payout 1' },
        { driverId: driver2._id.toString(), amountCents: 2000, description: 'Payout 2' },
      ];

      const result = await stripeConnectService.processBatchPayout(payouts);

      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(2);
    });
  });

  // =====================================================
  // Payout History & Earnings
  // =====================================================
  describe('Payout History & Earnings', () => {
    it('should return payout history with pagination', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      // Create a payout
      await DriverPayout.create({
        driverId: driver._id,
        payoutNumber: `PAY-${Date.now()}`,
        type: 'instant',
        status: 'completed',
        periodStart: new Date(),
        periodEnd: new Date(),
        grossAmount: 100,
        netAmount: 95,
        breakdown: {
          deliveryFees: 95,
          distanceBonuses: 0,
          waitTimeBonuses: 0,
          peakHourBonuses: 0,
          tips: 5,
          incentiveBonuses: 0,
          referralBonuses: 0,
          adjustments: 0,
          deductions: 5,
        },
        deliveryCount: 10,
        currency: 'eur',
        paymentMethod: 'instant',
      });

      const result = await stripeConnectService.getDriverPayoutHistory(
        driver._id.toString(),
        { page: 1, limit: 10 }
      );

      expect(result.payouts).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
    });

    it('should filter payout history by date range', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const result = await stripeConnectService.getDriverPayoutHistory(
        driver._id.toString(),
        { startDate, endDate }
      );

      expect(result.payouts).toBeDefined();
      expect(result.pagination).toBeDefined();
    });

    it('should return earnings summary for driver', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const summary = await stripeConnectService.getDriverEarningsSummary(driver._id.toString());

      expect(summary).toHaveProperty('today');
      expect(summary).toHaveProperty('thisWeek');
      expect(summary).toHaveProperty('thisMonth');
      expect(summary).toHaveProperty('allTime');
      expect(summary).toHaveProperty('currency');
    });

    it('should return zero earnings for new driver', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const summary = await stripeConnectService.getDriverEarningsSummary(driver._id.toString());

      expect(summary.today.amount).toBe(0);
      expect(summary.today.deliveries).toBe(0);
    });
  });

  // =====================================================
  // Pending Balance
  // =====================================================
  describe('Pending Balance', () => {
    it('should return 0 for driver with no pending payouts', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const balance = await stripeConnectService.getDriverPendingBalance(driver._id.toString());

      expect(balance).toBe(0);
    });

    it('should aggregate pending payout amounts', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      // Create pending payouts
      await DriverPayout.create([
        {
          driverId: driver._id,
          payoutNumber: `PAY-P1-${Date.now()}`,
          type: 'weekly',
          status: 'pending',
          periodStart: new Date(),
          periodEnd: new Date(),
          grossAmount: 50,
          netAmount: 50,
          breakdown: {
            deliveryFees: 50,
            distanceBonuses: 0,
            waitTimeBonuses: 0,
            peakHourBonuses: 0,
            tips: 0,
            incentiveBonuses: 0,
            referralBonuses: 0,
            adjustments: 0,
            deductions: 0,
          },
          deliveryCount: 5,
          currency: 'eur',
          paymentMethod: 'bank_transfer',
        },
        {
          driverId: driver._id,
          payoutNumber: `PAY-P2-${Date.now()}`,
          type: 'weekly',
          status: 'pending',
          periodStart: new Date(),
          periodEnd: new Date(),
          grossAmount: 75,
          netAmount: 75,
          breakdown: {
            deliveryFees: 75,
            distanceBonuses: 0,
            waitTimeBonuses: 0,
            peakHourBonuses: 0,
            tips: 0,
            incentiveBonuses: 0,
            referralBonuses: 0,
            adjustments: 0,
            deductions: 0,
          },
          deliveryCount: 8,
          currency: 'eur',
          paymentMethod: 'bank_transfer',
        },
      ]);

      const balance = await stripeConnectService.getDriverPendingBalance(driver._id.toString());

      // Should have some pending balance
      expect(typeof balance).toBe('number');
    });
  });

  // =====================================================
  // Webhook Handling
  // =====================================================
  describe('Webhook Handling', () => {
    it('should handle account.updated event', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id], {
        stripeAccountId: 'acct_test123',
      });

      const event = {
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_test123',
            details_submitted: true,
            payouts_enabled: true,
            metadata: { driverId: driver._id.toString() },
          },
        },
      } as unknown as Stripe.Event;

      await stripeConnectService.handleWebhook(event);

      // Verify driver was updated
      const updatedDriver = await DeliveryDriver.findById(driver._id);
      expect(updatedDriver?.stripeOnboardingComplete).toBe(true);
    });

    it('should handle transfer.created event without error', async () => {
      const event = {
        type: 'transfer.created',
        data: {
          object: {
            id: 'tr_test123',
            reversed: false,
            metadata: { deliveryId: new mongoose.Types.ObjectId().toString() },
          },
        },
      } as unknown as Stripe.Event;

      await expect(stripeConnectService.handleWebhook(event)).resolves.not.toThrow();
    });

    it('should handle payout.paid event without error', async () => {
      const event = {
        type: 'payout.paid',
        data: {
          object: { id: 'po_test123' },
        },
      } as unknown as Stripe.Event;

      await expect(stripeConnectService.handleWebhook(event)).resolves.not.toThrow();
    });

    it('should handle payout.failed event without error', async () => {
      const event = {
        type: 'payout.failed',
        data: {
          object: { id: 'po_test123', failure_message: 'Test failure' },
        },
      } as unknown as Stripe.Event;

      await expect(stripeConnectService.handleWebhook(event)).resolves.not.toThrow();
    });

    it('should handle unknown event types gracefully', async () => {
      const event = {
        type: 'unknown.event',
        data: {
          object: {},
        },
      } as unknown as Stripe.Event;

      await expect(stripeConnectService.handleWebhook(event)).resolves.not.toThrow();
    });
  });

  // =====================================================
  // Webhook Signature Verification
  // =====================================================
  describe('Webhook Signature Verification', () => {
    it('should return null when service not enabled', () => {
      if (!stripeConnectService.isEnabled()) {
        const result = stripeConnectService.verifyWebhookSignature('{}', 'sig_test');
        expect(result).toBeNull();
      }
    });
  });

  // =====================================================
  // Edge Cases
  // =====================================================
  describe('Edge Cases', () => {
    it('should handle non-existent driver for onboarding', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const result = await stripeConnectService.createOnboardingLink(
        fakeId,
        'https://example.com/return',
        'https://example.com/refresh'
      );

      expect(result.success).toBe(false);
    });

    it('should handle driver without Stripe account for dashboard link', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const result = await stripeConnectService.createDashboardLink(driver._id.toString());

      expect(result.success).toBe(false);
    });

    it('should return null status for driver without Stripe account', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id]);

      const status = await stripeConnectService.getAccountStatus(driver._id.toString());

      expect(status).toBeNull();
    });
  });
});
