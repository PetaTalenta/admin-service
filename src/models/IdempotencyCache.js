/**
 * IdempotencyCache Model for Admin Service
 * Direct access to assessment.idempotency_cache table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IdempotencyCache = sequelize.define('IdempotencyCache', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  idempotency_key: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'idempotency_key'
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
  request_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'request_hash'
  },
  response_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'response_data'
  },
  status_code: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'status_code'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  }
}, {
  tableName: 'idempotency_cache',
  schema: 'assessment',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['idempotency_key']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Associations
IdempotencyCache.associate = function(models) {
  IdempotencyCache.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = IdempotencyCache;
