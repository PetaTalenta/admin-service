const { UserActivityLog } = require('../models');

/**
 * Activity logging middleware
 */
const logActivity = (activityType, getDescription = null, getMetadata = null) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Call original res.json first
      originalJson.call(this, data);
      
      // Log activity asynchronously (don't block response)
      setImmediate(async () => {
        try {
          if (!req.adminId) {
            return; // Skip logging if no admin ID
          }

          const userId = req.params.userId || req.body.userId || req.adminId; // Use adminId as fallback
          const description = typeof getDescription === 'function'
            ? getDescription(req, res, data)
            : getDescription;
          const metadata = typeof getMetadata === 'function'
            ? getMetadata(req, res, data)
            : getMetadata;

          await UserActivityLog.logActivity({
            userId,
            adminId: req.adminId,
            activityType,
            description,
            metadata: {
              ...metadata,
              endpoint: req.originalUrl,
              method: req.method,
              statusCode: res.statusCode,
              success: data?.success
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          });
        } catch (error) {
          console.error('Activity logging error:', error);
          // Don't let logging errors break the response
        }
      });
    };
    
    next();
  };
};

/**
 * Predefined activity loggers
 */
const activityLoggers = {
  userView: logActivity(
    'user_view',
    (req) => `Admin viewed user profile: ${req.params.userId}`,
    (req) => ({ userId: req.params.userId })
  ),
  
  userListView: logActivity(
    'user_list_view',
    (req) => `Admin viewed user list with filters: ${JSON.stringify(req.query)}`,
    (req) => ({ filters: req.query })
  ),
  
  profileUpdate: logActivity(
    'profile_update',
    (req) => `Admin updated user profile: ${req.params.userId}`,
    (req) => ({ 
      userId: req.params.userId,
      updatedFields: Object.keys(req.body)
    })
  ),
  
  tokenBalanceUpdate: logActivity(
    'token_balance_update',
    (req) => `Admin updated token balance for user: ${req.params.userId}`,
    (req) => ({
      userId: req.params.userId,
      action: req.originalUrl.includes('/add') ? 'add' : 'deduct',
      amount: req.body.amount
    })
  ),
  
  login: logActivity(
    'login',
    () => 'Admin logged in',
    (req) => ({ email: req.body.email })
  ),
  
  logout: logActivity(
    'logout',
    () => 'Admin logged out'
  ),
  
  profileView: logActivity(
    'profile_view',
    () => 'Admin viewed own profile'
  ),

  // Phase 2 Activity Loggers
  analyticsView: logActivity(
    'analytics_view',
    (req) => `Admin viewed analytics: ${req.originalUrl}`,
    (req) => ({
      endpoint: req.originalUrl,
      filters: req.query
    })
  ),

  assessmentView: logActivity(
    'assessment_view',
    (req) => `Admin viewed assessment details: ${req.params.resultId}`,
    (req) => ({ resultId: req.params.resultId })
  ),

  bulkTokenOperation: logActivity(
    'bulk_token_operation',
    (req) => `Admin performed bulk token ${req.body.operation}: ${req.body.amount} tokens for ${req.body.userIds.length} users`,
    (req) => ({
      operation: req.body.operation,
      amount: req.body.amount,
      userCount: req.body.userIds.length,
      reason: req.body.reason
    })
  ),

  jobOperation: logActivity(
    'job_operation',
    (req) => `Admin performed job operation: ${req.method} ${req.originalUrl}`,
    (req) => ({
      jobId: req.params.jobId,
      operation: req.method === 'POST' ? 'retry' : 'cancel'
    })
  ),

  // Phase 3 Activity Loggers
  securityAudit: logActivity(
    'security_audit',
    (req) => `Admin viewed security audit: ${req.originalUrl}`,
    (req) => ({
      endpoint: req.originalUrl,
      filters: req.query
    })
  ),

  userSuspension: logActivity(
    'user_suspension',
    (req) => `Admin suspended user: ${req.params.userId}`,
    (req) => ({
      userId: req.params.userId,
      reason: req.body.reason
    })
  ),

  userActivation: logActivity(
    'user_activation',
    (req) => `Admin activated user: ${req.params.userId}`,
    (req) => ({
      userId: req.params.userId,
      reason: req.body.reason
    })
  ),

  auditView: logActivity(
    'audit_view',
    (req) => `Admin viewed audit data: ${req.originalUrl}`,
    (req) => ({
      endpoint: req.originalUrl,
      filters: req.query
    })
  ),

  auditExport: logActivity(
    'audit_export',
    (req) => `Admin exported audit data: ${req.originalUrl}`,
    (req) => ({
      endpoint: req.originalUrl,
      filters: req.query
    })
  ),

  insightsView: logActivity(
    'insights_view',
    (req) => `Admin viewed insights: ${req.originalUrl}`,
    (req) => ({
      endpoint: req.originalUrl,
      filters: req.query
    })
  ),

  dataExport: logActivity(
    'data_export',
    (req) => `Admin exported data: ${req.body.dataType}`,
    (req) => ({
      dataType: req.body.dataType,
      format: req.body.format,
      filters: req.body.filters
    })
  ),

  dataBackup: logActivity(
    'data_backup',
    (req) => `Admin created backup: ${req.body.backupType}`,
    (req) => ({
      backupType: req.body.backupType,
      includeSchemas: req.body.includeSchemas
    })
  ),

  dataAnonymization: logActivity(
    'data_anonymization',
    (req) => `Admin anonymized user data: ${req.params.userId}`,
    (req) => ({
      userId: req.params.userId,
      anonymizeFields: req.body.anonymizeFields
    })
  ),

  dataIntegrityCheck: logActivity(
    'data_integrity_check',
    (req) => `Admin performed data integrity check`,
    (req) => ({
      checkTypes: req.query.checkTypes
    })
  ),

  dashboardView: logActivity(
    'dashboard_view',
    (req) => `Admin viewed dashboard: ${req.originalUrl}`,
    (req) => ({
      endpoint: req.originalUrl,
      filters: req.query
    })
  )
};

module.exports = {
  logActivity,
  activityLoggers
};
