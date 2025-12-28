import { createServer } from 'http';
import app from './app.js';
import config from './config/env.js';
import { connectDatabase } from './config/database.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { initializeSocket } from './services/socketService.js';
import { logger } from './utils/logger.js';
import { initializeSentry, flushSentry, captureException } from './services/sentryService.js';
import { initializeEmailService } from './services/emailService.js';
import { initializeRedis, closeRedis } from './config/redis.js';

// Create HTTP server for both Express and Socket.io
const httpServer = createServer(app);

const startServer = async (): Promise<void> => {
  try {
    // Initialize Sentry error tracking (must be early)
    initializeSentry(app);

    // Connect to MongoDB
    await connectDatabase();

    // Initialize Socket.io
    initializeSocket(httpServer);

    // Initialize email service
    await initializeEmailService();

    // Initialize Redis for live GPS tracking (optional)
    const redis = await initializeRedis();
    if (redis) {
      logger.info('Redis initialized for live tracking');
    } else {
      logger.info('Redis not configured, live tracking disabled');
    }

    // Start campaign scheduler
    startScheduler();

    // Start server
    httpServer.listen(config.port, () => {
      // Log startup info
      if (config.isDevelopment) {
        logger.info('MenuQR API Server started', {
          port: config.port,
          environment: config.nodeEnv,
          apiUrl: `http://localhost:${config.port}/api/v1`,
          webSocket: `ws://localhost:${config.port}`,
        });
      } else {
        logger.info('Server started', {
          port: config.port,
          environment: config.nodeEnv,
          websocket: true,
        });
      }
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', async (error: Error) => {
  logger.error('Uncaught Exception', error);
  captureException(error, { type: 'uncaughtException' });
  await flushSentry(2000);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason: unknown) => {
  logger.error('Unhandled Rejection', reason);
  captureException(reason instanceof Error ? reason : new Error(String(reason)), { type: 'unhandledRejection' });
  await flushSentry(2000);
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  stopScheduler();
  await closeRedis();
  await flushSentry(2000);
  process.exit(0);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  stopScheduler();
  await closeRedis();
  await flushSentry(2000);
  process.exit(0);
});

startServer();
