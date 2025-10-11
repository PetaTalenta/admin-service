/**
 * Token Management Routes for Admin Service
 * Phase 2 Implementation - Token Management System
 */

const express = require('express');
const TokenService = require('../services/tokenService');
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const { validate, schemas } = require('../validation/schemas');

const router = express.Router();

/**
 * GET /admin/tokens/overview
 * Token usage statistics and overview
 */
router.get('/overview',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await TokenService.getTokenOverview(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get token overview error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get token overview'
        }
      });
    }
  }
);

/**
 * GET /admin/tokens/transactions
 * All token transactions with filtering and pagination
 */
router.get('/transactions',
  adminAuth,
  validate(schemas.transactionQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await TokenService.getTokenTransactions(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get token transactions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get token transactions'
        }
      });
    }
  }
);

/**
 * GET /admin/tokens/analytics
 * Token consumption patterns and analytics
 */
router.get('/analytics',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await TokenService.getTokenAnalytics(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get token analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get token analytics'
        }
      });
    }
  }
);

/**
 * POST /admin/tokens/bulk-operations
 * Bulk token operations (add/deduct for multiple users)
 */
router.post('/bulk-operations',
  adminAuth,
  validate(schemas.bulkTokenOperation),
  activityLoggers.bulkTokenOperation,
  async (req, res) => {
    try {
      const result = await TokenService.performBulkOperation(req.body, req.user.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Bulk token operation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk token operation'
        }
      });
    }
  }
);

module.exports = router;
