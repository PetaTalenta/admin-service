const schoolService = require('../services/schoolService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * Get paginated list of schools
 * GET /admin/schools
 */
const getSchools = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', sort_by = 'created_at', sort_order = 'DESC' } = req.query;

    logger.info('Fetching schools list', {
      page,
      limit,
      search,
      sort_by,
      sort_order,
      adminId: req.admin.id
    });

    const result = await schoolService.getSchools(page, limit, search, sort_by, sort_order);

    res.json(successResponse(result, 'Schools retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching schools', {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Get school by ID
 * GET /admin/schools/:id
 */
const getSchoolById = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Fetching school details', {
      schoolId: id,
      adminId: req.admin.id
    });

    const result = await schoolService.getSchoolById(id);

    res.json(successResponse(result, 'School details retrieved successfully'));
  } catch (error) {
    if (error.message === 'School not found') {
      return res.status(404).json(errorResponse(
        'NOT_FOUND',
        'School not found'
      ));
    }

    logger.error('Error fetching school details', {
      schoolId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Create new school
 * POST /admin/schools
 */
const createSchool = async (req, res, next) => {
  try {
    const schoolData = req.body;

    logger.info('Creating new school', {
      schoolData,
      adminId: req.admin.id
    });

    const result = await schoolService.createSchool(schoolData);

    res.status(201).json(successResponse(result, 'School created successfully'));
  } catch (error) {
    logger.error('Error creating school', {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Update school
 * PUT /admin/schools/:id
 */
const updateSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating school', {
      schoolId: id,
      updates,
      adminId: req.admin.id
    });

    const result = await schoolService.updateSchool(id, updates);

    res.json(successResponse(result, 'School updated successfully'));
  } catch (error) {
    if (error.message === 'School not found') {
      return res.status(404).json(errorResponse(
        'NOT_FOUND',
        'School not found'
      ));
    }

    logger.error('Error updating school', {
      schoolId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

/**
 * Delete school
 * DELETE /admin/schools/:id
 */
const deleteSchool = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info('Deleting school', {
      schoolId: id,
      adminId: req.admin.id
    });

    const result = await schoolService.deleteSchool(id);

    res.json(successResponse(result, 'School deleted successfully'));
  } catch (error) {
    if (error.message === 'School not found') {
      return res.status(404).json(errorResponse(
        'NOT_FOUND',
        'School not found'
      ));
    }

    if (error.message.includes('Cannot delete school')) {
      return res.status(400).json(errorResponse(
        'INVALID_REQUEST',
        error.message
      ));
    }

    logger.error('Error deleting school', {
      schoolId: req.params.id,
      error: error.message,
      stack: error.stack,
      adminId: req.admin?.id
    });
    next(error);
  }
};

module.exports = {
  getSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool
};

