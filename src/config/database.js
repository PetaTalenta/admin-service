const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'futureguide',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  dialect: 'postgres',
  logging: process.env.DB_LOGGING === 'true' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 5,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
};

// Create Sequelize instances for each schema
const authSequelize = new Sequelize({
  ...dbConfig,
  schema: 'auth',
});

const assessmentSequelize = new Sequelize({
  ...dbConfig,
  schema: 'assessment',
});

const archiveSequelize = new Sequelize({
  ...dbConfig,
  schema: 'archive',
});

const chatSequelize = new Sequelize({
  ...dbConfig,
  schema: 'chat',
});

/**
 * Test database connections
 */
const testConnections = async () => {
  const connections = [
    { name: 'auth', instance: authSequelize },
    { name: 'assessment', instance: assessmentSequelize },
    { name: 'archive', instance: archiveSequelize },
    { name: 'chat', instance: chatSequelize },
  ];

  const results = [];

  for (const conn of connections) {
    try {
      await conn.instance.authenticate();
      logger.info(`Database connection established: ${conn.name} schema`);
      results.push({ schema: conn.name, status: 'connected' });
    } catch (error) {
      logger.error(`Unable to connect to ${conn.name} schema:`, {
        error: error.message,
        stack: error.stack,
      });
      results.push({ schema: conn.name, status: 'failed', error: error.message });
    }
  }

  return results;
};

/**
 * Close all database connections
 */
const closeConnections = async () => {
  try {
    await Promise.all([
      authSequelize.close(),
      assessmentSequelize.close(),
      archiveSequelize.close(),
      chatSequelize.close(),
    ]);
    logger.info('All database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get database health status
 */
const getHealthStatus = async () => {
  const schemas = [
    { name: 'auth', instance: authSequelize },
    { name: 'assessment', instance: assessmentSequelize },
    { name: 'archive', instance: archiveSequelize },
    { name: 'chat', instance: chatSequelize },
  ];

  const health = {};

  for (const schema of schemas) {
    try {
      await schema.instance.query('SELECT 1');
      health[schema.name] = {
        status: 'healthy',
        pool: {
          size: schema.instance.connectionManager.pool.size,
          available: schema.instance.connectionManager.pool.available,
          using: schema.instance.connectionManager.pool.using,
          waiting: schema.instance.connectionManager.pool.waiting,
        },
      };
    } catch (error) {
      health[schema.name] = {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  return health;
};

module.exports = {
  authSequelize,
  assessmentSequelize,
  archiveSequelize,
  chatSequelize,
  testConnections,
  closeConnections,
  getHealthStatus,
};

