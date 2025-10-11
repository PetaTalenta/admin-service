/**
 * SystemMetrics Model for Admin Service
 * Direct access to archive.system_metrics table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemMetrics = sequelize.define('SystemMetrics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  metric_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'metric_name'
  },
  metric_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'metric_value'
  },
  metric_unit: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'metric_unit'
  },
  metric_category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'metric_category'
  },
  recorded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'recorded_at'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'system_metrics',
  schema: 'archive',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['metric_name']
    },
    {
      fields: ['metric_category']
    },
    {
      fields: ['recorded_at']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = SystemMetrics;
