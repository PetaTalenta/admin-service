const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateQuery, validateParams, validateBody, schemas } = require('../middleware/validation');
const { cacheMiddleware, invalidateCacheAfter } = require('../middleware/cacheMiddleware');

/**
 * All routes require admin authentication
 */
router.use(authenticateAdmin);

/**
 * GET /admin/users
 * Get paginated list of users with search and filter
 */
router.get(
  '/',
  validateQuery(schemas.userListQuery),
  cacheMiddleware(60), // Cache for 60 seconds
  userController.getUsers
);

/**
 * GET /admin/users/:id
 * Get user details by ID
 */
router.get(
  '/:id',
  validateParams(schemas.uuid),
  cacheMiddleware(120), // Cache for 2 minutes
  userController.getUserById
);

/**
 * PUT /admin/users/:id
 * Update user information
 */
router.put(
  '/:id',
  validateParams(schemas.uuid),
  validateBody(schemas.updateUser),
  invalidateCacheAfter('admin:route:/admin/users*'), // Invalidate user cache after update
  userController.updateUser
);

/**
 * GET /admin/users/:id/tokens
 * Get user token history
 */
router.get(
  '/:id/tokens',
  validateParams(schemas.uuid),
  userController.getUserTokens
);

/**
 * PUT /admin/users/:id/tokens
 * Update user token balance
 */
router.put(
  '/:id/tokens',
  validateParams(schemas.uuid),
  validateBody(schemas.updateTokens),
  userController.updateUserTokens
);

/**
 * GET /admin/users/:id/jobs
 * Get user's analysis jobs
 */
router.get(
  '/:id/jobs',
  validateParams(schemas.uuid),
  validateQuery(schemas.paginationQuery),
  userController.getUserJobs
);

/**
 * GET /admin/users/:id/conversations
 * Get user's conversations
 */
router.get(
  '/:id/conversations',
  validateParams(schemas.uuid),
  validateQuery(schemas.paginationQuery),
  userController.getUserConversations
);

module.exports = router;

