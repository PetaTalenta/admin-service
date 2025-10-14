const { Server } = require('socket.io');
const logger = require('../utils/logger');
const jobService = require('./jobService');

let io = null;
let jobStatsInterval = null;

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server instance
 */
const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : '*',
      credentials: true
    },
    path: '/admin/socket.io'
  });

  // Authentication middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      logger.warn('WebSocket connection rejected: No token provided', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication required'));
    }

    // In production, validate token with auth-service
    // For now, we'll accept any token (to be implemented with proper auth)
    logger.info('WebSocket client authenticated', {
      socketId: socket.id,
      ip: socket.handshake.address
    });
    
    next();
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info('WebSocket client connected', {
      socketId: socket.id,
      ip: socket.handshake.address
    });

    // Send initial job stats
    sendJobStats(socket);

    // Subscribe to job updates
    socket.on('subscribe:jobs', () => {
      socket.join('job-updates');
      logger.debug('Client subscribed to job updates', {
        socketId: socket.id
      });
    });

    // Unsubscribe from job updates
    socket.on('unsubscribe:jobs', () => {
      socket.leave('job-updates');
      logger.debug('Client unsubscribed from job updates', {
        socketId: socket.id
      });
    });

    // Request job stats
    socket.on('request:job-stats', () => {
      sendJobStats(socket);
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        reason
      });
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('WebSocket error', {
        socketId: socket.id,
        error: error.message,
        stack: error.stack
      });
    });
  });

  // Start periodic job stats broadcast
  startJobStatsInterval();

  logger.info('WebSocket server initialized');
  return io;
};

/**
 * Send job statistics to a specific socket
 * @param {Object} socket - Socket instance
 */
const sendJobStats = async (socket) => {
  try {
    const stats = await jobService.getJobStats();
    socket.emit('job-stats', stats);
  } catch (error) {
    logger.error('Error sending job stats', {
      socketId: socket.id,
      error: error.message
    });
    socket.emit('error', {
      message: 'Failed to fetch job statistics'
    });
  }
};

/**
 * Broadcast job statistics to all connected clients
 */
const broadcastJobStats = async () => {
  if (!io) return;

  try {
    const stats = await jobService.getJobStats();
    io.to('job-updates').emit('job-stats', stats);
    
    logger.debug('Job stats broadcasted', {
      connectedClients: io.engine.clientsCount
    });
  } catch (error) {
    logger.error('Error broadcasting job stats', {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Start periodic job stats broadcast
 */
const startJobStatsInterval = () => {
  // Broadcast job stats every 5 seconds
  const intervalMs = parseInt(process.env.JOB_STATS_INTERVAL_MS) || 5000;
  
  jobStatsInterval = setInterval(() => {
    broadcastJobStats();
  }, intervalMs);

  logger.info('Job stats interval started', {
    intervalMs
  });
};

/**
 * Stop periodic job stats broadcast
 */
const stopJobStatsInterval = () => {
  if (jobStatsInterval) {
    clearInterval(jobStatsInterval);
    jobStatsInterval = null;
    logger.info('Job stats interval stopped');
  }
};

/**
 * Emit job update event
 * @param {Object} job - Job data
 * @param {String} event - Event type (created, updated, completed, failed)
 */
const emitJobUpdate = (job, event) => {
  if (!io) return;

  io.to('job-updates').emit('job-update', {
    event,
    job,
    timestamp: new Date().toISOString()
  });

  logger.debug('Job update emitted', {
    event,
    jobId: job.id,
    status: job.status
  });
};

/**
 * Emit job alert
 * @param {Object} alert - Alert data
 */
const emitJobAlert = (alert) => {
  if (!io) return;

  io.to('job-updates').emit('job-alert', {
    ...alert,
    timestamp: new Date().toISOString()
  });

  logger.info('Job alert emitted', {
    type: alert.type,
    severity: alert.severity
  });
};

/**
 * Get WebSocket server instance
 */
const getIO = () => io;

/**
 * Close WebSocket server
 */
const closeWebSocket = () => {
  stopJobStatsInterval();
  
  if (io) {
    io.close();
    io = null;
    logger.info('WebSocket server closed');
  }
};

module.exports = {
  initializeWebSocket,
  broadcastJobStats,
  emitJobUpdate,
  emitJobAlert,
  getIO,
  closeWebSocket
};

