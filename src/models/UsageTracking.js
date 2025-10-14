const { DataTypes } = require('sequelize');
const { chatSequelize } = require('../config/database');

/**
 * UsageTracking model - chat.usage_tracking table
 */
const UsageTracking = chatSequelize.define('UsageTracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  conversation_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  message_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  model_used: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prompt_tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  completion_tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  total_tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  cost_credits: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    defaultValue: 0
  },
  is_free_model: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  processing_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'usage_tracking',
  schema: 'chat',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = UsageTracking;

