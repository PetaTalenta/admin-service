const { fn, col, literal } = require('sequelize');
const AnalysisJob = require('../models/AnalysisJob');
const AnalysisResult = require('../models/AnalysisResult');
const SystemMetrics = require('../models/SystemMetrics');
const User = require('../models/User');
const { archiveSequelize } = require('../config/database');
const logger = require('../utils/logger');

// Use Op from archiveSequelize instance for consistency
const Op = archiveSequelize.Sequelize.Op;

/**
 * Get job statistics dashboard
 */
const getJobStats = async () => {
  try {
    // Get overall job counts by status
    const statusCounts = await AnalysisJob.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Convert to object for easier access
    const statusMap = {};
    statusCounts.forEach(item => {
      statusMap[item.status] = parseInt(item.count);
    });

    // Get today's job metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayJobs = await AnalysisJob.count({
      where: {
        created_at: {
          [Op.gte]: today
        }
      }
    });

    const todayCompleted = await AnalysisJob.count({
      where: {
        status: 'completed',
        completed_at: {
          [Op.gte]: today
        }
      }
    });

    const todayFailed = await AnalysisJob.count({
      where: {
        status: 'failed',
        updated_at: {
          [Op.gte]: today
        }
      }
    });

    // Calculate success rate
    const totalCompleted = statusMap.completed || 0;
    const totalFailed = statusMap.failed || 0;
    const totalProcessed = totalCompleted + totalFailed;
    const successRate = totalProcessed > 0 ? ((totalCompleted / totalProcessed) * 100).toFixed(2) : 0;

    // Get average processing time for completed jobs (last 100)
    const recentCompletedJobs = await AnalysisJob.findAll({
      where: {
        status: 'completed',
        processing_started_at: { [Op.ne]: null },
        completed_at: { [Op.ne]: null }
      },
      order: [['completed_at', 'DESC']],
      limit: 100,
      raw: true
    });

    let avgProcessingTime = 0;
    if (recentCompletedJobs.length > 0) {
      const totalTime = recentCompletedJobs.reduce((sum, job) => {
        const startTime = new Date(job.processing_started_at).getTime();
        const endTime = new Date(job.completed_at).getTime();
        return sum + (endTime - startTime);
      }, 0);
      avgProcessingTime = Math.round(totalTime / recentCompletedJobs.length / 1000); // in seconds
    }

    // Get daily job metrics for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyMetrics = await AnalysisJob.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completed'],
        [fn('SUM', literal("CASE WHEN status = 'failed' THEN 1 ELSE 0 END")), 'failed']
      ],
      where: {
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      },
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true
    });

    // Get resource utilization from system_metrics (if available)
    const latestMetrics = await SystemMetrics.findAll({
      where: {
        metric_name: {
          [Op.in]: ['cpu_usage', 'memory_usage', 'queue_size']
        }
      },
      order: [['recorded_at', 'DESC']],
      limit: 3,
      raw: true
    });

    const resourceUtilization = {};
    latestMetrics.forEach(metric => {
      resourceUtilization[metric.metric_name] = {
        value: parseFloat(metric.metric_value),
        data: metric.metric_data,
        recorded_at: metric.recorded_at
      };
    });

    return {
      overview: {
        total: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
        queued: statusMap.queue || 0,
        processing: statusMap.processing || 0,
        completed: statusMap.completed || 0,
        failed: statusMap.failed || 0,
        cancelled: statusMap.cancelled || 0,
        successRate: parseFloat(successRate)
      },
      today: {
        total: todayJobs,
        completed: todayCompleted,
        failed: todayFailed
      },
      performance: {
        avgProcessingTimeSeconds: avgProcessingTime,
        avgProcessingTimeMinutes: (avgProcessingTime / 60).toFixed(2)
      },
      dailyMetrics,
      resourceUtilization
    };
  } catch (error) {
    logger.error('Error fetching job statistics', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get paginated job list with filtering and sorting
 */
const getJobs = async (page = 1, limit = 50, filters = {}, sortBy = 'created_at', sortOrder = 'DESC') => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.user_id) {
      where.user_id = filters.user_id;
    }
    
    if (filters.assessment_name) {
      where.assessment_name = {
        [Op.iLike]: `%${filters.assessment_name}%`
      };
    }
    
    if (filters.date_from) {
      where.created_at = {
        ...where.created_at,
        [Op.gte]: new Date(filters.date_from)
      };
    }
    
    if (filters.date_to) {
      where.created_at = {
        ...where.created_at,
        [Op.lte]: new Date(filters.date_to)
      };
    }

    // Build include for User
    const includeUser = {
      model: User,
      as: 'user',
      attributes: ['id', 'email', 'username'],
      required: false
    };

    // If filtering by user email or username, get user IDs first
    let userIds = null;
    if (filters.user_email || filters.user_username) {
      const userWhere = {};

      // Build OR condition if both filters are provided
      if (filters.user_email && filters.user_username) {
        userWhere[Op.or] = [
          { email: { [Op.iLike]: `%${filters.user_email}%` } },
          { username: { [Op.iLike]: `%${filters.user_username}%` } }
        ];
      } else if (filters.user_email) {
        userWhere.email = { [Op.iLike]: `%${filters.user_email}%` };
      } else if (filters.user_username) {
        userWhere.username = { [Op.iLike]: `%${filters.user_username}%` };
      }

      const users = await User.findAll({
        where: userWhere,
        attributes: ['id']
      });
      userIds = users.map(u => u.id);
      logger.debug('User IDs found for filtering', { count: userIds.length });
      if (userIds.length > 0) {
        where.user_id = { [Op.in]: userIds };
        // Don't set required: true to avoid issues with cross-schema JOIN count
        // includeUser.required = true;
      } else {
        // No users found, return empty
        return {
          jobs: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0
          }
        };
      }
    }

    // Validate sort field
    const allowedSortFields = ['created_at', 'updated_at', 'completed_at', 'status', 'priority'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Handle count separately when user filtering is applied to avoid cross-schema JOIN issues
    let count;
    if (filters.user_email || filters.user_username) {
      // Count from AnalysisJob table directly with user_id filter
      count = await AnalysisJob.count({ where });
    } else {
      count = await AnalysisJob.count({ where });
    }

    // Get jobs with user filtering
    const jobs = await AnalysisJob.findAll({
      where,
      include: [includeUser],
      limit,
      offset,
      order: [[validSortBy, validSortOrder]]
    });

    return {
      jobs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching jobs', {
      error: error.message,
      stack: error.stack,
      filters
    });
    throw error;
  }
};

