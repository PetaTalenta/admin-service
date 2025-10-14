const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

// Validation schemas
const alertFiltersSchema = Joi.object({
  type: Joi.string().valid('system', 'job', 'user', 'chat', 'performance', 'security'),
  severity: Joi.string().valid('info', 'warning', 'error', 'critical'),
  status: Joi.string().valid('active', 'acknowledged', 'resolved'),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100)
});

const resolveAlertSchema = Joi.object({
  resolution: Joi.string().required().min(1).max(1000)
});

const createTestAlertSchema = Joi.object({
  type: Joi.string().valid('system', 'job', 'user', 'chat', 'performance', 'security'),
  severity: Joi.string().valid('info', 'warning', 'error', 'critical'),
  title: Joi.string().min(1).max(200),
  message: Joi.string().min(1).max(1000)
});

// System health and metrics routes
router.get('/health', authenticateAdmin, systemController.getSystemHealth);
router.get('/metrics', authenticateAdmin, systemController.getSystemMetrics);
router.get('/database', authenticateAdmin, systemController.getDatabaseHealth);
router.get('/resources', authenticateAdmin, systemController.getSystemResources);

// Alert management routes
router.get('/alerts', authenticateAdmin, validateRequest(alertFiltersSchema, 'query'), systemController.getAlerts);
router.get('/alerts/stats', authenticateAdmin, systemController.getAlertStats);
router.get('/alerts/:id', authenticateAdmin, systemController.getAlertById);
router.post('/alerts/:id/acknowledge', authenticateAdmin, systemController.acknowledgeAlert);
router.post('/alerts/:id/resolve', authenticateAdmin, validateRequest(resolveAlertSchema), systemController.resolveAlert);

// Test alert route (for development/testing)
if (process.env.NODE_ENV !== 'production') {
  router.post('/alerts/test', authenticateAdmin, validateRequest(createTestAlertSchema), systemController.createTestAlert);
}

module.exports = router;

