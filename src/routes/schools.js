const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const schoolController = require('../controllers/schoolController');
// const { validateQuery, validateParams, validateBody, schemas } = require('../middleware/validation');
// const { cacheMiddleware, invalidateCacheAfter } = require('../middleware/cacheMiddleware');

/**
 * All routes require admin authentication
 */
router.use(auth.authenticateAdmin);

/**
 * GET /admin/schools
 * Get paginated list of schools with search and sorting
 */
router.get(
  '/',
  // validateQuery(schemas.schoolListQuery),
  // cacheMiddleware(120), // Cache for 2 minutes
  schoolController.getSchools
);

/**
 * GET /admin/schools/:id
 * Get school details by ID
 */
router.get(
  '/:id',
  // validateParams(schemas.schoolId),
  // cacheMiddleware(120), // Cache for 2 minutes
  schoolController.getSchoolById
);

/**
 * POST /admin/schools
 * Create new school
 */
router.post(
  '/',
  // validateBody(schemas.createSchool),
  // invalidateCacheAfter('admin:route:/admin/schools*'), // Invalidate school cache after create
  schoolController.createSchool
);

/**
 * PUT /admin/schools/:id
 * Update school information
 */
router.put(
  '/:id',
  // validateParams(schemas.schoolId),
  // validateBody(schemas.updateSchool),
  // invalidateCacheAfter('admin:route:/admin/schools*'), // Invalidate school cache after update
  schoolController.updateSchool
);

/**
 * DELETE /admin/schools/:id
 * Delete school (only if no users are associated)
 */
router.delete(
  '/:id',
  // validateParams(schemas.schoolId),
  // invalidateCacheAfter('admin:route:/admin/schools*'), // Invalidate school cache after delete
  schoolController.deleteSchool
);

module.exports = router;

