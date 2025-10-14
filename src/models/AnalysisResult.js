const { DataTypes } = require('sequelize');
const { archiveSequelize } = require('../config/database');

/**
 * AnalysisResult model - archive.analysis_results table
 */
const AnalysisResult = archiveSequelize.define('AnalysisResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  test_data: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  test_result: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  raw_responses: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  chatbot_id: {
    type: DataTypes.UUID,
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
  tableName: 'analysis_results',
  schema: 'archive',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = AnalysisResult;

