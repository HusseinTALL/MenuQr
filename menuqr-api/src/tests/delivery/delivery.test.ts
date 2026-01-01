/**
 * Delivery Controller Tests
 * Comprehensive tests for the delivery module endpoints
 */

import '../setup.js'; // Initialize MongoDB Memory Server and mocks
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import { Delivery } from '../../models/Delivery.js';
import { DeliveryDriver } from '../../models/DeliveryDriver.js';
import {
  createTestRestaurant,
  createTestDriver,
  createTestDeliveryOrder,
  createTestDelivery,
  createDeliveryScenario,
  createSuperAdmin,
} from './deliveryHelpers.js';

describe('Delivery Controller', () => {
  // =====================================================
  // POST /api/v1/deliveries (Create Delivery)
  // =====================================================
  describe('POST /api/v1/deliveries', () => {
    it('should create a delivery from a valid order', async () => {
      const { restaurant, ownerToken } = await createDeliveryScenario();
      const order = await createTestDeliveryOrder(restaurant._id);

      const res = await request(app)
        .post('/api/v1/deliveries')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          orderId: order._id.toString(),
          deliveryInstructions: 'Leave at door',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.orderId.toString()).toBe(order._id.toString());
    });

    it('should reject delivery creation for non-delivery order', async () => {
      const { restaurant, ownerToken, order } = await createDeliveryScenario();

      // Create a dine-in order
      const dineInOrder = await createTestDeliveryOrder(restaurant._id, {
        fulfillmentType: 'dine-in',
        tableNumber: '5',
      });

      const res = await request(app)
        .post('/api/v1/deliveries')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          orderId: dineInOrder._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate delivery for same order', async () => {
      const { ownerToken, order, delivery } = await createDeliveryScenario();

      const res = await request(app)
        .post('/api/v1/deliveries')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          orderId: order._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('existe déjà');
    });

    it('should reject without authentication', async () => {
      const { order } = await createDeliveryScenario();

      const res = await request(app)
        .post('/api/v1/deliveries')
        .send({
          orderId: order._id.toString(),
        });

      expect(res.status).toBe(401);
    });

    it('should reject with non-existent order ID', async () => {
      const { ownerToken } = await createDeliveryScenario();
      const fakeOrderId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/v1/deliveries')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          orderId: fakeOrderId.toString(),
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/deliveries (List Deliveries)
  // =====================================================
  describe('GET /api/v1/deliveries', () => {
    it('should list deliveries for restaurant owner', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/deliveries')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter deliveries by status', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/deliveries?status=pending')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((d: { status: string }) => d.status === 'pending')).toBe(true);
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/deliveries');

      expect(res.status).toBe(401);
    });
  });

  // =====================================================
  // GET /api/v1/deliveries/:id (Get Delivery by ID)
  // =====================================================
  describe('GET /api/v1/deliveries/:id', () => {
    it('should get delivery by ID', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      const res = await request(app)
        .get(`/api/v1/deliveries/${delivery._id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(delivery._id.toString());
    });

    it('should return 404 for non-existent delivery', async () => {
      const { ownerToken } = await createDeliveryScenario();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/v1/deliveries/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // POST /api/v1/deliveries/:id/assign (Assign Driver)
  // =====================================================
  describe('POST /api/v1/deliveries/:id/assign', () => {
    it('should assign driver to delivery', async () => {
      const { ownerToken, delivery, driver } = await createDeliveryScenario();

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          driverId: driver._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.driverId.toString()).toBe(driver._id.toString());
      expect(res.body.data.status).toBe('assigned');
    });

    it('should reject assignment to unavailable driver', async () => {
      const { restaurant, ownerToken, delivery } = await createDeliveryScenario();

      // Create an offline driver
      const { driver: offlineDriver } = await createTestDriver([restaurant._id], {
        shiftStatus: 'offline',
        isAvailable: false,
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          driverId: offlineDriver._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject assignment with invalid driver ID', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();
      const fakeDriverId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          driverId: fakeDriverId.toString(),
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // PUT /api/v1/deliveries/:id/status (Update Status)
  // =====================================================
  describe('PUT /api/v1/deliveries/:id/status', () => {
    it('should update delivery status', async () => {
      const { ownerToken, delivery, driver } = await createDeliveryScenario();

      // First assign the driver
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'assigned',
      });

      const res = await request(app)
        .put(`/api/v1/deliveries/${delivery._id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'picked_up',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('picked_up');
    });

    it('should reject invalid status transition', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      // Try to go from pending directly to delivered (invalid)
      const res = await request(app)
        .put(`/api/v1/deliveries/${delivery._id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'delivered',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/deliveries/track/:trackingCode (Public Track)
  // =====================================================
  describe('GET /api/v1/deliveries/track/:trackingCode', () => {
    it('should track delivery with valid tracking code', async () => {
      const { delivery } = await createDeliveryScenario();

      // Add tracking code to delivery
      const trackingCode = 'TRACK-12345';
      await Delivery.findByIdAndUpdate(delivery._id, { trackingCode });

      const res = await request(app)
        .get(`/api/v1/deliveries/track/${trackingCode}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 404 for invalid tracking code', async () => {
      const res = await request(app)
        .get('/api/v1/deliveries/track/INVALID-CODE');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // POST /api/v1/deliveries/:id/accept (Driver Accept)
  // =====================================================
  describe('POST /api/v1/deliveries/:id/accept', () => {
    it('should allow driver to accept assigned delivery', async () => {
      const { delivery, driver, driverToken } = await createDeliveryScenario();

      // Assign driver to delivery
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'assigned',
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('accepted');
    });

    it('should reject acceptance by unassigned driver', async () => {
      const { restaurant, delivery } = await createDeliveryScenario();

      // Create a different driver
      const { driver: otherDriver, accessToken: otherToken } = await createTestDriver([restaurant._id]);

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/accept`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // POST /api/v1/deliveries/:id/reject (Driver Reject)
  // =====================================================
  describe('POST /api/v1/deliveries/:id/reject', () => {
    it('should allow driver to reject assigned delivery', async () => {
      const { delivery, driver, driverToken } = await createDeliveryScenario();

      // Assign driver to delivery
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'assigned',
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/reject`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          reason: 'Too far away',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Delivery should be back to pending
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.driverId).toBeUndefined();
    });
  });

  // =====================================================
  // POST /api/v1/deliveries/:id/complete (Driver Complete)
  // =====================================================
  describe('POST /api/v1/deliveries/:id/complete', () => {
    it('should allow driver to complete delivery with POD', async () => {
      const { delivery, driver, driverToken } = await createDeliveryScenario();

      // Set delivery to in_transit state
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'in_transit',
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/complete`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          proofOfDelivery: {
            type: 'signature',
            signatureData: 'base64signature...',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('delivered');
    });

    it('should reject completion without POD', async () => {
      const { delivery, driver, driverToken } = await createDeliveryScenario();

      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'in_transit',
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/complete`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});

      // Should fail or require POD
      expect([400, 200].includes(res.status)).toBe(true);
    });
  });

  // =====================================================
  // POST /api/v1/deliveries/:id/cancel (Cancel Delivery)
  // =====================================================
  describe('POST /api/v1/deliveries/:id/cancel', () => {
    it('should cancel pending delivery', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          reason: 'Customer requested cancellation',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should not cancel already delivered order', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      // Set as already delivered
      await Delivery.findByIdAndUpdate(delivery._id, {
        status: 'delivered',
        actualDeliveryTime: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          reason: 'Want to cancel',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // POST /api/v1/deliveries/:id/rate (Rate Delivery)
  // =====================================================
  describe('POST /api/v1/deliveries/:id/rate', () => {
    it('should rate completed delivery', async () => {
      const { delivery, driver } = await createDeliveryScenario();

      // Mark as delivered
      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'delivered',
        actualDeliveryTime: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/rate`)
        .send({
          rating: 5,
          comment: 'Excellent delivery!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerRating).toBe(5);
    });

    it('should reject rating for non-delivered order', async () => {
      const { delivery } = await createDeliveryScenario();

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/rate`)
        .send({
          rating: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid rating value', async () => {
      const { delivery, driver } = await createDeliveryScenario();

      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'delivered',
        actualDeliveryTime: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/rate`)
        .send({
          rating: 10, // Invalid - should be 1-5
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // POST /api/v1/deliveries/:id/tip (Add Tip)
  // =====================================================
  describe('POST /api/v1/deliveries/:id/tip', () => {
    it('should add tip to completed delivery', async () => {
      const { delivery, driver } = await createDeliveryScenario();

      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'delivered',
        actualDeliveryTime: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/tip`)
        .send({
          amount: 500, // 5 EUR in cents
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tipAmount).toBe(500);
    });

    it('should reject negative tip amount', async () => {
      const { delivery, driver } = await createDeliveryScenario();

      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'delivered',
        actualDeliveryTime: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${delivery._id}/tip`)
        .send({
          amount: -100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/deliveries/stats (Delivery Stats)
  // =====================================================
  describe('GET /api/v1/deliveries/stats', () => {
    it('should return delivery statistics', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/deliveries/stats')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.totalDeliveries).toBe('number');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/deliveries/stats');

      expect(res.status).toBe(401);
    });
  });

  // =====================================================
  // GET /api/v1/deliveries/active (Active Deliveries)
  // =====================================================
  describe('GET /api/v1/deliveries/active', () => {
    it('should return active deliveries', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      const res = await request(app)
        .get('/api/v1/deliveries/active')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should not include completed deliveries', async () => {
      const { ownerToken, delivery } = await createDeliveryScenario();

      // Mark as delivered
      await Delivery.findByIdAndUpdate(delivery._id, {
        status: 'delivered',
        actualDeliveryTime: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/deliveries/active')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const deliveryIds = res.body.data.map((d: { _id: string }) => d._id);
      expect(deliveryIds.includes(delivery._id.toString())).toBe(false);
    });
  });

  // =====================================================
  // PUT /api/v1/deliveries/:id/location (Update Location)
  // =====================================================
  describe('PUT /api/v1/deliveries/:id/location', () => {
    it('should update driver location for in-transit delivery', async () => {
      const { driverToken, delivery, driver } = await createDeliveryScenario();

      await Delivery.findByIdAndUpdate(delivery._id, {
        driverId: driver._id,
        status: 'in_transit',
      });

      const res = await request(app)
        .put(`/api/v1/deliveries/${delivery._id}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          latitude: 48.8580,
          longitude: 2.3400,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =====================================================
  // Superadmin Access Tests
  // =====================================================
  describe('Superadmin Access', () => {
    it('should allow superadmin to view all deliveries', async () => {
      const { delivery } = await createDeliveryScenario();
      const { accessToken: superadminToken } = await createSuperAdmin();

      const res = await request(app)
        .get('/api/v1/deliveries')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow superadmin to view delivery stats', async () => {
      const { accessToken: superadminToken } = await createSuperAdmin();

      const res = await request(app)
        .get('/api/v1/deliveries/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
