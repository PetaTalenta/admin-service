const { DataTypes } = require('sequelize');
const { chatSequelize } = require('../config/database');

/**
 * Message model - chat.messages table
 */
const Message = chatSequelize.define('Message', {
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
  sender_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  content_type: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'text'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  parent_message_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'messages',
  schema: 'chat',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Message;

