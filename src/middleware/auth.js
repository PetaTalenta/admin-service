const axios = require('axios');
const logger = require('../utils/logger');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * Authenticate admin user via JWT token
 * Validates token with auth-service and checks for admin role
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Admin authentication failed: No token provided', {
        ip: req.ip,
        url: req.originalUrl
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
    }

    // Verify token with auth-service
    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/auth/verify-token`,
        { token },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'true',
            'X-Service-Key': process.env.INTERNAL_SERVICE_KEY
          },
          timeout: 5000
        }
      );

      if (!response.data.success || !response.data.data.valid) {
        logger.warn('Admin authentication failed: Invalid token', {
          ip: req.ip,
          url: req.originalUrl
        });
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token'
          }
        });
      }

      const user = response.data.data.user;

      // Check if user has admin role
      if (user.user_type !== 'admin' && user.user_type !== 'superadmin') {
        logger.warn('Admin authentication failed: Insufficient permissions', {
          userId: user.id,
          userType: user.user_type,
          ip: req.ip,
          url: req.originalUrl
        });
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }

      // Attach user to request
      req.admin = {
        id: user.id,
        email: user.email,
        user_type: user.user_type
      };

      logger.debug('Admin authenticated successfully', {
        adminId: user.id,
        email: user.email,
        userType: user.user_type
      });

      next();
    } catch (authError) {
      logger.error('Auth service communication error', {
        error: authError.message,
        url: req.originalUrl
      });

      // If auth service is down, return 503
      if (authError.code === 'ECONNREFUSED' || authError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Authentication service is temporarily unavailable'
          }
        });
      }

      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token verification failed'
        }
      });
    }
  } catch (error) {
    logger.error('Admin authentication error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

/**
 * Check if admin has specific role
 * @param {Array} allowedRoles - Array of allowed roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.admin.user_type)) {
      logger.warn('Admin role check failed', {
        adminId: req.admin.id,
        requiredRoles: allowedRoles,
        actualRole: req.admin.user_type,
        url: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateAdmin,
  requireRole
};

