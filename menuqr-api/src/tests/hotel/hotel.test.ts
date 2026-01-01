/**
 * Hotel Module Integration Tests
 * Tests hotel CRUD operations, room management, and hotel settings
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { User, Room } from '../../models/index.js';
import {
  createTestHotel,
  createTestHotelUser,
  createTestRooms,
} from './hotelHelpers.js';

describe('Hotel Module', () => {
  describe('Hotel CRUD Operations', () => {
    describe('GET /api/v1/hotels/me', () => {
      it('should return the hotel for authenticated hotel owner', async () => {
        const { hotel, owner } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');

        // Link user to the hotel
        await User.findByIdAndUpdate(owner._id, { hotelId: hotel._id });

        const res = await request(app)
          .get('/api/v1/hotels/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      });

      it('should return 401 without authentication', async () => {
        const res = await request(app).get('/api/v1/hotels/me');
        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/v1/hotels/slug/:slug', () => {
      it('should return hotel by slug (public)', async () => {
        const { hotel } = await createTestHotel();

        const res = await request(app).get(`/api/v1/hotels/slug/${hotel.slug}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe(hotel.name);
        expect(res.body.data.slug).toBe(hotel.slug);
      });

      it('should return 404 for non-existent slug', async () => {
        const res = await request(app).get('/api/v1/hotels/slug/non-existent-hotel');
        expect(res.status).toBe(404);
      });
    });

    describe('PUT /api/v1/hotels/:id', () => {
      it('should update hotel settings', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');

        const updateData = {
          name: 'Updated Hotel Name',
          description: { fr: 'Description mise à jour', en: 'Updated description' },
        };

        const res = await request(app)
          .put(`/api/v1/hotels/${hotel._id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe(updateData.name);
      });

      it('should not allow non-owners to update hotel', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');

        const res = await request(app)
          .put(`/api/v1/hotels/${hotel._id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'Hacked Name' });

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /api/v1/hotels/:id/settings', () => {
      it('should update hotel settings only', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');

        const settingsUpdate = {
          roomService: {
            enabled: false,
            availableHours: { start: '07:00', end: '22:00' },
            minimumOrder: 20,
            deliveryFee: 5,
            serviceChargePercent: 15,
          },
        };

        const res = await request(app)
          .patch(`/api/v1/hotels/${hotel._id}/settings`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(settingsUpdate);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  describe('Room Management', () => {
    describe('GET /api/v1/hotels/:hotelId/rooms', () => {
      it('should list all rooms for a hotel', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        await createTestRooms(hotel._id, 5);

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/rooms`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(5);
      });

      it('should filter rooms by status', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 5);

        // Update one room to occupied
        await Room.findByIdAndUpdate(rooms[0]._id, { status: 'occupied' });

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/rooms?status=available`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(4);
      });
    });

    describe('POST /api/v1/hotels/:hotelId/rooms', () => {
      it('should create a new room', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);

        const roomData = {
          roomNumber: '201',
          floor: 2,
          building: 'Main',
          roomType: 'deluxe',
          capacity: 3,
          amenities: ['wifi', 'tv', 'jacuzzi'],
          isRoomServiceEnabled: true,
          pricePerNight: 250,
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/rooms`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(roomData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.roomNumber).toBe('201');
        expect(res.body.data.roomType).toBe('deluxe');
      });

      it('should not allow duplicate room numbers', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        await createTestRooms(hotel._id, 1);

        const roomData = {
          roomNumber: '100', // Same as first test room
          floor: 1,
          roomType: 'standard',
          capacity: 2,
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/rooms`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(roomData);

        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/v1/hotels/:hotelId/rooms/bulk', () => {
      it('should bulk create rooms', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);

        const bulkData = {
          prefix: '',
          startNumber: 301,
          count: 5,
          floor: 3,
          building: 'Wing B',
          roomType: 'standard',
          capacity: 2,
          isRoomServiceEnabled: true,
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/rooms/bulk`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(bulkData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.created).toBe(5);
      });
    });

    describe('PUT /api/v1/hotels/:hotelId/rooms/:roomId', () => {
      it('should update a room', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 1);

        const updateData = {
          roomType: 'suite',
          capacity: 4,
          pricePerNight: 500,
        };

        const res = await request(app)
          .put(`/api/v1/hotels/${hotel._id}/rooms/${rooms[0]._id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.data.roomType).toBe('suite');
        expect(res.body.data.capacity).toBe(4);
      });
    });

    describe('PATCH /api/v1/hotels/:hotelId/rooms/:roomId/status', () => {
      it('should update room status', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 1);

        const res = await request(app)
          .patch(`/api/v1/hotels/${hotel._id}/rooms/${rooms[0]._id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ status: 'cleaning' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('cleaning');
      });
    });

    describe('DELETE /api/v1/hotels/:hotelId/rooms/:roomId', () => {
      it('should delete a room', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 1);

        const res = await request(app)
          .delete(`/api/v1/hotels/${hotel._id}/rooms/${rooms[0]._id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify room is deleted
        const deletedRoom = await Room.findById(rooms[0]._id);
        expect(deletedRoom).toBeNull();
      });

      it('should not delete room with active guest', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 1);

        // Mark room as occupied
        await Room.findByIdAndUpdate(rooms[0]._id, { status: 'occupied' });

        const res = await request(app)
          .delete(`/api/v1/hotels/${hotel._id}/rooms/${rooms[0]._id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/hotels/:hotelId/rooms/status-summary', () => {
      it('should return room status summary', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 5);

        // Update some room statuses
        await Room.findByIdAndUpdate(rooms[0]._id, { status: 'occupied' });
        await Room.findByIdAndUpdate(rooms[1]._id, { status: 'cleaning' });

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/rooms/status-summary`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.available).toBe(3);
        expect(res.body.data.occupied).toBe(1);
        expect(res.body.data.cleaning).toBe(1);
      });
    });
  });

  describe('Hotel Stats', () => {
    describe('GET /api/v1/hotels/:id/stats', () => {
      it('should return hotel statistics', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        await createTestRooms(hotel._id, 10);

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/stats`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('totalRooms');
        expect(res.body.data.totalRooms).toBe(10);
      });
    });
  });
});
