const { Op, fn, col, literal } = require('sequelize');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const UsageTracking = require('../models/UsageTracking');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Get chatbot statistics
 */
const getChatbotStats = async () => {
  try {
    // Get total conversations count
    const totalConversations = await Conversation.count();

    // Get total messages count
    const totalMessages = await Message.count();

    // Get active conversations (status = 'active')
    const activeConversations = await Conversation.count({
      where: { status: 'active' }
    });

    // Get today's conversations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayConversations = await Conversation.count({
      where: {
        created_at: {
          [Op.gte]: today
        }
      }
    });

    const todayMessages = await Message.count({
      where: {
        created_at: {
          [Op.gte]: today
        }
      }
    });

    // Get model usage statistics
    const modelUsage = await UsageTracking.findAll({
      attributes: [
        'model_used',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('total_tokens')), 'total_tokens'],
        [fn('AVG', col('processing_time_ms')), 'avg_processing_time']
      ],
      group: ['model_used'],
      raw: true
    });

    // Get average response time (from usage_tracking)
    const avgResponseTime = await UsageTracking.findOne({
      attributes: [
        [fn('AVG', col('processing_time_ms')), 'avg_time']
      ],
      raw: true
    });

    // Get token usage statistics
    const tokenStats = await UsageTracking.findOne({
      attributes: [
        [fn('SUM', col('prompt_tokens')), 'total_prompt_tokens'],
        [fn('SUM', col('completion_tokens')), 'total_completion_tokens'],
        [fn('SUM', col('total_tokens')), 'total_tokens'],
        [fn('SUM', col('cost_credits')), 'total_cost']
      ],
      raw: true
    });

    // Get daily conversation metrics for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyMetrics = await Conversation.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'conversations']
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

    // Get messages per day for the last 7 days
    const dailyMessages = await Message.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'messages']
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

    // Get conversation status breakdown
    const statusBreakdown = await Conversation.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const statusMap = {};
    statusBreakdown.forEach(item => {
      statusMap[item.status] = parseInt(item.count);
    });

    return {
      overview: {
        totalConversations,
        totalMessages,
        activeConversations,
        avgMessagesPerConversation: totalConversations > 0 
          ? (totalMessages / totalConversations).toFixed(2) 
          : 0
      },
      today: {
        conversations: todayConversations,
        messages: todayMessages
      },
      modelUsage: modelUsage.map(model => ({
        model: model.model_used,
        count: parseInt(model.count),
        totalTokens: parseInt(model.total_tokens) || 0,
        avgProcessingTime: parseFloat(model.avg_processing_time) || 0
      })),
      performance: {
        avgResponseTimeMs: parseFloat(avgResponseTime?.avg_time) || 0,
        avgResponseTimeSeconds: ((parseFloat(avgResponseTime?.avg_time) || 0) / 1000).toFixed(2)
      },
      tokenUsage: {
        totalPromptTokens: parseInt(tokenStats?.total_prompt_tokens) || 0,
        totalCompletionTokens: parseInt(tokenStats?.total_completion_tokens) || 0,
        totalTokens: parseInt(tokenStats?.total_tokens) || 0,
        totalCost: parseFloat(tokenStats?.total_cost) || 0
      },
      statusBreakdown: statusMap,
      dailyMetrics,
      dailyMessages
    };
  } catch (error) {
    logger.error('Error fetching chatbot statistics', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get paginated conversation list with filtering
 */
const getConversations = async (page = 1, limit = 20, filters = {}, sortBy = 'created_at', sortOrder = 'DESC') => {
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
    
    if (filters.context_type) {
      where.context_type = filters.context_type;
    }
    
    if (filters.search) {
      where.title = {
        [Op.iLike]: `%${filters.search}%`
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

    // Validate sort field
    const allowedSortFields = ['created_at', 'updated_at', 'title', 'status'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const { count, rows } = await Conversation.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'username'],
        required: false
      }],
      limit,
      offset,
      order: [[validSortBy, validSortOrder]],
      distinct: true
    });

    // Get message count for each conversation
    const conversationsWithCounts = await Promise.all(
      rows.map(async (conversation) => {
        const messageCount = await Message.count({
          where: { conversation_id: conversation.id }
        });
        
        return {
          ...conversation.toJSON(),
          messageCount
        };
      })
    );

    return {
      conversations: conversationsWithCounts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching conversations', {
      error: error.message,
      stack: error.stack,
      filters
    });
    throw error;
  }
};

/**
 * Get conversation details by ID
 */
const getConversationById = async (conversationId) => {
  try {
    const conversation = await Conversation.findByPk(conversationId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'username'],
        required: false
      }]
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get message count
    const messageCount = await Message.count({
      where: { conversation_id: conversationId }
    });

    // Get total tokens used in this conversation
    const tokenStats = await UsageTracking.findOne({
      attributes: [
        [fn('SUM', col('total_tokens')), 'total_tokens'],
        [fn('SUM', col('cost_credits')), 'total_cost']
      ],
      where: { conversation_id: conversationId },
      raw: true
    });

    return {
      ...conversation.toJSON(),
      messageCount,
      totalTokens: parseInt(tokenStats?.total_tokens) || 0,
      totalCost: parseFloat(tokenStats?.total_cost) || 0
    };
  } catch (error) {
    logger.error('Error fetching conversation by ID', {
      conversationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get chat messages for a conversation
 */
const getConversationChats = async (conversationId, page = 1, limit = 50) => {
  try {
    // First check if conversation exists
    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Message.findAndCountAll({
      where: { conversation_id: conversationId },
      include: [{
        model: UsageTracking,
        as: 'usage',
        required: false
      }],
      limit,
      offset,
      order: [['created_at', 'ASC']],
      distinct: true
    });

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        status: conversation.status,
        context_type: conversation.context_type
      },
      messages: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching conversation chats', {
      conversationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get available models information
 */
const getModels = async () => {
  try {
    // Get model usage statistics from database
    const modelStats = await UsageTracking.findAll({
      attributes: [
        'model_used',
        [fn('COUNT', col('id')), 'usage_count'],
        [fn('SUM', col('total_tokens')), 'total_tokens'],
        [fn('AVG', col('processing_time_ms')), 'avg_processing_time'],
        [fn('COUNT', literal("CASE WHEN is_free_model = true THEN 1 END")), 'free_usage_count']
      ],
      group: ['model_used'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true
    });

    // Get the most recent usage for each model to check if it's free
    const models = await Promise.all(
      modelStats.map(async (stat) => {
        const recentUsage = await UsageTracking.findOne({
          where: { model_used: stat.model_used },
          order: [['created_at', 'DESC']],
          raw: true
        });

        return {
          model: stat.model_used,
          usageCount: parseInt(stat.usage_count),
          totalTokens: parseInt(stat.total_tokens) || 0,
          avgProcessingTimeMs: parseFloat(stat.avg_processing_time) || 0,
          isFreeModel: recentUsage?.is_free_model || false,
          lastUsed: recentUsage?.created_at || null
        };
      })
    );

    // Get overall statistics
    const totalUsage = await UsageTracking.count();
    const freeModelUsage = await UsageTracking.count({
      where: { is_free_model: true }
    });

    return {
      models,
      summary: {
        totalModels: models.length,
        totalUsage,
        freeModelUsage,
        paidModelUsage: totalUsage - freeModelUsage,
        freeModelPercentage: totalUsage > 0
          ? ((freeModelUsage / totalUsage) * 100).toFixed(2)
          : 0
      }
    };
  } catch (error) {
    logger.error('Error fetching models information', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  getChatbotStats,
  getConversations,
  getConversationById,
  getConversationChats,
  getModels
};

