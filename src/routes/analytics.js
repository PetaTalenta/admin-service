/**
 * Analytics Routes for Admin Service
 * Phase 2 Implementation - User Analytics & Statistics
 */

const express = require('express');
const AnalyticsService = require('../services/analyticsService');
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const { validate, schemas } = require('../validation/schemas');

const router = express.Router();

/**
 * GET /admin/analytics/users/overview
 * User registration trends and overview statistics
 */
router.get('/users/overview',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await AnalyticsService.getUserOverview(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get user overview error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user overview'
        }
      });
    }
  }
);

/**
 * GET /admin/analytics/users/activity
 * User activity patterns and engagement metrics
 */
router.get('/users/activity',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await AnalyticsService.getUserActivity(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user activity'
        }
      });
    }
  }
);

/**
 * GET /admin/analytics/users/demographics
 * User demographic analysis and segmentation
 */
router.get('/users/demographics',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await AnalyticsService.getUserDemographics(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get user demographics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user demographics'
        }
      });
    }
  }
);

/**
 * GET /admin/analytics/users/retention
 * User retention metrics and cohort analysis
 */
router.get('/users/retention',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await AnalyticsService.getUserRetention(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get user retention error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user retention'
        }
      });
    }
  }
);

module.exports = router;
