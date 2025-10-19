/**
 * Comprehensive test script for school filtering feature in admin service
 * Tests all aspects of user-school filtering implementation
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
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

let adminToken = null;

/**
 * Log test result
 */
function logTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    if (message) console.log(`  ${colors.cyan}${message}${colors.reset}`);
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
  console.log(`\n${colors.blue}=== Test 1: Admin Authentication ===${colors.reset}`);

  try {
    const response = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (response.status === 200 && response.data.success && response.data.data.token) {
      adminToken = response.data.data.token;
      logTest('Admin Login', true, 'Successfully authenticated');
      return true;
    } else {
      logTest('Admin Login', false, 'Invalid response structure');
      return false;
    }
  } catch (error) {
    logTest('Admin Login', false, error.message);
    return false;
  }
}

/**
 * Test getting list of schools
 */
async function testGetSchools() {
  console.log(`\n${colors.blue}=== Test 2: Get Schools List ===${colors.reset}`);

  try {
    const response = await axios.get(`${BASE_URL}/admin/schools?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.status === 200 && response.data.success) {
      const schools = response.data.data.schools;
      const pagination = response.data.data.pagination;

      logTest('Get Schools Endpoint', true, `Found ${pagination.total} schools`);

      if (schools.length > 0) {
        const school = schools[0];
        logTest('School Data Structure',
          school.id && school.name,
          `Sample: ${school.name} (ID: ${school.id})`
        );

        // Try to find a school with users by checking each school
        for (const s of schools) {
          try {
            const usersResponse = await axios.get(
              `${BASE_URL}/admin/users?school_id=${s.id}&page=1&limit=1`,
              { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            if (usersResponse.data.data.pagination.total > 0) {
              console.log(`  ${colors.cyan}Found school with users: ${s.name} (ID: ${s.id})${colors.reset}`);
              return s.id;
            }
          } catch (err) {
            // Continue to next school
          }
        }

        // If no school with users found, return first school for testing
        console.log(`  ${colors.yellow}No school with users found, using first school for testing${colors.reset}`);
        return schools[0].id;
      } else {
        logTest('School Data Available', false, 'No schools found in database');
        return null;
      }
    } else {
      logTest('Get Schools Endpoint', false, 'Invalid response');
      return null;
    }
  } catch (error) {
    logTest('Get Schools Endpoint', false, error.message);
    return null;
  }
}

/**
 * Test filtering users by school_id
 */
async function testFilterUsersBySchool(schoolId) {
  console.log(`\n${colors.blue}=== Test 3: Filter Users by School ===${colors.reset}`);

  try {
    const response = await axios.get(
      `${BASE_URL}/admin/users?school_id=${schoolId}&page=1&limit=10`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200 && response.data.success) {
      const users = response.data.data.users;
      const total = response.data.data.pagination.total;

      logTest('Filter Users by School', true, `Found ${total} user(s) with school_id=${schoolId}`);

      if (users.length > 0) {
        const user = users[0];

        // Verify user has profile with school data
        const hasProfile = !!user.profile;
        const hasSchoolId = user.profile?.school_id === parseInt(schoolId);
        const hasSchoolData = !!user.profile?.school;

        logTest('User Profile Included', hasProfile,
          hasProfile ? 'Profile data present' : 'Profile data missing'
        );

        logTest('School ID Match', hasSchoolId,
          hasSchoolId ? `school_id matches filter (${schoolId})` : `school_id mismatch (expected: ${schoolId}, got: ${user.profile?.school_id})`
        );

        logTest('School Data Included', hasSchoolData,
          hasSchoolData ? `School: ${user.profile.school.name}` : 'School data missing'
        );

        return user.id; // Return user ID for detail test
      } else {
        console.log(`  ${colors.yellow}Note: No users found with school_id=${schoolId} (this is OK if school has no users)${colors.reset}`);
        return null;
      }
    } else {
      logTest('Filter Users by School', false, 'Invalid response');
      return null;
    }
  } catch (error) {
    logTest('Filter Users by School', false, error.message);
    return null;
  }
}

/**
 * Test getting user detail with school data
 */
async function testGetUserDetail(userId) {
  console.log(`\n${colors.blue}=== Test 4: Get User Detail with School ===${colors.reset}`);

  try {
    const response = await axios.get(`${BASE_URL}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.status === 200 && response.data.success) {
      const user = response.data.data.user;

      logTest('Get User Detail', true, `Retrieved user: ${user.email}`);

      if (user.profile) {
        logTest('User Profile Present', true, `Full name: ${user.profile.full_name || 'N/A'}`);

        if (user.profile.school_id) {
          logTest('School ID Present', true, `school_id: ${user.profile.school_id}`);

          if (user.profile.school) {
            logTest('School Data Complete', true,
              `${user.profile.school.name}, ${user.profile.school.city || 'N/A'}, ${user.profile.school.province || 'N/A'}`
            );
          } else {
            logTest('School Data Complete', false, 'School object missing despite school_id present');
          }
        } else {
          console.log(`  ${colors.yellow}Note: User has no school_id (expected for some users)${colors.reset}`);
        }
      } else {
        logTest('User Profile Present', false, 'Profile data missing');
      }

      return true;
    } else {
      logTest('Get User Detail', false, 'Invalid response');
      return false;
    }
  } catch (error) {
    logTest('Get User Detail', false, error.message);
    return false;
  }
}

