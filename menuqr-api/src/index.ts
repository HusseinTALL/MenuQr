import app from './app.js';
import config from './config/env.js';
import { connectDatabase } from './config/database.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start campaign scheduler
    startScheduler();

    // Start server
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🍽️  MenuQR API Server                                    ║
║                                                            ║
║   Server running on port ${config.port}                         ║
║   Environment: ${config.nodeEnv.padEnd(10)}                         ║
║   API URL: http://localhost:${config.port}/api/v1               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  stopScheduler();
  process.exit(0);
});

startServer();
