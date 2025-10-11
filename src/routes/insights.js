const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const insightsService = require('../services/insightsService');

/**
 * @route GET /admin/direct/insights/user-behavior
 * @desc Get user behavior analysis
 * @access Admin
 */
router.get('/user-behavior', 
  adminAuth,
  activityLoggers.insightsView,
  async (req, res) => {
    try {
      const result = await insightsService.getUserBehaviorAnalysis(req.query);
      res.json(result);
    } catch (error) {
      console.error('User behavior analysis error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: 'Failed to get user behavior analysis'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/insights/assessment-effectiveness
 * @desc Get assessment effectiveness metrics
 * @access Admin
 */
router.get('/assessment-effectiveness',
  adminAuth,
  activityLoggers.insightsView,
  async (req, res) => {
    try {
      const result = await insightsService.getAssessmentEffectiveness(req.query);
      res.json(result);
    } catch (error) {
      console.error('Assessment effectiveness error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: 'Failed to get assessment effectiveness'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/insights/business-metrics
 * @desc Get business intelligence metrics
 * @access Admin
 */
router.get('/business-metrics',
  adminAuth,
  activityLoggers.insightsView,
  async (req, res) => {
    try {
      const result = await insightsService.getBusinessMetrics(req.query);
      res.json(result);
    } catch (error) {
      console.error('Business metrics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: 'Failed to get business metrics'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/insights/predictive-analytics
 * @desc Get predictive user analytics
 * @access Admin
 */
router.get('/predictive-analytics',
  adminAuth,
  activityLoggers.insightsView,
  async (req, res) => {
    try {
      const result = await insightsService.getPredictiveAnalytics(req.query);
      res.json(result);
    } catch (error) {
      console.error('Predictive analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: 'Failed to get predictive analytics'
        }
      });
    }
  }
);

module.exports = router;
