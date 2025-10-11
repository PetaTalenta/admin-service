const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthService {
  /**
   * Admin login
   */
  static async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({
        where: { 
          email: email.toLowerCase(),
          is_active: true
        }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is admin
      if (user.user_type !== 'admin') {
        throw new Error('Admin access required');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await user.update({
        last_login: new Date()
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          userType: user.user_type
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Return user data without password
      const userData = user.toJSON();
      
      return {
        success: true,
        data: {
          user: userData,
          token,
          expiresIn: JWT_EXPIRES_IN
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Get admin profile
   */
  static async getProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        data: user.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROFILE_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Update admin profile
   */
  static async updateProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Only allow certain fields to be updated
      const allowedFields = ['username', 'email'];
      const filteredData = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      // If email is being updated, make sure it's lowercase
      if (filteredData.email) {
        filteredData.email = filteredData.email.toLowerCase();
      }

      await user.update(filteredData);

      return {
        success: true,
        data: user.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_PROFILE_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        success: true,
        data: decoded
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      };
    }
  }
}

module.exports = AuthService;
