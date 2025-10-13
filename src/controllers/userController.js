const userService = require('../services/userService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * Get paginated list of users
 * GET /admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', user_type, is_active, auth_provider } = req.query;

    const filter = {};
    if (user_type) filter.user_type = user_type;
    if (is_active !== undefined) filter.is_active = is_active;
    if (auth_provider) filter.auth_provider = auth_provider;

    logger.info('Fetching users list', {
      page,
      limit,
      search,
      filter,
      adminId: req.admin.id
    });

    const result = await userService.getUsers(page, limit, search, filter);

    res.json(successResponse(result, 'Users retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching users', {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get user by ID with detailed information
 * GET /admin/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Fetching user details', {
      userId: id,
      adminId: req.admin.id
    });

    const result = await userService.getUserById(id);

    res.json(successResponse(result, 'User details retrieved successfully'));
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json(errorResponse(
        'NOT_FOUND',
        'User not found'
      ));
    }

    logger.error('Error fetching user details', {
      userId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Update user information
 * PUT /admin/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating user', {
      userId: id,
      updates,
      adminId: req.admin.id
    });

    const result = await userService.updateUser(
      id,
      updates,
      req.admin.id,
      req.ip,
      req.get('User-Agent')
    );

    res.json(successResponse(result, 'User updated successfully'));
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json(errorResponse(
        'NOT_FOUND',
        'User not found'
      ));
    }

    logger.error('Error updating user', {
      userId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get user token history
 * GET /admin/users/:id/tokens
 */
const getUserTokens = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Fetching user token history', {
      userId: id,
      adminId: req.admin.id
    });

    const result = await userService.getUserTokens(id);

    res.json(successResponse(result, 'Token history retrieved successfully'));
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json(errorResponse(
        'NOT_FOUND',
        'User not found'
      ));
    }

    logger.error('Error fetching user tokens', {
      userId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Update user token balance
 * PUT /admin/users/:id/tokens
 */
const updateUserTokens = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    logger.info('Updating user token balance', {
      userId: id,
      amount,
      reason,
      adminId: req.admin.id
    });

    const result = await userService.updateUserTokens(
      id,
      amount,
      reason,
      req.admin.id,
      req.ip,
      req.get('User-Agent')
    );

    res.json(successResponse(result, 'Token balance updated successfully'));
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json(errorResponse(
        'NOT_FOUND',
        'User not found'
      ));
    }

    if (error.message === 'Insufficient token balance') {
      return res.status(400).json(errorResponse(
        'INVALID_REQUEST',
        'Insufficient token balance'
      ));
    }

    logger.error('Error updating user tokens', {
      userId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get user's analysis jobs
 * GET /admin/users/:id/jobs
 */
const getUserJobs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    logger.info('Fetching user jobs', {
      userId: id,
      page,
      limit,
      adminId: req.admin.id
    });

    const result = await userService.getUserJobs(id, page, limit);

    res.json(successResponse(result, 'User jobs retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching user jobs', {
      userId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get user's conversations
 * GET /admin/users/:id/conversations
 */
const getUserConversations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    logger.info('Fetching user conversations', {
      userId: id,
      page,
      limit,
      adminId: req.admin.id
    });

    const result = await userService.getUserConversations(id, page, limit);

    res.json(successResponse(result, 'User conversations retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching user conversations', {
      userId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  getUserTokens,
  updateUserTokens,
  getUserJobs,
  getUserConversations
};

