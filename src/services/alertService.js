const { archiveSequelize } = require('../config/database');
const logger = require('../utils/logger');
const { getIO } = require('./websocketService');

// Alert types
const ALERT_TYPES = {
  SYSTEM: 'system',
  JOB: 'job',
  USER: 'user',
  CHAT: 'chat',
  PERFORMANCE: 'performance',
  SECURITY: 'security'
};

// Alert severity levels
const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// In-memory alert storage (for demo purposes)
// In production, this should be stored in database
const alerts = [];
const alertRules = [];

/**
 * Create a new alert
 */
const createAlert = async (alertData) => {
  try {
    const alert = {
      id: generateAlertId(),
      type: alertData.type || ALERT_TYPES.SYSTEM,
      severity: alertData.severity || ALERT_SEVERITY.INFO,
      title: alertData.title,
      message: alertData.message,
      data: alertData.data || {},
      status: 'active',
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
      resolvedBy: null
    };

    // Store alert
    alerts.unshift(alert);

    // Keep only last 1000 alerts in memory
    if (alerts.length > 1000) {
      alerts.pop();
    }

    // Log alert
    logger.warn('Alert created', {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title
    });

    // Record in database
    await recordAlertInDatabase(alert);

    // Broadcast to WebSocket clients
    broadcastAlert(alert);

    // Check if alert should trigger notifications
    await checkAlertNotifications(alert);

    return alert;
  } catch (error) {
    logger.error('Error creating alert', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get all alerts with filtering
 */
const getAlerts = async (filters = {}) => {
  try {
    let filteredAlerts = [...alerts];

    // Filter by type
    if (filters.type) {
      filteredAlerts = filteredAlerts.filter(a => a.type === filters.type);
    }

    // Filter by severity
    if (filters.severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity);
    }

    // Filter by status
    if (filters.status) {
      filteredAlerts = filteredAlerts.filter(a => a.status === filters.status);
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    const paginatedAlerts = filteredAlerts.slice(offset, offset + limit);

    return {
      alerts: paginatedAlerts,
      pagination: {
        page,
        limit,
        total: filteredAlerts.length,
        totalPages: Math.ceil(filteredAlerts.length / limit)
      }
    };
  } catch (error) {
    logger.error('Error getting alerts', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Get alert by ID
 */
const getAlertById = async (alertId) => {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }
  return alert;
};

/**
 * Acknowledge alert
 */
const acknowledgeAlert = async (alertId, adminId) => {
  try {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = adminId;

    logger.info('Alert acknowledged', {
      alertId,
      adminId
    });

    // Broadcast update
    broadcastAlertUpdate(alert);

    return alert;
  } catch (error) {
    logger.error('Error acknowledging alert', {
      error: error.message,
      alertId
    });
    throw error;
  }
};

/**
 * Resolve alert
 */
const resolveAlert = async (alertId, adminId, resolution) => {
  try {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = adminId;
    alert.resolution = resolution;

    logger.info('Alert resolved', {
      alertId,
      adminId
    });

    // Broadcast update
    broadcastAlertUpdate(alert);

    return alert;
  } catch (error) {
    logger.error('Error resolving alert', {
      error: error.message,
      alertId
    });
    throw error;
  }
};

/**
 * Get alert statistics
 */
const getAlertStats = async () => {
  try {
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      bySeverity: {
        info: alerts.filter(a => a.severity === ALERT_SEVERITY.INFO).length,
        warning: alerts.filter(a => a.severity === ALERT_SEVERITY.WARNING).length,
        error: alerts.filter(a => a.severity === ALERT_SEVERITY.ERROR).length,
        critical: alerts.filter(a => a.severity === ALERT_SEVERITY.CRITICAL).length
      },
      byType: {
        system: alerts.filter(a => a.type === ALERT_TYPES.SYSTEM).length,
        job: alerts.filter(a => a.type === ALERT_TYPES.JOB).length,
        user: alerts.filter(a => a.type === ALERT_TYPES.USER).length,
        chat: alerts.filter(a => a.type === ALERT_TYPES.CHAT).length,
        performance: alerts.filter(a => a.type === ALERT_TYPES.PERFORMANCE).length,
        security: alerts.filter(a => a.type === ALERT_TYPES.SECURITY).length
      }
    };

    return stats;
  } catch (error) {
    logger.error('Error getting alert stats', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Record alert in database
 */
const recordAlertInDatabase = async (alert) => {
  try {
    await archiveSequelize.query(`
      INSERT INTO archive.user_activity_logs (admin_id, activity_type, activity_data, created_at)
      VALUES (:adminId, :activityType, :activityData, NOW())
    `, {
      replacements: {
        adminId: '00000000-0000-0000-0000-000000000000', // System user
        activityType: 'alert_created',
        activityData: JSON.stringify(alert)
      }
    });
  } catch (error) {
    logger.error('Error recording alert in database', {
      error: error.message
    });
  }
};

/**
 * Broadcast alert to WebSocket clients
 */
const broadcastAlert = (alert) => {
  const io = getIO();
  if (io) {
    io.emit('alert:new', alert);
  }
};

/**
 * Broadcast alert update to WebSocket clients
 */
const broadcastAlertUpdate = (alert) => {
  const io = getIO();
  if (io) {
    io.emit('alert:update', alert);
  }
};

/**
 * Check if alert should trigger notifications
 */
const checkAlertNotifications = async (alert) => {
  // In production, implement email/SMS notifications here
  if (alert.severity === ALERT_SEVERITY.CRITICAL) {
    logger.warn('Critical alert - notification should be sent', {
      alertId: alert.id,
      title: alert.title
    });
  }
};

/**
 * Generate unique alert ID
 */
const generateAlertId = () => {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  ALERT_TYPES,
  ALERT_SEVERITY,
  createAlert,
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  getAlertStats
};

