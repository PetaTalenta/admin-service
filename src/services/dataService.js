const { sequelize } = require('../models');
const { User, AnalysisResult, AnalysisJob, UserActivityLog } = require('../models');
const { Op } = require('sequelize');

class DataService {
  /**
   * Export data functionality
   */
  async exportData(exportConfig, adminId) {
    try {
      const {
        dataType = 'users',
        format = 'json',
        filters = {},
        includeFields = []
      } = exportConfig;

      let exportData = [];
      let query = '';
      let replacements = {};

      switch (dataType) {
        case 'users':
          query = `
            SELECT 
              u.id,
              u.email,
              u.username,
              u.user_type,
              u.is_active,
              u.token_balance,
              u.last_login,
              u.created_at,
              u.updated_at
            FROM auth.users u
            WHERE 1=1
            ${filters.userType ? 'AND u.user_type = :userType' : ''}
            ${filters.isActive !== undefined ? 'AND u.is_active = :isActive' : ''}
            ${filters.startDate ? 'AND u.created_at >= :startDate' : ''}
            ${filters.endDate ? 'AND u.created_at <= :endDate' : ''}
            ORDER BY u.created_at DESC
            ${filters.limit ? 'LIMIT :limit' : ''}
          `;
          replacements = filters;
          break;

        case 'assessments':
          query = `
            SELECT 
              ar.id,
              ar.job_id,
              ar.user_id,
              u.email as user_email,
              ar.analysis_result,
              ar.created_at
            FROM archive.analysis_results ar
            JOIN auth.users u ON ar.user_id = u.id
            WHERE 1=1
            ${filters.startDate ? 'AND ar.created_at >= :startDate' : ''}
            ${filters.endDate ? 'AND ar.created_at <= :endDate' : ''}
            ORDER BY ar.created_at DESC
            ${filters.limit ? 'LIMIT :limit' : ''}
          `;
          replacements = filters;
          break;

        case 'activities':
          query = `
            SELECT 
              ual.id,
              ual.user_id,
              u.email as user_email,
              ual.admin_id,
              a.email as admin_email,
              ual.activity_type,
              ual.activity_data,
              ual.ip_address,
              ual.created_at
            FROM archive.user_activity_logs ual
            LEFT JOIN auth.users u ON ual.user_id = u.id
            LEFT JOIN auth.users a ON ual.admin_id = a.id
            WHERE 1=1
            ${filters.activityType ? 'AND ual.activity_type = :activityType' : ''}
            ${filters.startDate ? 'AND ual.created_at >= :startDate' : ''}
            ${filters.endDate ? 'AND ual.created_at <= :endDate' : ''}
            ORDER BY ual.created_at DESC
            ${filters.limit ? 'LIMIT :limit' : ''}
          `;
          replacements = filters;
          break;

        default:
          return {
            success: false,
            error: {
              code: 'INVALID_DATA_TYPE',
              message: 'Invalid data type for export'
            }
          };
      }

      exportData = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // Log the export activity
      await UserActivityLog.logActivity({
        userId: null,
        adminId,
        activityType: 'data_export',
        description: `Data export: ${dataType} (${exportData.length} records)`,
        metadata: {
          dataType,
          format,
          recordCount: exportData.length,
          filters
        }
      });

      return {
        success: true,
        data: {
          dataType,
          format,
          recordCount: exportData.length,
          exportData: exportData || [],
          generatedAt: new Date(),
          exportedBy: adminId
        }
      };
    } catch (error) {
      console.error('Data exportData error:', error);
      return {
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'Failed to export data'
        }
      };
    }
  }

  /**
   * Create database backup
   */
  async createBackup(backupConfig, adminId) {
    try {
      const {
        backupType = 'full',
        includeSchemas = ['auth', 'archive', 'chat'],
        compression = true
      } = backupConfig;

      // Simulate backup process (in real implementation, this would use pg_dump)
      const backupId = `backup_${Date.now()}`;
      const timestamp = new Date();

      // Get database statistics for backup metadata
      const dbStats = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables
        WHERE schemaname = ANY(:schemas)
        ORDER BY schemaname, tablename
      `, {
        replacements: { schemas: includeSchemas },
        type: sequelize.QueryTypes.SELECT
      });

      // Log the backup activity
      await UserActivityLog.logActivity({
        userId: null,
        adminId,
        activityType: 'data_backup',
        description: `Database backup created: ${backupId}`,
        metadata: {
          backupId,
          backupType,
          includeSchemas,
          compression,
          tableStats: dbStats.length
        }
      });

      return {
        success: true,
        data: {
          backupId,
          backupType,
          includeSchemas,
          compression,
          createdAt: timestamp,
          createdBy: adminId,
          status: 'completed',
          tableStats: dbStats || []
        }
      };
    } catch (error) {
      console.error('Data createBackup error:', error);
      return {
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'Failed to create backup'
        }
      };
    }
  }

  /**
   * Anonymize user data for GDPR compliance
   */
  async anonymizeUserData(userId, anonymizeConfig, adminId) {
    try {
      const {
        anonymizeFields = ['email', 'username'],
        preserveAnalytics = true
      } = anonymizeConfig;

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

      const originalData = {
        email: user.email,
        username: user.username
      };

      // Anonymize user data
      const updateData = {};
      if (anonymizeFields.includes('email')) {
        updateData.email = `anonymized_${userId.substring(0, 8)}@example.com`;
      }
      if (anonymizeFields.includes('username')) {
        updateData.username = `anonymized_${userId.substring(0, 8)}`;
      }

      await user.update(updateData);

      // Optionally preserve analytics by not deleting analysis results
      if (!preserveAnalytics) {
        await AnalysisResult.destroy({
          where: { user_id: userId }
        });
        await AnalysisJob.destroy({
          where: { user_id: userId }
        });
      }

      // Log the anonymization
      await UserActivityLog.logActivity({
        userId,
        adminId,
        activityType: 'data_anonymization',
        description: `User data anonymized for GDPR compliance`,
        metadata: {
          anonymizedFields: anonymizeFields,
          preserveAnalytics,
          originalEmail: originalData.email
        }
      });

      return {
        success: true,
        data: {
          userId,
          anonymizedFields: anonymizeFields,
          preserveAnalytics,
          anonymizedAt: new Date(),
          anonymizedBy: adminId
        }
      };
    } catch (error) {
      console.error('Data anonymizeUserData error:', error);
      return {
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'Failed to anonymize user data'
        }
      };
    }
  }

  /**
   * Perform data integrity check
   */
  async performIntegrityCheck(checkConfig = {}) {
    try {
      const {
        checkTypes = ['foreign_keys', 'orphaned_records', 'data_consistency']
      } = checkConfig;

      const integrityResults = {};

      // Check foreign key constraints
      if (checkTypes.includes('foreign_keys')) {
        const foreignKeyIssues = await sequelize.query(`
          SELECT 
            'analysis_results' as table_name,
            'user_id' as column_name,
            COUNT(*) as orphaned_count
          FROM archive.analysis_results ar
          LEFT JOIN auth.users u ON ar.user_id = u.id
          WHERE u.id IS NULL
          UNION ALL
          SELECT 
            'analysis_results' as table_name,
            'job_id' as column_name,
            COUNT(*) as orphaned_count
          FROM archive.analysis_results ar
          LEFT JOIN archive.analysis_jobs aj ON ar.job_id = aj.id
          WHERE aj.id IS NULL
          UNION ALL
          SELECT 
            'user_activity_logs' as table_name,
            'user_id' as column_name,
            COUNT(*) as orphaned_count
          FROM archive.user_activity_logs ual
          LEFT JOIN auth.users u ON ual.user_id = u.id
          WHERE ual.user_id IS NOT NULL AND u.id IS NULL
        `, {
          type: sequelize.QueryTypes.SELECT
        });

        integrityResults.foreignKeyIssues = foreignKeyIssues.filter(issue => 
          parseInt(issue.orphaned_count) > 0
        );
      }

      // Check for orphaned records
      if (checkTypes.includes('orphaned_records')) {
        const orphanedRecords = await sequelize.query(`
          SELECT 
            'analysis_jobs without results' as issue_type,
            COUNT(*) as count
          FROM archive.analysis_jobs aj
          LEFT JOIN archive.analysis_results ar ON aj.id = ar.job_id
          WHERE ar.id IS NULL
            AND aj.status = 'completed'
            AND aj.completed_at IS NOT NULL
        `, {
          type: sequelize.QueryTypes.SELECT
        });

        integrityResults.orphanedRecords = orphanedRecords;
      }

      // Check data consistency
      if (checkTypes.includes('data_consistency')) {
        const consistencyIssues = await sequelize.query(`
          SELECT 
            'users with negative token balance' as issue_type,
            COUNT(*) as count
          FROM auth.users
          WHERE token_balance < 0
          UNION ALL
          SELECT 
            'analysis jobs with invalid status' as issue_type,
            COUNT(*) as count
          FROM archive.analysis_jobs
          WHERE status NOT IN ('pending', 'processing', 'completed', 'failed')
        `, {
          type: sequelize.QueryTypes.SELECT
        });

        integrityResults.consistencyIssues = consistencyIssues.filter(issue => 
          parseInt(issue.count) > 0
        );
      }

      // Calculate overall integrity score
      const totalIssues = Object.values(integrityResults).reduce((sum, issues) => 
        sum + (Array.isArray(issues) ? issues.length : 0), 0
      );

      const integrityScore = totalIssues === 0 ? 100 : Math.max(0, 100 - (totalIssues * 10));

      return {
        success: true,
        data: {
          integrityScore,
          totalIssues,
          checkTypes,
          results: integrityResults,
          checkedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Data performIntegrityCheck error:', error);
      return {
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'Failed to perform integrity check'
        }
      };
    }
  }
}

module.exports = new DataService();
