const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserActivityLog = sequelize.define('UserActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true, // Can be null for system-wide actions
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'admin_id'
  },
  activity_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'activity_type',
    validate: {
      isIn: [[
        'profile_update',
        'token_balance_update',
        'user_delete',
        'user_view',
        'user_list_view',
        'profile_view',
        'system_stats_view',
        'job_monitor_view',
        'assessment_view',
        'assessment_export',
        'login',
        'logout',
        // Phase 2 activity types
        'analytics_view',
        'bulk_token_operation',
        'job_operation',
        'job_retry',
        'job_cancellation',
        // Phase 3 activity types
        'security_audit',
        'user_suspension',
        'user_activation',
        'audit_view',
        'audit_export',
        'insights_view',
        'data_export',
        'data_backup',
        'data_anonymization',
        'data_integrity_check',
        'dashboard_view'
      ]]
    }
  },
  activity_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'activity_data'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'ip_address'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'user_activity_logs',
  schema: 'archive',
  timestamps: false, // We manage created_at manually
  underscored: true,
  indexes: [
    {
      name: 'idx_user_activity_logs_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_user_activity_logs_admin_id',
      fields: ['admin_id']
    },
    {
      name: 'idx_user_activity_logs_created_at',
      fields: ['created_at']
    },
    {
      name: 'idx_user_activity_logs_activity_type',
      fields: ['activity_type']
    },
    {
      name: 'idx_user_activity_logs_admin_date',
      fields: ['admin_id', 'created_at']
    },
    {
      name: 'idx_user_activity_logs_user_date',
      fields: ['user_id', 'created_at']
    }
  ]
});

// Instance methods
UserActivityLog.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Class methods
UserActivityLog.logActivity = async function(activityData) {
  const {
    userId = null,
    adminId,
    activityType,
    description = null,
    metadata = null,
    ipAddress = null,
    userAgent = null
  } = activityData;

  return await this.create({
    user_id: userId,
    admin_id: adminId,
    activity_type: activityType,
    activity_data: {
      description,
      ...metadata
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date()
  });
};

UserActivityLog.associate = function(models) {
  // UserActivityLog belongs to User (the user being acted upon)
  UserActivityLog.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user',
    targetKey: 'id'
  });

  // UserActivityLog belongs to User (the admin performing the action)
  UserActivityLog.belongsTo(models.User, {
    foreignKey: 'admin_id',
    as: 'admin',
    targetKey: 'id'
  });
};

module.exports = UserActivityLog;
