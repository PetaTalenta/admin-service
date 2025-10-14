const express = require('express');
const router = express.Router();

const chatbotController = require('../controllers/chatbotController');
const { authenticateAdmin } = require('../middleware/auth');

/**
 * All routes require admin authentication
 */
router.use(authenticateAdmin);

/**
 * GET /admin/chatbot/stats
 * Get chatbot statistics dashboard
 */
router.get(
  '/stats',
  chatbotController.getChatbotStats
);

/**
 * GET /admin/chatbot/models
 * Get available models information
 */
router.get(
  '/models',
  chatbotController.getModels
);

module.exports = router;

