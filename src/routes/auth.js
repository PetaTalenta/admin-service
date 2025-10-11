const express = require('express');
const AuthService = require('../services/authService');
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const { validate, schemas } = require('../validation/schemas');

const router = express.Router();

/**
 * POST /admin/login
 * Admin authentication
 */
router.post('/login', 
  validate(schemas.login),
  activityLoggers.login,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        }
      });
    }
  }
);

/**
 * GET /admin/profile
 * Get admin profile
 */
router.get('/profile',
  adminAuth,
  activityLoggers.profileView,
  async (req, res) => {
    try {
      const result = await AuthService.getProfile(req.user.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get profile'
        }
      });
    }
  }
);

/**
 * PUT /admin/profile
 * Update admin profile
 */
router.put('/profile',
  adminAuth,
  validate(schemas.updateProfile),
  async (req, res) => {
    try {
      const result = await AuthService.updateProfile(req.user.id, req.body);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update profile'
        }
      });
    }
  }
);

/**
 * POST /admin/logout
 * Admin logout (client-side token removal)
 */
router.post('/logout',
  adminAuth,
  activityLoggers.logout,
  async (req, res) => {
    try {
      // Since we're using JWT, logout is handled client-side
      // This endpoint is mainly for logging purposes
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed'
        }
      });
    }
  }
);

module.exports = router;
