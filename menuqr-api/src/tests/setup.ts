/**
 * Test Setup - Initializes MongoDB Memory Server for testing
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

let mongoServer: MongoMemoryServer;

// Mock SMS service to prevent actual SMS sending during tests
const mockSmsService = {
  sendOTP: vi.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
  sendSMS: vi.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
};
vi.mock('../services/smsService.js', () => ({
  default: mockSmsService,
  smsService: mockSmsService,
}));

// Mock logger to reduce noise during tests
vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  requestIdMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  httpLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock Sentry
vi.mock('../services/sentryService.js', () => ({
  initSentry: vi.fn(),
  // IMPORTANT: Must pass the error to next() to continue error handling chain
  sentryErrorHandler: () => (err: unknown, _req: unknown, _res: unknown, next: (e?: unknown) => void) => next(err),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

beforeAll(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  // Disconnect and stop the server
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Export for use in tests
export { mongoServer };
