const express = require('express');
const UserService = require('../services/userService');
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const { validate, schemas } = require('../validation/schemas');

const router = express.Router();

/**
 * GET /admin/users
 * Get paginated user list with filtering
 */
router.get('/',
  adminAuth,
  validate(schemas.getUsersQuery, 'query'),
  activityLoggers.userListView,
  async (req, res) => {
    try {
      const result = await UserService.getUsers(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get users'
        }
      });
    }
  }
);

/**
 * GET /admin/users/:userId
 * Get detailed user profile
 */
router.get('/:userId',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  activityLoggers.userView,
  async (req, res) => {
    try {
      const result = await UserService.getUserById(req.params.userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user'
        }
      });
    }
  }
);

/**
 * PUT /admin/users/:userId/profile
 * Update user information
 */
router.put('/:userId/profile',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  validate(schemas.updateUserProfile),
  activityLoggers.profileUpdate,
  async (req, res) => {
    try {
      const result = await UserService.updateUserProfile(req.params.userId, req.body);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user profile'
        }
      });
    }
  }
);

/**
 * POST /admin/users/:userId/tokens/add
 * Add tokens to user
 */
router.post('/:userId/tokens/add',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  validate(schemas.tokenOperation),
  activityLoggers.tokenBalanceUpdate,
  async (req, res) => {
    try {
      const { amount, reason } = req.body;
      const result = await UserService.addTokens(req.params.userId, amount, reason);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Add tokens error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add tokens'
        }
      });
    }
  }
);

/**
 * POST /admin/users/:userId/tokens/deduct
 * Deduct tokens from user
 */
router.post('/:userId/tokens/deduct',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  validate(schemas.tokenOperation),
  activityLoggers.tokenBalanceUpdate,
  async (req, res) => {
    try {
      const { amount, reason } = req.body;
      const result = await UserService.deductTokens(req.params.userId, amount, reason);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Deduct tokens error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deduct tokens'
        }
      });
    }
  }
);

/**
 * GET /admin/users/:userId/tokens/history
 * Get token transaction history
 */
router.get('/:userId/tokens/history',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  validate(schemas.tokenHistoryQuery, 'query'),
  async (req, res) => {
    try {
      const result = await UserService.getTokenHistory(req.params.userId, req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get token history error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get token history'
        }
      });
    }
  }
);

module.exports = router;
