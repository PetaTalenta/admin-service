const Joi = require('joi');

const schemas = {
  // Authentication schemas
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
  }),

  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(100).optional(),
    email: Joi.string().email().optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // User management schemas
  getUsersQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow('').optional(),
    userType: Joi.string().valid('user', 'admin').allow('').optional(),
    isActive: Joi.string().valid('true', 'false').allow('').optional(),
    sortBy: Joi.string().valid('created_at', 'email', 'username', 'token_balance').default('created_at'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
  }),

  updateUserProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(100).optional(),
    email: Joi.string().email().optional(),
    is_active: Joi.boolean().optional(),
    user_type: Joi.string().valid('user', 'admin').optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  tokenOperation: Joi.object({
    amount: Joi.number().integer().min(1).required().messages({
      'number.min': 'Amount must be at least 1',
      'any.required': 'Amount is required'
    }),
    reason: Joi.string().max(255).optional().allow('')
  }),

  tokenHistoryQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // Phase 2 Analytics schemas
  analyticsQuery: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'hourly').default('daily'),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    category: Joi.string().optional(),
    cohortPeriod: Joi.string().valid('weekly', 'monthly').default('monthly')
  }),

  transactionQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    userId: Joi.string().uuid().optional(),
    action: Joi.string().valid('add', 'deduct').optional(),
    sortBy: Joi.string().valid('created_at', 'amount').default('created_at'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
  }),

  bulkTokenOperation: Joi.object({
    operation: Joi.string().valid('add', 'deduct').required().messages({
      'any.required': 'Operation is required',
      'any.only': 'Operation must be either "add" or "deduct"'
    }),
    amount: Joi.number().integer().min(1).required().messages({
      'number.min': 'Amount must be at least 1',
      'any.required': 'Amount is required'
    }),
    userIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required().messages({
      'array.min': 'At least one user ID is required',
      'array.max': 'Maximum 100 users allowed per operation',
      'any.required': 'User IDs are required'
    }),
    reason: Joi.string().max(255).optional().allow('')
  }),

  // Common parameter schemas
  uuidParam: Joi.object({
    userId: Joi.string().uuid().required().messages({
      'string.uuid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),
    resultId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Invalid result ID format'
    }),
    jobId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Invalid job ID format'
    })
  })
};

/**
 * Validation middleware factory
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : 
                  source === 'params' ? req.params : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      });
    }

    // Replace the original data with validated and sanitized data
    if (source === 'query') {
      req.query = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  schemas,
  validate
};
