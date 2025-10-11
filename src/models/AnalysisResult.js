const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AnalysisResult = sequelize.define('AnalysisResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  test_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'test_data'
  },
  test_result: {
    type: DataTypes.JSONB,
    allowNull: true, // Allow null for failed analyses
    field: 'test_result'
  },
  raw_responses: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'raw_responses'
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
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['created_at']
    },
    {
      name: 'idx_analysis_results_user_created',
      fields: ['user_id', 'created_at']
    }
  ]
});

// Instance methods
AnalysisResult.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Class methods
AnalysisResult.findWithPagination = async function(options = {}) {
  const {
    page = 1,
    limit = 10,
    userId = null,
    status = null,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const offset = (page - 1) * limit;
  const whereClause = {};

  if (userId) {
    whereClause.user_id = userId;
  }

  const queryOptions = {
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder.toUpperCase()]],
    include: [
      {
        model: this.sequelize.models.AnalysisJob,
        as: 'jobs',
        required: false,
        where: status ? { status } : undefined
      }
    ]
  };

  const { count, rows } = await this.findAndCountAll(queryOptions);

  // Transform results to include job data at the result level
  const transformedRows = rows.map(result => {
    const resultData = result.toJSON();
    const job = resultData.jobs && resultData.jobs.length > 0 ? resultData.jobs[0] : null;

    return {
      ...resultData,
      // Add job fields to result level for backward compatibility
      status: job ? job.status : null,
      error_message: job ? job.error_message : null,
      assessment_name: job ? job.assessment_name : null,
      // Keep jobs array for detailed access if needed
      jobs: resultData.jobs
    };
  });

  const totalPages = Math.ceil(count / limit);

  return {
    results: transformedRows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

AnalysisResult.associate = function(models) {
  // AnalysisResult belongs to User
  AnalysisResult.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user',
    targetKey: 'id'
  });

  // AnalysisResult has many AnalysisJobs (through result_id)
  AnalysisResult.hasMany(models.AnalysisJob, {
    foreignKey: 'result_id',
    sourceKey: 'id',
    as: 'jobs'
  });
};

module.exports = AnalysisResult;
