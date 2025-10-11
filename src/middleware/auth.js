const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Admin authentication middleware
 */
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find user in database
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found'
          }
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User account is inactive'
          }
        });
      }

      // Check if user is admin
      if (user.user_type !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }

      // Add user to request object
      req.user = user;
      req.adminId = user.id;
      
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication error'
      }
    });
  }
};

/**
 * Optional admin auth - doesn't fail if no token provided
 */
const optionalAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password_hash'] }
      });

      if (user && user.is_active && user.user_type === 'admin') {
        req.user = user;
        req.adminId = user.id;
      }
    } catch (jwtError) {
      // Ignore JWT errors for optional auth
    }
    
    next();
  } catch (error) {
    console.error('Optional admin auth middleware error:', error);
    next();
  }
};

module.exports = {
  adminAuth,
  optionalAdminAuth
};
