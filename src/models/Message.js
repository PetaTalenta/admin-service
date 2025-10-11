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
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user',
    field: 'sender_type',
    validate: {
      isIn: [['user', 'assistant', 'system']]
    }
  },
  content_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'text',
    field: 'content_type',
    validate: {
      isIn: [['text', 'image', 'file']]
    }
  },
  parent_message_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_message_id',
    references: {
      model: 'messages',
      key: 'id'
    }
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
      fields: ['sender_type']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['parent_message_id']
    }
  ]
});

// Associations
Message.associate = function(models) {
  Message.belongsTo(models.Conversation, {
    foreignKey: 'conversation_id',
    as: 'conversation'
  });

  Message.belongsTo(models.Message, {
    foreignKey: 'parent_message_id',
    as: 'parentMessage'
  });

  Message.hasMany(models.Message, {
    foreignKey: 'parent_message_id',
    as: 'replies'
  });
};

module.exports = Message;
