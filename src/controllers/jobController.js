const jobService = require('../services/jobService');
const logger = require('../utils/logger');
const { successResponse } = require('../utils/responseFormatter');

/**
 * Get job statistics dashboard
 * GET /admin/jobs/stats
 */
const getJobStats = async (req, res, next) => {
  try {
    logger.info('Fetching job statistics', {
      adminId: req.admin.id
    });

    const stats = await jobService.getJobStats();

    res.json(successResponse(stats, 'Job statistics retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching job statistics', {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get paginated job list
 * GET /admin/jobs
 */
const getJobs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      user_id,
      user_email,
      user_username,
      assessment_name,
      date_from,
      date_to,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (user_id) filters.user_id = user_id;
    if (user_email) filters.user_email = user_email;
    if (user_username) filters.user_username = user_username;
    if (assessment_name) filters.assessment_name = assessment_name;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    logger.info('Fetching jobs list', {
      page,
      limit,
      filters,
      sort_by,
      sort_order,
      adminId: req.admin.id
    });

    const result = await jobService.getJobs(page, limit, filters, sort_by, sort_order);

    res.json(successResponse(result, 'Jobs retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching jobs', {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get job details by ID
 * GET /admin/jobs/:id
 */
const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Fetching job details', {
      jobId: id,
      adminId: req.admin.id
    });

    const job = await jobService.getJobById(id);

    res.json(successResponse(job, 'Job details retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching job details', {
      jobId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get job results by job ID
 * GET /admin/jobs/:id/results
 */
const getJobResults = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Fetching job results', {
      jobId: id,
      adminId: req.admin.id
    });

    const results = await jobService.getJobResults(id);

    res.json(successResponse(results, 'Job results retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching job results', {
      jobId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

module.exports = {
  getJobStats,
  getJobs,
  getJobById,
  getJobResults
};

