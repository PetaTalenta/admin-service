/**
 * System Performance Monitoring Routes for Admin Service
 * Phase 2 Implementation - System Performance Monitoring
 */

const express = require('express');
const SystemService = require('../services/systemService');
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const { validate, schemas } = require('../validation/schemas');

const router = express.Router();

/**
 * GET /admin/system/metrics
 * System performance metrics and resource usage
 */
router.get('/metrics',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await SystemService.getSystemMetrics(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get system metrics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get system metrics'
        }
      });
    }
  }
);

/**
 * GET /admin/system/health
 * Comprehensive health check for all system components
 */
router.get('/health',
  adminAuth,
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await SystemService.getSystemHealth();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get system health'
        }
      });
    }
  }
);

/**
 * GET /admin/system/database/stats
 * Database performance statistics and connection info
 */
router.get('/database/stats',
  adminAuth,
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await SystemService.getDatabaseStats();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get database stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get database statistics'
        }
      });
    }
  }
);

/**
 * GET /admin/system/errors
 * Error tracking and analysis across the system
 */
router.get('/errors',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await SystemService.getErrorAnalysis(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get error analysis error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get error analysis'
        }
      });
    }
  }
);

module.exports = router;
