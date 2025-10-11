const { sequelize } = require('../models');
const { User, UserActivityLog } = require('../models');
const { Op } = require('sequelize');

class AuditService {
  /**
   * Get all admin activities
   */
  async getAdminActivities(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        adminId,
        activityType,
        page = 1,
        limit = 50
      } = filters;

      const offset = (page - 1) * limit;
      const whereConditions = {
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (adminId) {
        whereConditions.admin_id = adminId;
      }

      if (activityType) {
        whereConditions.activity_type = activityType;
      }

      const activities = await UserActivityLog.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'email', 'username'],
            required: false
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'username'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Activity summary
      const activitySummary = await sequelize.query(`
        SELECT 
          activity_type,
          COUNT(*) as count,
          COUNT(DISTINCT admin_id) as unique_admins
        FROM archive.user_activity_logs
        WHERE created_at BETWEEN :startDate AND :endDate
          ${adminId ? 'AND admin_id = :adminId' : ''}
        GROUP BY activity_type
        ORDER BY count DESC
      `, {
        replacements: { startDate, endDate, ...(adminId && { adminId }) },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          activities: activities.rows,
          pagination: {
            total: activities.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(activities.count / limit)
          },
          summary: activitySummary || []
        }
      };
    } catch (error) {
      console.error('Audit getAdminActivities error:', error);
      return {
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to get admin activities'
        }
      };
    }
  }

  /**
   * Get user-specific audit trail
   */
  async getUserAuditHistory(userId, filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        activityType,
        page = 1,
        limit = 50
      } = filters;

      const offset = (page - 1) * limit;
      const whereConditions = {
        user_id: userId,
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (activityType) {
        whereConditions.activity_type = activityType;
      }

      const userHistory = await UserActivityLog.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'email', 'username'],
            required: false
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'username'],
            required: true
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // User activity timeline
      const timeline = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          activity_type,
          COUNT(*) as count
        FROM archive.user_activity_logs
        WHERE user_id = :userId
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE_TRUNC('day', created_at), activity_type
        ORDER BY date DESC, count DESC
      `, {
        replacements: { userId, startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          history: userHistory.rows,
          timeline: timeline || [],
          pagination: {
            total: userHistory.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(userHistory.count / limit)
          }
        }
      };
    } catch (error) {
      console.error('Audit getUserAuditHistory error:', error);
      return {
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to get user audit history'
        }
      };
    }
  }

  /**
   * Get data access logs
   */
  async getDataAccessLogs(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        dataType,
        page = 1,
        limit = 100
      } = filters;

      const offset = (page - 1) * limit;

      // Data access patterns
      const accessLogs = await sequelize.query(`
        SELECT 
          ual.admin_id,
          u.email as admin_email,
          ual.activity_type,
          ual.activity_data,
          ual.ip_address,
          ual.user_agent,
          ual.created_at
        FROM archive.user_activity_logs ual
        JOIN auth.users u ON ual.admin_id = u.id
        WHERE ual.created_at BETWEEN :startDate AND :endDate
          AND ual.activity_type IN ('user_view', 'user_list_view', 'assessment_view', 'analytics_view')
          ${dataType ? "AND ual.activity_type = :dataType" : ''}
        ORDER BY ual.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { 
          startDate, 
          endDate, 
          limit: parseInt(limit), 
          offset: parseInt(offset),
          ...(dataType && { dataType })
        },
        type: sequelize.QueryTypes.SELECT
      });

      // Access frequency by admin
      const accessFrequency = await sequelize.query(`
        SELECT 
          u.email as admin_email,
          ual.admin_id,
          COUNT(*) as access_count,
          COUNT(DISTINCT DATE_TRUNC('day', ual.created_at)) as active_days
        FROM archive.user_activity_logs ual
        JOIN auth.users u ON ual.admin_id = u.id
        WHERE ual.created_at BETWEEN :startDate AND :endDate
          AND ual.activity_type IN ('user_view', 'user_list_view', 'assessment_view', 'analytics_view')
        GROUP BY u.email, ual.admin_id
        ORDER BY access_count DESC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          accessLogs: accessLogs || [],
          accessFrequency: accessFrequency || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      };
    } catch (error) {
      console.error('Audit getDataAccessLogs error:', error);
      return {
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to get data access logs'
        }
      };
    }
  }

  /**
   * Export audit data
   */
  async exportAuditData(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        format = 'json',
        activityTypes = []
      } = filters;

      let whereClause = 'WHERE ual.created_at BETWEEN :startDate AND :endDate';
      const replacements = { startDate, endDate };

      if (activityTypes.length > 0) {
        whereClause += ' AND ual.activity_type = ANY(:activityTypes)';
        replacements.activityTypes = activityTypes;
      }

      const exportData = await sequelize.query(`
        SELECT 
          ual.id,
          ual.user_id,
          u.email as user_email,
          ual.admin_id,
          a.email as admin_email,
          ual.activity_type,
          ual.activity_data,
          ual.ip_address,
          ual.user_agent,
          ual.created_at
        FROM archive.user_activity_logs ual
        LEFT JOIN auth.users u ON ual.user_id = u.id
        LEFT JOIN auth.users a ON ual.admin_id = a.id
        ${whereClause}
        ORDER BY ual.created_at DESC
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        data: {
          format,
          recordCount: exportData.length,
          exportData: exportData || [],
          generatedAt: new Date(),
          filters: {
            startDate,
            endDate,
            activityTypes
          }
        }
      };
    } catch (error) {
      console.error('Audit exportAuditData error:', error);
      return {
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to export audit data'
        }
      };
    }
  }
}

module.exports = new AuditService();
