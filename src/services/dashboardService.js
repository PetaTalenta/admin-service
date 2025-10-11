const { sequelize } = require('../models');
const { User, AnalysisResult, AnalysisJob, UserActivityLog } = require('../models');
const { Op } = require('sequelize');

class DashboardService {
  /**
   * Get real-time dashboard data
   */
  async getRealtimeData(filters = {}) {
    try {
      const {
        refreshInterval = 30000 // 30 seconds
      } = filters;

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Real-time metrics
      const realtimeMetrics = await sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM auth.users WHERE user_type = 'user' AND is_active = true) as active_users,
          (SELECT COUNT(*) FROM archive.analysis_jobs WHERE created_at >= :oneHourAgo) as jobs_last_hour,
          (SELECT COUNT(*) FROM archive.analysis_jobs WHERE status = 'processing') as jobs_processing,
          (SELECT COUNT(*) FROM archive.analysis_jobs WHERE status = 'pending') as jobs_pending,
          (SELECT COUNT(*) FROM archive.user_activity_logs WHERE created_at >= :oneHourAgo) as activities_last_hour
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });

      // System performance metrics
      const performanceMetrics = await sequelize.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_job_duration,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs_today,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs_today
        FROM archive.analysis_jobs
        WHERE created_at >= :oneDayAgo
      `, {
        replacements: { oneDayAgo },
        type: sequelize.QueryTypes.SELECT
      });

      // Recent activity feed
      const recentActivity = await sequelize.query(`
        SELECT 
          ual.activity_type,
          ual.activity_data,
          ual.created_at,
          u.email as user_email,
          a.email as admin_email
        FROM archive.user_activity_logs ual
        LEFT JOIN auth.users u ON ual.user_id = u.id
        LEFT JOIN auth.users a ON ual.admin_id = a.id
        WHERE ual.created_at >= :oneHourAgo
        ORDER BY ual.created_at DESC
        LIMIT 20
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });

      // Token usage in last hour
      const tokenUsage = await sequelize.query(`
        SELECT 
          SUM(ut.total_tokens) as tokens_used_last_hour,
          COUNT(DISTINCT c.user_id) as active_token_users,
          AVG(ut.total_tokens) as avg_tokens_per_session
        FROM chat.usage_tracking ut
        JOIN chat.conversations c ON ut.conversation_id = c.id
        WHERE ut.created_at >= :oneHourAgo
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          timestamp: now,
          refreshInterval,
          metrics: {
            ...realtimeMetrics[0],
            ...performanceMetrics[0],
            ...tokenUsage[0]
          },
          recentActivity: recentActivity || [],
          systemStatus: 'operational' // This could be determined by various health checks
        }
      };
    } catch (error) {
      console.error('Dashboard getRealtimeData error:', error);
      return {
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to get realtime dashboard data'
        }
      };
    }
  }

  /**
   * Get system alerts and notifications
   */
  async getSystemAlerts(filters = {}) {
    try {
      const {
        severity = 'all',
        limit = 50
      } = filters;

      const alerts = [];
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check for high failure rate
      const failureRate = await sequelize.query(`
        SELECT 
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
          COUNT(*) as total_jobs,
          ROUND(COUNT(CASE WHEN status = 'failed' THEN 1 END) * 100.0 / COUNT(*), 2) as failure_rate
        FROM archive.analysis_jobs
        WHERE created_at >= :oneHourAgo
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });

      if (failureRate[0] && parseFloat(failureRate[0].failure_rate) > 10) {
        alerts.push({
          id: 'high_failure_rate',
          type: 'warning',
          severity: 'medium',
          title: 'High Job Failure Rate',
          message: `${failureRate[0].failure_rate}% of jobs failed in the last hour`,
          timestamp: now,
          data: failureRate[0]
        });
      }

      // Check for suspicious login activity
      const suspiciousLogins = await sequelize.query(`
        SELECT 
          ip_address,
          COUNT(*) as failed_attempts
        FROM archive.user_activity_logs
        WHERE activity_type = 'login'
          AND activity_data->>'success' = 'false'
          AND created_at >= :oneHourAgo
        GROUP BY ip_address
        HAVING COUNT(*) > 5
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });

      if (suspiciousLogins.length > 0) {
        alerts.push({
          id: 'suspicious_login_activity',
          type: 'security',
          severity: 'high',
          title: 'Suspicious Login Activity Detected',
          message: `${suspiciousLogins.length} IP addresses with multiple failed login attempts`,
          timestamp: now,
          data: suspiciousLogins
        });
      }

      // Check for low token balances
      const lowBalanceUsers = await sequelize.query(`
        SELECT COUNT(*) as low_balance_count
        FROM auth.users
        WHERE user_type = 'user'
          AND token_balance < 10
          AND token_balance > 0
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      if (lowBalanceUsers[0] && parseInt(lowBalanceUsers[0].low_balance_count) > 50) {
        alerts.push({
          id: 'low_token_balances',
          type: 'info',
          severity: 'low',
          title: 'Many Users with Low Token Balances',
          message: `${lowBalanceUsers[0].low_balance_count} users have less than 10 tokens`,
          timestamp: now,
          data: lowBalanceUsers[0]
        });
      }

      // Check for database performance issues
      const longRunningJobs = await sequelize.query(`
        SELECT COUNT(*) as long_running_count
        FROM archive.analysis_jobs
        WHERE status = 'processing'
          AND created_at < :oneHourAgo
      `, {
        replacements: { oneHourAgo },
        type: sequelize.QueryTypes.SELECT
      });

      if (longRunningJobs[0] && parseInt(longRunningJobs[0].long_running_count) > 0) {
        alerts.push({
          id: 'long_running_jobs',
          type: 'performance',
          severity: 'medium',
          title: 'Long Running Jobs Detected',
          message: `${longRunningJobs[0].long_running_count} jobs have been processing for over an hour`,
          timestamp: now,
          data: longRunningJobs[0]
        });
      }

      // Filter by severity if specified
      const filteredAlerts = severity === 'all' 
        ? alerts 
        : alerts.filter(alert => alert.severity === severity);

      return {
        success: true,
        data: {
          alerts: filteredAlerts.slice(0, limit),
          totalAlerts: filteredAlerts.length,
          alertCounts: {
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length
          },
          lastChecked: now
        }
      };
    } catch (error) {
      console.error('Dashboard getSystemAlerts error:', error);
      return {
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to get system alerts'
        }
      };
    }
  }

  /**
   * Get key performance indicators
   */
  async getKPIs(filters = {}) {
    try {
      const {
        period = 'daily',
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = filters;

      // User engagement KPIs
      const userKPIs = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN u.last_login >= :startDate THEN u.id END) as active_users,
          COUNT(DISTINCT CASE WHEN u.created_at >= :startDate THEN u.id END) as new_users,
          ROUND(
            COUNT(DISTINCT CASE WHEN u.last_login >= :startDate THEN u.id END) * 100.0 / 
            COUNT(DISTINCT u.id), 2
          ) as user_engagement_rate
        FROM auth.users u
        WHERE u.user_type = 'user'
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Assessment KPIs
      const assessmentKPIs = await sequelize.query(`
        SELECT 
          COUNT(aj.id) as total_assessments,
          COUNT(ar.id) as completed_assessments,
          ROUND(COUNT(ar.id) * 100.0 / COUNT(aj.id), 2) as completion_rate,
          AVG(EXTRACT(EPOCH FROM (aj.completed_at - aj.created_at))) as avg_processing_time,
          AVG((ar.analysis_result->>'overall_score')::numeric) as avg_assessment_score
        FROM archive.analysis_jobs aj
        LEFT JOIN archive.analysis_results ar ON aj.id = ar.job_id
        WHERE aj.created_at BETWEEN :startDate AND :endDate
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Token usage KPIs
      const tokenKPIs = await sequelize.query(`
        SELECT 
          SUM(ut.total_tokens) as total_tokens_consumed,
          COUNT(DISTINCT c.user_id) as token_using_users,
          AVG(ut.total_tokens) as avg_tokens_per_session,
          SUM(ut.cost_credits) as total_cost_credits
        FROM chat.usage_tracking ut
        JOIN chat.conversations c ON ut.conversation_id = c.id
        WHERE ut.created_at BETWEEN :startDate AND :endDate
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // System performance KPIs
      const performanceKPIs = await sequelize.query(`
        SELECT 
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
          COUNT(*) as total_jobs,
          ROUND(COUNT(CASE WHEN status = 'failed' THEN 1 END) * 100.0 / COUNT(*), 2) as error_rate,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_response_time
        FROM archive.analysis_jobs
        WHERE created_at BETWEEN :startDate AND :endDate
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          period,
          dateRange: { startDate, endDate },
          kpis: {
            user: userKPIs[0] || {},
            assessment: assessmentKPIs[0] || {},
            token: tokenKPIs[0] || {},
            performance: performanceKPIs[0] || {}
          },
          calculatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Dashboard getKPIs error:', error);
      return {
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to get KPIs'
        }
      };
    }
  }
}

module.exports = new DashboardService();
