const { DataTypes } = require('sequelize');
const { archiveSequelize } = require('../config/database');

/**
 * SystemMetrics model - archive.system_metrics table
 */
const SystemMetrics = archiveSequelize.define('SystemMetrics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  metric_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  metric_value: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  metric_data: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  recorded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'system_metrics',
  schema: 'archive',
  timestamps: false
});

module.exports = SystemMetrics;

