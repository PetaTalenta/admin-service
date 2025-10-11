const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AnalysisJob = sequelize.define('AnalysisJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  job_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'job_id'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'queued',
    validate: {
      isIn: [['queued', 'processing', 'completed', 'failed', 'deleted']]
    }
  },
  result_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'result_id'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  processing_started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processing_started_at'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'priority'
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'retry_count'
  },
  max_retries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    field: 'max_retries'
  },
  assessment_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'AI-Driven Talent Mapping',
    field: 'assessment_name',
    validate: {
      isIn: [['AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment']]
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
  tableName: 'analysis_jobs',
  schema: 'archive',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['job_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['priority', 'created_at']
    }
  ]
});

// Instance methods
AnalysisJob.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Remove the database internal ID from API responses
  delete values.id;
  
  return values;
};

// Class methods
AnalysisJob.findByJobId = async function(jobId, includeAssociations = false) {
  const options = {
    where: { job_id: jobId }
  };

  if (includeAssociations) {
    options.include = [
      {
        model: this.sequelize.models.AnalysisResult,
        as: 'result',
        required: false
      }
    ];
  }

  return await this.findOne(options);
};

AnalysisJob.associate = function(models) {
  // AnalysisJob belongs to User
  AnalysisJob.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user',
    targetKey: 'id'
  });

  // AnalysisJob has one AnalysisResult
  AnalysisJob.hasOne(models.AnalysisResult, {
    foreignKey: 'id',
    sourceKey: 'result_id',
    as: 'result'
  });
};

module.exports = AnalysisJob;