/**
 * Get job details by ID
 */
const getJobById = async (jobId) => {
  try {
    const job = await AnalysisJob.findByPk(jobId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'username'],
        required: false
      }]
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // Calculate processing time if available
    let processingTime = null;
    if (job.processing_started_at && job.completed_at) {
      const startTime = new Date(job.processing_started_at).getTime();
      const endTime = new Date(job.completed_at).getTime();
      processingTime = Math.round((endTime - startTime) / 1000); // in seconds
    }

    return {
      ...job.toJSON(),
      processingTimeSeconds: processingTime
    };
  } catch (error) {
    logger.error('Error fetching job by ID', {
      jobId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get job results by job ID
 * Improved with better error handling and retry logic
 */
const getJobResults = async (jobId) => {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Fetching job results - Attempt ${attempt}/${maxRetries}`, { jobId });

      // Fetch job with explicit attributes to ensure data is loaded
      const job = await AnalysisJob.findByPk(jobId, {
        attributes: ['id', 'job_id', 'status', 'result_id', 'assessment_name', 'completed_at', 'user_id', 'created_at']
      });

      if (!job) {
        const error = new Error(`Job with ID ${jobId} not found in database`);
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      if (!job.result_id) {
        const error = new Error('Job has no results yet. The job may still be processing.');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      // Fetch result with explicit attributes
      const result = await AnalysisResult.findByPk(job.result_id, {
        attributes: ['id', 'user_id', 'test_data', 'test_result', 'raw_responses', 'is_public', 'chatbot_id', 'created_at', 'updated_at']
      });

      if (!result) {
        const error = new Error(`Result with ID ${job.result_id} not found in database`);
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      logger.info('Job results fetched successfully', {
        jobId,
        resultId: job.result_id,
        attempt
      });

      return {
        job: {
          id: job.id,
          job_id: job.job_id,
          status: job.status,
          assessment_name: job.assessment_name,
          completed_at: job.completed_at,
          user_id: job.user_id,
          created_at: job.created_at
        },
        result: result.toJSON()
      };
    } catch (error) {
      lastError = error;

      // Don't retry on 404 errors (resource not found)
      if (error.statusCode === 404) {
        logger.error('Job or result not found', {
          jobId,
          error: error.message,
          statusCode: error.statusCode
        });
        throw error;
      }

      // Log retry attempt for other errors
      if (attempt < maxRetries) {
        logger.warn(`Attempt ${attempt} failed, retrying...`, {
          jobId,
          error: error.message,
          nextAttempt: attempt + 1
        });
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 100));
      }
    }
  }

  // All retries exhausted
  logger.error('Failed to fetch job results after all retries', {
    jobId,
    attempts: maxRetries,
    lastError: lastError?.message
  });
  throw lastError;
};

module.exports = {
  getJobStats,
  getJobs,
  getJobById,
  getJobResults
};

