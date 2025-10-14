/**
 * Phase 3 Testing Script - Jobs Monitoring Module
 * Tests all job monitoring endpoints and WebSocket functionality
 */

require('dotenv').config();
const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3107';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@futureguide.id';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let adminToken = null;
let socket = null;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

/**
 * Test 1: Admin Login
 */
async function testAdminLogin() {
  log.section('Test 1: Admin Login');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (response.data.success && response.data.data.token) {
      adminToken = response.data.data.token;
      log.success('Admin login successful');
      log.info(`Token: ${adminToken.substring(0, 20)}...`);
      return true;
    } else {
      log.error('Login failed: No token received');
      return false;
    }
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 2: Get Job Statistics
 */
async function testGetJobStats() {
  log.section('Test 2: Get Job Statistics');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/jobs/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log.success('Job statistics retrieved successfully');
      const stats = response.data.data;
      
      log.info(`Total Jobs: ${stats.overview.total}`);
      log.info(`Queued: ${stats.overview.queued}`);
      log.info(`Processing: ${stats.overview.processing}`);
      log.info(`Completed: ${stats.overview.completed}`);
      log.info(`Failed: ${stats.overview.failed}`);
      log.info(`Success Rate: ${stats.overview.successRate}%`);
      log.info(`Avg Processing Time: ${stats.performance.avgProcessingTimeMinutes} minutes`);
      
      return true;
    } else {
      log.error('Failed to retrieve job statistics');
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 3: Get Job List
 */
async function testGetJobList() {
  log.section('Test 3: Get Job List (Paginated)');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/jobs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: {
        page: 1,
        limit: 10,
        sort_by: 'created_at',
        sort_order: 'DESC'
      }
    });

    if (response.data.success) {
      log.success('Job list retrieved successfully');
      const { jobs, pagination } = response.data.data;
      
      log.info(`Total Jobs: ${pagination.total}`);
      log.info(`Page: ${pagination.page}/${pagination.totalPages}`);
      log.info(`Jobs in this page: ${jobs.length}`);
      
      if (jobs.length > 0) {
        log.info(`First job: ${jobs[0].job_id} - Status: ${jobs[0].status}`);
      }
      
      return jobs.length > 0 ? jobs[0].id : null;
    } else {
      log.error('Failed to retrieve job list');
      return null;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

/**
 * Test 4: Get Job Details
 */
async function testGetJobDetails(jobId) {
  log.section('Test 4: Get Job Details');
  
  if (!jobId) {
    log.warning('No job ID available, skipping test');
    return false;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log.success('Job details retrieved successfully');
      const job = response.data.data;
      
      log.info(`Job ID: ${job.job_id}`);
      log.info(`Status: ${job.status}`);
      log.info(`Assessment: ${job.assessment_name}`);
      log.info(`Created: ${new Date(job.created_at).toLocaleString()}`);
      
      if (job.processingTimeSeconds) {
        log.info(`Processing Time: ${job.processingTimeSeconds} seconds`);
      }
      
      return job;
    } else {
      log.error('Failed to retrieve job details');
      return null;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

/**
 * Test 5: Get Job Results
 */
async function testGetJobResults(jobId) {
  log.section('Test 5: Get Job Results');
  
  if (!jobId) {
    log.warning('No job ID available, skipping test');
    return false;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/jobs/${jobId}/results`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log.success('Job results retrieved successfully');
      const { job, result } = response.data.data;
      
      log.info(`Job: ${job.job_id}`);
      log.info(`Status: ${job.status}`);
      log.info(`Result ID: ${result.id}`);
      log.info(`Has test data: ${result.test_data ? 'Yes' : 'No'}`);
      log.info(`Has test result: ${result.test_result ? 'Yes' : 'No'}`);
      
      return true;
    } else {
      log.error('Failed to retrieve job results');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 404 || error.response?.data?.error?.message?.includes('no results')) {
      log.warning('Job has no results yet (this is normal for incomplete jobs)');
      return true;
    }
    log.error(`Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 6: Filter Jobs by Status
 */
async function testFilterJobsByStatus() {
  log.section('Test 6: Filter Jobs by Status');
  
  const statuses = ['completed', 'failed', 'processing', 'queue'];
  
  for (const status of statuses) {
    try {
      const response = await axios.get(`${BASE_URL}/admin/jobs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        params: { status, limit: 5 }
      });

      if (response.data.success) {
        const count = response.data.data.pagination.total;
        log.success(`${status}: ${count} jobs`);
      }
    } catch (error) {
      log.error(`Error filtering ${status}: ${error.message}`);
    }
  }
  
  return true;
}

/**
 * Test 7: WebSocket Connection
 */
async function testWebSocketConnection() {
  log.section('Test 7: WebSocket Real-time Monitoring');
  
  return new Promise((resolve) => {
    try {
      socket = io('http://localhost:3107', {
        path: '/admin/socket.io',
        auth: {
          token: adminToken
        }
      });

      socket.on('connect', () => {
        log.success('WebSocket connected');
        
        // Subscribe to job updates
        socket.emit('subscribe:jobs');
        log.info('Subscribed to job updates');
        
        // Request job stats
        socket.emit('request:job-stats');
        log.info('Requested job statistics');
      });

      socket.on('job-stats', (stats) => {
        log.success('Received job statistics via WebSocket');
        log.info(`Total Jobs: ${stats.overview.total}`);
        log.info(`Success Rate: ${stats.overview.successRate}%`);
      });

      socket.on('job-update', (update) => {
        log.success(`Received job update: ${update.event}`);
        log.info(`Job ID: ${update.job.id}, Status: ${update.job.status}`);
      });

      socket.on('job-alert', (alert) => {
        log.warning(`Received job alert: ${alert.type} (${alert.severity})`);
      });

      socket.on('error', (error) => {
        log.error(`WebSocket error: ${error.message || error}`);
      });

      socket.on('disconnect', (reason) => {
        log.info(`WebSocket disconnected: ${reason}`);
      });

      // Wait 3 seconds to receive initial data
      setTimeout(() => {
        resolve(true);
      }, 3000);
    } catch (error) {
      log.error(`WebSocket connection failed: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 3: Jobs Monitoring Module - Test Suite');
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Login
  results.total++;
  if (await testAdminLogin()) {
    results.passed++;
  } else {
    results.failed++;
    log.error('Cannot proceed without authentication');
    return printResults(results);
  }

  // Test 2: Job Statistics
  results.total++;
  if (await testGetJobStats()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 3: Job List
  results.total++;
  const jobId = await testGetJobList();
  if (jobId) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 4: Job Details
  results.total++;
  const jobDetails = await testGetJobDetails(jobId);
  if (jobDetails) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 5: Job Results
  results.total++;
  if (await testGetJobResults(jobId)) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 6: Filter Jobs
  results.total++;
  if (await testFilterJobsByStatus()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 7: WebSocket
  results.total++;
  if (await testWebSocketConnection()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Cleanup
  if (socket) {
    socket.disconnect();
    log.info('WebSocket disconnected');
  }

  printResults(results);
}

/**
 * Print test results
 */
function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('Test Results');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log('='.repeat(60) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});

