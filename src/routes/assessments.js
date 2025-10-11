/**
 * Assessment Routes for Admin Service
 * Phase 2 Implementation - Assessment Management & Analysis
 */

const express = require('express');
const AssessmentService = require('../services/assessmentService');
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const { validate, schemas } = require('../validation/schemas');

const router = express.Router();

/**
 * GET /admin/assessments/overview
 * Assessment completion statistics and overview
 */
router.get('/overview',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await AssessmentService.getAssessmentOverview(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get assessment overview error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get assessment overview'
        }
      });
    }
  }
);

/**
 * GET /admin/assessments/:resultId/details
 * Detailed assessment analysis for specific result
 */
router.get('/:resultId/details',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  activityLoggers.assessmentView,
  async (req, res) => {
    try {
      const result = await AssessmentService.getAssessmentDetails(req.params.resultId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Get assessment details error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get assessment details'
        }
      });
    }
  }
);

/**
 * GET /admin/assessments/raw-analysis
 * Raw response vs test result analysis
 */
router.get('/raw-analysis',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await AssessmentService.getRawAnalysis(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get raw analysis error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get raw analysis'
        }
      });
    }
  }
);

/**
 * GET /admin/assessments/performance
 * Assessment performance metrics and statistics
 */
router.get('/performance',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await AssessmentService.getPerformanceMetrics(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get performance metrics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get performance metrics'
        }
      });
    }
  }
);

/**
 * GET /admin/assessments/trends
 * Assessment trend analysis over time
 */
router.get('/trends',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await AssessmentService.getTrendAnalysis(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get trend analysis error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get trend analysis'
        }
      });
    }
  }
);

module.exports = router;
