import mongoose from 'mongoose';
import { env } from './environment';
import logger from './logger';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

export const connectDatabase = async (retryCount = 0): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      minPoolSize: 2,
      maxPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('✅ MongoDB connected successfully');
    logger.info(`📊 Database: ${mongoose.connection.name}`);
    logger.info(`🔗 Host: ${mongoose.connection.host}`);
  } catch (error) {
    logger.warn('Error connecting to MongoDB', error);

    if (retryCount < MAX_RETRIES) {
      logger.warn(
        `🔄 Retrying connection... Attempt ${retryCount + 1}/${MAX_RETRIES}`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return connectDatabase(retryCount + 1);
    }

    logger.error('💀 Max retry attempts reached. Exiting...');
    process.exit(1);
  }
};

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('🔄 MongoDB reconnected');
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Closing MongoDB connection...`);
  try {
    await mongoose.connection.close();
    logger.info('✅ MongoDB connection closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
