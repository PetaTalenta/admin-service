/**
 * Test script to verify admin service can retrieve school data for a user
 */

const axios = require('axios');

const BASE_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3007';
const ADMIN_EMAIL = 'admin@futureguide.id';
const ADMIN_PASSWORD = 'fgadmin321';

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
 * Login as admin
 */
async function loginAdmin() {
  console.log(`\n${colors.blue}=== Admin Login ===${colors.reset}`);

  try {
    const response = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (response.status === 200 && response.data.success && response.data.data.token) {
      logTest('Admin Login', true);
      return response.data.data.token;
    } else {
      logTest('Admin Login', false, 'Invalid response');
      return null;
    }
  } catch (error) {
    logTest('Admin Login', false, error.message);
    return null;
  }
}

/**
 * Get users list to find a user with school
 */
async function getUsersWithSchool(token) {
  console.log(`\n${colors.blue}=== Get Users with School ===${colors.reset}`);

  try {
    const response = await axios.get(`${BASE_URL}/admin/users?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 200 && response.data.success && response.data.data.users) {
      const users = response.data.data.users;
      console.log(`Found ${users.length} users`);
      
      // Debug: print first few users
      for (let i = 0; i < Math.min(3, users.length); i++) {
        const user = users[i];
        console.log(`User ${i+1}: ID=${user.id}, school_id=${user.school_id}, has_profile=${!!user.profile}, profile_school_id=${user.profile?.school_id}, has_school=${!!user.profile?.school}`);
      }
      
      // Find users with school data
      const usersWithSchool = users.filter(user =>
        user.school_id && user.profile && user.profile.school
      );
      
      if (usersWithSchool.length > 0) {
        logTest('Find Users with School', true, `Found ${usersWithSchool.length} users with school data`);
        return usersWithSchool[0]; // Return first user with school
      } else {
        logTest('Find Users with School', false, 'No users found with school data');
        return null;
      }
    } else {
      logTest('Get Users List', false, 'Invalid response');
      return null;
    }
  } catch (error) {
    logTest('Get Users List', false, error.message);
    return null;
  }
}

/**
 * Get user details by ID and verify school data
 */
async function getUserDetailsAndVerifySchool(token, userId) {
  console.log(`\n${colors.blue}=== Get User Details and Verify School ===${colors.reset}`);

  try {
    const response = await axios.get(`${BASE_URL}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 200 && response.data.success && response.data.data.user) {
      const user = response.data.data.user;

      console.log(`User ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Profile exists: ${!!user.profile}`);

      if (user.profile) {
        console.log(`School ID: ${user.profile.school_id || 'null'}`);
        console.log(`School data exists: ${!!user.profile.school}`);

        if (user.profile.school) {
          console.log(`School Name: ${user.profile.school.name}`);
          console.log(`School City: ${user.profile.school.city}`);
          console.log(`School Province: ${user.profile.school.province}`);

          logTest('User School Data Retrieval', true, `Successfully retrieved school data for user ${userId}`);
          return true;
        } else {
          logTest('User School Data Retrieval', false, 'User has school_id but no school data in response');
          return false;
        }
      } else {
        logTest('User School Data Retrieval', false, 'User has no profile data');
        return false;
      }
    } else {
      logTest('Get User Details', false, 'Invalid response');
      return false;
    }
  } catch (error) {
    logTest('Get User Details', false, error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(`${colors.yellow}Testing Admin Service: Retrieve School Data for User${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}`);

  // Step 1: Login as admin
  const token = await loginAdmin();
  if (!token) {
    console.log(`${colors.red}Cannot proceed without admin token${colors.reset}`);
    return;
  }

  // Step 2: Get users with school data
  const userWithSchool = await getUsersWithSchool(token);
  if (!userWithSchool) {
    console.log(`${colors.red}Cannot proceed without a user that has school data${colors.reset}`);
    return;
  }

  // Step 3: Get user details and verify school data
  await getUserDetailsAndVerifySchool(token, userWithSchool.id);

  // Summary
  console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);

  if (testResults.failed === 0) {
    console.log(`${colors.green}All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.red}Some tests failed.${colors.reset}`);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test execution failed:${colors.reset}`, error);
  process.exit(1);
});
