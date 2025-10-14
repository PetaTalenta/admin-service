/**
 * Phase 5 Testing Script
 * Real-time Features & Optimization
 * 
 * Tests:
 * 1. System Health Monitoring
 * 2. System Metrics
 * 3. Alert Management
 * 4. Cache Performance
 * 5. WebSocket Real-time Updates
 */

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
let ADMIN_TOKEN = 'test-admin-token'; // Will be replaced after login

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Login to get admin token
 */
async function login() {
  console.log('\n=== Authenticating Admin User ===');
  try {
    const response = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'admin@futureguide.id',
      password: 'admin123'
    });

    if (response.data.success && response.data.data.token) {
      ADMIN_TOKEN = response.data.data.token;
      logTest('Admin Login', true, 'Token obtained successfully');
      return true;
    } else {
      logTest('Admin Login', false, 'No token in response');
      return false;
    }
  } catch (error) {
    // If login fails, continue with test token (for testing without auth-service)
    logTest('Admin Login', false, `${error.message} - continuing with test token`);
    return true; // Continue anyway for testing
  }
}

/**
 * Log test result
 */
function logTest(name, passed, message = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m - ${name}`);
  if (message) {
    console.log(`  ${message}`);
  }
  
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

/**
 * Test 1: System Health Endpoint
 */
async function testSystemHealth() {
  console.log('\n=== Test 1: System Health Monitoring ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/system/health`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    const passed = response.status === 200 && 
                   response.data.success === true &&
                   response.data.data.status !== undefined;

    logTest('System Health Endpoint', passed, 
      passed ? `Status: ${response.data.data.status}` : 'Invalid response structure');

    // Check health components
    if (response.data.data.database) {
      logTest('Database Health Check', true, 
        `Auth: ${response.data.data.database.auth?.status}, Archive: ${response.data.data.database.archive?.status}`);
    }

    if (response.data.data.cache) {
      logTest('Cache Health Check', true, 
        `Status: ${response.data.data.cache.status}`);
    }

    if (response.data.data.resources) {
      logTest('System Resources Check', true, 
        `Memory Usage: ${response.data.data.resources.memory?.usagePercent}%`);
    }

    return passed;
  } catch (error) {
    logTest('System Health Endpoint', false, error.message);
    return false;
  }
}

/**
 * Test 2: System Metrics
 */
async function testSystemMetrics() {
  console.log('\n=== Test 2: System Metrics ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/system/metrics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    const passed = response.status === 200 && 
                   response.data.success === true &&
                   response.data.data.jobs !== undefined;

    logTest('System Metrics Endpoint', passed);

    if (response.data.data.jobs) {
      logTest('Job Metrics Available', true, 
        `Total Jobs: ${response.data.data.jobs.total_jobs || 0}`);
    }

    if (response.data.data.users) {
      logTest('User Metrics Available', true, 
        `Total Users: ${response.data.data.users.total_users || 0}`);
    }

    if (response.data.data.chat) {
      logTest('Chat Metrics Available', true, 
        `Total Conversations: ${response.data.data.chat.total_conversations || 0}`);
    }

    return passed;
  } catch (error) {
    logTest('System Metrics Endpoint', false, error.message);
    return false;
  }
}

/**
 * Test 3: Database Health
 */
async function testDatabaseHealth() {
  console.log('\n=== Test 3: Database Health ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/system/database`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    const passed = response.status === 200 && 
                   response.data.success === true;

    logTest('Database Health Endpoint', passed);

    if (response.data.data) {
      const schemas = ['auth', 'archive', 'chat'];
      schemas.forEach(schema => {
        if (response.data.data[schema]) {
          logTest(`${schema.toUpperCase()} Schema Health`, 
            response.data.data[schema].status === 'healthy',
            `Response Time: ${response.data.data[schema].responseTime}`);
        }
      });
    }

    return passed;
  } catch (error) {
    logTest('Database Health Endpoint', false, error.message);
    return false;
  }
}

/**
 * Test 4: Alert Management
 */
