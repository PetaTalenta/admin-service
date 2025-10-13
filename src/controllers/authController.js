const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * Admin login
 * POST /admin/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info('Admin login attempt', { 
      email,
      ip: req.ip 
    });

    // Login via auth-service
    const result = await authService.loginAdmin(email, password);

    logger.info('Admin login successful', {
      userId: result.user.id,
      email: result.user.email,
      ip: req.ip
    });

    res.json(successResponse(result, 'Login successful'));
  } catch (error) {
    logger.error('Admin login failed', {
      email: req.body.email,
      error: error.message,
      ip: req.ip
    });

    // Return appropriate error
    if (error.message.includes('unavailable')) {
      return res.status(503).json(errorResponse(
        'SERVICE_UNAVAILABLE',
        error.message
      ));
    } else if (error.message.includes('Admin access required')) {
      return res.status(403).json(errorResponse(
        'FORBIDDEN',
        'Admin access required'
      ));
    } else {
      return res.status(401).json(errorResponse(
        'UNAUTHORIZED',
        error.message || 'Invalid credentials'
      ));
    }
  }
};

/**
 * Admin logout
 * POST /admin/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const adminId = req.admin.id;

    logger.info('Admin logout', {
      adminId,
      email: req.admin.email,
      ip: req.ip
    });

    // Token invalidation is handled client-side
    // This endpoint is mainly for logging purposes
    res.json(successResponse(null, 'Logout successful'));
  } catch (error) {
    logger.error('Admin logout error', {
      error: error.message,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Verify admin token
 * GET /admin/auth/verify
 */
const verify = async (req, res, next) => {
  try {
    // If we reach here, the token is valid (authenticateAdmin middleware passed)
    const admin = {
      id: req.admin.id,
      email: req.admin.email,
      user_type: req.admin.user_type
    };

    res.json(successResponse(admin, 'Token is valid'));
  } catch (error) {
    logger.error('Token verification error', {
      error: error.message,
      adminId: req.admin?.id
    });
    next(error);
  }
};

module.exports = {
  login,
  logout,
  verify
};

