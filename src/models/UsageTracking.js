/**
 * UsageTracking Model for Admin Service
 * Direct access to chat.usage_tracking table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UsageTracking = sequelize.define('UsageTracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  conversation_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'conversation_id',
    references: {
      model: 'conversations',
      key: 'id'
    }
  },
  message_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'message_id'
  },
  model_used: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'model_used'
  },
  prompt_tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'prompt_tokens'
  },
  completion_tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'completion_tokens'
  },
  total_tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_tokens'
  },
  cost_credits: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 0,
    field: 'cost_credits'
  },
  is_free_model: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_free_model'
  },
  processing_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'processing_time_ms'
  }
}, {
  tableName: 'usage_tracking',
  schema: 'chat',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No updated_at in the actual table
  underscored: true,
  indexes: [
    {
      fields: ['conversation_id']
    },
    {
      fields: ['message_id']
    },
    {
      fields: ['model_used']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Associations
UsageTracking.associate = function(models) {
  UsageTracking.belongsTo(models.Conversation, {
    foreignKey: 'conversation_id',
    as: 'conversation'
  });
};

module.exports = UsageTracking;