async function testAlertManagement() {
  console.log('\n=== Test 4: Alert Management ===');
  
  try {
    // Get alerts
    const getResponse = await axios.get(`${BASE_URL}/admin/system/alerts`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    logTest('Get Alerts Endpoint', 
      getResponse.status === 200 && getResponse.data.success === true);

    // Get alert stats
    const statsResponse = await axios.get(`${BASE_URL}/admin/system/alerts/stats`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    logTest('Alert Statistics Endpoint', 
      statsResponse.status === 200 && statsResponse.data.success === true,
      `Total Alerts: ${statsResponse.data.data?.total || 0}`);

    // Create test alert (only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const createResponse = await axios.post(`${BASE_URL}/admin/system/alerts/test`, {
          type: 'system',
          severity: 'info',
          title: 'Test Alert',
          message: 'This is a test alert from Phase 5 testing'
        }, {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });

        logTest('Create Test Alert', 
          createResponse.status === 200 && createResponse.data.success === true);
      } catch (error) {
        logTest('Create Test Alert', false, 'Test alert endpoint not available');
      }
    }

    return true;
  } catch (error) {
    logTest('Alert Management', false, error.message);
    return false;
  }
}

/**
 * Test 5: Cache Performance
 */
async function testCachePerformance() {
  console.log('\n=== Test 5: Cache Performance ===');
  
  try {
    // First request (cache miss)
    const start1 = Date.now();
    const response1 = await axios.get(`${BASE_URL}/admin/users?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    const time1 = Date.now() - start1;

    const cacheStatus1 = response1.headers['x-cache'];
    logTest('First Request (Cache Miss)', 
      response1.status === 200,
      `Time: ${time1}ms, Cache: ${cacheStatus1 || 'N/A'}`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second request (should be cache hit if Redis is available)
    const start2 = Date.now();
    const response2 = await axios.get(`${BASE_URL}/admin/users?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    const time2 = Date.now() - start2;

    const cacheStatus2 = response2.headers['x-cache'];
    logTest('Second Request (Potential Cache Hit)', 
      response2.status === 200,
      `Time: ${time2}ms, Cache: ${cacheStatus2 || 'N/A'}`);

    // Check if cache improved performance
    if (cacheStatus2 === 'HIT' && time2 < time1) {
      logTest('Cache Performance Improvement', true, 
        `Improved by ${((1 - time2/time1) * 100).toFixed(1)}%`);
    } else {
      logTest('Cache Performance Improvement', false, 
        'Cache not available or no improvement detected');
    }

    return true;
  } catch (error) {
    logTest('Cache Performance Test', false, error.message);
    return false;
  }
}

/**
 * Test 6: WebSocket Real-time Updates
 */
async function testWebSocketUpdates() {
  console.log('\n=== Test 6: WebSocket Real-time Updates ===');
  
  return new Promise((resolve) => {
    try {
      const socket = io(BASE_URL, {
        path: '/admin/socket.io',
        auth: { token: ADMIN_TOKEN },
        transports: ['websocket']
      });

      let connected = false;
      let receivedUpdate = false;

      socket.on('connect', () => {
        connected = true;
        logTest('WebSocket Connection', true, `Socket ID: ${socket.id}`);

        // Subscribe to system updates
        socket.emit('subscribe:system');
        socket.emit('subscribe:alerts');

        // Wait for updates
        setTimeout(() => {
          if (!receivedUpdate) {
            logTest('WebSocket Real-time Updates', false, 'No updates received within timeout');
          }
          socket.disconnect();
          resolve(connected);
        }, 3000);
      });

      socket.on('alert:new', (data) => {
        receivedUpdate = true;
        logTest('Alert Update Received', true, `Alert: ${data.title}`);
      });

      socket.on('connect_error', (error) => {
        logTest('WebSocket Connection', false, error.message);
        resolve(false);
      });

      socket.on('disconnect', () => {
        if (connected) {
          logTest('WebSocket Disconnect', true, 'Clean disconnect');
        }
      });

    } catch (error) {
      logTest('WebSocket Test', false, error.message);
      resolve(false);
    }
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Phase 5 Testing: Real-time Features & Optimization   ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Login first
  await login();

  await testSystemHealth();
  await testSystemMetrics();
  await testDatabaseHealth();
  await testAlertManagement();
  await testCachePerformance();
  await testWebSocketUpdates();

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`\x1b[32mPassed: ${results.passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${results.failed}\x1b[0m`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});

