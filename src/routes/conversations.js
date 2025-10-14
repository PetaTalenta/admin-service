const express = require('express');
const router = express.Router();

const chatbotController = require('../controllers/chatbotController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateQuery, validateParams, schemas } = require('../middleware/validation');

/**
 * All routes require admin authentication
 */
router.use(authenticateAdmin);

/**
 * GET /admin/conversations
 * Get paginated list of conversations with filtering and sorting
 */
router.get(
  '/',
  validateQuery(schemas.conversationListQuery),
  chatbotController.getConversations
);

/**
 * GET /admin/conversations/:id
 * Get conversation details by ID
 */
router.get(
  '/:id',
  validateParams(schemas.uuid),
  chatbotController.getConversationById
);

/**
 * GET /admin/conversations/:id/chats
 * Get chat messages for a conversation
 */
router.get(
  '/:id/chats',
  validateParams(schemas.uuid),
  validateQuery(schemas.chatPaginationQuery),
  chatbotController.getConversationChats
);

module.exports = router;

