const { DataTypes } = require('sequelize');
const { authSequelize } = require('../config/database');
const User = require('./User');

/**
 * UserProfile model - auth.user_profiles table
 */
const UserProfile = authSequelize.define('UserProfile', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: true
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  tableName: 'user_profiles',
  schema: 'auth',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
User.hasOne(UserProfile, {
  foreignKey: 'user_id',
  as: 'profile'
});

UserProfile.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = UserProfile;

