/**
 * Analytics Service for Admin Service
 * Phase 2 Implementation - User Analytics & Statistics
 */

const { sequelize } = require('../config/database');
const { User, AnalysisJob, AnalysisResult, Conversation, Message, UsageTracking } = require('../models');
const { Op } = require('sequelize');

class AnalyticsService {
  /**
   * Get user registration trends and overview statistics
   */
  static async getUserOverview(params = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        period = 'daily' // daily, weekly, monthly
      } = params;

      // Total users
      const totalUsers = await User.count();
      
      // Active users (users with activity in the period)
      const activeUsers = await User.count({
        where: {
          last_login: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      // New registrations in period
      const newRegistrations = await User.count({
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      // Registration trends by period
      let dateFormat;
      switch (period) {
        case 'weekly':
          dateFormat = "DATE_TRUNC('week', created_at)";
          break;
        case 'monthly':
          dateFormat = "DATE_TRUNC('month', created_at)";
          break;
        default:
          dateFormat = "DATE_TRUNC('day', created_at)";
      }

      const registrationTrends = await sequelize.query(`
        SELECT 
          ${dateFormat} as period,
          COUNT(*) as registrations,
          COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admin_registrations,
          COUNT(CASE WHEN user_type = 'user' THEN 1 END) as user_registrations
        FROM auth.users 
        WHERE created_at BETWEEN :startDate AND :endDate
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // User type distribution
      const userTypeDistribution = await User.findAll({
        attributes: [
          'user_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['user_type']
      });

      return {
        success: true,
        data: {
          overview: {
            totalUsers,
            activeUsers,
            newRegistrations,
            activeUserRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
          },
          trends: registrationTrends,
          distribution: userTypeDistribution.map(item => ({
            type: item.user_type,
            count: parseInt(item.dataValues.count)
          }))
        }
      };
    } catch (error) {
      console.error('Analytics getUserOverview error:', error);
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to get user overview analytics'
        }
      };
    }
  }

  /**
   * Get user activity patterns and engagement metrics
   */
  static async getUserActivity(params = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        period = 'daily'
      } = params;

      // Activity by analysis jobs
      const jobActivity = await AnalysisJob.findAll({
        attributes: [
          [sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at')), 'period'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'job_count'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'unique_users']
        ],
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: [sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at'))],
        order: [[sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at')), 'ASC']]
      });

      // Chat activity
      const chatActivity = await Message.findAll({
        attributes: [
          [sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at')), 'period'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'message_count'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'unique_users']
        ],
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: [sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at'))],
        order: [[sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at')), 'ASC']]
      });

      // Most active users
      const mostActiveUsers = await sequelize.query(`
        SELECT 
          u.id,
          u.email,
          u.username,
          COUNT(DISTINCT aj.id) as job_count,
          COUNT(DISTINCT m.id) as message_count,
          u.last_login
        FROM auth.users u
        LEFT JOIN archive.analysis_jobs aj ON u.id = aj.user_id 
          AND aj.created_at BETWEEN :startDate AND :endDate
        LEFT JOIN chat.messages m ON u.id = m.user_id 
          AND m.created_at BETWEEN :startDate AND :endDate
        WHERE u.user_type = 'user'
        GROUP BY u.id, u.email, u.username, u.last_login
        HAVING COUNT(DISTINCT aj.id) > 0 OR COUNT(DISTINCT m.id) > 0
        ORDER BY (COUNT(DISTINCT aj.id) + COUNT(DISTINCT m.id)) DESC
        LIMIT 10
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          jobActivity: jobActivity.map(item => ({
            period: item.dataValues.period,
            jobCount: parseInt(item.dataValues.job_count),
            uniqueUsers: parseInt(item.dataValues.unique_users)
          })),
          chatActivity: chatActivity.map(item => ({
            period: item.dataValues.period,
            messageCount: parseInt(item.dataValues.message_count),
            uniqueUsers: parseInt(item.dataValues.unique_users)
          })),
          mostActiveUsers
        }
      };
    } catch (error) {
      console.error('Analytics getUserActivity error:', error);
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to get user activity analytics'
        }
      };
    }
  }

