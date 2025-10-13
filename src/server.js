// Load environment variables
require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const { testConnections, closeConnections } = require('./config/database');

const PORT = process.env.PORT || 3007;

/**
 * Initialize services and database connections
 */
const initializeServices = async () => {
  try {
    logger.info('Initializing Admin Service...');

    // Test database connections
    logger.info('Testing database connections...');
    const connectionResults = await testConnections();

    // Log connection results
    connectionResults.forEach(result => {
      if (result.status === 'connected') {
        logger.info(`✓ ${result.schema} schema connected`);
      } else {
        logger.error(`✗ ${result.schema} schema failed: ${result.error}`);
      }
    });

    // Check if all critical connections are established
    const criticalSchemas = ['auth', 'archive'];
    const criticalFailures = connectionResults.filter(
      r => criticalSchemas.includes(r.schema) && r.status === 'failed'
    );

    if (criticalFailures.length > 0) {
      throw new Error(`Critical database connections failed: ${criticalFailures.map(f => f.schema).join(', ')}`);
    }

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  initializeServices()
    .then(() => {
      const server = app.listen(PORT, () => {
        logger.info(`Admin Service started successfully`, {
          service: 'admin-service',
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          phase: 'Phase 1 - Foundation & Authentication',
          features: [
            'Health Check Endpoints',
            'Admin Authentication',
            'Multi-Schema Database Access',
            'Security Middleware',
            'Rate Limiting'
          ]
        });

        logger.info(`Health check available at: http://localhost:${PORT}/health`);
        logger.info(`Admin login available at: http://localhost:${PORT}/admin/auth/login`);
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal) => {
        logger.info(`${signal} received, shutting down gracefully`);

        try {
          // Close server
          server.close(async () => {
            logger.info('HTTP server closed');

            // Close database connections
            await closeConnections();

            logger.info('Process terminated');
            process.exit(0);
          });

          // Force shutdown after 30 seconds
          setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
          }, 30000);
        } catch (error) {
          logger.error('Error during shutdown', { 
            error: error.message,
            stack: error.stack 
          });
          process.exit(1);
        }
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', {
          error: error.message,
          stack: error.stack
        });
        gracefulShutdown('UNCAUGHT_EXCEPTION');
      });

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection', {
          reason,
          promise
        });
      });

      module.exports = server;
    })
    .catch((error) => {
      logger.error('Failed to start Admin Service', { 
        error: error.message,
        stack: error.stack 
      });
      process.exit(1);
    });
} else {
  module.exports = app;
}

