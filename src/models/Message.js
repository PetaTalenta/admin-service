/**
 * Message Model for Admin Service
 * Direct access to chat.messages table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user',
    field: 'message_type',
    validate: {
      isIn: [['user', 'assistant', 'system']]
    }
  },
  tokens_used: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tokens_used'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'messages',
  schema: 'chat',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['conversation_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['message_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Associations
Message.associate = function(models) {
  Message.belongsTo(models.Conversation, {
    foreignKey: 'conversation_id',
    as: 'conversation'
  });
  
  Message.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = Message;
