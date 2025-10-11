const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const auditService = require('../services/auditService');
const { validate, schemas } = require('../validation/schemas');

/**
 * @route GET /admin/direct/audit/activities
 * @desc Get all admin activities
 * @access Admin
 */
router.get('/activities', 
  adminAuth,
  activityLoggers.auditView,
  async (req, res) => {
    try {
      const result = await auditService.getAdminActivities(req.query);
      res.json(result);
    } catch (error) {
      console.error('Admin activities error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to get admin activities'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/audit/user/:userId/history
 * @desc Get user-specific audit trail
 * @access Admin
 */
router.get('/user/:userId/history',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  activityLoggers.auditView,
  async (req, res) => {
    try {
      const result = await auditService.getUserAuditHistory(req.params.userId, req.query);
      res.json(result);
    } catch (error) {
      console.error('User audit history error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to get user audit history'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/audit/data-access
 * @desc Get data access logging
 * @access Admin
 */
router.get('/data-access',
  adminAuth,
  activityLoggers.auditView,
  async (req, res) => {
    try {
      const result = await auditService.getDataAccessLogs(req.query);
      res.json(result);
    } catch (error) {
      console.error('Data access logs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to get data access logs'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/audit/exports
 * @desc Export audit data
 * @access Admin
 */
router.get('/exports',
  adminAuth,
  activityLoggers.auditExport,
  async (req, res) => {
    try {
      const result = await auditService.exportAuditData(req.query);
      res.json(result);
    } catch (error) {
      console.error('Audit export error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to export audit data'
        }
      });
    }
  }
);

module.exports = router;
