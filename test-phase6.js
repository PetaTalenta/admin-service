/**
 * Phase 6 Testing: Docker Integration & Production Reasync function authenticate() {
  try {
    log('\n=== Authentication ===', 'blue');
    const response = await axios.post(`${BASE_URL}/admin/auth/login`, ADMIN_CREDENTIALS);
    
    if (response.data.success && response.data.data && response.data.data.token) {
      adminToken = response.data.data.token;
      logTest('Admin Authentication', 'PASS', `Token obtained`);
      return true;
    } else {
      logTest('Admin Authentication', 'FAIL', 'No token in response');
      return false;
    }
  } catch (error) {
    logTest('Admin Authentication', 'FAIL', error.message);
    return false;
  }
}s test suite validates:
 * 1. End-to-end system integration
 * 2. Docker container health and performance
 * 3. API gateway integration
 * 4. Production readiness checks
 * 5. Security and performance benchmarks
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3007';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@futureguide.id',
  password: 'admin123'
};

let adminToken = null;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  log(`${statusSymbol} ${testName}: ${status}`, statusColor);
  if (details) {
    log(`   ${details}`, 'cyan');
  }
}

// Helper function to measure response time
async function measureResponseTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

// Authentication
async function authenticate() {
  try {
    log('\n=== Authentication ===', 'blue');
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, ADMIN_CREDENTIALS);
    
    if (response.data && response.data.token) {
      adminToken = response.data.token;
      logTest('Admin Authentication', 'PASS', `Token obtained`);
      return true;
    } else {
      logTest('Admin Authentication', 'FAIL', 'No token in response');
      return false;
    }
  } catch (error) {
    logTest('Admin Authentication', 'FAIL', error.message);
    return false;
  }
}

// Test 1: Docker Container Health Checks
async function testDockerHealth() {
  log('\n=== Test 1: Docker Container Health ===', 'blue');
  
  try {
    // Test admin-service health
    const { result: healthResponse, duration } = await measureResponseTime(() =>
      axios.get(`${BASE_URL}/health`)
    );
    
    if (healthResponse.status === 200 && healthResponse.data.status === 'healthy') {
      logTest('Admin Service Health Check', 'PASS', `Response time: ${duration}ms`);
    } else {
      logTest('Admin Service Health Check', 'FAIL', 'Service not healthy');
    }
    
    // Test database connectivity
    if (healthResponse.data.database && healthResponse.data.database.status === 'connected') {
      logTest('Database Connectivity', 'PASS', 'All schemas connected');
    } else {
      logTest('Database Connectivity', 'FAIL', 'Database connection issues');
    }
    
  } catch (error) {
    logTest('Docker Health Check', 'FAIL', error.message);
  }
}

// Test 2: API Gateway Integration
async function testAPIGatewayIntegration() {
  log('\n=== Test 2: API Gateway Integration ===', 'blue');
  
  try {
    // Test routing through API gateway
    const { result: response, duration } = await measureResponseTime(() =>
      axios.get(`${API_GATEWAY_URL}/api/admin/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
    );
    
    if (response.status === 200) {
      logTest('API Gateway Routing', 'PASS', `Response time: ${duration}ms`);
    } else {
      logTest('API Gateway Routing', 'FAIL', `Status: ${response.status}`);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logTest('API Gateway Integration', 'SKIP', 'API Gateway not running (direct service testing mode)');
    } else {
      logTest('API Gateway Integration', 'FAIL', error.message);
    }
  }
}

// Test 3: End-to-End User Management Flow
async function testE2EUserManagement() {
  log('\n=== Test 3: End-to-End User Management ===', 'blue');
  
  try {
    // Get users list
    const { result: usersResponse, duration: usersDuration } = await measureResponseTime(() =>
      axios.get(`${BASE_URL}/admin/users?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
    );
    
    if (usersResponse.status === 200 && usersResponse.data.users) {
      logTest('Get Users List', 'PASS', `${usersResponse.data.users.length} users, ${usersDuration}ms`);
      
      // Get first user details
      if (usersResponse.data.users.length > 0) {
        const userId = usersResponse.data.users[0].id;
        
        const { result: userResponse, duration: userDuration } = await measureResponseTime(() =>
          axios.get(`${BASE_URL}/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
          })
        );
        
        if (userResponse.status === 200) {
          logTest('Get User Details', 'PASS', `User ID: ${userId}, ${userDuration}ms`);
        }
      }
    } else {
      logTest('Get Users List', 'FAIL', 'Invalid response');
    }
    
  } catch (error) {
    logTest('E2E User Management', 'FAIL', error.message);
  }
}

// Test 4: End-to-End Jobs Monitoring Flow
async function testE2EJobsMonitoring() {
  log('\n=== Test 4: End-to-End Jobs Monitoring ===', 'blue');
  
  try {
    // Get job statistics
    const { result: statsResponse, duration: statsDuration } = await measureResponseTime(() =>
      axios.get(`${BASE_URL}/admin/jobs/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
    );
    
    if (statsResponse.status === 200 && statsResponse.data.overview) {
      logTest('Get Job Statistics', 'PASS', `Total jobs: ${statsResponse.data.overview.total}, ${statsDuration}ms`);
    } else {
      logTest('Get Job Statistics', 'FAIL', 'Invalid response');
    }
    
    // Get jobs list
    const { result: jobsResponse, duration: jobsDuration } = await measureResponseTime(() =>
      axios.get(`${BASE_URL}/admin/jobs?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
    );
    
    if (jobsResponse.status === 200 && jobsResponse.data.jobs) {
      logTest('Get Jobs List', 'PASS', `${jobsResponse.data.jobs.length} jobs, ${jobsDuration}ms`);
    } else {
      logTest('Get Jobs List', 'FAIL', 'Invalid response');
    }
    
  } catch (error) {
    logTest('E2E Jobs Monitoring', 'FAIL', error.message);
  }
}

// Test 5: End-to-End Chatbot Monitoring Flow
async function testE2EChatbotMonitoring() {
  log('\n=== Test 5: End-to-End Chatbot Monitoring ===', 'blue');
  
  try {
    // Get chatbot statistics
    const { result: statsResponse, duration: statsDuration } = await measureResponseTime(() =>
      axios.get(`${BASE_URL}/admin/chatbot/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
    );
    
    if (statsResponse.status === 200 && statsResponse.data.overview) {
      logTest('Get Chatbot Statistics', 'PASS', `Total conversations: ${statsResponse.data.overview.totalConversations}, ${statsDuration}ms`);
    } else {
      logTest('Get Chatbot Statistics', 'FAIL', 'Invalid response');
    }
    
    // Get conversations list
    const { result: convsResponse, duration: convsDuration } = await measureResponseTime(() =>
      axios.get(`${BASE_URL}/admin/conversations?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
    );
    
    if (convsResponse.status === 200 && convsResponse.data.conversations) {
      logTest('Get Conversations List', 'PASS', `${convsResponse.data.conversations.length} conversations, ${convsDuration}ms`);
    } else {
      logTest('Get Conversations List', 'FAIL', 'Invalid response');
    }
    
  } catch (error) {
    logTest('E2E Chatbot Monitoring', 'FAIL', error.message);
  }
}

// Test 6: Performance Benchmarks
async function testPerformanceBenchmarks() {
  log('\n=== Test 6: Performance Benchmarks ===', 'blue');
  
  const endpoints = [
    { name: 'System Health', url: `${BASE_URL}/admin/system/health`, target: 50 },
    { name: 'System Metrics', url: `${BASE_URL}/admin/system/metrics`, target: 100 },
    { name: 'Job Statistics', url: `${BASE_URL}/admin/jobs/stats`, target: 600 },
    { name: 'User List', url: `${BASE_URL}/admin/users?page=1&limit=20`, target: 500 }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const { duration } = await measureResponseTime(() =>
        axios.get(endpoint.url, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      
      const status = duration <= endpoint.target ? 'PASS' : 'WARN';
      logTest(`${endpoint.name} Performance`, status, `${duration}ms (target: <${endpoint.target}ms)`);
      
    } catch (error) {
      logTest(`${endpoint.name} Performance`, 'FAIL', error.message);
    }
  }
}

// Test 7: Security Checks
async function testSecurityChecks() {
  log('\n=== Test 7: Security Checks ===', 'blue');
  
  try {
    // Test without authentication
    try {
      await axios.get(`${BASE_URL}/admin/users`);
      logTest('Authentication Required', 'FAIL', 'Endpoint accessible without token');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logTest('Authentication Required', 'PASS', '401 Unauthorized returned');
      } else {
        logTest('Authentication Required', 'FAIL', error.message);
      }
    }
    
    // Test with invalid token
    try {
      await axios.get(`${BASE_URL}/admin/users`, {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      logTest('Invalid Token Rejection', 'FAIL', 'Invalid token accepted');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logTest('Invalid Token Rejection', 'PASS', '401 Unauthorized returned');
      } else {
        logTest('Invalid Token Rejection', 'FAIL', error.message);
      }
    }
    
  } catch (error) {
    logTest('Security Checks', 'FAIL', error.message);
  }
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Phase 6: Docker Integration & Production Readiness Test  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\nTest Configuration:`, 'yellow');
  log(`  Base URL: ${BASE_URL}`);
  log(`  API Gateway URL: ${API_GATEWAY_URL}`);
  log(`  Auth Service URL: ${AUTH_SERVICE_URL}`);
  
  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    log('\n❌ Authentication failed. Cannot proceed with tests.', 'red');
    process.exit(1);
  }
  
  // Run all tests
  await testDockerHealth();
  await testAPIGatewayIntegration();
  await testE2EUserManagement();
  await testE2EJobsMonitoring();
  await testE2EChatbotMonitoring();
  await testPerformanceBenchmarks();
  await testSecurityChecks();
  
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    Testing Complete                        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});

