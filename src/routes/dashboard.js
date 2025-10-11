const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const dashboardService = require('../services/dashboardService');

/**
 * @route GET /admin/direct/dashboard/realtime
 * @desc Get real-time dashboard data
 * @access Admin
 */
router.get('/realtime', 
  adminAuth,
  activityLoggers.dashboardView,
  async (req, res) => {
    try {
      const result = await dashboardService.getRealtimeData(req.query);
      res.json(result);
    } catch (error) {
      console.error('Realtime dashboard error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to get realtime dashboard data'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/dashboard/alerts
 * @desc Get system alerts and notifications
 * @access Admin
 */
router.get('/alerts',
  adminAuth,
  activityLoggers.dashboardView,
  async (req, res) => {
    try {
      const result = await dashboardService.getSystemAlerts(req.query);
      res.json(result);
    } catch (error) {
      console.error('System alerts error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to get system alerts'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/dashboard/kpis
 * @desc Get key performance indicators
 * @access Admin
 */
router.get('/kpis',
  adminAuth,
  activityLoggers.dashboardView,
  async (req, res) => {
    try {
      const result = await dashboardService.getKPIs(req.query);
      res.json(result);
    } catch (error) {
      console.error('KPIs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to get KPIs'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/dashboard/live
 * @desc WebSocket endpoint for live dashboard updates
 * @access Admin
 */
router.get('/live',
  adminAuth,
  async (req, res) => {
    try {
      // This will be handled by WebSocket upgrade
      res.status(426).json({
        success: false,
        error: {
          code: 'UPGRADE_REQUIRED',
          message: 'This endpoint requires WebSocket upgrade'
        }
      });
    } catch (error) {
      console.error('Live dashboard error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to establish live connection'
        }
      });
    }
  }
);

module.exports = router;
