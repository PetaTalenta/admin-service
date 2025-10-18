const { Op } = require('sequelize');
const School = require('../models/School');
const UserProfile = require('../models/UserProfile');
const logger = require('../utils/logger');

/**
 * Get paginated list of schools with search and sorting
 */
const getSchools = async (page = 1, limit = 20, search = '', sortBy = 'created_at', sortOrder = 'DESC') => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause for search
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { province: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Validate sort fields
    const allowedSortFields = ['name', 'city', 'province', 'created_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await School.findAndCountAll({
      where,
      limit,
      offset,
      order: [[validSortBy, validSortOrder]],
      distinct: true
    });

    return {
      schools: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching schools', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get school by ID
 */
const getSchoolById = async (schoolId) => {
  try {
    const school = await School.findByPk(schoolId);

    if (!school) {
      throw new Error('School not found');
    }

    // Get count of users associated with this school
    const userCount = await UserProfile.count({
      where: { school_id: schoolId }
    });

    return {
      school: school.toJSON(),
      userCount
    };
  } catch (error) {
    logger.error('Error fetching school by ID', {
      schoolId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Create new school
 */
const createSchool = async (schoolData) => {
  try {
    const school = await School.create(schoolData);

    logger.info('School created successfully', {
      schoolId: school.id,
      name: school.name
    });

    return school;
  } catch (error) {
    logger.error('Error creating school', {
      error: error.message,
      stack: error.stack,
      schoolData
    });
    throw error;
  }
};

/**
 * Update school
 */
const updateSchool = async (schoolId, updates) => {
  try {
    const school = await School.findByPk(schoolId);

    if (!school) {
      throw new Error('School not found');
    }

    await school.update(updates);

    logger.info('School updated successfully', {
      schoolId: school.id,
      name: school.name,
      updates
    });

    return school;
  } catch (error) {
    logger.error('Error updating school', {
      schoolId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Delete school
 * Only allowed if no users are associated with this school
 */
const deleteSchool = async (schoolId) => {
  try {
    const school = await School.findByPk(schoolId);

    if (!school) {
      throw new Error('School not found');
    }

    // Check if any users are associated with this school
    const userCount = await UserProfile.count({
      where: { school_id: schoolId }
    });

    if (userCount > 0) {
      throw new Error(`Cannot delete school. ${userCount} user(s) are associated with this school.`);
    }

    await school.destroy();

    logger.info('School deleted successfully', {
      schoolId,
      name: school.name
    });

    return { message: 'School deleted successfully' };
  } catch (error) {
    logger.error('Error deleting school', {
      schoolId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  getSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool
};

