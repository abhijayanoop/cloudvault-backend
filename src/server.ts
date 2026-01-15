import app from './app';
import { connectDatabase } from './config/database';
import { config } from './config/environment';
import logger from './config/logger';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB Atlas
    logger.info('🔌 Connecting to MongoDB Atlas...');
    await connectDatabase();

    // Start Express server
    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info('🚀 CloudVault Backend Server Started');
      logger.info('='.repeat(50));
      logger.info(
        `📝 Environment: ${config.isDevelopment ? 'Development' : 'Production'}`
      );
      logger.info(`🔗 Server: http://localhost:${PORT}`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info(`💾 Database: Connected to MongoDB Atlas`);
      logger.info('='.repeat(50));
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('🚨 Unhandled Promise Rejection:', reason);
  // Give time for logging before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('🚨 Uncaught Exception:', error);
  // Give time for logging before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Start the server
startServer();
