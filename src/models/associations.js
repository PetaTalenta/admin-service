const User = require('./User');
const UserProfile = require('./UserProfile');
const AnalysisJob = require('./AnalysisJob');
const AnalysisResult = require('./AnalysisResult');
const Conversation = require('./Conversation');
const Message = require('./Message');
const UsageTracking = require('./UsageTracking');
const UserActivityLog = require('./UserActivityLog');

/**
 * Define model associations
 * This file should be imported after all models are defined
 * Note: User <-> UserProfile associations are already defined in UserProfile.js
 */

// User <-> AnalysisJob (One-to-Many)
// Note: User is in auth schema, AnalysisJob is in archive schema
// We need to use a manual association since they're in different databases
AnalysisJob.belongsTo(User, {
  foreignKey: 'user_id',
  targetKey: 'id',
  as: 'user',
  constraints: false // Important: disable constraints for cross-schema associations
});

// AnalysisJob <-> AnalysisResult (One-to-One)
AnalysisJob.belongsTo(AnalysisResult, {
  foreignKey: 'result_id',
  targetKey: 'id',
  as: 'result',
  constraints: false
});

// User <-> Conversation (One-to-Many)
// Note: User is in auth schema, Conversation is in chat schema
Conversation.belongsTo(User, {
  foreignKey: 'user_id',
  targetKey: 'id',
  as: 'user',
  constraints: false
});

// UserActivityLog associations
UserActivityLog.belongsTo(User, {
  foreignKey: 'user_id',
  targetKey: 'id',
  as: 'user',
  constraints: false
});

UserActivityLog.belongsTo(User, {
  foreignKey: 'admin_id',
  targetKey: 'id',
  as: 'admin',
  constraints: false
});

// Conversation <-> Message (One-to-Many)
Conversation.hasMany(Message, {
  foreignKey: 'conversation_id',
  sourceKey: 'id',
  as: 'messages',
  constraints: false
});

Message.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  targetKey: 'id',
  as: 'conversation',
  constraints: false
});

// Message <-> UsageTracking (One-to-One)
Message.hasOne(UsageTracking, {
  foreignKey: 'message_id',
  sourceKey: 'id',
  as: 'usage',
  constraints: false
});

UsageTracking.belongsTo(Message, {
  foreignKey: 'message_id',
  targetKey: 'id',
  as: 'message',
  constraints: false
});

// Conversation <-> UsageTracking (One-to-Many)
Conversation.hasMany(UsageTracking, {
  foreignKey: 'conversation_id',
  sourceKey: 'id',
  as: 'usage_tracking',
  constraints: false
});

UsageTracking.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  targetKey: 'id',
  as: 'conversation',
  constraints: false
});

module.exports = {
  User,
  UserProfile,
  AnalysisJob,
  AnalysisResult,
  Conversation,
  Message,
  UsageTracking,
  UserActivityLog
};

