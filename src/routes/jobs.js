/**
 * Job Monitoring Routes for Admin Service
 * Phase 2 Implementation - Job Monitoring & Queue Management
 */

const express = require('express');
const JobService = require('../services/jobService');
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const { validate, schemas } = require('../validation/schemas');

const router = express.Router();

/**
 * GET /admin/jobs/monitor
 * Real-time job monitoring dashboard
 */
router.get('/monitor',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await JobService.getJobMonitor(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get job monitor error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get job monitor data'
        }
      });
    }
  }
);

/**
 * GET /admin/jobs/queue/status
 * Queue health and statistics
 */
router.get('/queue/status',
  adminAuth,
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await JobService.getQueueStatus();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get queue status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get queue status'
        }
      });
    }
  }
);

/**
 * GET /admin/jobs/analytics
 * Job processing analytics and performance metrics
 */
router.get('/analytics',
  adminAuth,
  validate(schemas.analyticsQuery, 'query'),
  activityLoggers.analyticsView,
  async (req, res) => {
    try {
      const result = await JobService.getJobAnalytics(req.query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get job analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get job analytics'
        }
      });
    }
  }
);

/**
 * POST /admin/jobs/:jobId/retry
 * Manual job retry for failed jobs
 */
router.post('/:jobId/retry',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  activityLoggers.jobOperation,
  async (req, res) => {
    try {
      const result = await JobService.retryJob(req.params.jobId, req.user.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Retry job error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retry job'
        }
      });
    }
  }
);

/**
 * DELETE /admin/jobs/:jobId
 * Cancel/delete job
 */
router.delete('/:jobId',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  activityLoggers.jobOperation,
  async (req, res) => {
    try {
      const result = await JobService.cancelJob(req.params.jobId, req.user.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Cancel job error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel job'
        }
      });
    }
  }
);

module.exports = router;
