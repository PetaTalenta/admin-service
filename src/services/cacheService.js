const Redis = require('ioredis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 2,
        retryStrategy: (times) => {
          if (times > this.maxReconnectAttempts) {
            logger.error('Redis max reconnection attempts reached');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          logger.info(`Redis reconnecting in ${delay}ms (attempt ${times})`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      };

      this.redis = new Redis(redisConfig);

      // Event handlers
      this.redis.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.redis.on('ready', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('Redis client connected and ready', {
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db
        });
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis client error', {
          error: error.message,
          stack: error.stack
        });
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        this.reconnectAttempts++;
        logger.info('Redis client reconnecting...', {
          attempt: this.reconnectAttempts
        });
      });

      // Connect to Redis
      await this.redis.connect();

      return true;
    } catch (error) {
      logger.error('Failed to initialize Redis', {
        error: error.message,
        stack: error.stack
      });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(key, prefix = 'admin') {
    return `${prefix}:${key}`;
  }

  /**
   * Set cache value
   */
  async set(key, value, ttl = 300) {
    if (!this.isConnected) {
      logger.debug('Cache set skipped - Redis not connected', { key });
      return false;
    }

    try {
      const fullKey = this.generateKey(key);
      const serialized = JSON.stringify(value);
      
      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serialized);
      } else {
        await this.redis.set(fullKey, serialized);
      }

      logger.debug('Cache set successful', {
        key: fullKey,
        ttl,
        size: serialized.length
      });

      return true;
    } catch (error) {
      logger.warn('Cache set failed', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    if (!this.isConnected) {
      logger.debug('Cache get skipped - Redis not connected', { key });
      return null;
    }

    try {
      const fullKey = this.generateKey(key);
      const value = await this.redis.get(fullKey);

      if (value) {
        logger.debug('Cache hit', { key: fullKey });
        return JSON.parse(value);
      }

      logger.debug('Cache miss', { key: fullKey });
      return null;
    } catch (error) {
      logger.warn('Cache get failed', {
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Delete cache value
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.generateKey(key);
      await this.redis.del(fullKey);
      logger.debug('Cache deleted', { key: fullKey });
      return true;
    } catch (error) {
      logger.warn('Cache delete failed', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete cache by pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullPattern = this.generateKey(pattern);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug('Cache pattern deleted', {
          pattern: fullPattern,
          count: keys.length
        });
      }

      return true;
    } catch (error) {
      logger.warn('Cache pattern delete failed', {
        pattern,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.generateKey(key);
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      logger.warn('Cache exists check failed', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cache TTL
   */
  async ttl(key) {
    if (!this.isConnected) {
      return -1;
    }

    try {
      const fullKey = this.generateKey(key);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      logger.warn('Cache TTL check failed', {
        key,
        error: error.message
      });
      return -1;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.redis.info();
      return info;
    } catch (error) {
      logger.warn('Failed to get Redis info', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady() {
    return this.isConnected;
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;

