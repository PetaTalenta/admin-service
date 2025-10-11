const { sequelize } = require('../models');
const { User, AnalysisResult, AnalysisJob } = require('../models');
const { Op } = require('sequelize');

class InsightsService {
  /**
   * Get user behavior analysis
   */
  async getUserBehaviorAnalysis(filters = {}) {
    try {
      const {
        period = 'daily',
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        cohortPeriod = 'monthly'
      } = filters;

      // User engagement patterns
      const engagementPatterns = await sequelize.query(`
        SELECT
          DATE_TRUNC('${period}', aj.created_at) as period,
          COUNT(DISTINCT aj.user_id) as active_users,
          COUNT(aj.id) as total_jobs,
          AVG(EXTRACT(EPOCH FROM (aj.completed_at - aj.created_at))) as avg_completion_time,
          COUNT(CASE WHEN ar.id IS NOT NULL THEN 1 END) as successful_jobs
        FROM archive.analysis_jobs aj
        LEFT JOIN archive.analysis_results ar ON aj.result_id = ar.id
        WHERE aj.created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE_TRUNC('${period}', aj.created_at)
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // User retention analysis
      const retentionAnalysis = await sequelize.query(`
        WITH user_cohorts AS (
          SELECT 
            u.id as user_id,
            DATE_TRUNC('${cohortPeriod}', u.created_at) as cohort_period,
            u.created_at as registration_date
          FROM auth.users u
          WHERE u.user_type = 'user'
            AND u.created_at >= :startDate
        ),
        user_activity AS (
          SELECT 
            uc.user_id,
            uc.cohort_period,
            DATE_TRUNC('${cohortPeriod}', aj.created_at) as activity_period,
            COUNT(aj.id) as job_count
          FROM user_cohorts uc
          LEFT JOIN archive.analysis_jobs aj ON uc.user_id = aj.user_id
            AND aj.created_at BETWEEN uc.registration_date AND :endDate
          GROUP BY uc.user_id, uc.cohort_period, DATE_TRUNC('${cohortPeriod}', aj.created_at)
        )
        SELECT 
          cohort_period,
          COUNT(DISTINCT user_id) as cohort_size,
          activity_period,
          COUNT(CASE WHEN job_count > 0 THEN user_id END) as retained_users,
          ROUND(
            COUNT(CASE WHEN job_count > 0 THEN user_id END) * 100.0 / 
            COUNT(DISTINCT user_id), 2
          ) as retention_rate
        FROM user_activity
        GROUP BY cohort_period, activity_period
        ORDER BY cohort_period, activity_period
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Usage frequency distribution
      const usageFrequency = await sequelize.query(`
        SELECT 
          CASE 
            WHEN job_count = 0 THEN 'No usage'
            WHEN job_count BETWEEN 1 AND 5 THEN '1-5 jobs'
            WHEN job_count BETWEEN 6 AND 20 THEN '6-20 jobs'
            WHEN job_count BETWEEN 21 AND 50 THEN '21-50 jobs'
            ELSE '50+ jobs'
          END as usage_category,
          COUNT(*) as user_count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM (
          SELECT 
            u.id,
            COUNT(aj.id) as job_count
          FROM auth.users u
          LEFT JOIN archive.analysis_jobs aj ON u.id = aj.user_id
            AND aj.created_at BETWEEN :startDate AND :endDate
          WHERE u.user_type = 'user'
          GROUP BY u.id
        ) user_jobs
        GROUP BY usage_category
        ORDER BY 
          CASE usage_category
            WHEN 'No usage' THEN 1
            WHEN '1-5 jobs' THEN 2
            WHEN '6-20 jobs' THEN 3
            WHEN '21-50 jobs' THEN 4
            ELSE 5
          END
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          engagementPatterns: engagementPatterns || [],
          retentionAnalysis: retentionAnalysis || [],
          usageFrequency: usageFrequency || []
        }
      };
    } catch (error) {
      console.error('Insights getUserBehaviorAnalysis error:', error);
      return {
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: 'Failed to get user behavior analysis'
        }
      };
    }
  }

  /**
   * Get assessment effectiveness metrics
   */
  async getAssessmentEffectiveness(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = filters;

      // Assessment completion rates
      const completionRates = await sequelize.query(`
        SELECT
          COUNT(aj.id) as total_jobs,
          COUNT(ar.id) as completed_jobs,
          ROUND(COUNT(ar.id) * 100.0 / COUNT(aj.id), 2) as completion_rate,
          AVG(EXTRACT(EPOCH FROM (aj.completed_at - aj.created_at))) as avg_processing_time
        FROM archive.analysis_jobs aj
        LEFT JOIN archive.analysis_results ar ON aj.result_id = ar.id
        WHERE aj.created_at BETWEEN :startDate AND :endDate
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Score distribution analysis
      const scoreDistribution = await sequelize.query(`
        SELECT
          CASE
            WHEN (test_result->>'overall_score')::numeric >= 90 THEN 'Excellent (90-100)'
            WHEN (test_result->>'overall_score')::numeric >= 80 THEN 'Good (80-89)'
            WHEN (test_result->>'overall_score')::numeric >= 70 THEN 'Average (70-79)'
            WHEN (test_result->>'overall_score')::numeric >= 60 THEN 'Below Average (60-69)'
            ELSE 'Poor (<60)'
          END as score_range,
          COUNT(*) as result_count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM archive.analysis_results
        WHERE created_at BETWEEN :startDate AND :endDate
          AND test_result->>'overall_score' IS NOT NULL
        GROUP BY score_range
        ORDER BY
          CASE score_range
            WHEN 'Excellent (90-100)' THEN 1
            WHEN 'Good (80-89)' THEN 2
            WHEN 'Average (70-79)' THEN 3
            WHEN 'Below Average (60-69)' THEN 4
            ELSE 5
          END
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Assessment trends over time
      const assessmentTrends = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', ar.created_at) as date,
          COUNT(*) as assessment_count,
          AVG((ar.analysis_result->>'overall_score')::numeric) as avg_score,
          STDDEV((ar.analysis_result->>'overall_score')::numeric) as score_stddev
        FROM archive.analysis_results ar
        WHERE ar.created_at BETWEEN :startDate AND :endDate
          AND ar.analysis_result->>'overall_score' IS NOT NULL
        GROUP BY DATE_TRUNC('day', ar.created_at)
        ORDER BY date ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          completionRates: completionRates[0] || {
            total_jobs: 0,
            completed_jobs: 0,
            completion_rate: 0,
            avg_processing_time: 0
          },
          scoreDistribution: scoreDistribution || [],
          assessmentTrends: assessmentTrends || []
        }
      };
    } catch (error) {
      console.error('Insights getAssessmentEffectiveness error:', error);
      return {
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: 'Failed to get assessment effectiveness'
        }
      };
    }
  }

  /**
   * Get business intelligence metrics
   */
  async getBusinessMetrics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = filters;

      // User growth metrics
      const userGrowth = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users,
          SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', created_at)) as cumulative_users
        FROM auth.users
        WHERE user_type = 'user'
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Platform usage metrics
      const platformUsage = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT aj.user_id) as active_users,
          COUNT(aj.id) as total_assessments,
          COUNT(ar.id) as completed_assessments,
          AVG(EXTRACT(EPOCH FROM (aj.completed_at - aj.created_at))) as avg_processing_time,
          SUM(CASE WHEN ut.total_tokens > 0 THEN ut.total_tokens ELSE 0 END) as total_tokens_used
        FROM archive.analysis_jobs aj
        LEFT JOIN archive.analysis_results ar ON aj.id = ar.job_id
        LEFT JOIN chat.conversations c ON aj.user_id = c.user_id
        LEFT JOIN chat.usage_tracking ut ON c.id = ut.conversation_id
        WHERE aj.created_at BETWEEN :startDate AND :endDate
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Revenue potential (token usage)
      const revenueMetrics = await sequelize.query(`
        SELECT 
          SUM(ut.total_tokens) as total_tokens_consumed,
          SUM(ut.cost_credits) as total_cost_credits,
          COUNT(DISTINCT c.user_id) as paying_users,
          AVG(ut.total_tokens) as avg_tokens_per_session
        FROM chat.usage_tracking ut
        JOIN chat.conversations c ON ut.conversation_id = c.id
        WHERE ut.created_at BETWEEN :startDate AND :endDate
          AND ut.total_tokens > 0
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          userGrowth: userGrowth || [],
          platformUsage: platformUsage[0] || {
            active_users: 0,
            total_assessments: 0,
            completed_assessments: 0,
            avg_processing_time: 0,
            total_tokens_used: 0
          },
          revenueMetrics: revenueMetrics[0] || {
            total_tokens_consumed: 0,
            total_cost_credits: 0,
            paying_users: 0,
            avg_tokens_per_session: 0
          }
        }
      };
    } catch (error) {
      console.error('Insights getBusinessMetrics error:', error);
      return {
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: 'Failed to get business metrics'
        }
      };
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = filters;

      // User churn prediction (users who haven't been active recently)
      const churnPrediction = await sequelize.query(`
        SELECT 
          u.id,
          u.email,
          u.created_at as registration_date,
          MAX(aj.created_at) as last_activity,
          COUNT(aj.id) as total_jobs,
          EXTRACT(days FROM NOW() - MAX(aj.created_at)) as days_since_last_activity,
          CASE 
            WHEN MAX(aj.created_at) IS NULL THEN 'Never Active'
            WHEN EXTRACT(days FROM NOW() - MAX(aj.created_at)) > 30 THEN 'High Risk'
            WHEN EXTRACT(days FROM NOW() - MAX(aj.created_at)) > 14 THEN 'Medium Risk'
            ELSE 'Low Risk'
          END as churn_risk
        FROM auth.users u
        LEFT JOIN archive.analysis_jobs aj ON u.id = aj.user_id
        WHERE u.user_type = 'user'
          AND u.created_at <= :endDate
        GROUP BY u.id, u.email, u.created_at
        HAVING MAX(aj.created_at) IS NULL OR MAX(aj.created_at) < NOW() - INTERVAL '7 days'
        ORDER BY days_since_last_activity DESC NULLS FIRST
        LIMIT 100
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Growth projections based on historical data
      const growthProjections = await sequelize.query(`
        WITH daily_metrics AS (
          SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as new_users
          FROM auth.users
          WHERE user_type = 'user'
            AND created_at BETWEEN :startDate AND :endDate
          GROUP BY DATE_TRUNC('day', created_at)
        )
        SELECT 
          AVG(new_users) as avg_daily_new_users,
          STDDEV(new_users) as stddev_daily_new_users,
          MIN(new_users) as min_daily_new_users,
          MAX(new_users) as max_daily_new_users,
          COUNT(*) as days_analyzed
        FROM daily_metrics
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          churnPrediction: churnPrediction || [],
          growthProjections: growthProjections[0] || {
            avg_daily_new_users: 0,
            stddev_daily_new_users: 0,
            min_daily_new_users: 0,
            max_daily_new_users: 0,
            days_analyzed: 0
          }
        }
      };
    } catch (error) {
      console.error('Insights getPredictiveAnalytics error:', error);
      return {
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: 'Failed to get predictive analytics'
        }
      };
    }
  }
}

module.exports = new InsightsService();
