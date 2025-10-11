const { Sequelize } = require('sequelize');
const logger = console;

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'atma_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  dialect: process.env.DB_DIALECT || 'postgres',
  logging: process.env.NODE_ENV === 'development' ?
    (msg) => logger.debug(msg) : false,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
    evict: parseInt(process.env.DB_POOL_EVICT || '5000'),
    handleDisconnects: true,
    retry: {
      max: 3
    }
  },
  dialectOptions: {
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000
  },
  define: {
    underscored: true,
    freezeTableName: true,
    charset: 'utf8',
    dialectOptions: {
      collate: 'utf8_general_ci'
    }
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(config);

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.log('✅ Admin Service: Database connection established successfully');
  } catch (error) {
    logger.error('❌ Admin Service: Unable to connect to database:', error.message);
    throw error;
  }
};

module.exports = { sequelize, testConnection };
