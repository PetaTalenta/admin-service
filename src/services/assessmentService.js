/**
 * Assessment Service for Admin Service
 * Phase 2 Implementation - Assessment Management & Analysis
 */

const { sequelize } = require('../config/database');
const { AnalysisJob, AnalysisResult, User, IdempotencyCache } = require('../models');
const { Op } = require('sequelize');

class AssessmentService {
  /**
   * Get assessment completion statistics and overview
   */
  static async getAssessmentOverview(params = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        period = 'daily'
      } = params;

      // Total assessments
      const totalAssessments = await AnalysisResult.count();
      
      // Assessments in period
      const periodAssessments = await AnalysisResult.count({
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      // Job status distribution
      const jobStatusDistribution = await AnalysisJob.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['status']
      });

      // Assessment completion trends
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

      const completionTrends = await sequelize.query(`
        SELECT 
          ${dateFormat} as period,
          COUNT(ar.id) as completed_assessments,
          COUNT(DISTINCT ar.user_id) as unique_users,
          AVG(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as avg_processing_time
        FROM archive.analysis_results ar
        JOIN archive.analysis_jobs aj ON ar.id = aj.result_id
        WHERE ar.created_at BETWEEN :startDate AND :endDate
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Top performing users
      const topUsers = await sequelize.query(`
        SELECT 
          u.id,
          u.email,
          u.username,
          COUNT(ar.id) as assessment_count,
          AVG(CASE 
            WHEN ar.test_result->>'overall_score' IS NOT NULL 
            THEN (ar.test_result->>'overall_score')::numeric 
            ELSE NULL 
          END) as avg_score
        FROM auth.users u
        JOIN archive.analysis_results ar ON u.id = ar.user_id
        WHERE ar.created_at BETWEEN :startDate AND :endDate
          AND u.user_type = 'user'
        GROUP BY u.id, u.email, u.username
        HAVING COUNT(ar.id) >= 1
        ORDER BY assessment_count DESC, avg_score DESC
        LIMIT 10
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          overview: {
            totalAssessments,
            periodAssessments,
            completionRate: totalAssessments > 0 ? (periodAssessments / totalAssessments * 100).toFixed(2) : 0
          },
          statusDistribution: jobStatusDistribution.map(item => ({
            status: item.status,
            count: parseInt(item.dataValues.count)
          })),
          trends: completionTrends.map(item => ({
            period: item.period,
            completedAssessments: parseInt(item.completed_assessments),
            uniqueUsers: parseInt(item.unique_users),
            avgProcessingTime: parseFloat(item.avg_processing_time || 0).toFixed(2)
          })),
          topUsers
        }
      };
    } catch (error) {
      console.error('Assessment getAssessmentOverview error:', error);
      return {
        success: false,
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to get assessment overview'
        }
      };
    }
  }

  /**
   * Get detailed assessment analysis for specific result
   */
  static async getAssessmentDetails(resultId) {
    try {
      const result = await AnalysisResult.findByPk(resultId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'username', 'user_type']
          }
        ]
      });

      if (!result) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Assessment result not found'
          }
        };
      }

      // Get associated job
      const job = await AnalysisJob.findOne({
        where: { result_id: resultId }
      });

      // Parse test data and results
      const testData = result.test_data || {};
      const testResult = result.test_result || {};
      const rawResponses = result.raw_responses || {};

      // Calculate detailed metrics
      const metrics = {
        processingTime: job ? 
          Math.round((new Date(result.created_at) - new Date(job.created_at)) / 1000) : null,
        responseCount: Object.keys(rawResponses).length,
        dataQuality: this.calculateDataQuality(testData, rawResponses),
        scoreBreakdown: this.extractScoreBreakdown(testResult)
      };

      return {
        success: true,
        data: {
          result: {
            id: result.id,
            user: result.user,
            testData,
            testResult,
            rawResponses,
            createdAt: result.created_at,
            updatedAt: result.updated_at
          },
          job: job ? {
            id: job.id,
            jobId: job.job_id,
            status: job.status,
            createdAt: job.created_at,
            updatedAt: job.updated_at
          } : null,
          metrics
        }
      };
    } catch (error) {
      console.error('Assessment getAssessmentDetails error:', error);
      return {
        success: false,
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to get assessment details'
        }
      };
    }
  }

  /**
   * Calculate data quality score based on completeness and consistency
   */
  static calculateDataQuality(testData, rawResponses) {
    try {
      const testDataKeys = Object.keys(testData);
      const responseKeys = Object.keys(rawResponses);
      
      if (testDataKeys.length === 0) return 0;
      
      const completeness = (responseKeys.length / testDataKeys.length) * 100;
      const consistency = this.calculateConsistency(testData, rawResponses);
      
      return {
        completeness: Math.round(completeness),
        consistency: Math.round(consistency),
        overall: Math.round((completeness + consistency) / 2)
      };
    } catch (error) {
      return { completeness: 0, consistency: 0, overall: 0 };
    }
  }

  /**
   * Calculate consistency between test data and responses
   */
  static calculateConsistency(testData, rawResponses) {
    try {
      let consistentFields = 0;
      let totalFields = 0;
      
      for (const [key, value] of Object.entries(testData)) {
        if (rawResponses[key] !== undefined) {
          totalFields++;
          // Simple consistency check - can be enhanced based on data types
          if (typeof value === typeof rawResponses[key]) {
            consistentFields++;
          }
        }
      }
      
      return totalFields > 0 ? (consistentFields / totalFields) * 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract score breakdown from test results
   */
  static extractScoreBreakdown(testResult) {
    try {
      const breakdown = {};

      // Extract common score fields
      if (testResult.overall_score !== undefined) {
        breakdown.overall = parseFloat(testResult.overall_score);
      }

      // Extract category scores if available
      if (testResult.category_scores) {
        breakdown.categories = testResult.category_scores;
      }

      // Extract individual scores
      if (testResult.scores) {
        breakdown.individual = testResult.scores;
      }

      return breakdown;
    } catch (error) {
      return {};
    }
  }

  /**
   * Get raw response vs test result analysis
   */
  static async getRawAnalysis(params = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        limit = 100
      } = params;

      const rawAnalysis = await sequelize.query(`
        SELECT
          ar.id,
          ar.user_id,
          u.email,
          ar.test_data,
          ar.test_result,
          ar.raw_responses,
          ar.created_at,
          CASE
            WHEN ar.test_result->>'overall_score' IS NOT NULL
            THEN (ar.test_result->>'overall_score')::numeric
            ELSE NULL
          END as overall_score,
          jsonb_array_length(COALESCE(ar.raw_responses, '{}')) as response_count
        FROM archive.analysis_results ar
        JOIN auth.users u ON ar.user_id = u.id
        WHERE ar.created_at BETWEEN :startDate AND :endDate
        ORDER BY ar.created_at DESC
        LIMIT :limit
      `, {
        replacements: { startDate, endDate, limit },
        type: sequelize.QueryTypes.SELECT
      });

      // Calculate analysis statistics
      const stats = {
        totalResults: rawAnalysis.length,
        avgScore: 0,
        avgResponseCount: 0,
        scoreDistribution: {
          excellent: 0, // 90-100
          good: 0,      // 70-89
          average: 0,   // 50-69
          poor: 0       // 0-49
        }
      };

      let validScores = 0;
      let totalResponseCount = 0;

      rawAnalysis.forEach(item => {
        if (item.overall_score !== null) {
          stats.avgScore += parseFloat(item.overall_score);
          validScores++;

          const score = parseFloat(item.overall_score);
          if (score >= 90) stats.scoreDistribution.excellent++;
          else if (score >= 70) stats.scoreDistribution.good++;
          else if (score >= 50) stats.scoreDistribution.average++;
          else stats.scoreDistribution.poor++;
        }

        totalResponseCount += parseInt(item.response_count || 0);
      });

      if (validScores > 0) {
        stats.avgScore = (stats.avgScore / validScores).toFixed(2);
      }

      if (rawAnalysis.length > 0) {
        stats.avgResponseCount = (totalResponseCount / rawAnalysis.length).toFixed(1);
      }

      return {
        success: true,
        data: {
          results: rawAnalysis,
          statistics: stats
        }
      };
    } catch (error) {
      console.error('Assessment getRawAnalysis error:', error);
      return {
        success: false,
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to get raw analysis'
        }
      };
    }
  }

  /**
   * Get assessment performance metrics and statistics
   */
  static async getPerformanceMetrics(params = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = params;

      // Processing time metrics
      const processingMetrics = await sequelize.query(`
        SELECT
          COUNT(*) as total_jobs,
          AVG(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as avg_processing_time,
          MIN(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as min_processing_time,
          MAX(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as max_processing_time,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as median_processing_time
        FROM archive.analysis_jobs aj
        JOIN archive.analysis_results ar ON aj.result_id = ar.id
        WHERE aj.created_at BETWEEN :startDate AND :endDate
          AND aj.status = 'completed'
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Error rate analysis
      const errorAnalysis = await sequelize.query(`
        SELECT
          status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM archive.analysis_jobs
        WHERE created_at BETWEEN :startDate AND :endDate
        GROUP BY status
        ORDER BY count DESC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Peak usage analysis
      const peakUsage = await sequelize.query(`
        SELECT
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as job_count
        FROM archive.analysis_jobs
        WHERE created_at BETWEEN :startDate AND :endDate
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY job_count DESC
        LIMIT 5
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          processingMetrics: processingMetrics[0],
          errorAnalysis,
          peakUsage
        }
      };
    } catch (error) {
      console.error('Assessment getPerformanceMetrics error:', error);
      return {
        success: false,
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to get performance metrics'
        }
      };
    }
  }

  /**
   * Get assessment trend analysis over time
   */
  static async getTrendAnalysis(params = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        period = 'daily'
      } = params;

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

      // Volume trends
      const volumeTrends = await sequelize.query(`
        SELECT
          ${dateFormat} as period,
          COUNT(aj.id) as total_jobs,
          COUNT(CASE WHEN aj.status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN aj.status = 'failed' THEN 1 END) as failed_jobs,
          COUNT(DISTINCT aj.user_id) as unique_users
        FROM archive.analysis_jobs aj
        WHERE aj.created_at BETWEEN :startDate AND :endDate
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Score trends
      const scoreTrends = await sequelize.query(`
        SELECT
          ${dateFormat} as period,
          COUNT(ar.id) as assessment_count,
          AVG(CASE
            WHEN ar.test_result->>'overall_score' IS NOT NULL
            THEN (ar.test_result->>'overall_score')::numeric
            ELSE NULL
          END) as avg_score,
          MIN(CASE
            WHEN ar.test_result->>'overall_score' IS NOT NULL
            THEN (ar.test_result->>'overall_score')::numeric
            ELSE NULL
          END) as min_score,
          MAX(CASE
            WHEN ar.test_result->>'overall_score' IS NOT NULL
            THEN (ar.test_result->>'overall_score')::numeric
            ELSE NULL
          END) as max_score
        FROM archive.analysis_results ar
        WHERE ar.created_at BETWEEN :startDate AND :endDate
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          volumeTrends,
          scoreTrends
        }
      };
    } catch (error) {
      console.error('Assessment getTrendAnalysis error:', error);
      return {
        success: false,
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to get trend analysis'
        }
      };
    }
  }
}

module.exports = AssessmentService;