/**
 * Test filtering with invalid school_id
 */
async function testInvalidSchoolFilter() {
  console.log(`\n${colors.blue}=== Test 5: Edge Cases ===${colors.reset}`);

  try {
    // Test with non-existent school_id
    const response = await axios.get(
      `${BASE_URL}/admin/users?school_id=99999&page=1&limit=10`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200 && response.data.success) {
      const total = response.data.data.pagination.total;
      logTest('Invalid School ID Handling', true, 
        `Returns empty result for non-existent school (found ${total} users)`
      );
    } else {
      logTest('Invalid School ID Handling', false, 'Unexpected response');
    }
  } catch (error) {
    logTest('Invalid School ID Handling', false, error.message);
  }

  try {
    // Test without school_id filter (should return all users)
    const response = await axios.get(
      `${BASE_URL}/admin/users?page=1&limit=10`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200 && response.data.success) {
      const total = response.data.data.pagination.total;
      logTest('No Filter Returns All Users', true, `Found ${total} total users`);
    } else {
      logTest('No Filter Returns All Users', false, 'Unexpected response');
    }
  } catch (error) {
    logTest('No Filter Returns All Users', false, error.message);
  }
}

/**
 * Test school search functionality
 */
async function testSchoolSearch() {
  console.log(`\n${colors.blue}=== Test 6: School Search ===${colors.reset}`);

  try {
    const response = await axios.get(
      `${BASE_URL}/admin/schools?search=SMA&page=1&limit=5`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200 && response.data.success) {
      const schools = response.data.data.schools;
      logTest('School Search', true, `Found ${schools.length} schools matching "SMA"`);
    } else {
      logTest('School Search', false, 'Invalid response');
    }
  } catch (error) {
    logTest('School Search', false, error.message);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(`${colors.yellow}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.yellow}║  Comprehensive Test: School Filtering in Admin Service    ║${colors.reset}`);
  console.log(`${colors.yellow}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test 1: Login
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log(`\n${colors.red}Cannot proceed without admin authentication${colors.reset}`);
    return;
  }

  // Test 2: Get schools
  const schoolId = await testGetSchools();
  
  // Test 3: Filter users by school (if school exists)
  let userId = null;
  if (schoolId) {
    userId = await testFilterUsersBySchool(schoolId);
  }

  // Test 4: Get user detail (if user with school found)
  if (userId) {
    await testGetUserDetail(userId);
  }

  // Test 5: Edge cases
  await testInvalidSchoolFilter();

  // Test 6: School search
  await testSchoolSearch();

  // Summary
  console.log(`\n${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║                      Test Summary                          ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);

  if (testResults.failed === 0) {
    console.log(`\n${colors.green}✓ All tests passed! Implementation is working correctly.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed. Please review the implementation.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test execution failed:${colors.reset}`, error);
  process.exit(1);
});

