/**
 * System Service for Admin Service
 * Phase 2 Implementation - System Performance Monitoring
 */

const { sequelize } = require('../config/database');
const { SystemMetrics, AnalysisJob, User, UserActivityLog } = require('../models');
const { Op } = require('sequelize');

class SystemService {
  /**
   * Get system performance metrics and resource usage
   */
  static async getSystemMetrics(params = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate = new Date(),
        category = null
      } = params;

      // Get system metrics from database
      let whereConditions = {
        recorded_at: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (category) {
        whereConditions.metric_category = category;
      }

      const metrics = await SystemMetrics.findAll({
        where: whereConditions,
        order: [['recorded_at', 'DESC']],
        limit: 1000
      });

      // Group metrics by category
      const metricsByCategory = {};
      metrics.forEach(metric => {
        const category = metric.metric_category;
        if (!metricsByCategory[category]) {
          metricsByCategory[category] = [];
        }
        metricsByCategory[category].push({
          name: metric.metric_name,
          value: parseFloat(metric.metric_value),
          unit: metric.metric_unit,
          recordedAt: metric.recorded_at,
          metadata: metric.metadata
        });
      });

      // Calculate current system load based on job queue
      const currentLoad = await this.calculateSystemLoad();

      // Get database connection stats
      const dbStats = await this.getDatabaseConnectionStats();

      // Memory and performance indicators (simulated - in real implementation would come from actual monitoring)
      const performanceIndicators = {
        cpuUsage: Math.random() * 100, // This should come from actual system monitoring
        memoryUsage: Math.random() * 100,
        diskUsage: Math.random() * 100,
        networkLatency: Math.random() * 50 + 10,
        responseTime: Math.random() * 500 + 100
      };

      return {
        success: true,
        data: {
          metricsByCategory,
          currentLoad,
          dbStats,
          performanceIndicators,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('System getSystemMetrics error:', error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Failed to get system metrics'
        }
      };
    }
  }

