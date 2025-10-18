const { Op } = require('sequelize');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const School = require('../models/School');
const AnalysisJob = require('../models/AnalysisJob');
const Conversation = require('../models/Conversation');
const UserActivityLog = require('../models/UserActivityLog');
const logger = require('../utils/logger');

/**
 * Get paginated list of users with search and filter
 */
const getUsers = async (page = 1, limit = 20, search = '', filter = {}) => {
  try {
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};

    // Search by email, username, or full_name
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by user_type
    if (filter.user_type) {
      where.user_type = filter.user_type;
    }

    // Filter by is_active
    if (filter.is_active !== undefined) {
      where.is_active = filter.is_active === 'true' || filter.is_active === true;
    }

    // Filter by auth_provider
    if (filter.auth_provider) {
      where.auth_provider = filter.auth_provider;
    }

    // Build profile where clause for school_id filter
    const profileWhere = {};
    if (filter.school_id) {
      profileWhere.school_id = filter.school_id;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{
        model: UserProfile,
        as: 'profile',
        required: filter.school_id ? true : false, // Required if filtering by school
        where: Object.keys(profileWhere).length > 0 ? profileWhere : undefined,
        include: [{
          model: School,
          as: 'school',
          required: false
        }]
      }],
      attributes: {
        exclude: ['password_hash']
      },
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true
    });

    return {
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching users', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get user by ID with detailed information
 */
const getUserById = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false,
        include: [{
          model: School,
          as: 'school',
          required: false
        }]
      }],
      attributes: {
        exclude: ['password_hash']
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get job statistics
    const jobStats = await AnalysisJob.count({
      where: { user_id: userId },
      group: ['status']
    });

    // Get conversation count
    const conversationCount = await Conversation.count({
      where: { user_id: userId }
    });

    // Get recent jobs (last 5)
    const recentJobs = await AnalysisJob.findAll({
      where: { user_id: userId },
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'job_id', 'status', 'assessment_name', 'created_at', 'completed_at']
    });

    // Get recent conversations (last 5)
    const recentConversations = await Conversation.findAll({
      where: { user_id: userId },
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'title', 'status', 'context_type', 'created_at', 'updated_at']
    });

    return {
      user: user.toJSON(),
      statistics: {
        jobs: jobStats,
        conversations: conversationCount
      },
      recentJobs,
      recentConversations
    };
  } catch (error) {
    logger.error('Error fetching user by ID', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Update user information
 */
const updateUser = async (userId, updates, adminId, ipAddress, userAgent) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Fields that can be updated
    const allowedFields = ['username', 'is_active', 'user_type', 'federation_status'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Update user
    await user.update(updateData);

    // Update profile if provided
    if (updates.profile) {
      const profile = await UserProfile.findOne({ where: { user_id: userId } });
      
      if (profile) {
        const profileFields = ['full_name', 'date_of_birth', 'gender', 'school_id'];
        const profileData = {};
        
        profileFields.forEach(field => {
          if (updates.profile[field] !== undefined) {
            profileData[field] = updates.profile[field];
          }
        });
        
        if (Object.keys(profileData).length > 0) {
          await profile.update(profileData);
        }
      }
    }

    // Log activity
    await UserActivityLog.create({
      user_id: userId,
      admin_id: adminId,
      activity_type: 'USER_UPDATE',
      activity_data: {
        updates: updateData,
        profileUpdates: updates.profile || null
      },
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Fetch updated user
    const updatedUser = await User.findByPk(userId, {
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false
      }],
      attributes: {
        exclude: ['password_hash']
      }
    });

    return updatedUser;
  } catch (error) {
    logger.error('Error updating user', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get user token history
 */
const getUserTokens = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'token_balance', 'created_at']
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get token-related activity logs
    const tokenHistory = await UserActivityLog.findAll({
      where: {
        user_id: userId,
        activity_type: {
          [Op.in]: ['TOKEN_UPDATE', 'TOKEN_REFUND', 'TOKEN_DEDUCTION']
        }
      },
      order: [['created_at', 'DESC']],
      limit: 50
    });

    return {
      currentBalance: user.token_balance,
      history: tokenHistory
    };
  } catch (error) {
    logger.error('Error fetching user tokens', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Update user token balance
 */
const updateUserTokens = async (userId, amount, reason, adminId, ipAddress, userAgent) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const oldBalance = user.token_balance;
    const newBalance = oldBalance + amount;

    if (newBalance < 0) {
      throw new Error('Insufficient token balance');
    }

    // Update token balance
    await user.update({ token_balance: newBalance });

    // Log activity
    await UserActivityLog.create({
      user_id: userId,
      admin_id: adminId,
      activity_type: amount > 0 ? 'TOKEN_UPDATE' : 'TOKEN_DEDUCTION',
      activity_data: {
        oldBalance,
        newBalance,
        amount,
        reason
      },
      ip_address: ipAddress,
      user_agent: userAgent
    });

    logger.info('User token balance updated', {
      userId,
      oldBalance,
      newBalance,
      amount,
      adminId
    });

    return {
      userId: user.id,
      email: user.email,
      oldBalance,
      newBalance,
      amount
    };
  } catch (error) {
    logger.error('Error updating user tokens', {
      userId,
      amount,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get user's analysis jobs
 */
const getUserJobs = async (userId, page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    const { count, rows } = await AnalysisJob.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      jobs: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching user jobs', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get user's conversations
 */
const getUserConversations = async (userId, page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    const { count, rows } = await Conversation.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      conversations: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching user conversations', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  getUserTokens,
  updateUserTokens,
  getUserJobs,
  getUserConversations
};

