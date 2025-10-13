const logger = require('../utils/logger');
const { errorResponse } = require('../utils/responseFormatter');

/**
 * Error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'UnauthorizedError' || err.code === 'UNAUTHORIZED') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (err.name === 'ForbiddenError' || err.code === 'FORBIDDEN') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access denied';
  } else if (err.name === 'NotFoundError' || err.code === 'NOT_FOUND') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = err.message || 'Resource not found';
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.errors.map(e => e.message).join(', ');
  } else if (err.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = 'Database operation failed';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred';
  }

  // Send error response
  res.status(statusCode).json(errorResponse(errorCode, message, 
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  ));
};

module.exports = errorHandler;

