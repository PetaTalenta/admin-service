const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { activityLoggers } = require('../middleware/activityLogger');
const dataService = require('../services/dataService');
const { validate, schemas } = require('../validation/schemas');

/**
 * @route POST /admin/direct/data/export
 * @desc Data export functionality
 * @access Admin
 */
router.post('/export', 
  adminAuth,
  activityLoggers.dataExport,
  async (req, res) => {
    try {
      const result = await dataService.exportData(req.body, req.adminId);
      res.json(result);
    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'Failed to export data'
        }
      });
    }
  }
);

/**
 * @route POST /admin/direct/data/backup
 * @desc Database backup operations
 * @access Admin
 */
router.post('/backup',
  adminAuth,
  activityLoggers.dataBackup,
  async (req, res) => {
    try {
      const result = await dataService.createBackup(req.body, req.adminId);
      res.json(result);
    } catch (error) {
      console.error('Data backup error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'Failed to create backup'
        }
      });
    }
  }
);

/**
 * @route POST /admin/direct/data/anonymize/:userId
 * @desc GDPR compliance data anonymization
 * @access Admin
 */
router.post('/anonymize/:userId',
  adminAuth,
  validate(schemas.uuidParam, 'params'),
  activityLoggers.dataAnonymization,
  async (req, res) => {
    try {
      const result = await dataService.anonymizeUserData(req.params.userId, req.body, req.adminId);
      res.json(result);
    } catch (error) {
      console.error('Data anonymization error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'Failed to anonymize user data'
        }
      });
    }
  }
);

/**
 * @route GET /admin/direct/data/integrity-check
 * @desc Data integrity verification
 * @access Admin
 */
router.get('/integrity-check',
  adminAuth,
  activityLoggers.dataIntegrityCheck,
  async (req, res) => {
    try {
      const result = await dataService.performIntegrityCheck(req.query);
      res.json(result);
    } catch (error) {
      console.error('Data integrity check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'Failed to perform integrity check'
        }
      });
    }
  }
);

module.exports = router;
