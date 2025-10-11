const { sequelize } = require('../models');
const { User, UserActivityLog } = require('../models');
const { Op } = require('sequelize');

class SecurityService {
  /**
   * Get security audit report
   */
  async getSecurityAudit(filters = {}) {
    try {
      const {
        period = 'daily',
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        limit = 100
      } = filters;

      // Failed login attempts
      const failedLogins = await sequelize.query(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(DISTINCT user_id) as affected_users,
          DATE_TRUNC('${period}', created_at) as period
        FROM archive.user_activity_logs
        WHERE activity_type = 'login'
          AND activity_data->>'success' = 'false'
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE_TRUNC('${period}', created_at)
        ORDER BY period DESC
        LIMIT :limit
      `, {
        replacements: { startDate, endDate, limit },
        type: sequelize.QueryTypes.SELECT
      });

      // Suspicious IP addresses
      const suspiciousIPs = await sequelize.query(`
        SELECT 
          ip_address,
          COUNT(*) as attempt_count,
          COUNT(DISTINCT user_id) as users_targeted,
          MAX(created_at) as last_attempt
        FROM archive.user_activity_logs
        WHERE activity_type = 'login'
          AND activity_data->>'success' = 'false'
          AND created_at BETWEEN :startDate AND :endDate
          AND ip_address IS NOT NULL
        GROUP BY ip_address
        HAVING COUNT(*) > 5
        ORDER BY attempt_count DESC
        LIMIT 20
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Account security status
      const securityStatus = await sequelize.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN is_active = false THEN 1 END) as suspended_users,
          COUNT(CASE WHEN last_login < NOW() - INTERVAL '30 days' THEN 1 END) as inactive_users
        FROM auth.users
        WHERE user_type = 'user'
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          failedLogins: failedLogins || [],
          suspiciousIPs: suspiciousIPs || [],
          securityStatus: securityStatus[0] || {
            total_users: 0,
            active_users: 0,
            suspended_users: 0,
            inactive_users: 0
          }
        }
      };
    } catch (error) {
      console.error('Security getSecurityAudit error:', error);
      return {
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to get security audit'
        }
      };
    }
  }

  /**
   * Get suspicious activities
   */
  async getSuspiciousActivities(filters = {}) {
    try {
      const {
        period = 'daily',
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        limit = 50
      } = filters;

      // Multiple failed logins from same IP
      const multipleFailedLogins = await sequelize.query(`
        SELECT 
          ip_address,
          user_agent,
          COUNT(*) as failed_attempts,
          MIN(created_at) as first_attempt,
          MAX(created_at) as last_attempt,
          COUNT(DISTINCT user_id) as users_targeted
        FROM archive.user_activity_logs
        WHERE activity_type = 'login'
          AND activity_data->>'success' = 'false'
          AND created_at BETWEEN :startDate AND :endDate
          AND ip_address IS NOT NULL
        GROUP BY ip_address, user_agent
        HAVING COUNT(*) >= 3
        ORDER BY failed_attempts DESC
        LIMIT :limit
      `, {
        replacements: { startDate, endDate, limit },
        type: sequelize.QueryTypes.SELECT
      });

      // Unusual login times
      const unusualLoginTimes = await sequelize.query(`
        SELECT 
          u.email,
          u.id as user_id,
          ual.ip_address,
          ual.created_at as login_time,
          EXTRACT(hour FROM ual.created_at) as login_hour
        FROM archive.user_activity_logs ual
        JOIN auth.users u ON ual.user_id = u.id
        WHERE ual.activity_type = 'login'
          AND ual.activity_data->>'success' = 'true'
          AND ual.created_at BETWEEN :startDate AND :endDate
          AND (EXTRACT(hour FROM ual.created_at) < 6 OR EXTRACT(hour FROM ual.created_at) > 23)
        ORDER BY ual.created_at DESC
        LIMIT :limit
      `, {
        replacements: { startDate, endDate, limit },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          multipleFailedLogins: multipleFailedLogins || [],
          unusualLoginTimes: unusualLoginTimes || []
        }
      };
    } catch (error) {
      console.error('Security getSuspiciousActivities error:', error);
      return {
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to get suspicious activities'
        }
      };
    }
  }

  /**
   * Get login pattern analysis
   */
  async getLoginPatterns(filters = {}) {
    try {
      const {
        period = 'daily',
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = filters;

      const dateFormat = period === 'hourly' ? 'hour' : 'day';

      // Login patterns by time
      const loginPatterns = await sequelize.query(`
        SELECT 
          DATE_TRUNC('${dateFormat}', created_at) as period,
          COUNT(*) as total_logins,
          COUNT(CASE WHEN activity_data->>'success' = 'true' THEN 1 END) as successful_logins,
          COUNT(CASE WHEN activity_data->>'success' = 'false' THEN 1 END) as failed_logins,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM archive.user_activity_logs
        WHERE activity_type = 'login'
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE_TRUNC('${dateFormat}', created_at)
        ORDER BY period ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Geographic patterns (based on IP)
      const geographicPatterns = await sequelize.query(`
        SELECT 
          ip_address,
          COUNT(*) as login_count,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen
        FROM archive.user_activity_logs
        WHERE activity_type = 'login'
          AND created_at BETWEEN :startDate AND :endDate
          AND ip_address IS NOT NULL
        GROUP BY ip_address
        ORDER BY login_count DESC
        LIMIT 20
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          loginPatterns: loginPatterns || [],
          geographicPatterns: geographicPatterns || []
        }
      };
    } catch (error) {
      console.error('Security getLoginPatterns error:', error);
      return {
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to get login patterns'
        }
      };
    }
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId, data, adminId) {
    try {
      const { reason = 'Administrative action' } = data;

      const user = await User.findByPk(userId);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      await user.update({ is_active: false });

      // Log the suspension
      await UserActivityLog.logActivity({
        userId,
        adminId,
        activityType: 'user_suspension',
        description: `User account suspended: ${reason}`,
        metadata: { reason, previousStatus: user.is_active }
      });

      return {
        success: true,
        data: {
          message: 'User account suspended successfully',
          userId,
          reason
        }
      };
    } catch (error) {
      console.error('Security suspendUser error:', error);
      return {
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to suspend user'
        }
      };
    }
  }

  /**
   * Activate user account
   */
  async activateUser(userId, data, adminId) {
    try {
      const { reason = 'Administrative action' } = data;

      const user = await User.findByPk(userId);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      await user.update({ is_active: true });

      // Log the activation
      await UserActivityLog.logActivity({
        userId,
        adminId,
        activityType: 'user_activation',
        description: `User account activated: ${reason}`,
        metadata: { reason, previousStatus: user.is_active }
      });

      return {
        success: true,
        data: {
          message: 'User account activated successfully',
          userId,
          reason
        }
      };
    } catch (error) {
      console.error('Security activateUser error:', error);
      return {
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Failed to activate user'
        }
      };
    }
  }
}

module.exports = new SecurityService();
