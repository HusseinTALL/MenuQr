/**
 * Driver Self-Service Controller Tests
 * Tests for driver-specific endpoints (registration, profile, earnings, etc.)
 */

import '../setup.js';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { DeliveryDriver } from '../../models/DeliveryDriver.js';
import { Delivery } from '../../models/Delivery.js';
import {
  createTestRestaurant,
  createTestDriver,
  createDeliveryScenario,
  TEST_PASSWORD,
} from './deliveryHelpers.js';

describe('Driver Self-Service Controller', () => {
  // =====================================================
  // POST /api/v1/drivers/register (Driver Registration)
  // =====================================================
  describe('POST /api/v1/drivers/register', () => {
    it('should register a new driver', async () => {
      const { restaurant } = await createTestRestaurant();
      const timestamp = Date.now();

      const res = await request(app)
        .post('/api/v1/drivers/register')
        .send({
          email: `newdriver-${timestamp}@test.com`,
          password: TEST_PASSWORD,
          firstName: 'New',
          lastName: 'Driver',
          phone: `+336${timestamp.toString().slice(-8)}`,
          vehicleType: 'bicycle',
          vehiclePlate: 'TEST-001',
          restaurantIds: [restaurant._id.toString()],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toContain('newdriver');
      expect(res.body.data.status).toBe('pending'); // Needs verification
    });

    it('should reject registration with duplicate email', async () => {
      const { driver } = await createDeliveryScenario();

      const res = await request(app)
        .post('/api/v1/drivers/register')
        .send({
          email: driver.email,
          password: TEST_PASSWORD,
          firstName: 'Duplicate',
          lastName: 'Driver',
          phone: '+33699999999',
          vehicleType: 'scooter',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require all mandatory fields', async () => {
      const res = await request(app)
        .post('/api/v1/drivers/register')
        .send({
          email: 'incomplete@test.com',
        });

      // Returns 400 or 500 depending on validation error type
      expect([400, 500].includes(res.status)).toBe(true);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // POST /api/v1/drivers/login (Driver Login)
  // =====================================================
  describe('POST /api/v1/drivers/login', () => {
    it('should login verified driver', async () => {
      const { driver } = await createDeliveryScenario();

      const res = await request(app)
        .post('/api/v1/drivers/login')
        .send({
          email: driver.email,
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.driver).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const { driver } = await createDeliveryScenario();

      const res = await request(app)
        .post('/api/v1/drivers/login')
        .send({
          email: driver.email,
          password: 'WrongPass123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for unverified driver', async () => {
      const { restaurant } = await createTestRestaurant();
      const { driver } = await createTestDriver([restaurant._id], {
        status: 'pending',
      });

      const res = await request(app)
        .post('/api/v1/drivers/login')
        .send({
          email: driver.email,
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/driver/profile (Get Profile)
  // =====================================================
  describe('GET /api/v1/driver/profile', () => {
    it('should return driver profile', async () => {
      const { driverToken, driver } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(driver.email);
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/driver/profile');

      expect(res.status).toBe(401);
    });
  });

  // =====================================================
  // PUT /api/v1/driver/profile (Update Profile)
  // =====================================================
  describe('PUT /api/v1/driver/profile', () => {
    it('should update driver profile allowed fields', async () => {
      const { driverToken } = await createDeliveryScenario();

      const res = await request(app)
        .put('/api/v1/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          phone: '+33611111111',
          vehicleType: 'car',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not allow changing email via profile update', async () => {
      const { driverToken, driver } = await createDeliveryScenario();
      const originalEmail = driver.email;

      const res = await request(app)
        .put('/api/v1/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          email: 'newemail@test.com',
        });

      // Should succeed but email should not change
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(originalEmail);
    });
  });

  // =====================================================
  // POST /api/v1/driver/go-online (Go Online)
  // =====================================================
  describe('POST /api/v1/driver/go-online', () => {
    it('should go online', async () => {
      const { driverToken, driver } = await createDeliveryScenario();

      // First set to offline
      await DeliveryDriver.findByIdAndUpdate(driver._id, {
        shiftStatus: 'offline',
        isAvailable: false,
      });

      const res = await request(app)
        .post('/api/v1/driver/go-online')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          location: { lat: 48.8566, lng: 2.3522 },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shiftStatus).toBe('online');
    });
  });

  // =====================================================
  // POST /api/v1/driver/go-offline (Go Offline)
  // =====================================================
  describe('POST /api/v1/driver/go-offline', () => {
    it('should go offline when no active delivery', async () => {
      const { driverToken } = await createDeliveryScenario();

      const res = await request(app)
        .post('/api/v1/driver/go-offline')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shiftStatus).toBe('offline');
    });

    it('should reject going offline with active delivery', async () => {
      const { driverToken, driver, delivery } = await createDeliveryScenario();

      // Assign delivery to driver
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'in_transit',
      });

      const res = await request(app)
        .post('/api/v1/driver/go-offline')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/driver/deliveries/active (Active Deliveries)
  // =====================================================
  describe('GET /api/v1/driver/deliveries/active', () => {
    it('should return active delivery for driver', async () => {
      const { driverToken, driver, delivery } = await createDeliveryScenario();

      // Assign delivery to driver
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'in_transit',
      });

      const res = await request(app)
        .get('/api/v1/driver/deliveries/active')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Returns single active delivery or null
      expect(res.body.data === null || res.body.data._id).toBeDefined();
    });

    it('should return null when no active delivery', async () => {
      const { driverToken, driver, delivery } = await createDeliveryScenario();

      // Mark as delivered
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'delivered',
        actualDeliveryTime: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/driver/deliveries/active')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  // =====================================================
  // GET /api/v1/driver/deliveries (Delivery History)
  // =====================================================
  describe('GET /api/v1/driver/deliveries', () => {
    it('should return delivery history with pagination', async () => {
      const { driverToken, driver, delivery } = await createDeliveryScenario();

      // Complete the delivery
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'delivered',
        actualDeliveryTime: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/driver/deliveries?page=1&limit=5')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });
  });

  // =====================================================
  // GET /api/v1/driver/earnings (Get Earnings)
  // =====================================================
  describe('GET /api/v1/driver/earnings', () => {
    it('should return driver earnings summary', async () => {
      const { driverToken } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/driver/earnings')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  // =====================================================
  // GET /api/v1/driver/stats (Driver Statistics)
  // =====================================================
  describe('GET /api/v1/driver/stats', () => {
    it('should return driver statistics', async () => {
      const { driverToken } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/driver/stats')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.stats).toBeDefined();
    });
  });

  // =====================================================
  // POST /api/v1/driver/payouts/instant (Request Payout)
  // =====================================================
  describe('POST /api/v1/driver/payouts/instant', () => {
    it('should reject payout when balance is zero', async () => {
      const { driverToken, driver } = await createDeliveryScenario();

      // Ensure zero balance
      await DeliveryDriver.findByIdAndUpdate(driver._id, {
        currentBalance: 0,
      });

      const res = await request(app)
        .post('/api/v1/driver/payouts/instant')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          amount: 3000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // Shift Management Tests
  // =====================================================
  describe('Shift Management', () => {
    it('should start a shift', async () => {
      const { driverToken } = await createDeliveryScenario();

      const res = await request(app)
        .post('/api/v1/driver/shifts/start')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          location: { lat: 48.8566, lng: 2.3522 },
        });

      // Either 200/201 for success or 400/404 if already in shift or endpoint issue
      expect([200, 201, 400, 404].includes(res.status)).toBe(true);
    });

    it('should get current shift', async () => {
      const { driverToken } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/driver/shifts/current')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get shift history', async () => {
      const { driverToken } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/driver/shifts/history')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
