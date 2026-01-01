/**
 * Hotel Guest Module Integration Tests
 * Tests guest registration, authentication, check-in/check-out
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { Room } from '../../models/index.js';
import {
  createTestHotel,
  createTestHotelUser,
  createTestRooms,
  createTestGuest,
} from './hotelHelpers.js';

describe('Hotel Guest Module', () => {
  describe('Guest Registration', () => {
    describe('POST /api/v1/hotels/:hotelId/guests', () => {
      it('should register a new guest', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');
        const rooms = await createTestRooms(hotel._id, 1);

        const guestData = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+33600123456',
          roomId: rooms[0]._id.toString(),
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          preferredLanguage: 'en',
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guests`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(guestData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('John Doe');
        expect(res.body.data.accessCode).toBeDefined();
        expect(res.body.data.status).toBe('checked_in');
      });

      it('should update room status to occupied after check-in', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');
        const rooms = await createTestRooms(hotel._id, 1);

        const guestData = {
          name: 'Jane Doe',
          roomId: rooms[0]._id.toString(),
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        };

        await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guests`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(guestData);

        const updatedRoom = await Room.findById(rooms[0]._id);
        expect(updatedRoom?.status).toBe('occupied');
      });

      it('should not register guest in occupied room', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');
        const rooms = await createTestRooms(hotel._id, 1);

        // Occupy the room first
        await Room.findByIdAndUpdate(rooms[0]._id, { status: 'occupied' });

        const guestData = {
          name: 'Another Guest',
          roomId: rooms[0]._id.toString(),
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guests`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(guestData);

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/hotels/:hotelId/guests', () => {
      it('should list all guests', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 3);

        // Create multiple guests
        await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        await createTestGuest(hotel._id, rooms[1]._id, rooms[1].roomNumber);

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/guests`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
      });

      it('should filter guests by status', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id);
        const rooms = await createTestRooms(hotel._id, 2);

        const guest1 = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);
        await createTestGuest(hotel._id, rooms[1]._id, rooms[1].roomNumber, { status: 'checked_out' });

        const res = await request(app)
          .get(`/api/v1/hotels/${hotel._id}/guests?status=checked_in`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0]._id.toString()).toBe(guest1._id.toString());
      });
    });
  });

  describe('Guest Authentication', () => {
    describe('POST /api/v1/hotels/:hotelId/guest/auth/access-code', () => {
      it('should authenticate guest with access code', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({
            accessCode: guest.accessCode,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.guest).toBeDefined();
        expect(res.body.data.guest.name).toBe(guest.name);
      });

      it('should reject invalid access code', async () => {
        const { hotel } = await createTestHotel();

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({
            accessCode: 'INVALID123',
          });

        expect(res.status).toBe(401);
      });

      it('should reject checked-out guest', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber, {
          status: 'checked_out',
        });

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/access-code`)
          .send({
            accessCode: guest.accessCode,
          });

        expect(res.status).toBe(401);
      });
    });

    describe('POST /api/v1/hotels/:hotelId/guest/auth/pin', () => {
      it('should authenticate guest with PIN', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber, {
          pin: '1234',
        });

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/pin`)
          .send({
            roomNumber: rooms[0].roomNumber,
            pin: '1234',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
      });

      it('should reject wrong PIN', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);
        await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber, {
          pin: '1234',
        });

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guest/auth/pin`)
          .send({
            roomNumber: rooms[0].roomNumber,
            pin: '0000',
          });

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Guest Check-out', () => {
    describe('POST /api/v1/hotels/:hotelId/guests/:guestId/check-out', () => {
      it('should check out a guest', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);

        // Mark room as occupied
        await Room.findByIdAndUpdate(rooms[0]._id, { status: 'occupied' });

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guests/${guest._id}/check-out`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('checked_out');

        // Verify room status is updated
        const updatedRoom = await Room.findById(rooms[0]._id);
        expect(updatedRoom?.status).toBe('cleaning');
      });

      it('should not check out already checked-out guest', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');
        const rooms = await createTestRooms(hotel._id, 1);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber, {
          status: 'checked_out',
        });

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guests/${guest._id}/check-out`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Guest Transfer', () => {
    describe('POST /api/v1/hotels/:hotelId/guests/:guestId/transfer', () => {
      it('should transfer guest to another room', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');
        const rooms = await createTestRooms(hotel._id, 2);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);

        // Mark old room as occupied
        await Room.findByIdAndUpdate(rooms[0]._id, { status: 'occupied' });

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guests/${guest._id}/transfer`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            newRoomId: rooms[1]._id.toString(),
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.roomId.toString()).toBe(rooms[1]._id.toString());

        // Verify old room is now cleaning
        const oldRoom = await Room.findById(rooms[0]._id);
        expect(oldRoom?.status).toBe('cleaning');

        // Verify new room is occupied
        const newRoom = await Room.findById(rooms[1]._id);
        expect(newRoom?.status).toBe('occupied');
      });

      it('should not transfer to occupied room', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');
        const rooms = await createTestRooms(hotel._id, 2);
        const guest = await createTestGuest(hotel._id, rooms[0]._id, rooms[0].roomNumber);

        // Mark both rooms as occupied
        await Room.findByIdAndUpdate(rooms[0]._id, { status: 'occupied' });
        await Room.findByIdAndUpdate(rooms[1]._id, { status: 'occupied' });

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/guests/${guest._id}/transfer`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            newRoomId: rooms[1]._id.toString(),
          });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Room QR Code', () => {
    describe('GET /api/v1/hotels/rooms/qr/:qrCode', () => {
      it('should get room info by QR code', async () => {
        const { hotel } = await createTestHotel();
        const rooms = await createTestRooms(hotel._id, 1);

        // Set a QR code for the room
        await Room.findByIdAndUpdate(rooms[0]._id, { qrCode: 'ROOM100QR' });

        const res = await request(app).get('/api/v1/hotels/rooms/qr/ROOM100QR');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.room.roomNumber).toBe(rooms[0].roomNumber);
        expect(res.body.data.hotel).toBeDefined();
      });

      it('should return 404 for invalid QR code', async () => {
        const res = await request(app).get('/api/v1/hotels/rooms/qr/INVALIDQR');
        expect(res.status).toBe(404);
      });
    });
  });
});