  /**
   * Calculate current system load based on job queue and activity
   */
  static async calculateSystemLoad() {
    try {
      const jobStats = await sequelize.query(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as jobs_last_hour
        FROM archive.analysis_jobs
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      const stats = jobStats[0];
      const queueLoad = parseInt(stats.pending_jobs) + parseInt(stats.processing_jobs);
      const hourlyRate = parseInt(stats.jobs_last_hour);

      // Calculate load percentage (this is a simplified calculation)
      const maxCapacity = 100; // This should be configurable based on system capacity
      const loadPercentage = Math.min((queueLoad / maxCapacity) * 100, 100);

      return {
        queueLoad,
        hourlyRate,
        loadPercentage: Math.round(loadPercentage),
        status: loadPercentage > 80 ? 'high' : loadPercentage > 50 ? 'medium' : 'low'
      };
    } catch (error) {
      console.error('Error calculating system load:', error);
      return {
        queueLoad: 0,
        hourlyRate: 0,
        loadPercentage: 0,
        status: 'unknown'
      };
    }
  }

  /**
   * Get database connection statistics
   */
  static async getDatabaseConnectionStats() {
    try {
      // Test database connection
      await sequelize.authenticate();

      // Get connection pool stats (simplified)
      const poolStats = {
        totalConnections: sequelize.connectionManager.pool.size,
        activeConnections: sequelize.connectionManager.pool.used,
        idleConnections: sequelize.connectionManager.pool.available,
        maxConnections: sequelize.connectionManager.pool.max
      };

      // Get database size and table stats
      const dbSizeStats = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname IN ('auth', 'archive', 'chat', 'assessment')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        connectionStatus: 'healthy',
        poolStats,
        tableStats: dbSizeStats,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        connectionStatus: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Get comprehensive health check for all system components
   */
  static async getSystemHealth() {
    try {
      const healthChecks = {};

      // Database health
      try {
        await sequelize.authenticate();
        healthChecks.database = {
          status: 'healthy',
          responseTime: Date.now(), // This should measure actual response time
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        healthChecks.database = {
          status: 'unhealthy',
          error: error.message,
          lastChecked: new Date().toISOString()
        };
      }

      // Job queue health
      const queueHealth = await this.checkQueueHealth();
      healthChecks.jobQueue = queueHealth;

      // Service dependencies health (simulated)
      healthChecks.services = {
        authService: { status: 'healthy', responseTime: 45 },
        archiveService: { status: 'healthy', responseTime: 32 },
        assessmentService: { status: 'healthy', responseTime: 28 },
        chatbotService: { status: 'healthy', responseTime: 67 },
        notificationService: { status: 'healthy', responseTime: 23 }
      };

      // Overall system status
      const allHealthy = Object.values(healthChecks).every(check => 
        check.status === 'healthy' || (check.services && Object.values(check.services).every(s => s.status === 'healthy'))
      );

      return {
        success: true,
        data: {
          overallStatus: allHealthy ? 'healthy' : 'degraded',
          components: healthChecks,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('System getSystemHealth error:', error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Failed to get system health'
        }
      };
    }
  }

  /**
   * Check job queue health
   */
  static async checkQueueHealth() {
    try {
      const queueStats = await sequelize.query(`
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
          COUNT(CASE WHEN status = 'failed' AND created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_failures,
          AVG(CASE 
            WHEN status = 'completed' AND updated_at >= NOW() - INTERVAL '1 hour'
            THEN EXTRACT(EPOCH FROM (updated_at - created_at))
            ELSE NULL 
          END) as avg_processing_time
        FROM archive.analysis_jobs
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      const stats = queueStats[0];
      const pendingCount = parseInt(stats.pending_count);
      const recentFailures = parseInt(stats.recent_failures);
      const avgProcessingTime = parseFloat(stats.avg_processing_time || 0);

      let status = 'healthy';
      if (pendingCount > 100 || recentFailures > 10 || avgProcessingTime > 300) {
        status = 'degraded';
      }
      if (pendingCount > 500 || recentFailures > 50 || avgProcessingTime > 600) {
        status = 'unhealthy';
      }

      return {
        status,
        metrics: {
          pendingJobs: pendingCount,
          processingJobs: parseInt(stats.processing_count),
          recentFailures,
          avgProcessingTime: Math.round(avgProcessingTime)
        },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Get database performance statistics
   */
  static async getDatabaseStats() {
    try {
      // Connection pool information
      const connectionStats = await this.getDatabaseConnectionStats();

      // Query performance stats
      const queryStats = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE schemaname IN ('auth', 'archive', 'chat', 'assessment')
        ORDER BY n_live_tup DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Database size information
      const sizeStats = await sequelize.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          pg_database_size(current_database()) as database_size_bytes
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Index usage stats
      const indexStats = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname IN ('auth', 'archive', 'chat', 'assessment')
        ORDER BY idx_scan DESC
        LIMIT 20
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          connectionStats,
          queryStats,
          sizeStats: sizeStats[0],
          indexStats,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('System getDatabaseStats error:', error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Failed to get database statistics'
        }
      };
    }
  }

  /**
   * Get error tracking and analysis across the system
   */
  static async getErrorAnalysis(params = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate = new Date(),
        limit = 100
      } = params;

      // Failed jobs analysis
      const failedJobs = await sequelize.query(`
        SELECT
          DATE_TRUNC('hour', created_at) as error_hour,
          COUNT(*) as error_count,
          array_agg(DISTINCT user_id) as affected_users
        FROM archive.analysis_jobs
        WHERE status = 'failed'
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY error_hour DESC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Error patterns by user
      const errorsByUser = await sequelize.query(`
        SELECT
          u.id,
          u.email,
          u.username,
          COUNT(aj.id) as error_count,
          array_agg(DISTINCT aj.status) as error_types,
          MAX(aj.created_at) as last_error
        FROM auth.users u
        JOIN archive.analysis_jobs aj ON u.id = aj.user_id
        WHERE aj.status = 'failed'
          AND aj.created_at BETWEEN :startDate AND :endDate
        GROUP BY u.id, u.email, u.username
        ORDER BY error_count DESC
        LIMIT 20
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // System error trends
      const errorTrends = await sequelize.query(`
        SELECT
          DATE_TRUNC('day', created_at) as error_date,
          COUNT(*) as total_errors,
          COUNT(DISTINCT user_id) as affected_users,
          ROUND(
            COUNT(*) * 100.0 /
            (SELECT COUNT(*) FROM archive.analysis_jobs WHERE created_at BETWEEN :startDate AND :endDate),
            2
          ) as error_rate
        FROM archive.analysis_jobs
        WHERE status = 'failed'
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY error_date DESC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Recent critical errors (most recent failed jobs)
      const recentErrors = await sequelize.query(`
        SELECT
          aj.id,
          aj.job_id,
          aj.user_id,
          u.email,
          aj.status,
          aj.created_at,
          aj.updated_at
        FROM archive.analysis_jobs aj
        JOIN auth.users u ON aj.user_id = u.id
        WHERE aj.status = 'failed'
          AND aj.created_at BETWEEN :startDate AND :endDate
        ORDER BY aj.created_at DESC
        LIMIT :limit
      `, {
        replacements: { startDate, endDate, limit },
        type: sequelize.QueryTypes.SELECT
      });

      // Error summary statistics
      const errorSummary = await sequelize.query(`
        SELECT
          COUNT(*) as total_errors,
          COUNT(DISTINCT user_id) as affected_users,
          COUNT(DISTINCT DATE_TRUNC('day', created_at)) as error_days,
          MIN(created_at) as first_error,
          MAX(created_at) as last_error
        FROM archive.analysis_jobs
        WHERE status = 'failed'
          AND created_at BETWEEN :startDate AND :endDate
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          summary: errorSummary[0],
          hourlyDistribution: failedJobs,
          errorsByUser,
          trends: errorTrends,
          recentErrors,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('System getErrorAnalysis error:', error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Failed to get error analysis'
        }
      };
    }
  }
}

module.exports = SystemService;
