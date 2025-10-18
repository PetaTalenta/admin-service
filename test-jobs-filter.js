/**
 * Comprehensive Test Script for Admin Jobs Filter
 * Tests all filter combinations to ensure filtering works correctly
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@futureguide.id';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let adminToken = '';

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
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.yellow}→ ${msg}${colors.reset}`)
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
 * Test 2: Filter by user_username
 */
async function testFilterByUsername(username) {
  log.test(`Testing filter by user_username="${username}"`);
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/jobs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: {
        page: 1,
        limit: 50,
        user_username: username,
        sort_by: 'created_at',
        sort_order: 'DESC'
      }
    });

    if (response.data.success) {
      const { jobs, pagination } = response.data.data;
      log.success(`Retrieved ${jobs.length} jobs for username "${username}"`);
      log.info(`Total: ${pagination.total}, Page: ${pagination.page}/${pagination.totalPages}`);
      
      // Verify all jobs belong to the specified username
      const allMatch = jobs.every(job => 
        job.user && job.user.username && job.user.username.toLowerCase().includes(username.toLowerCase())
      );
      
      if (allMatch) {
        log.success(`✓ All ${jobs.length} jobs belong to username "${username}"`);
        if (jobs.length > 0) {
          log.info(`Sample: ${jobs[0].user.username} (${jobs[0].user.email})`);
        }
        return true;
      } else {
        log.error(`✗ Some jobs do NOT belong to username "${username}"`);
        jobs.forEach((job, idx) => {
          if (!job.user.username.toLowerCase().includes(username.toLowerCase())) {
            log.error(`  Job ${idx}: ${job.user.username} (${job.user.email})`);
          }
        });
        return false;
      }
    } else {
      log.error('Failed to retrieve jobs');
      return false;
    }
  } catch (error) {
    log.error(`Filter test failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 3: Filter by user_email
 */
async function testFilterByEmail(email) {
  log.test(`Testing filter by user_email="${email}"`);
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/jobs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: {
        page: 1,
        limit: 50,
        user_email: email,
        sort_by: 'created_at',
        sort_order: 'DESC'
      }
    });

    if (response.data.success) {
      const { jobs, pagination } = response.data.data;
      log.success(`Retrieved ${jobs.length} jobs for email "${email}"`);
      
      const allMatch = jobs.every(job => 
        job.user && job.user.email && job.user.email.toLowerCase().includes(email.toLowerCase())
      );
      
      if (allMatch) {
        log.success(`✓ All ${jobs.length} jobs belong to email "${email}"`);
        return true;
      } else {
        log.error(`✗ Some jobs do NOT belong to email "${email}"`);
        return false;
      }
    } else {
      log.error('Failed to retrieve jobs');
      return false;
    }
  } catch (error) {
    log.error(`Filter test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Filter by status
 */
async function testFilterByStatus(status) {
  log.test(`Testing filter by status="${status}"`);
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/jobs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: {
        page: 1,
        limit: 50,
        status: status,
        sort_by: 'created_at',
        sort_order: 'DESC'
      }
    });

    if (response.data.success) {
      const { jobs, pagination } = response.data.data;
      log.success(`Retrieved ${jobs.length} jobs with status "${status}"`);
      
      const allMatch = jobs.every(job => job.status === status);
      
      if (allMatch) {
        log.success(`✓ All ${jobs.length} jobs have status "${status}"`);
        return true;
      } else {
        log.error(`✗ Some jobs do NOT have status "${status}"`);
        return false;
      }
    } else {
      log.error('Failed to retrieve jobs');
      return false;
    }
  } catch (error) {
    log.error(`Filter test failed: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('Admin Jobs Filter - Comprehensive Test Suite');
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

  // Test 2: Filter by username
  results.total++;
  if (await testFilterByUsername('rayinail')) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 3: Filter by email
  results.total++;
  if (await testFilterByEmail('kasykoi@gmail.com')) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 4: Filter by status
  results.total++;
  if (await testFilterByStatus('completed')) {
    results.passed++;
  } else {
    results.failed++;
  }

  printResults(results);
}

function printResults(results) {
  log.section('Test Results Summary');
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
}

// Run tests
runAllTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});

