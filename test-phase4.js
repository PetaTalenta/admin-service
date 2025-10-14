/**
 * Phase 4 Testing Script - Chatbot Monitoring Module
 * Tests all chatbot monitoring endpoints
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3107';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@futureguide.id';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

let authToken = '';
let testConversationId = '';

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

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(message, 'blue');
  log('='.repeat(60), 'blue');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Admin Login
 */
async function testLogin() {
  logSection('Test 1: Admin Login');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      logSuccess('Admin login successful');
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logError('Login failed: No token received');
      return false;
    }
  } catch (error) {
    logError(`Login failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 2: Get Chatbot Statistics
 */
async function testGetChatbotStats() {
  logSection('Test 2: Get Chatbot Statistics');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/chatbot/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const stats = response.data.data;
      logSuccess('Chatbot statistics retrieved successfully');
      logInfo(`Total Conversations: ${stats.overview.totalConversations}`);
      logInfo(`Total Messages: ${stats.overview.totalMessages}`);
      logInfo(`Active Conversations: ${stats.overview.activeConversations}`);
      logInfo(`Avg Messages/Conversation: ${stats.overview.avgMessagesPerConversation}`);
      logInfo(`Today's Conversations: ${stats.today.conversations}`);
      logInfo(`Today's Messages: ${stats.today.messages}`);
      logInfo(`Avg Response Time: ${stats.performance.avgResponseTimeMs}ms`);
      logInfo(`Total Tokens Used: ${stats.tokenUsage.totalTokens}`);
      
      if (stats.modelUsage && stats.modelUsage.length > 0) {
        logInfo(`\nModel Usage:`);
        stats.modelUsage.forEach(model => {
          logInfo(`  - ${model.model}: ${model.count} uses, ${model.totalTokens} tokens`);
        });
      }
      
      return true;
    } else {
      logError('Failed to retrieve chatbot statistics');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 3: Get Conversations List
 */
async function testGetConversations() {
  logSection('Test 3: Get Conversations List');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/conversations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        page: 1,
        limit: 10
      }
    });

    if (response.data.success) {
      const result = response.data.data;
      logSuccess('Conversations list retrieved successfully');
      logInfo(`Total Conversations: ${result.pagination.total}`);
      logInfo(`Page: ${result.pagination.page}/${result.pagination.totalPages}`);
      logInfo(`Conversations on this page: ${result.conversations.length}`);
      
      if (result.conversations.length > 0) {
        testConversationId = result.conversations[0].id;
        logInfo(`\nFirst conversation:`);
        logInfo(`  ID: ${result.conversations[0].id}`);
        logInfo(`  Title: ${result.conversations[0].title}`);
        logInfo(`  Status: ${result.conversations[0].status}`);
        logInfo(`  Message Count: ${result.conversations[0].messageCount}`);
        logInfo(`  Created: ${result.conversations[0].created_at}`);
      }
      
      return true;
    } else {
      logError('Failed to retrieve conversations list');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 4: Get Conversations with Filters
 */
async function testGetConversationsWithFilters() {
  logSection('Test 4: Get Conversations with Filters');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/conversations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        page: 1,
        limit: 5,
        status: 'active',
        sort_by: 'created_at',
        sort_order: 'DESC'
      }
    });

    if (response.data.success) {
      const result = response.data.data;
      logSuccess('Filtered conversations retrieved successfully');
      logInfo(`Active Conversations: ${result.pagination.total}`);
      logInfo(`Conversations on this page: ${result.conversations.length}`);
      return true;
    } else {
      logError('Failed to retrieve filtered conversations');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 5: Get Conversation Details
 */
async function testGetConversationDetails() {
  logSection('Test 5: Get Conversation Details');
  
  if (!testConversationId) {
    logError('No conversation ID available for testing');
    return false;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/conversations/${testConversationId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const conversation = response.data.data;
      logSuccess('Conversation details retrieved successfully');
      logInfo(`ID: ${conversation.id}`);
      logInfo(`Title: ${conversation.title}`);
      logInfo(`Status: ${conversation.status}`);
      logInfo(`Context Type: ${conversation.context_type}`);
      logInfo(`Message Count: ${conversation.messageCount}`);
      logInfo(`Total Tokens: ${conversation.totalTokens}`);
      logInfo(`Total Cost: ${conversation.totalCost}`);
      logInfo(`Created: ${conversation.created_at}`);
      
      if (conversation.user) {
        logInfo(`User: ${conversation.user.email || conversation.user.username}`);
      }
      
      return true;
    } else {
      logError('Failed to retrieve conversation details');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 6: Get Conversation Chats
 */
async function testGetConversationChats() {
  logSection('Test 6: Get Conversation Chats');
  
  if (!testConversationId) {
    logError('No conversation ID available for testing');
    return false;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/conversations/${testConversationId}/chats`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        page: 1,
        limit: 20
      }
    });

    if (response.data.success) {
      const result = response.data.data;
      logSuccess('Conversation chats retrieved successfully');
      logInfo(`Conversation: ${result.conversation.title}`);
      logInfo(`Total Messages: ${result.pagination.total}`);
      logInfo(`Messages on this page: ${result.messages.length}`);
      
      if (result.messages.length > 0) {
        logInfo(`\nFirst few messages:`);
        result.messages.slice(0, 3).forEach((msg, idx) => {
          logInfo(`  ${idx + 1}. [${msg.sender_type}] ${msg.content.substring(0, 50)}...`);
          if (msg.usage) {
            logInfo(`     Model: ${msg.usage.model_used}, Tokens: ${msg.usage.total_tokens}`);
          }
        });
      }
      
      return true;
    } else {
      logError('Failed to retrieve conversation chats');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Test 7: Get Models Information
 */
async function testGetModels() {
  logSection('Test 7: Get Models Information');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/chatbot/models`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const result = response.data.data;
      logSuccess('Models information retrieved successfully');
      logInfo(`Total Models: ${result.summary.totalModels}`);
      logInfo(`Total Usage: ${result.summary.totalUsage}`);
      logInfo(`Free Model Usage: ${result.summary.freeModelUsage} (${result.summary.freeModelPercentage}%)`);
      logInfo(`Paid Model Usage: ${result.summary.paidModelUsage}`);
      
      if (result.models && result.models.length > 0) {
        logInfo(`\nTop Models:`);
        result.models.slice(0, 5).forEach((model, idx) => {
          logInfo(`  ${idx + 1}. ${model.model}`);
          logInfo(`     Usage: ${model.usageCount}, Tokens: ${model.totalTokens}`);
          logInfo(`     Avg Processing: ${model.avgProcessingTimeMs.toFixed(2)}ms`);
          logInfo(`     Free: ${model.isFreeModel ? 'Yes' : 'No'}`);
        });
      }
      
      return true;
    } else {
      logError('Failed to retrieve models information');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║     PHASE 4 - CHATBOT MONITORING MODULE TEST SUITE        ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 7
  };

  // Test 1: Login
  if (await testLogin()) {
    results.passed++;
  } else {
    results.failed++;
    logError('Login failed. Cannot proceed with other tests.');
    return results;
  }

  await sleep(500);

  // Test 2: Get Chatbot Statistics
  if (await testGetChatbotStats()) {
    results.passed++;
  } else {
    results.failed++;
  }

  await sleep(500);

  // Test 3: Get Conversations List
  if (await testGetConversations()) {
    results.passed++;
  } else {
    results.failed++;
  }

  await sleep(500);

  // Test 4: Get Conversations with Filters
  if (await testGetConversationsWithFilters()) {
    results.passed++;
  } else {
    results.failed++;
  }

  await sleep(500);

  // Test 5: Get Conversation Details
  if (await testGetConversationDetails()) {
    results.passed++;
  } else {
    results.failed++;
  }

  await sleep(500);

  // Test 6: Get Conversation Chats
  if (await testGetConversationChats()) {
    results.passed++;
  } else {
    results.failed++;
  }

  await sleep(500);

  // Test 7: Get Models Information
  if (await testGetModels()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Print summary
  logSection('Test Summary');
  log(`Total Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`, 
      results.failed > 0 ? 'yellow' : 'green');

  if (results.failed === 0) {
    log('\n🎉 All tests passed! Phase 4 implementation is complete.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
  }

  return results;
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});

