/**
 * Auth Controller Tests
 * Tests for admin/owner authentication endpoints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User, Restaurant } from '../models/index.js';
import {
  createTestRestaurant,
  createTestUser,
  TEST_PASSWORD,
  randomEmail,
} from './helpers.js';

describe('Auth Controller', () => {
  let restaurant: InstanceType<typeof Restaurant>;

  beforeEach(async () => {
    restaurant = await createTestRestaurant();
  });

  // =====================================================
  // POST /api/v1/auth/register
  // =====================================================
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const email = randomEmail();

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: TEST_PASSWORD,
          name: 'New User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Verify user was created in database
      const user = await User.findOne({ email });
      expect(user).not.toBeNull();
      expect(user?.name).toBe('New User');
    });

    it('should reject registration with existing email', async () => {
      const email = randomEmail();

      // Create user first
      await User.create({
        email,
        password: TEST_PASSWORD,
        name: 'Existing User',
        role: 'owner',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: TEST_PASSWORD,
          name: 'New User',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password (too short)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: randomEmail(),
          password: 'Short1',
          name: 'New User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject password without uppercase', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: randomEmail(),
          password: 'password123',
          name: 'New User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject password without lowercase', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: randomEmail(),
          password: 'PASSWORD123',
          name: 'New User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject password without number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: randomEmail(),
          password: 'PasswordOnly',
          name: 'New User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration without email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          password: TEST_PASSWORD,
          name: 'New User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: TEST_PASSWORD,
          name: 'New User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // POST /api/v1/auth/login
  // =====================================================
  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { user } = await createTestUser(restaurant._id);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const { user } = await createTestUser(restaurant._id);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for deactivated user', async () => {
      const { user } = await createTestUser(restaurant._id, { isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should lock account after 5 failed attempts', async () => {
      const { user } = await createTestUser(restaurant._id);

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: 'WrongPassword123',
          });
      }

      // 6th attempt should return locked status
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: TEST_PASSWORD, // Even correct password should fail
        });

      expect(res.status).toBe(423);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('locked');
    });

    it('should reset failed attempts after successful login', async () => {
      const { user } = await createTestUser(restaurant._id);

      // 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: 'WrongPassword123',
          });
      }

      // Successful login
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(200);

      // Check that failed attempts were reset
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.failedLoginAttempts).toBe(0);
    });
  });

  // =====================================================
  // POST /api/v1/auth/refresh-token
  // =====================================================
  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh tokens successfully', async () => {
      const { refreshToken } = await createTestUser(restaurant._id);

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // GET /api/v1/auth/profile
  // =====================================================
  describe('GET /api/v1/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const { user, accessToken } = await createTestUser(restaurant._id);

      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data.name).toBe(user.name);
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =====================================================
  // POST /api/v1/auth/logout
  // =====================================================
  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const { accessToken, refreshToken } = await createTestUser(restaurant._id);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =====================================================
  // PUT /api/v1/auth/change-password
  // =====================================================
  describe('PUT /api/v1/auth/change-password', () => {
    it('should change password successfully', async () => {
      const { user, accessToken } = await createTestUser(restaurant._id);
      const newPassword = 'NewPassword123';

      const res = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: newPassword,
        });

      expect(loginRes.status).toBe(200);
    });

    it('should reject change with wrong current password', async () => {
      const { accessToken } = await createTestUser(restaurant._id);

      const res = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak new password', async () => {
      const { accessToken } = await createTestUser(restaurant._id);

      const res = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
