const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * POST /admin/auth/login
 * Admin login endpoint
 * Authenticates admin user and returns JWT token
 */
router.post('/login',
  authLimiter,
  validateBody(schemas.login),
  authController.login
);

/**
 * POST /admin/auth/logout
 * Admin logout endpoint
 * Invalidates the current session (client-side token removal)
 */
router.post('/logout',
  authenticateAdmin,
  authController.logout
);

/**
 * GET /admin/auth/verify
 * Verify admin token
 * Returns admin user information if token is valid
 */
router.get('/verify',
  authenticateAdmin,
  authController.verify
);

module.exports = router;

