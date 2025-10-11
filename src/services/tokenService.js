/**
 * Token Service for Admin Service
 * Phase 2 Implementation - Token Management System
 */

const { sequelize } = require('../config/database');
const { User, UserActivityLog, UsageTracking } = require('../models');
const { Op } = require('sequelize');

class TokenService {
  /**
   * Get token usage statistics and overview
   */
  static async getTokenOverview(params = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = params;

      // Total token statistics
      const tokenStats = await sequelize.query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(token_balance) as total_tokens,
          AVG(token_balance) as avg_balance,
          MIN(token_balance) as min_balance,
          MAX(token_balance) as max_balance,
          COUNT(CASE WHEN token_balance = 0 THEN 1 END) as zero_balance_users,
          COUNT(CASE WHEN token_balance > 0 THEN 1 END) as positive_balance_users
        FROM auth.users
        WHERE user_type = 'user'
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Token transactions in period
      const transactionStats = await sequelize.query(`
        SELECT
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN activity_data->>'action' = 'add' THEN 1 END) as additions,
          COUNT(CASE WHEN activity_data->>'action' = 'deduct' THEN 1 END) as deductions,
          COALESCE(SUM(CASE WHEN activity_data->>'action' = 'add' THEN (activity_data->>'amount')::integer ELSE 0 END), 0) as total_added,
          COALESCE(SUM(CASE WHEN activity_data->>'action' = 'deduct' THEN (activity_data->>'amount')::integer ELSE 0 END), 0) as total_deducted
        FROM archive.user_activity_logs
        WHERE activity_type = 'token_balance_update'
          AND created_at BETWEEN :startDate AND :endDate
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Token consumption from usage tracking
      const consumptionStats = await sequelize.query(`
        SELECT
          COUNT(*) as total_usage_events,
          COALESCE(SUM(total_tokens), 0) as total_consumed,
          COALESCE(AVG(total_tokens), 0) as avg_per_event,
          COUNT(DISTINCT c.user_id) as active_users
        FROM chat.usage_tracking ut
        JOIN chat.conversations c ON ut.conversation_id = c.id
        WHERE ut.created_at BETWEEN :startDate AND :endDate
          AND ut.total_tokens > 0
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Token balance distribution
      const balanceDistribution = await sequelize.query(`
        SELECT
          CASE
            WHEN token_balance = 0 THEN '0'
            WHEN token_balance BETWEEN 1 AND 10 THEN '1-10'
            WHEN token_balance BETWEEN 11 AND 50 THEN '11-50'
            WHEN token_balance BETWEEN 51 AND 100 THEN '51-100'
            WHEN token_balance BETWEEN 101 AND 500 THEN '101-500'
            ELSE '500+'
          END as balance_range,
          COUNT(*) as user_count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM auth.users
        WHERE user_type = 'user'
        GROUP BY
          CASE
            WHEN token_balance = 0 THEN '0'
            WHEN token_balance BETWEEN 1 AND 10 THEN '1-10'
            WHEN token_balance BETWEEN 11 AND 50 THEN '11-50'
            WHEN token_balance BETWEEN 51 AND 100 THEN '51-100'
            WHEN token_balance BETWEEN 101 AND 500 THEN '101-500'
            ELSE '500+'
          END
        ORDER BY
          MIN(CASE
            WHEN token_balance = 0 THEN 1
            WHEN token_balance BETWEEN 1 AND 10 THEN 2
            WHEN token_balance BETWEEN 11 AND 50 THEN 3
            WHEN token_balance BETWEEN 51 AND 100 THEN 4
            WHEN token_balance BETWEEN 101 AND 500 THEN 5
            ELSE 6
          END)
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          overview: tokenStats[0] || {
            total_users: 0,
            total_balance: 0,
            avg_balance: 0,
            active_users: 0
          },
          transactions: transactionStats[0] || {
            total_transactions: 0,
            additions: 0,
            deductions: 0,
            total_added: 0,
            total_deducted: 0
          },
          consumption: consumptionStats[0] || {
            total_usage_events: 0,
            total_consumed: 0,
            avg_per_event: 0,
            active_users: 0
          },
          distribution: balanceDistribution || []
        }
      };
    } catch (error) {
      console.error('Token getTokenOverview error:', error);
      return {
        success: false,
        error: {
          code: 'TOKEN_ERROR',
          message: 'Failed to get token overview'
        }
      };
    }
  }

  /**
   * Get all token transactions with filtering and pagination
   */
  static async getTokenTransactions(params = {}) {
    try {
      const { 
        page = 1,
        limit = 20,
        startDate,
        endDate,
        userId,
        action, // 'add' or 'deduct'
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = params;

      const offset = (page - 1) * limit;
      
      // Build where conditions
      const whereConditions = {
        activity_type: 'token_balance_update'
      };

      if (startDate && endDate) {
        whereConditions.created_at = {
          [Op.between]: [startDate, endDate]
        };
      }

      if (userId) {
        whereConditions.user_id = userId;
      }

      if (action) {
        whereConditions[Op.and] = sequelize.literal(`activity_data->>'action' = '${action}'`);
      }

      const { count, rows } = await UserActivityLog.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'username']
          },
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'email', 'username']
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: offset
      });

      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: {
          transactions: rows,
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
      console.error('Token getTokenTransactions error:', error);
      return {
        success: false,
        error: {
          code: 'TOKEN_ERROR',
          message: 'Failed to get token transactions'
        }
      };
    }
  }

  /**
   * Get token consumption patterns and analytics
   */
  static async getTokenAnalytics(params = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        period = 'daily'
      } = params;

      let dateFormat;
      switch (period) {
        case 'weekly':
          dateFormat = "DATE_TRUNC('week', created_at)";
          break;
        case 'monthly':
          dateFormat = "DATE_TRUNC('month', created_at)";
          break;
        default:
          dateFormat = "DATE_TRUNC('day', created_at)";
      }

      // Token transaction trends
      const transactionTrends = await sequelize.query(`
        SELECT
          ${dateFormat} as period,
          COUNT(*) as transaction_count,
          COUNT(CASE WHEN activity_data->>'action' = 'add' THEN 1 END) as additions,
          COUNT(CASE WHEN activity_data->>'action' = 'deduct' THEN 1 END) as deductions,
          SUM(CASE WHEN activity_data->>'action' = 'add' THEN (activity_data->>'amount')::integer ELSE 0 END) as tokens_added,
          SUM(CASE WHEN activity_data->>'action' = 'deduct' THEN (activity_data->>'amount')::integer ELSE 0 END) as tokens_deducted,
          COUNT(DISTINCT user_id) as affected_users
        FROM archive.user_activity_logs
        WHERE activity_type = 'token_balance_update'
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Token consumption trends
      const consumptionTrends = await sequelize.query(`
        SELECT
          ${dateFormat} as period,
          COUNT(*) as usage_events,
          SUM(ut.total_tokens) as total_consumed,
          AVG(ut.total_tokens) as avg_per_event,
          COUNT(DISTINCT c.user_id) as active_users
        FROM chat.usage_tracking ut
        JOIN chat.conversations c ON ut.conversation_id = c.id
        WHERE ut.created_at BETWEEN :startDate AND :endDate
          AND ut.total_tokens > 0
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Top token consumers
      const topConsumers = await sequelize.query(`
        SELECT
          u.id,
          u.email,
          u.username,
          u.token_balance as current_balance,
          SUM(ut.total_tokens) as total_consumed,
          COUNT(ut.id) as usage_count,
          AVG(ut.total_tokens) as avg_per_use
        FROM auth.users u
        JOIN chat.conversations c ON u.id = c.user_id
        JOIN chat.usage_tracking ut ON c.id = ut.conversation_id
        WHERE ut.created_at BETWEEN :startDate AND :endDate
          AND ut.total_tokens > 0
          AND u.user_type = 'user'
        GROUP BY u.id, u.email, u.username, u.token_balance
        ORDER BY total_consumed DESC
        LIMIT 10
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Token efficiency metrics by model
      const efficiencyMetrics = await sequelize.query(`
        SELECT
          model_used,
          COUNT(*) as event_count,
          SUM(total_tokens) as total_tokens,
          AVG(total_tokens) as avg_tokens_per_event,
          SUM(cost_credits) as total_cost
        FROM chat.usage_tracking
        WHERE created_at BETWEEN :startDate AND :endDate
          AND total_tokens > 0
        GROUP BY model_used
        ORDER BY total_tokens DESC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          transactionTrends,
          consumptionTrends,
          topConsumers,
          efficiencyMetrics
        }
      };
    } catch (error) {
      console.error('Token getTokenAnalytics error:', error);
      return {
        success: false,
        error: {
          code: 'TOKEN_ERROR',
          message: 'Failed to get token analytics'
        }
      };
    }
  }

  /**
   * Perform bulk token operations (add/deduct for multiple users)
   */
  static async performBulkOperation(params, adminId) {
    const transaction = await sequelize.transaction();

    try {
      const {
        operation, // 'add' or 'deduct'
        amount,
        userIds,
        reason = 'Bulk token operation'
      } = params;

      if (!['add', 'deduct'].includes(operation)) {
        throw new Error('Invalid operation. Must be "add" or "deduct"');
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('User IDs must be a non-empty array');
      }

      if (!amount || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const results = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          // Get current user
          const user = await User.findByPk(userId, { transaction });

          if (!user) {
            errors.push({ userId, error: 'User not found' });
            continue;
          }

          const previousBalance = user.token_balance;
          let newBalance;

          if (operation === 'add') {
            newBalance = previousBalance + amount;
          } else {
            newBalance = Math.max(0, previousBalance - amount);
          }

          // Update user balance
          await user.update({ token_balance: newBalance }, { transaction });

          // Log the activity
          await UserActivityLog.create({
            user_id: userId,
            admin_id: adminId,
            activity_type: 'token_balance_update',
            activity_description: `Admin performed bulk ${operation} operation: ${amount} tokens`,
            metadata: {
              userId,
              action: operation,
              amount,
              previousBalance,
              newBalance,
              reason,
              endpoint: '/admin/tokens/bulk-operations',
              method: 'POST',
              statusCode: 200,
              success: true
            },
            ip_address: '127.0.0.1', // This should come from request in real implementation
            user_agent: 'Admin Service'
          }, { transaction });

          results.push({
            userId,
            email: user.email,
            previousBalance,
            newBalance,
            operation,
            amount,
            success: true
          });

        } catch (userError) {
          errors.push({
            userId,
            error: userError.message
          });
        }
      }

      await transaction.commit();

      return {
        success: true,
        data: {
          operation,
          amount,
          reason,
          totalUsers: userIds.length,
          successfulOperations: results.length,
          failedOperations: errors.length,
          results,
          errors
        }
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Token performBulkOperation error:', error);
      return {
        success: false,
        error: {
          code: 'BULK_OPERATION_ERROR',
          message: error.message || 'Failed to perform bulk token operation'
        }
      };
    }
  }
}

module.exports = TokenService;
