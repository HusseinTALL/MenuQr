import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://menuqr:menuqr123@localhost:27017/menuqr?authSource=menuqr';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(MONGODB_URI);
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export default mongoose;
