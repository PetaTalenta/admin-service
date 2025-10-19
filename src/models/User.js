const { DataTypes } = require('sequelize');
const { authSequelize } = require('../config/database');

/**
 * User model - auth.users table
 */
const User = authSequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  token_balance: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  firebase_uid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  auth_provider: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'local'
  },
  provider_data: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  last_firebase_sync: {
    type: DataTypes.DATE,
    allowNull: true
  },
  federation_status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active'
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'users',
  schema: 'auth',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;

