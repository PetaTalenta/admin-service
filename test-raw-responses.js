/**
 * Test script to check raw_responses in job results
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@futureguide.id';
const ADMIN_PASSWORD = 'admin123';

async function testJobResults() {
  try {
    console.log('Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const token = loginResponse.data.data.token;
    console.log('Login successful');

    const jobId = '28b77c85-d7cf-40ce-9f86-aa774f4fcc8e'; // Job with raw_responses

    console.log(`Fetching results for job ${jobId}...`);
    const response = await axios.get(`${BASE_URL}/admin/jobs/${jobId}/results`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success) {
      const { result } = response.data.data;
      console.log('Result retrieved successfully');
      console.log('Raw responses present:', !!result.raw_responses);
      if (result.raw_responses) {
        console.log('Raw responses type:', typeof result.raw_responses);
        console.log('Raw responses keys:', Object.keys(result.raw_responses));
        console.log('Sample ocean data:', result.raw_responses.ocean?.slice(0, 2));
      } else {
        console.log('Raw responses is null/empty');
      }
    } else {
      console.log('Failed to retrieve results');
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testJobResults();
