const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateQuery, validateParams, schemas } = require('../middleware/validation');

/**
 * All routes require admin authentication
 */
router.use(authenticateAdmin);

/**
 * GET /admin/jobs/stats
 * Get job statistics dashboard
 */
router.get(
  '/stats',
  jobController.getJobStats
);

/**
 * GET /admin/jobs
 * Get paginated list of jobs with filtering and sorting
 */
router.get(
  '/',
  validateQuery(schemas.jobListQuery),
  jobController.getJobs
);

/**
 * GET /admin/jobs/:id
 * Get job details by ID
 */
router.get(
  '/:id',
  validateParams(schemas.uuid),
  jobController.getJobById
);

/**
 * GET /admin/jobs/:id/results
 * Get job results by job ID
 */
router.get(
  '/:id/results',
  validateParams(schemas.uuid),
  jobController.getJobResults
);

module.exports = router;