  /**
   * Get user demographic analysis and segmentation
   */
  static async getUserDemographics(params = {}) {
    try {
      // User distribution by registration date
      const registrationDistribution = await sequelize.query(`
        SELECT 
          CASE 
            WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'Last 7 days'
            WHEN created_at >= NOW() - INTERVAL '30 days' THEN 'Last 30 days'
            WHEN created_at >= NOW() - INTERVAL '90 days' THEN 'Last 90 days'
            ELSE 'Older than 90 days'
          END as registration_period,
          COUNT(*) as user_count
        FROM auth.users
        WHERE user_type = 'user'
        GROUP BY registration_period
        ORDER BY 
          CASE registration_period
            WHEN 'Last 7 days' THEN 1
            WHEN 'Last 30 days' THEN 2
            WHEN 'Last 90 days' THEN 3
            ELSE 4
          END
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Token balance distribution
      const tokenDistribution = await sequelize.query(`
        SELECT 
          CASE 
            WHEN token_balance = 0 THEN '0 tokens'
            WHEN token_balance BETWEEN 1 AND 10 THEN '1-10 tokens'
            WHEN token_balance BETWEEN 11 AND 50 THEN '11-50 tokens'
            WHEN token_balance BETWEEN 51 AND 100 THEN '51-100 tokens'
            ELSE '100+ tokens'
          END as token_range,
          COUNT(*) as user_count,
          AVG(token_balance) as avg_balance
        FROM auth.users
        WHERE user_type = 'user'
        GROUP BY token_range
        ORDER BY 
          CASE token_range
            WHEN '0 tokens' THEN 1
            WHEN '1-10 tokens' THEN 2
            WHEN '11-50 tokens' THEN 3
            WHEN '51-100 tokens' THEN 4
            ELSE 5
          END
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Activity level segmentation
      const activitySegmentation = await sequelize.query(`
        SELECT 
          CASE 
            WHEN job_count = 0 AND message_count = 0 THEN 'Inactive'
            WHEN job_count + message_count BETWEEN 1 AND 5 THEN 'Low Activity'
            WHEN job_count + message_count BETWEEN 6 AND 20 THEN 'Medium Activity'
            ELSE 'High Activity'
          END as activity_level,
          COUNT(*) as user_count,
          AVG(job_count) as avg_jobs,
          AVG(message_count) as avg_messages
        FROM (
          SELECT 
            u.id,
            COUNT(DISTINCT aj.id) as job_count,
            COUNT(DISTINCT m.id) as message_count
          FROM auth.users u
          LEFT JOIN archive.analysis_jobs aj ON u.id = aj.user_id
          LEFT JOIN chat.messages m ON u.id = m.user_id
          WHERE u.user_type = 'user'
          GROUP BY u.id
        ) user_activity
        GROUP BY activity_level
        ORDER BY 
          CASE activity_level
            WHEN 'Inactive' THEN 1
            WHEN 'Low Activity' THEN 2
            WHEN 'Medium Activity' THEN 3
            ELSE 4
          END
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          registrationDistribution,
          tokenDistribution,
          activitySegmentation
        }
      };
    } catch (error) {
      console.error('Analytics getUserDemographics error:', error);
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to get user demographics analytics'
        }
      };
    }
  }

  /**
   * Get user retention metrics and cohort analysis
   */
  static async getUserRetention(params = {}) {
    try {
      const { 
        cohortPeriod = 'monthly' // weekly, monthly
      } = params;

      // Cohort analysis - users who registered in the same period and their return rate
      const cohortAnalysis = await sequelize.query(`
        WITH user_cohorts AS (
          SELECT 
            id,
            email,
            DATE_TRUNC('${cohortPeriod}', created_at) as cohort_period,
            created_at
          FROM auth.users
          WHERE user_type = 'user'
            AND created_at >= NOW() - INTERVAL '6 months'
        ),
        user_activity AS (
          SELECT 
            uc.id,
            uc.cohort_period,
            uc.created_at,
            COALESCE(MAX(aj.created_at), MAX(m.created_at)) as last_activity
          FROM user_cohorts uc
          LEFT JOIN archive.analysis_jobs aj ON uc.id = aj.user_id
          LEFT JOIN chat.messages m ON uc.id = m.user_id
          GROUP BY uc.id, uc.cohort_period, uc.created_at
        )
        SELECT 
          cohort_period,
          COUNT(*) as cohort_size,
          COUNT(CASE WHEN last_activity IS NOT NULL THEN 1 END) as active_users,
          ROUND(
            COUNT(CASE WHEN last_activity IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
            2
          ) as retention_rate,
          COUNT(CASE WHEN last_activity >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_active,
          COUNT(CASE WHEN last_activity >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_active
        FROM user_activity
        GROUP BY cohort_period
        ORDER BY cohort_period DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Overall retention metrics
      const retentionMetrics = await sequelize.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '1 day' THEN 1 END) as daily_active,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_active,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_active,
          ROUND(
            COUNT(CASE WHEN last_login >= NOW() - INTERVAL '1 day' THEN 1 END) * 100.0 / COUNT(*), 
            2
          ) as daily_retention_rate,
          ROUND(
            COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) * 100.0 / COUNT(*), 
            2
          ) as weekly_retention_rate,
          ROUND(
            COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) * 100.0 / COUNT(*), 
            2
          ) as monthly_retention_rate
        FROM auth.users
        WHERE user_type = 'user'
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          cohortAnalysis,
          retentionMetrics: retentionMetrics[0]
        }
      };
    } catch (error) {
      console.error('Analytics getUserRetention error:', error);
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to get user retention analytics'
        }
      };
    }
  }
}

module.exports = AnalyticsService;
