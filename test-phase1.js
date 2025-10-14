/**
 * Phase 1 Testing Script for Admin Service
 * Tests all Phase 1 endpoints and functionality
 */

const axios = require('axios');

const BASE_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3000/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

/**
 * Log test result
 */
function logTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (message) console.log(`  ${colors.red}${message}${colors.reset}`);
  }
}

/**
 * Test health endpoints
 */
async function testHealthEndpoints() {
  console.log(`\n${colors.blue}=== Testing Health Endpoints ===${colors.reset}`);

  // Test basic health
  try {
    const response = await axios.get(`${BASE_URL}/admin/health`);
    logTest('GET /admin/health', response.status === 200 && response.data.success);
  } catch (error) {
    logTest('GET /admin/health', false, error.message);
  }

  // Test detailed health
  try {
    const response = await axios.get(`${BASE_URL}/admin/health/detailed`);
    const hasDbHealth = response.data.data.database !== undefined;
    logTest('GET /admin/health/detailed', response.status === 200 && hasDbHealth);
  } catch (error) {
    logTest('GET /admin/health/detailed', false, error.message);
  }

  // Test readiness probe
  try {
    const response = await axios.get(`${BASE_URL}/admin/health/ready`);
    logTest('GET /admin/health/ready', response.status === 200);
  } catch (error) {
    logTest('GET /admin/health/ready', false, error.message);
  }

  // Test liveness probe
  try {
    const response = await axios.get(`${BASE_URL}/admin/health/live`);
    logTest('GET /admin/health/live', response.status === 200);
  } catch (error) {
    logTest('GET /admin/health/live', false, error.message);
  }
}

/**
 * Test authentication endpoints
 */
async function testAuthEndpoints() {
  console.log(`\n${colors.blue}=== Testing Authentication Endpoints ===${colors.reset}`);

  let adminToken = null;

  // Test login with invalid credentials
  try {
    await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'invalid@test.com',
      password: 'wrongpassword'
    });
    logTest('POST /admin/auth/login (invalid credentials)', false, 'Should have returned 401');
  } catch (error) {
    logTest('POST /admin/auth/login (invalid credentials)', error.response?.status === 401);
  }

  // Test login with valid admin credentials (requires actual admin user)
  console.log(`\n${colors.yellow}Note: Skipping valid admin login test (requires actual admin user in database)${colors.reset}`);
  console.log(`${colors.yellow}To test manually, use: curl -X POST ${BASE_URL}/admin/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"password"}'${colors.reset}`);

  // Test verify without token
  try {
    await axios.get(`${BASE_URL}/admin/auth/verify`);
    logTest('GET /admin/auth/verify (no token)', false, 'Should have returned 401');
  } catch (error) {
    logTest('GET /admin/auth/verify (no token)', error.response?.status === 401);
  }

  // Test logout without token
  try {
    await axios.post(`${BASE_URL}/admin/auth/logout`);
    logTest('POST /admin/auth/logout (no token)', false, 'Should have returned 401');
  } catch (error) {
    logTest('POST /admin/auth/logout (no token)', error.response?.status === 401);
  }
}

/**
 * Test validation
 */
async function testValidation() {
  console.log(`\n${colors.blue}=== Testing Input Validation ===${colors.reset}`);

  // Test login with missing email
  try {
    await axios.post(`${BASE_URL}/admin/auth/login`, {
      password: 'password123'
    });
    logTest('Validation: Missing email', false, 'Should have returned 400');
  } catch (error) {
    logTest('Validation: Missing email', error.response?.status === 400);
  }

  // Test login with invalid email format
  try {
    await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'notanemail',
      password: 'password123'
    });
    logTest('Validation: Invalid email format', false, 'Should have returned 400');
  } catch (error) {
    logTest('Validation: Invalid email format', error.response?.status === 400);
  }

  // Test login with short password
  try {
    await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'test@test.com',
      password: '123'
    });
    logTest('Validation: Short password', false, 'Should have returned 400');
  } catch (error) {
    logTest('Validation: Short password', error.response?.status === 400);
  }
}

/**
 * Test 404 handling
 */
async function test404Handling() {
  console.log(`\n${colors.blue}=== Testing 404 Handling ===${colors.reset}`);

  try {
    await axios.get(`${BASE_URL}/nonexistent-route`);
    logTest('404 for non-existent route', false, 'Should have returned 404');
  } catch (error) {
    logTest('404 for non-existent route', error.response?.status === 404);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Admin Service Phase 1 Testing Script     ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nTesting service at: ${colors.yellow}${BASE_URL}${colors.reset}\n`);

  try {
    await testHealthEndpoints();
    await testAuthEndpoints();
    await testValidation();
    await test404Handling();

    // Print summary
    console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
    
    const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    console.log(`Pass Rate: ${passRate}%`);

    if (testResults.failed === 0) {
      console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}✗ Some tests failed${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n${colors.red}Test execution failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run tests
runTests();

