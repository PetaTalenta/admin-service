const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validate request body against schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Request body validation failed', {
        url: req.originalUrl,
        errors
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: errors
        }
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validate request query parameters against schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Request query validation failed', {
        url: req.originalUrl,
        errors
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors
        }
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Validate request params against schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Request params validation failed', {
        url: req.originalUrl,
        errors
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: errors
        }
      });
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),
  uuid: Joi.object({
    id: Joi.string().uuid().required()
  })
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  schemas
};

