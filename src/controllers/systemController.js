const systemService = require('../services/systemService');
const alertService = require('../services/alertService');
const logger = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

/**
 * Get system health status
 */
const getSystemHealth = async (req, res, next) => {
  try {
    logger.info('Getting system health', {
      adminId: req.user?.id,
      ip: req.ip
    });

    const health = await systemService.getSystemHealth();

    res.json(successResponse(health, 'System health retrieved successfully'));
  } catch (error) {
    logger.error('Error getting system health', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Get system metrics
 */
const getSystemMetrics = async (req, res, next) => {
  try {
    logger.info('Getting system metrics', {
      adminId: req.user?.id,
      ip: req.ip
    });

    const metrics = await systemService.getSystemMetrics();

    res.json(successResponse(metrics, 'System metrics retrieved successfully'));
  } catch (error) {
    logger.error('Error getting system metrics', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Get database health
 */
const getDatabaseHealth = async (req, res, next) => {
  try {
    logger.info('Getting database health', {
      adminId: req.user?.id,
      ip: req.ip
    });

    const dbHealth = await systemService.getDatabaseHealth();

    res.json(successResponse(dbHealth, 'Database health retrieved successfully'));
  } catch (error) {
    logger.error('Error getting database health', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Get system resources
 */
const getSystemResources = async (req, res, next) => {
  try {
    logger.info('Getting system resources', {
      adminId: req.user?.id,
      ip: req.ip
    });

    const resources = systemService.getSystemResources();

    res.json(successResponse(resources, 'System resources retrieved successfully'));
  } catch (error) {
    logger.error('Error getting system resources', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Get all alerts
 */
const getAlerts = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      severity: req.query.severity,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit
    };

    logger.info('Getting alerts', {
      adminId: req.user?.id,
      filters,
      ip: req.ip
    });

    const result = await alertService.getAlerts(filters);

    res.json(successResponse(result, 'Alerts retrieved successfully'));
  } catch (error) {
    logger.error('Error getting alerts', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Get alert by ID
 */
const getAlertById = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Getting alert by ID', {
      alertId: id,
      adminId: req.user?.id,
      ip: req.ip
    });

    const alert = await alertService.getAlertById(id);

    res.json(successResponse(alert, 'Alert retrieved successfully'));
  } catch (error) {
    logger.error('Error getting alert', {
      error: error.message,
      stack: error.stack,
      alertId: req.params.id,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Acknowledge alert
 */
const acknowledgeAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    logger.info('Acknowledging alert', {
      alertId: id,
      adminId,
      ip: req.ip
    });

    const alert = await alertService.acknowledgeAlert(id, adminId);

    res.json(successResponse(alert, 'Alert acknowledged successfully'));
  } catch (error) {
    logger.error('Error acknowledging alert', {
      error: error.message,
      stack: error.stack,
      alertId: req.params.id,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Resolve alert
 */
const resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const adminId = req.user?.id;

    logger.info('Resolving alert', {
      alertId: id,
      adminId,
      ip: req.ip
    });

    const alert = await alertService.resolveAlert(id, adminId, resolution);

    res.json(successResponse(alert, 'Alert resolved successfully'));
  } catch (error) {
    logger.error('Error resolving alert', {
      error: error.message,
      stack: error.stack,
      alertId: req.params.id,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Get alert statistics
 */
const getAlertStats = async (req, res, next) => {
  try {
    logger.info('Getting alert statistics', {
      adminId: req.user?.id,
      ip: req.ip
    });

    const stats = await alertService.getAlertStats();

    res.json(successResponse(stats, 'Alert statistics retrieved successfully'));
  } catch (error) {
    logger.error('Error getting alert statistics', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    next(error);
  }
};

/**
 * Create test alert (for testing purposes)
 */
const createTestAlert = async (req, res, next) => {
  try {
    const { type, severity, title, message } = req.body;

    logger.info('Creating test alert', {
      adminId: req.user?.id,
      type,
      severity,
      ip: req.ip
    });

    const alert = await alertService.createAlert({
      type: type || alertService.ALERT_TYPES.SYSTEM,
      severity: severity || alertService.ALERT_SEVERITY.INFO,
      title: title || 'Test Alert',
      message: message || 'This is a test alert',
      data: { test: true }
    });

    res.json(successResponse(alert, 'Test alert created successfully'));
  } catch (error) {
    logger.error('Error creating test alert', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    next(error);
  }
};

module.exports = {
  getSystemHealth,
  getSystemMetrics,
  getDatabaseHealth,
  getSystemResources,
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  getAlertStats,
  createTestAlert
};

