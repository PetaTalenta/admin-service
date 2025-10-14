const os = require('os');
const { archiveSequelize, authSequelize, chatSequelize } = require('../config/database');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

/**
 * Get system health status
 */
const getSystemHealth = async () => {
  const cacheKey = 'system:health';
  
  // Try to get from cache
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Database health
    const dbHealth = await getDatabaseHealth();
    
    // System resources
    const resources = getSystemResources();
    
    // Cache health
    const cacheHealth = {
      status: cacheService.isReady() ? 'healthy' : 'degraded',
      connected: cacheService.isReady()
    };

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      cache: cacheHealth,
      resources: resources,
      version: process.env.npm_package_version || '1.0.0'
    };

    // Determine overall status
    if (dbHealth.auth.status !== 'healthy' || dbHealth.archive.status !== 'healthy') {
      health.status = 'unhealthy';
    } else if (dbHealth.chat.status !== 'healthy' || cacheHealth.status !== 'healthy') {
      health.status = 'degraded';
    }

    // Cache for 10 seconds
    await cacheService.set(cacheKey, health, 10);

    return health;
  } catch (error) {
    logger.error('Error getting system health', {
      error: error.message,
      stack: error.stack
    });

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

/**
 * Get database health for all schemas
 */
const getDatabaseHealth = async () => {
  const schemas = [
    { name: 'auth', instance: authSequelize },
    { name: 'archive', instance: archiveSequelize },
    { name: 'chat', instance: chatSequelize }
  ];

  const health = {};

  for (const schema of schemas) {
    try {
      const startTime = Date.now();
      await schema.instance.authenticate();
      const responseTime = Date.now() - startTime;

      health[schema.name] = {
        status: 'healthy',
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      health[schema.name] = {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  return health;
};

/**
 * Get system resource usage
 */
const getSystemResources = () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
      loadAverage: os.loadavg()
    },
    memory: {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
      usagePercent: ((usedMem / totalMem) * 100).toFixed(2)
    },
    process: {
      memory: formatBytes(process.memoryUsage().heapUsed),
      pid: process.pid,
      uptime: process.uptime()
    }
  };
};

/**
 * Get system metrics
 */
const getSystemMetrics = async () => {
  const cacheKey = 'system:metrics';
  
  // Try to get from cache
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get metrics from database
    const [jobMetrics, userMetrics, chatMetrics] = await Promise.all([
      getJobMetrics(),
      getUserMetrics(),
      getChatMetrics()
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      jobs: jobMetrics,
      users: userMetrics,
      chat: chatMetrics,
      system: getSystemResources()
    };

    // Cache for 30 seconds
    await cacheService.set(cacheKey, metrics, 30);

    return metrics;
  } catch (error) {
    logger.error('Error getting system metrics', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get job metrics
 */
const getJobMetrics = async () => {
  try {
    const [results] = await archiveSequelize.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
        COUNT(*) FILTER (WHERE status = 'queue') as queued_jobs,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) FILTER (WHERE status = 'completed') as avg_processing_time
      FROM archive.analysis_jobs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

    return results[0] || {};
  } catch (error) {
    logger.error('Error getting job metrics', { error: error.message });
    return {};
  }
};

/**
 * Get user metrics
 */
const getUserMetrics = async () => {
  try {
    const [results] = await authSequelize.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as new_users_today,
        COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '24 hours') as active_today,
        SUM(token_balance) as total_tokens
      FROM auth.users
    `);

    return results[0] || {};
  } catch (error) {
    logger.error('Error getting user metrics', { error: error.message });
    return {};
  }
};

/**
 * Get chat metrics
 */
const getChatMetrics = async () => {
  try {
    const [results] = await chatSequelize.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= NOW() - INTERVAL '24 hours') as conversations_today,
        COUNT(m.id) as total_messages,
        COUNT(m.id) FILTER (WHERE m.created_at >= NOW() - INTERVAL '24 hours') as messages_today,
        COALESCE(SUM(ut.total_tokens), 0) as total_tokens_used
      FROM chat.conversations c
      LEFT JOIN chat.messages m ON c.id = m.conversation_id
      LEFT JOIN chat.usage_tracking ut ON m.id = ut.message_id
    `);

    return results[0] || {};
  } catch (error) {
    logger.error('Error getting chat metrics', { error: error.message });
    return {};
  }
};

/**
 * Record system metric
 */
const recordMetric = async (metricName, metricValue, metricData = null) => {
  try {
    await archiveSequelize.query(`
      INSERT INTO archive.system_metrics (metric_name, metric_value, metric_data, recorded_at)
      VALUES (:metricName, :metricValue, :metricData, NOW())
    `, {
      replacements: {
        metricName,
        metricValue,
        metricData: metricData ? JSON.stringify(metricData) : null
      }
    });

    logger.debug('System metric recorded', {
      metricName,
      metricValue
    });

    return true;
  } catch (error) {
    logger.error('Error recording system metric', {
      error: error.message,
      metricName
    });
    return false;
  }
};

/**
 * Format bytes to human readable format
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  getSystemHealth,
  getSystemMetrics,
  recordMetric,
  getDatabaseHealth,
  getSystemResources
};

