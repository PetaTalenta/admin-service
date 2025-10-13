const express = require('express');
const router = express.Router();
const { getHealthStatus } = require('../config/database');
const { successResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const health = {
      status: 'healthy',
      service: 'admin-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(successResponse(health, 'Service is healthy'));
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNHEALTHY',
        message: 'Service health check failed'
      }
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check including database connections
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();

  try {
    // Get database health
    const dbHealth = await getHealthStatus();

    // Calculate overall status
    const allHealthy = Object.values(dbHealth).every(
      schema => schema.status === 'healthy'
    );

    const health = {
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'admin-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      responseTime: Date.now() - startTime
    };

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(successResponse(health, 'Detailed health check completed'));
  } catch (error) {
    logger.error('Detailed health check failed', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNHEALTHY',
        message: 'Detailed health check failed'
      }
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes/Docker
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if database connections are ready
    const dbHealth = await getHealthStatus();
    const allReady = Object.values(dbHealth).every(
      schema => schema.status === 'healthy'
    );

    if (allReady) {
      res.json(successResponse({ ready: true }, 'Service is ready'));
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_READY',
          message: 'Service is not ready'
        }
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_READY',
        message: 'Readiness check failed'
      }
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes/Docker
 */
router.get('/live', (req, res) => {
  res.json(successResponse({ alive: true }, 'Service is alive'));
});

module.exports = router;

