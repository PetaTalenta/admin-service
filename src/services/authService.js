const axios = require('axios');
const logger = require('../utils/logger');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * Login admin user via auth-service
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Object} Login result with token and user info
 */
const loginAdmin = async (email, password) => {
  try {
    logger.info('Attempting admin login', { email });

    // Call auth-service login endpoint
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/auth/login`,
      { email, password },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Login failed');
    }

    const { user, token } = response.data.data;

    // Verify user has admin role
    if (user.user_type !== 'admin' && user.user_type !== 'superadmin') {
      logger.warn('Non-admin user attempted to login to admin service', {
        userId: user.id,
        email: user.email,
        userType: user.user_type
      });
      throw new Error('Admin access required');
    }

    logger.info('Admin login successful', {
      userId: user.id,
      email: user.email,
      userType: user.user_type
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        user_type: user.user_type,
        is_active: user.is_active
      },
      token
    };
  } catch (error) {
    logger.error('Admin login failed', {
      email,
      error: error.message,
      stack: error.stack
    });

    // Handle specific error cases
    if (error.response) {
      // Auth service returned an error
      const errorData = error.response.data;
      throw new Error(errorData.error?.message || 'Login failed');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new Error('Authentication service is temporarily unavailable');
    } else {
      throw error;
    }
  }
};

/**
 * Verify admin token via auth-service
 * @param {string} token - JWT token
 * @returns {Object} User information
 */
const verifyAdminToken = async (token) => {
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
      throw new Error('Invalid token');
    }

    const user = response.data.data.user;

    // Verify admin role
    if (user.user_type !== 'admin' && user.user_type !== 'superadmin') {
      throw new Error('Admin access required');
    }

    return {
      id: user.id,
      email: user.email,
      user_type: user.user_type
    };
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  loginAdmin,
  verifyAdminToken
};

