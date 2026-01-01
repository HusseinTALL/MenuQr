/**
 * Hotel Order Module Integration Tests
 * Tests order creation, status management, and order flow
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import {
  createTestHotel,
  createTestHotelUser,
  createTestRooms,
  createTestGuest,
  createTestMenu,
  createTestHotelCategories,
  createTestHotelDishes,
  createTestHotelOrder,
} from './hotelHelpers.js';

describe('Hotel Order Module', () => {
  describe('Order Creation', () => {
    describe('POST /api/v1/hotels/:hotelId/orders', () => {
      it('should create an order as guest', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 2);

        // Authenticate as guest first
        const authRes = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({ accessCode: guest.accessCode });

        const guestToken = authRes.body.data.token;

        const orderData = {
          roomId: rooms[0]._id.toString(),
          items: [
            {
              dishId: dishes[0]._id.toString(),
              quantity: 2,
            },
            {
              dishId: dishes[1]._id.toString(),
              quantity: 1,
              specialInstructions: 'No onions please',
            },
          ],
          paymentMethod: 'room_charge',
          deliveryInstructions: 'Please knock',
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders`)
          .set('Authorization', `Bearer ${guestToken}`)
          .send(orderData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.orderNumber).toBeDefined();
        expect(res.body.data.items.length).toBe(2);
        expect(res.body.data.status).toBe('pending');
        expect(res.body.data.paymentMethod).toBe('room_charge');
      });

      it('should calculate totals correctly', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        const authRes = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({ accessCode: guest.accessCode });

        const guestToken = authRes.body.data.token;

        const orderData = {
          roomId: rooms[0]._id.toString(),
          items: [
            {
              dishId: dishes[0]._id.toString(),
              quantity: 2,
            },
          ],
          paymentMethod: 'room_charge',
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders`)
          .set('Authorization', `Bearer ${guestToken}`)
          .send(orderData);

        expect(res.status).toBe(201);
        // dishes[0].price is 15 (from helper), quantity 2 = 30 subtotal
        // 10% service charge = 3
        // total = 33
        expect(res.body.data.subtotal).toBe(30);
        expect(res.body.data.serviceCharge).toBe(3);
        expect(res.body.data.total).toBe(33);
      });

      it('should reject order for room without active guest', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        const orderData = {
          roomId: rooms[0]._id.toString(),
          items: [
            {
              dishId: dishes[0]._id.toString(),
              quantity: 1,
            },
          ],
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders`)
          .send(orderData);

        expect(res.status).toBe(401);
      });
    });

    describe('POST /api/v1/hotels/:hotelId/orders/staff', () => {
      it('should allow staff to create order on behalf of guest', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');
        const rooms = await createTestRooms(hotel._id, 1);
        await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        const orderData = {
          roomId: rooms[0]._id.toString(),
          guestName: 'Phone Order Guest',
          guestPhone: '+33600111222',
          items: [
            {
              dishId: dishes[0]._id.toString(),
              quantity: 1,
            },
          ],
          paymentMethod: 'cash',
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders/staff`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(orderData);

        expect(res.status).toBe(201);
        expect(res.body.data.guestName).toBe('Phone Order Guest');
      });
    });
  });

  describe('Order Retrieval', () => {
    describe('GET /api/v1/hotels/:hotelId/orders', () => {
      it('should list all orders for hotel staff', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        // Create multiple orders
        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes);
        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes);

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/orders`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
      });

      it('should filter orders by status', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes, {
          status: 'pending',
        });
        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes, {
          status: 'preparing',
        });

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/orders?status=pending`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].status).toBe('pending');
      });
    });

    describe('GET /api/v1/hotels/:hotelId/orders/kitchen', () => {
      it('should return orders for kitchen display', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_kitchen');
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes, {
          status: 'pending',
        });
        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes, {
          status: 'preparing',
        });
        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes, {
          status: 'delivered', // Should not appear
        });

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/orders/kitchen`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2); // Only pending and preparing
      });
    });

    describe('GET /api/v1/hotels/:hotelId/orders/:orderId', () => {
      it('should get order details', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes
        );

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/orders/${order._id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.orderNumber).toBe(order.orderNumber);
      });
    });
  });

  describe('Order Status Management', () => {
    describe('PATCH /api/v1/hotels/:hotelId/orders/:orderId/status', () => {
      it('should update order status', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_kitchen');
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes
        );

        const res = await request(app)
          .patch(`/api/v1/hotels/${hotel._id}/orders/${order._id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ status: 'preparing' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('preparing');
      });

      it('should follow valid status transitions', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_kitchen');
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes
        );

        // Pending -> Confirmed
        let res = await request(app)
          .patch(`/api/v1/hotels/${hotel._id}/orders/${order._id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ status: 'confirmed' });
        expect(res.body.data.status).toBe('confirmed');

        // Confirmed -> Preparing
        res = await request(app)
          .patch(`/api/v1/hotels/${hotel._id}/orders/${order._id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ status: 'preparing' });
        expect(res.body.data.status).toBe('preparing');

        // Preparing -> Ready
        res = await request(app)
          .patch(`/api/v1/hotels/${hotel._id}/orders/${order._id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ status: 'ready' });
        expect(res.body.data.status).toBe('ready');
      });
    });

    describe('POST /api/v1/hotels/:hotelId/orders/:orderId/pickup', () => {
      it('should mark order as picked up by room service', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'room_service');
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes,
          { status: 'ready' }
        );

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders/${order._id}/pickup`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('picked_up');
      });
    });

    describe('POST /api/v1/hotels/:hotelId/orders/:orderId/deliver', () => {
      it('should mark order as delivered', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'room_service');
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes,
          { status: 'picked_up' }
        );

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders/${order._id}/deliver`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('delivered');
      });
    });
  });

  describe('Order Cancellation', () => {
    describe('POST /api/v1/hotels/:hotelId/orders/:orderId/cancel', () => {
      it('should allow guest to cancel pending order', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes,
          { guestId: guest._id }
        );

        // Authenticate as guest
        const authRes = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({ accessCode: guest.accessCode });

        const guestToken = authRes.body.data.token;

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders/${order._id}/cancel`)
          .set('Authorization', `Bearer ${guestToken}`)
          .send({ reason: 'Changed my mind' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('cancelled');
      });

      it('should not allow cancellation of preparing order by guest', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes,
          { guestId: guest._id, status: 'preparing' }
        );

        const authRes = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({ accessCode: guest.accessCode });

        const guestToken = authRes.body.data.token;

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders/${order._id}/cancel`)
          .set('Authorization', `Bearer ${guestToken}`);

        expect(res.status).toBe(400);
      });

      it('should allow staff to cancel any order', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_manager');
        const rooms = await createTestRooms(hotel._id, 1);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes,
          { status: 'preparing' }
        );

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders/${order._id}/cancel`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ reason: 'Kitchen issue' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('cancelled');
      });
    });
  });

  describe('Order Rating', () => {
    describe('POST /api/v1/hotels/:hotelId/orders/:orderId/rate', () => {
      it('should allow guest to rate delivered order', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes,
          { guestId: guest._id, status: 'delivered' }
        );

        const authRes = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({ accessCode: guest.accessCode });

        const guestToken = authRes.body.data.token;

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders/${order._id}/rate`)
          .set('Authorization', `Bearer ${guestToken}`)
          .send({
            rating: 5,
            comment: 'Excellent service!',
          });

        expect(res.status).toBe(200);
        expect(res.body.data.rating).toBeDefined();
        expect(res.body.data.rating.score).toBe(5);
      });

      it('should not allow rating non-delivered orders', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);
        const order = await createTestHotelOrder(
          hotel._id,
          rooms[0]._id,
          rooms[0].roomNumber,
          dishes,
          { guestId: guest._id, status: 'pending' }
        );

        const authRes = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({ accessCode: guest.accessCode });

        const guestToken = authRes.body.data.token;

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/orders/${order._id}/rate`)
          .set('Authorization', `Bearer ${guestToken}`)
          .send({ rating: 5 });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Guest Order History', () => {
    describe('GET /api/v1/hotels/guest/orders', () => {
      it('should return guest order history', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        // Create multiple orders for the guest
        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes, {
          guestId: guest._id,
        });
        await createTestHotelOrder(hotel._id, rooms[0]._id, rooms[0].roomNumber, dishes, {
          guestId: guest._id,
        });

        const authRes = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({ accessCode: guest.accessCode });

        const guestToken = authRes.body.data.token;

        const res = await request(app)
          .get('/api/v1/hotels/guest/orders')
          .set('Authorization', `Bearer ${guestToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
      });
    });
  });
});
