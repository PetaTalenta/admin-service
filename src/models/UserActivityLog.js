const { DataTypes } = require('sequelize');
const { archiveSequelize } = require('../config/database');

/**
 * UserActivityLog model - archive.user_activity_logs table
 */
const UserActivityLog = archiveSequelize.define('UserActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  activity_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  activity_data: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'user_activity_logs',
  schema: 'archive',
  timestamps: false,
  underscored: true
});

module.exports = UserActivityLog;

