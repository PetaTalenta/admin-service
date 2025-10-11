const { User, AnalysisJob, AnalysisResult, UserActivityLog } = require('../models');
const { Op } = require('sequelize');

class UserService {
  /**
   * Get paginated user list with filtering
   */
  static async getUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        userType = '',
        isActive = '',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { email: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // User type filter
      if (userType) {
        whereClause.user_type = userType;
      }

      // Active status filter
      if (isActive !== '') {
        whereClause.is_active = isActive === 'true';
      }

      const { count, rows } = await User.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, sortOrder.toUpperCase()]],
        attributes: { exclude: ['password_hash'] }
      });

      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: {
          users: rows.map(user => user.toJSON()),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_USERS_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get detailed user profile
   */
  static async getUserById(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user statistics
      const [jobCount, resultCount, lastActivity] = await Promise.all([
        AnalysisJob.count({ where: { user_id: userId } }),
        AnalysisResult.count({ where: { user_id: userId } }),
        AnalysisJob.findOne({
          where: { user_id: userId },
          order: [['created_at', 'DESC']],
          attributes: ['created_at', 'status']
        })
      ]);

      const userData = user.toJSON();
      userData.statistics = {
        totalJobs: jobCount,
        totalResults: resultCount,
        lastActivity: lastActivity ? {
          date: lastActivity.created_at,
          status: lastActivity.status
        } : null
      };

      return {
        success: true,
        data: userData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_USER_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Only allow certain fields to be updated by admin
      const allowedFields = ['username', 'email', 'is_active', 'user_type'];
      const filteredData = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      // If email is being updated, make sure it's lowercase
      if (filteredData.email) {
        filteredData.email = filteredData.email.toLowerCase();
      }

      await user.update(filteredData);

      return {
        success: true,
        data: user.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_USER_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Add tokens to user
   */
  static async addTokens(userId, amount, reason = '') {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      const previousBalance = user.token_balance;
      const addedAmount = parseInt(amount);
      const newBalance = previousBalance + addedAmount;

      await user.update({ token_balance: newBalance });

      return {
        success: true,
        data: {
          userId,
          previousBalance,
          addedAmount,
          newBalance,
          reason
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_TOKENS_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Deduct tokens from user
   */
  static async deductTokens(userId, amount, reason = '') {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      const previousBalance = user.token_balance;
      const deductAmount = parseInt(amount);

      if (previousBalance < deductAmount) {
        throw new Error('Insufficient token balance');
      }

      const newBalance = previousBalance - deductAmount;
      await user.update({ token_balance: newBalance });

      return {
        success: true,
        data: {
          userId,
          previousBalance,
          deductedAmount: deductAmount,
          newBalance,
          reason
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DEDUCT_TOKENS_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get token transaction history for user
   */
  static async getTokenHistory(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10
      } = options;

      const offset = (page - 1) * limit;

      // Get activity logs related to token operations
      const { count, rows } = await UserActivityLog.findAndCountAll({
        where: {
          user_id: userId,
          activity_type: 'token_balance_update'
        },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'email', 'username']
          }
        ]
      });

      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: {
          transactions: rows.map(log => log.toJSON()),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TOKEN_HISTORY_ERROR',
          message: error.message
        }
      };
    }
  }
}

module.exports = UserService;
