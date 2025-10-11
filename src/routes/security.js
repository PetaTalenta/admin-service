const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const securityService = require('../services/securityService');
const { validate, schemas } = require('../validation/schemas');

/**
 * @route GET /admin/direct/security/audit
 * @desc Get security audit report
 * @access Admin
 */
router.get('/audit', 
  adminAuth,
  activityLoggers.securityAudit,
  async (req, res) => {
    try {
      const result = await securityService.getSecurityAudit(req.query);
      res.json(result);
    } catch (error) {
      console.error('Security audit error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to get security audit'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/security/suspicious-activities
 * @desc Get suspicious activity detection
 * @access Admin
 */
router.get('/suspicious-activities',
  adminAuth,
  activityLoggers.securityAudit,
  async (req, res) => {
    try {
      const result = await securityService.getSuspiciousActivities(req.query);
      res.json(result);
    } catch (error) {
      console.error('Suspicious activities error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to get suspicious activities'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/security/login-patterns
 * @desc Get login pattern analysis
 * @access Admin
 */
router.get('/login-patterns',
  adminAuth,
  activityLoggers.securityAudit,
  async (req, res) => {
    try {
      const result = await securityService.getLoginPatterns(req.query);
      res.json(result);
    } catch (error) {
      console.error('Login patterns error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to get login patterns'
        }
      });
    }
  }
);

/**
 * @route POST /admin/direct/security/user/:userId/suspend
 * @desc Suspend user account
 * @access Admin
 */
router.post('/user/:userId/suspend',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  activityLoggers.userSuspension,
  async (req, res) => {
    try {
      const result = await securityService.suspendUser(req.params.userId, req.body, req.adminId);
      res.json(result);
    } catch (error) {
      console.error('User suspension error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to suspend user'
        }
      });
    }
  }
);

/**
 * @route POST /admin/direct/security/user/:userId/activate
 * @desc Activate user account
 * @access Admin
 */
router.post('/user/:userId/activate',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  activityLoggers.userActivation,
  async (req, res) => {
    try {
      const result = await securityService.activateUser(req.params.userId, req.body, req.adminId);
      res.json(result);
    } catch (error) {
      console.error('User activation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to activate user'
        }
      });
    }
  }
);

module.exports = router;
