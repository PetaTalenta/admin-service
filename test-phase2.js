/**
 * Phase 2 Testing Script - User Management Module
 * 
 * This script tests all Phase 2 endpoints:
 * 1. User List & Search
 * 2. User Details
 * 3. User Update
 * 4. Token Management
 * 5. User Jobs
 * 6. User Conversations
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@futureguide.id';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let adminToken = '';
let testUserId = '';

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
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}→ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`)
};

/**
 * Test admin login
 */
async function testAdminLogin() {
  log.test('Testing admin login...');
  try {
    const response = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (response.data.success && response.data.data.token) {
      adminToken = response.data.data.token;
      log.success('Admin login successful');
      return true;
    } else {
      log.error('Admin login failed: No token received');
      return false;
    }
  } catch (error) {
    log.error(`Admin login failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test get users list
 */
async function testGetUsers() {
  log.test('Testing GET /admin/users...');
  try {
    const response = await axios.get(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, limit: 10 }
    });

    if (response.data.success && response.data.data.users) {
      log.success(`Users list retrieved: ${response.data.data.users.length} users`);
      log.info(`Total users: ${response.data.data.pagination.total}`);
      
      // Store first user ID for subsequent tests
      if (response.data.data.users.length > 0) {
        testUserId = response.data.data.users[0].id;
        log.info(`Test user ID: ${testUserId}`);
      }
      return true;
    } else {
      log.error('Failed to retrieve users list');
      return false;
    }
  } catch (error) {
    log.error(`GET /admin/users failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test search users
 */
async function testSearchUsers() {
  log.test('Testing user search...');
  try {
    const response = await axios.get(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { search: 'test', page: 1, limit: 10 }
    });

    if (response.data.success) {
      log.success(`User search successful: ${response.data.data.users.length} results`);
      return true;
    } else {
      log.error('User search failed');
      return false;
    }
  } catch (error) {
    log.error(`User search failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test get user by ID
 */
async function testGetUserById() {
  if (!testUserId) {
    log.warn('Skipping user details test: No test user ID available');
    return false;
  }

  log.test(`Testing GET /admin/users/${testUserId}...`);
  try {
    const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success && response.data.data.user) {
      log.success('User details retrieved successfully');
      log.info(`User email: ${response.data.data.user.email}`);
      log.info(`Jobs count: ${response.data.data.statistics.conversations}`);
      log.info(`Conversations count: ${response.data.data.statistics.conversations}`);
      return true;
    } else {
      log.error('Failed to retrieve user details');
      return false;
    }
  } catch (error) {
    log.error(`GET /admin/users/:id failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test update user
 */
async function testUpdateUser() {
  if (!testUserId) {
    log.warn('Skipping user update test: No test user ID available');
    return false;
  }

  log.test(`Testing PUT /admin/users/${testUserId}...`);
  try {
    const response = await axios.put(
      `${BASE_URL}/admin/users/${testUserId}`,
      {
        profile: {
          full_name: 'Test User Updated'
        }
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log.success('User updated successfully');
      return true;
    } else {
      log.error('Failed to update user');
      return false;
    }
  } catch (error) {
    log.error(`PUT /admin/users/:id failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test get user tokens
 */
async function testGetUserTokens() {
  if (!testUserId) {
    log.warn('Skipping user tokens test: No test user ID available');
    return false;
  }

  log.test(`Testing GET /admin/users/${testUserId}/tokens...`);
  try {
    const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/tokens`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log.success('User token history retrieved successfully');
      log.info(`Current balance: ${response.data.data.currentBalance}`);
      log.info(`History entries: ${response.data.data.history.length}`);
      return true;
    } else {
      log.error('Failed to retrieve user tokens');
      return false;
    }
  } catch (error) {
    log.error(`GET /admin/users/:id/tokens failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test update user tokens
 */
async function testUpdateUserTokens() {
  if (!testUserId) {
    log.warn('Skipping token update test: No test user ID available');
    return false;
  }

  log.test(`Testing PUT /admin/users/${testUserId}/tokens...`);
  try {
    const response = await axios.put(
      `${BASE_URL}/admin/users/${testUserId}/tokens`,
      {
        amount: 100,
        reason: 'Test token addition for Phase 2 testing'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log.success('User tokens updated successfully');
      log.info(`New balance: ${response.data.data.newBalance}`);
      return true;
    } else {
      log.error('Failed to update user tokens');
      return false;
    }
  } catch (error) {
    log.error(`PUT /admin/users/:id/tokens failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test get user jobs
 */
async function testGetUserJobs() {
  if (!testUserId) {
    log.warn('Skipping user jobs test: No test user ID available');
    return false;
  }

  log.test(`Testing GET /admin/users/${testUserId}/jobs...`);
  try {
    const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/jobs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, limit: 10 }
    });

    if (response.data.success) {
      log.success(`User jobs retrieved: ${response.data.data.jobs.length} jobs`);
      log.info(`Total jobs: ${response.data.data.pagination.total}`);
      return true;
    } else {
      log.error('Failed to retrieve user jobs');
      return false;
    }
  } catch (error) {
    log.error(`GET /admin/users/:id/jobs failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test get user conversations
 */
async function testGetUserConversations() {
  if (!testUserId) {
    log.warn('Skipping user conversations test: No test user ID available');
    return false;
  }

  log.test(`Testing GET /admin/users/${testUserId}/conversations...`);
  try {
    const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/conversations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, limit: 10 }
    });

    if (response.data.success) {
      log.success(`User conversations retrieved: ${response.data.data.conversations.length} conversations`);
      log.info(`Total conversations: ${response.data.data.pagination.total}`);
      return true;
    } else {
      log.error('Failed to retrieve user conversations');
      return false;
    }
  } catch (error) {
    log.error(`GET /admin/users/:id/conversations failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 2 Testing - User Management Module');
  console.log('='.repeat(60) + '\n');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // Test 1: Admin Login
  if (await testAdminLogin()) {
    results.passed++;
  } else {
    results.failed++;
    log.error('Cannot proceed without admin authentication');
    return printResults(results);
  }

  console.log('');

  // Test 2: Get Users List
  if (await testGetUsers()) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log('');

  // Test 3: Search Users
  if (await testSearchUsers()) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log('');

  // Test 4: Get User by ID
  if (await testGetUserById()) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log('');

  // Test 5: Update User
  if (await testUpdateUser()) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log('');

  // Test 6: Get User Tokens
  if (await testGetUserTokens()) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log('');

  // Test 7: Update User Tokens
  if (await testUpdateUserTokens()) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log('');

  // Test 8: Get User Jobs
  if (await testGetUserJobs()) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log('');

  // Test 9: Get User Conversations
  if (await testGetUserConversations()) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log('');

  printResults(results);
}

/**
 * Print test results
 */
function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('Test Results');
  console.log('='.repeat(60));
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  if (results.failed === 0) {
    log.success('All tests passed! Phase 2 implementation is complete.');
  } else {
    log.error(`${results.failed} test(s) failed. Please review the errors above.`);
  }
}

// Run tests
runTests().catch(error => {
  log.error(`Test execution failed: ${error.message}`);
  process.exit(1);
});

