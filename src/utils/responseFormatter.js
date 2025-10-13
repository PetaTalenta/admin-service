/**
 * Format success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Formatted response
 */
const successResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Format error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error response
 */
const errorResponse = (code, message, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.error.details = details;
  }

  return response;
};

/**
 * Format paginated response
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination info
 * @returns {Object} Formatted paginated response
 */
const paginatedResponse = (data, pagination) => {
  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    },
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};

