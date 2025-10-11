/**
 * Models Index for Admin Service
 * Exports all models and sets up associations
 */

const { sequelize } = require('../config/database');
const User = require('./User');
const AnalysisJob = require('./AnalysisJob');
const AnalysisResult = require('./AnalysisResult');
const UserActivityLog = require('./UserActivityLog');
const SystemMetrics = require('./SystemMetrics');
const Conversation = require('./Conversation');
const Message = require('./Message');
const UsageTracking = require('./UsageTracking');
const IdempotencyCache = require('./IdempotencyCache');

// Initialize models
const models = {
  User,
  AnalysisJob,
  AnalysisResult,
  UserActivityLog,
  SystemMetrics,
  Conversation,
  Message,
  UsageTracking,
  IdempotencyCache,
  sequelize
};

// Set up associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
