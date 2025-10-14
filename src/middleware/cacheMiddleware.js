const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds (default: 60)
 * @param {function} keyGenerator - Function to generate cache key from request
 */
const cacheMiddleware = (ttl = 60, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if cache is not ready
    if (!cacheService.isReady()) {
      logger.debug('Cache middleware skipped - Redis not ready');
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : generateDefaultCacheKey(req);

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug('Cache hit', {
          key: cacheKey,
          path: req.path,
          method: req.method
        });

        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);

        return res.json(cachedData);
      }

      // Cache miss - store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(data) {
        // Cache the response
        cacheService.set(cacheKey, data, ttl).catch(error => {
          logger.warn('Failed to cache response', {
            key: cacheKey,
            error: error.message
          });
        });

        logger.debug('Cache miss - response cached', {
          key: cacheKey,
          path: req.path,
          method: req.method,
          ttl
        });

        // Set cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path
      });
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Generate default cache key from request
 */
const generateDefaultCacheKey = (req) => {
  const userId = req.user?.id || 'anonymous';
  const path = req.path;
  const query = JSON.stringify(req.query);
  return `route:${path}:${userId}:${query}`;
};

/**
 * Invalidate cache by pattern
 */
const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    try {
      if (cacheService.isReady()) {
        await cacheService.delPattern(pattern);
        logger.debug('Cache invalidated', { pattern });
      }
    } catch (error) {
      logger.warn('Failed to invalidate cache', {
        pattern,
        error: error.message
      });
    }
    next();
  };
};

/**
 * Invalidate cache after successful mutation
 */
const invalidateCacheAfter = (pattern) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method
    res.json = async function(data) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          if (cacheService.isReady()) {
            await cacheService.delPattern(pattern);
            logger.debug('Cache invalidated after mutation', { pattern });
          }
        } catch (error) {
          logger.warn('Failed to invalidate cache after mutation', {
            pattern,
            error: error.message
          });
        }
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  invalidateCacheAfter
};

