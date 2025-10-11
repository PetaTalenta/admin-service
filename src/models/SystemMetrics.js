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
    type: DataTypes.DECIMAL,
    allowNull: true,
    field: 'metric_value'
  },
  metric_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'metric_data'
  },
  recorded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'recorded_at'
  }
}, {
  tableName: 'system_metrics',
  schema: 'archive',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      fields: ['metric_name']
    },
    {
      fields: ['recorded_at']
    }
  ]
});

module.exports = SystemMetrics;
