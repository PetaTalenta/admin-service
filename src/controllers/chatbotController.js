const chatbotService = require('../services/chatbotService');
const logger = require('../utils/logger');
const { successResponse } = require('../utils/responseFormatter');

/**
 * Get chatbot statistics
 * GET /admin/chatbot/stats
 */
const getChatbotStats = async (req, res, next) => {
  try {
    logger.info('Fetching chatbot statistics', {
      adminId: req.admin.id
    });

    const stats = await chatbotService.getChatbotStats();

    res.json(successResponse(stats, 'Chatbot statistics retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching chatbot statistics', {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get paginated conversation list
 * GET /admin/conversations
 */
const getConversations = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      user_id, 
      context_type, 
      search,
      date_from,
      date_to,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (user_id) filters.user_id = user_id;
    if (context_type) filters.context_type = context_type;
    if (search) filters.search = search;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    logger.info('Fetching conversations list', {
      page,
      limit,
      filters,
      adminId: req.admin.id
    });

    const result = await chatbotService.getConversations(page, limit, filters, sort_by, sort_order);

    res.json(successResponse(result, 'Conversations retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching conversations', {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get conversation details by ID
 * GET /admin/conversations/:id
 */
const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Fetching conversation details', {
      conversationId: id,
      adminId: req.admin.id
    });

    const conversation = await chatbotService.getConversationById(id);

    res.json(successResponse(conversation, 'Conversation details retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching conversation details', {
      conversationId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
    }
    
    next(error);
  }
};

/**
 * Get conversation chat messages
 * GET /admin/conversations/:id/chats
 */
const getConversationChats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    logger.info('Fetching conversation chats', {
      conversationId: id,
      page,
      limit,
      adminId: req.admin.id
    });

    const result = await chatbotService.getConversationChats(id, page, limit);

    res.json(successResponse(result, 'Conversation chats retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching conversation chats', {
      conversationId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
    }
    
    next(error);
  }
};

/**
 * Get available models information
 * GET /admin/chatbot/models
 */
const getModels = async (req, res, next) => {
  try {
    logger.info('Fetching models information', {
      adminId: req.admin.id
    });

    const models = await chatbotService.getModels();

    res.json(successResponse(models, 'Models information retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching models information', {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

module.exports = {
  getChatbotStats,
  getConversations,
  getConversationById,
  getConversationChats,
  getModels
};

