#!/usr/bin/env node

/**
 * Comprehensive test script for admin jobs filter functionality
 * Tests all filter combinations and verifies correct behavior
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@futureguide.id';
const ADMIN_PASSWORD = 'admin123';

let authToken = null;

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Login and get token
async function login() {
  console.log('🔐 Logging in...');
  const response = await makeRequest('POST', '/admin/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  if (response.data && response.data.token) {
    authToken = response.data.token;
    console.log('✅ Login successful\n');
    return true;
  }
  console.error('❌ Login failed');
  return false;
}

// Test filter
async function testFilter(name, query, validator) {
  try {
    const response = await makeRequest('GET', `/admin/jobs?${query}`);
    
    if (!response.success || !response.data || !response.data.jobs) {
      console.log(`❌ ${name}: Invalid response`);
      return false;
    }

    const jobs = response.data.jobs;
    const isValid = validator(jobs);
    
    if (isValid) {
      console.log(`✅ ${name}: ${jobs.length} jobs returned, all match filter`);
      return true;
    } else {
      console.log(`❌ ${name}: Some jobs don't match filter`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('========================================');
  console.log('ADMIN JOBS FILTER COMPREHENSIVE TESTS');
  console.log('========================================\n');

  if (!await login()) {
    process.exit(1);
  }

  let passed = 0;
  let total = 0;

  // Test 1: Filter by username
  total++;
  if (await testFilter(
    'Test 1: Filter by user_username=rayinail',
    'page=1&limit=5&user_username=rayinail',
    (jobs) => jobs.every(j => j.user.username.toLowerCase().includes('rayinail'))
  )) passed++;

  // Test 2: Filter by email
  total++;
  if (await testFilter(
    'Test 2: Filter by user_email=kasykoi',
    'page=1&limit=5&user_email=kasykoi',
    (jobs) => jobs.every(j => j.user.email.toLowerCase().includes('kasykoi'))
  )) passed++;

  // Test 3: Filter by status
  total++;
  if (await testFilter(
    'Test 3: Filter by status=completed',
    'page=1&limit=5&status=completed',
    (jobs) => jobs.every(j => j.status === 'completed')
  )) passed++;

  // Test 4: Combined filters
  total++;
  if (await testFilter(
    'Test 4: Combined (user_username=rayinail + status=completed)',
    'page=1&limit=5&user_username=rayinail&status=completed',
    (jobs) => jobs.every(j => 
      j.user.username.toLowerCase().includes('rayinail') && 
      j.status === 'completed'
    )
  )) passed++;

  // Test 5: Filter by assessment_name
  total++;
  if (await testFilter(
    'Test 5: Filter by assessment_name=AI-Driven',
    'page=1&limit=5&assessment_name=AI-Driven',
    (jobs) => jobs.every(j => j.assessment_name.includes('AI-Driven'))
  )) passed++;

  // Test 6: Pagination
  total++;
  if (await testFilter(
    'Test 6: Pagination (limit=3)',
    'page=1&limit=3',
    (jobs) => jobs.length === 3
  )) passed++;

  // Test 7: Sorting DESC
  total++;
  const sortResponse = await makeRequest('GET', '/admin/jobs?page=1&limit=2&sort_by=created_at&sort_order=DESC');
  if (sortResponse.data && sortResponse.data.jobs && sortResponse.data.jobs.length === 2) {
    const first = new Date(sortResponse.data.jobs[0].created_at);
    const second = new Date(sortResponse.data.jobs[1].created_at);
    if (first >= second) {
      console.log('✅ Test 7: Sorting DESC works correctly');
      passed++;
    } else {
      console.log('❌ Test 7: Sorting DESC failed');
    }
  }

  console.log('\n========================================');
  console.log(`RESULTS: ${passed}/${total} tests passed`);
  console.log('========================================');
  
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});

