/**
 * Job Service for Admin Service
 * Phase 2 Implementation - Job Monitoring & Queue Management
 */

const { sequelize } = require('../config/database');
const { AnalysisJob, AnalysisResult, User, UserActivityLog } = require('../models');
const { Op } = require('sequelize');

class JobService {
  /**
   * Get real-time job monitoring dashboard data
   */
  static async getJobMonitor(params = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate = new Date(),
        limit = 50
      } = params;

      // Current job status overview
      const statusOverview = await AnalysisJob.findAll({
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

      // Recent jobs with details
      const recentJobs = await AnalysisJob.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'username']
          },
          {
            model: AnalysisResult,
            as: 'result',
            attributes: ['id', 'created_at'],
            required: false
          }
        ],
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['created_at', 'DESC']],
        limit: parseInt(limit)
      });

      // Processing time statistics
      const processingStats = await sequelize.query(`
        SELECT 
          COUNT(*) as completed_jobs,
          AVG(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as avg_processing_time,
          MIN(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as min_processing_time,
          MAX(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as max_processing_time
        FROM archive.analysis_jobs aj
        JOIN archive.analysis_results ar ON aj.result_id = ar.id
        WHERE aj.created_at BETWEEN :startDate AND :endDate
          AND aj.status = 'completed'
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Failed jobs analysis
      const failedJobs = await AnalysisJob.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'username']
          }
        ],
        where: {
          status: 'failed',
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['created_at', 'DESC']],
        limit: 20
      });

      // Hourly job distribution
      const hourlyDistribution = await sequelize.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as job_count,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
        FROM archive.analysis_jobs
        WHERE created_at BETWEEN :startDate AND :endDate
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          overview: {
            statusDistribution: statusOverview.map(item => ({
              status: item.status,
              count: parseInt(item.dataValues.count)
            })),
            processingStats: processingStats[0]
          },
          recentJobs: recentJobs.map(job => ({
            id: job.id,
            jobId: job.job_id,
            userId: job.user_id,
            user: job.user,
            status: job.status,
            createdAt: job.created_at,
            updatedAt: job.updated_at,
            hasResult: !!job.result,
            resultCreatedAt: job.result?.created_at || null,
            processingTime: job.result ? 
              Math.round((new Date(job.result.created_at) - new Date(job.created_at)) / 1000) : null
          })),
          failedJobs: failedJobs.map(job => ({
            id: job.id,
            jobId: job.job_id,
            user: job.user,
            createdAt: job.created_at,
            updatedAt: job.updated_at
          })),
          hourlyDistribution
        }
      };
    } catch (error) {
      console.error('Job getJobMonitor error:', error);
      return {
        success: false,
        error: {
          code: 'JOB_ERROR',
          message: 'Failed to get job monitor data'
        }
      };
    }
  }

  /**
   * Get queue health and statistics
   */
  static async getQueueStatus() {
    try {
      // Current queue status
      const queueStats = await sequelize.query(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as jobs_last_hour,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as jobs_last_day
        FROM archive.analysis_jobs
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Queue health metrics
      const healthMetrics = await sequelize.query(`
        SELECT 
          CASE 
            WHEN COUNT(CASE WHEN status = 'pending' THEN 1 END) > 100 THEN 'overloaded'
            WHEN COUNT(CASE WHEN status = 'pending' THEN 1 END) > 50 THEN 'busy'
            WHEN COUNT(CASE WHEN status = 'pending' THEN 1 END) > 10 THEN 'normal'
            ELSE 'idle'
          END as queue_health,
          AVG(CASE 
            WHEN status = 'completed' AND result_id IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (updated_at - created_at))
            ELSE NULL 
          END) as avg_completion_time,
          COUNT(CASE WHEN status = 'failed' AND created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_failures
        FROM archive.analysis_jobs
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Worker performance (simulated - in real implementation this would come from actual worker metrics)
      const workerStats = {
        activeWorkers: 10, // This should come from actual worker monitoring
        totalCapacity: 10,
        utilizationRate: 75.5,
        avgResponseTime: parseFloat(healthMetrics[0].avg_completion_time || 0).toFixed(2)
      };

      // Recent error patterns
      const errorPatterns = await sequelize.query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as error_hour,
          COUNT(*) as error_count
        FROM archive.analysis_jobs
        WHERE status = 'failed'
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY error_hour DESC
        LIMIT 24
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          queueStats: queueStats[0],
          healthMetrics: {
            ...healthMetrics[0],
            workerStats
          },
          errorPatterns,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Job getQueueStatus error:', error);
      return {
        success: false,
        error: {
          code: 'JOB_ERROR',
          message: 'Failed to get queue status'
        }
      };
    }
  }

  /**
   * Get job processing analytics and performance metrics
   */
  static async getJobAnalytics(params = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
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
        case 'hourly':
          dateFormat = "DATE_TRUNC('hour', created_at)";
          break;
        default:
          dateFormat = "DATE_TRUNC('day', created_at)";
      }

      // Job volume trends
      const volumeTrends = await sequelize.query(`
        SELECT 
          ${dateFormat} as period,
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(DISTINCT user_id) as unique_users
        FROM archive.analysis_jobs
        WHERE created_at BETWEEN :startDate AND :endDate
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Performance metrics over time
      const performanceTrends = await sequelize.query(`
        SELECT 
          ${dateFormat} as period,
          COUNT(aj.id) as completed_jobs,
          AVG(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as avg_processing_time,
          MIN(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as min_processing_time,
          MAX(EXTRACT(EPOCH FROM (ar.created_at - aj.created_at))) as max_processing_time
        FROM archive.analysis_jobs aj
        JOIN archive.analysis_results ar ON aj.result_id = ar.id
        WHERE aj.created_at BETWEEN :startDate AND :endDate
          AND aj.status = 'completed'
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Success rate analysis
      const successRateAnalysis = await sequelize.query(`
        SELECT 
          ${dateFormat} as period,
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_jobs,
          ROUND(
            COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 
            2
          ) as success_rate
        FROM archive.analysis_jobs
        WHERE created_at BETWEEN :startDate AND :endDate
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Top users by job volume
      const topUsers = await sequelize.query(`
        SELECT 
          u.id,
          u.email,
          u.username,
          COUNT(aj.id) as job_count,
          COUNT(CASE WHEN aj.status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN aj.status = 'failed' THEN 1 END) as failed_jobs,
          ROUND(
            COUNT(CASE WHEN aj.status = 'completed' THEN 1 END) * 100.0 / COUNT(aj.id), 
            2
          ) as success_rate
        FROM auth.users u
        JOIN archive.analysis_jobs aj ON u.id = aj.user_id
        WHERE aj.created_at BETWEEN :startDate AND :endDate
          AND u.user_type = 'user'
        GROUP BY u.id, u.email, u.username
        ORDER BY job_count DESC
        LIMIT 10
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          volumeTrends,
          performanceTrends,
          successRateAnalysis,
          topUsers
        }
      };
    } catch (error) {
      console.error('Job getJobAnalytics error:', error);
      return {
        success: false,
        error: {
          code: 'JOB_ERROR',
          message: 'Failed to get job analytics'
        }
      };
    }
  }

  /**
   * Retry a failed job
   */
  static async retryJob(jobId, adminId) {
    const transaction = await sequelize.transaction();

    try {
      const job = await AnalysisJob.findByPk(jobId, { transaction });

      if (!job) {
        await transaction.rollback();
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found'
          }
        };
      }

      if (job.status !== 'failed') {
        await transaction.rollback();
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Only failed jobs can be retried'
          }
        };
      }

      // Update job status to pending for retry
      await job.update({
        status: 'pending',
        updated_at: new Date()
      }, { transaction });

      // Log the retry action
      await UserActivityLog.create({
        user_id: job.user_id,
        admin_id: adminId,
        activity_type: 'job_retry',
        activity_description: `Admin retried failed job: ${job.job_id}`,
        metadata: {
          jobId: job.id,
          jobUuid: job.job_id,
          previousStatus: 'failed',
          newStatus: 'pending',
          endpoint: `/admin/jobs/${jobId}/retry`,
          method: 'POST',
          statusCode: 200,
          success: true
        },
        ip_address: '127.0.0.1',
        user_agent: 'Admin Service'
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        data: {
          jobId: job.id,
          jobUuid: job.job_id,
          status: 'pending',
          message: 'Job queued for retry'
        }
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Job retryJob error:', error);
      return {
        success: false,
        error: {
          code: 'JOB_ERROR',
          message: 'Failed to retry job'
        }
      };
    }
  }

  /**
   * Cancel/delete a job
   */
  static async cancelJob(jobId, adminId) {
    const transaction = await sequelize.transaction();

    try {
      const job = await AnalysisJob.findByPk(jobId, { transaction });

      if (!job) {
        await transaction.rollback();
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found'
          }
        };
      }

      if (job.status === 'completed') {
        await transaction.rollback();
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Completed jobs cannot be cancelled'
          }
        };
      }

      const previousStatus = job.status;

      // Update job status to cancelled
      await job.update({
        status: 'cancelled',
        updated_at: new Date()
      }, { transaction });

      // Log the cancellation action
      await UserActivityLog.create({
        user_id: job.user_id,
        admin_id: adminId,
        activity_type: 'job_cancellation',
        activity_description: `Admin cancelled job: ${job.job_id}`,
        metadata: {
          jobId: job.id,
          jobUuid: job.job_id,
          previousStatus,
          newStatus: 'cancelled',
          endpoint: `/admin/jobs/${jobId}`,
          method: 'DELETE',
          statusCode: 200,
          success: true
        },
        ip_address: '127.0.0.1',
        user_agent: 'Admin Service'
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        data: {
          jobId: job.id,
          jobUuid: job.job_id,
          previousStatus,
          status: 'cancelled',
          message: 'Job cancelled successfully'
        }
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Job cancelJob error:', error);
      return {
        success: false,
        error: {
          code: 'JOB_ERROR',
          message: 'Failed to cancel job'
        }
      };
    }
  }
}

module.exports = JobService;
