/**
 * Direct Database Access Routes for Admin Service
 * Phase 1 Implementation - Core Admin Endpoints
 */

const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const analyticsRoutes = require('./analytics');
const assessmentRoutes = require('./assessments');
const tokenRoutes = require('./tokens');
const jobRoutes = require('./jobs');
const systemRoutes = require('./system');

// Phase 3 Routes
const securityRoutes = require('./security');
const auditRoutes = require('./audit');
const insightsRoutes = require('./insights');
const dataRoutes = require('./data');
const dashboardRoutes = require('./dashboard');

const router = express.Router();

// Authentication routes
router.use('/', authRoutes);

// User management routes
router.use('/users', userRoutes);

// Phase 2 Routes - Advanced Admin Endpoints & Analytics
router.use('/analytics', analyticsRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/tokens', tokenRoutes);
router.use('/jobs', jobRoutes);
router.use('/system', systemRoutes);

// Phase 3 Routes - Comprehensive Monitoring & Security Features
router.use('/security', securityRoutes);
router.use('/audit', auditRoutes);
router.use('/insights', insightsRoutes);
router.use('/data', dataRoutes);
router.use('/dashboard', dashboardRoutes);

// Health check endpoint for direct database access
router.get('/health/db', async (req, res) => {
  try {
    const { sequelize } = require('../models');
    await sequelize.authenticate();
    
    res.json({
      success: true,
      message: 'Direct database connection is healthy',
      timestamp: new Date().toISOString(),
      service: 'admin-service-direct-db'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
