/**
 * Order Controller Tests
 * Tests for order management endpoints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Restaurant } from '../models/index.js';
import {
  createTestRestaurant,
  createTestUser,
  createTestCustomer,
  createTestCategories,
  createTestDishes,
  createTestTables,
  createTestOrder,
  TEST_PHONE,
} from './helpers.js';
import mongoose from 'mongoose';

describe('Order Controller', () => {
  let restaurant: InstanceType<typeof Restaurant>;
  let ownerToken: string;
  let _customerToken: string;
  let customerId: mongoose.Types.ObjectId;
  let dishes: Awaited<ReturnType<typeof createTestDishes>>;

  beforeEach(async () => {
    // Set up test data
    restaurant = await createTestRestaurant();
    const { accessToken: ownerAccessToken } = await createTestUser(restaurant._id);
    ownerToken = ownerAccessToken;

    const { customer, accessToken: customerAccessToken } = await createTestCustomer(restaurant._id);
    _customerToken = customerAccessToken;
    customerId = customer._id;

    const categories = await createTestCategories(restaurant._id);
    dishes = await createTestDishes(restaurant._id, categories[0]._id, 5);
    await createTestTables(restaurant._id);
  });

  // =====================================================
  // POST /api/v1/orders (Create Order)
  // =====================================================
  describe('POST /api/v1/orders', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        restaurantId: restaurant._id.toString(),
        customerName: 'Test Customer',
        customerPhone: TEST_PHONE,
        tableNumber: '1',
        items: [
          {
            dishId: dishes[0]._id.toString(),
            quantity: 2,
          },
          {
            dishId: dishes[1]._id.toString(),
            quantity: 1,
          },
        ],
        fulfillmentType: 'dine-in',
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.orderNumber).toBeDefined();
    });

    it('should calculate totals correctly', async () => {
      const orderData = {
        restaurantId: restaurant._id.toString(),
        customerName: 'Test Customer',
        customerPhone: TEST_PHONE,
        tableNumber: '1',
        items: [
          {
            dishId: dishes[0]._id.toString(),
            quantity: 2,
          },
        ],
        fulfillmentType: 'dine-in',
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .send(orderData);

      expect(res.status).toBe(201);

      const expectedSubtotal = dishes[0].price * 2;
      expect(res.body.data.subtotal).toBe(expectedSubtotal);
      // Total should be >= subtotal (may or may not include tax depending on restaurant settings)
      expect(res.body.data.total).toBeGreaterThanOrEqual(expectedSubtotal);
    });

    it('should reject order with no items', async () => {
      const orderData = {
        restaurantId: restaurant._id.toString(),
        customerName: 'Test Customer',
        customerPhone: TEST_PHONE,
        tableNumber: '1',
        items: [],
        fulfillmentType: 'dine-in',
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .send(orderData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject order with invalid restaurant ID', async () => {
      const orderData = {
        restaurantId: new mongoose.Types.ObjectId().toString(),
        customerName: 'Test Customer',
        customerPhone: TEST_PHONE,
        tableNumber: '1',
        items: [
          {
            dishId: dishes[0]._id.toString(),
            quantity: 1,
          },
        ],
        fulfillmentType: 'dine-in',
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .send(orderData);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject order with unavailable dish', async () => {
      // Make dish unavailable
      dishes[0].isAvailable = false;
      await dishes[0].save();

      const orderData = {
        restaurantId: restaurant._id.toString(),
        customerName: 'Test Customer',
        customerPhone: TEST_PHONE,
        tableNumber: '1',
        items: [
          {
            dishId: dishes[0]._id.toString(),
            quantity: 1,
          },
        ],
        fulfillmentType: 'dine-in',
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .send(orderData);

      // API returns 404 for "not found or unavailable" dishes
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/orders (Admin: Get Restaurant Orders)
  // =====================================================
  describe('GET /api/v1/orders', () => {
    beforeEach(async () => {
      // Create some test orders
      for (let i = 0; i < 5; i++) {
        await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), {
          status: i % 2 === 0 ? 'pending' : 'confirmed',
        });
      }
    });

    it('should return orders for restaurant owner', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders).toBeDefined();
      expect(res.body.data.orders).toHaveLength(5);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter orders by status', async () => {
      const res = await request(app)
        .get('/api/v1/orders?status=pending')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.every((o: { status: string }) => o.status === 'pending')).toBe(true);
    });

    it('should paginate orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders?page=1&limit=2')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders).toHaveLength(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.pagination.total).toBe(5);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/v1/orders');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/orders/:id
  // =====================================================
  describe('GET /api/v1/orders/:id', () => {
    it('should return order by ID', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2));

      const res = await request(app)
        .get(`/api/v1/orders/${order._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(order._id.toString());
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${new mongoose.Types.ObjectId()}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/orders/number/:orderNumber
  // =====================================================
  describe('GET /api/v1/orders/number/:orderNumber', () => {
    it('should return order by order number', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2));

      const res = await request(app)
        .get(`/api/v1/orders/number/${order.orderNumber}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBe(order.orderNumber);
    });
  });

  // =====================================================
  // PATCH /api/v1/orders/:id/status
  // =====================================================
  describe('PATCH /api/v1/orders/:id/status', () => {
    it('should update order status', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2));

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('confirmed');
      expect(res.body.data.confirmedAt).toBeDefined();
    });

    it('should update to preparing status', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), {
        status: 'confirmed',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'preparing' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('preparing');
    });

    it('should update to ready status', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), {
        status: 'preparing',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'ready' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ready');
      // Order model doesn't have readyAt, status change to 'ready' is sufficient
    });

    it('should update to completed status', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), {
        status: 'ready',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.completedAt).toBeDefined();
    });

    it('should cancel order with reason', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2));

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'cancelled',
          cancelReason: 'Customer requested cancellation',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
      expect(res.body.data.cancelledAt).toBeDefined();
      expect(res.body.data.cancelReason).toBe('Customer requested cancellation');
    });

    it('should reject invalid status', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2));

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const order = await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2));

      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/orders/active (Active Orders)
  // =====================================================
  describe('GET /api/v1/orders/active', () => {
    beforeEach(async () => {
      // Create orders with different statuses
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), { status: 'pending' });
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), { status: 'confirmed' });
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), { status: 'preparing' });
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), { status: 'ready' });
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), { status: 'completed' });
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), { status: 'cancelled' });
    });

    it('should return only active orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders/active')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Active orders are: pending, confirmed, preparing, ready (4 total)
      expect(res.body.data.length).toBe(4);

      const statuses = res.body.data.map((o: { status: string }) => o.status);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('confirmed');
      expect(statuses).toContain('preparing');
      expect(statuses).toContain('ready');
      expect(statuses).not.toContain('completed');
      expect(statuses).not.toContain('cancelled');
    });
  });

  // =====================================================
  // GET /api/v1/orders/stats
  // =====================================================
  describe('GET /api/v1/orders/stats', () => {
    beforeEach(async () => {
      // Create orders with different statuses and totals
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 2), {
        status: 'completed',
        paymentStatus: 'paid',
      });
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 3), {
        status: 'completed',
        paymentStatus: 'paid',
      });
      await createTestOrder(restaurant._id, customerId, dishes.slice(0, 1), {
        status: 'pending',
      });
    });

    it('should return order statistics', async () => {
      const res = await request(app)
        .get('/api/v1/orders/stats')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});
