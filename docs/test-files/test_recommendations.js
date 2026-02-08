/**
 * Test script for Enhanced Recommendation System
 * Tests strict filtering: interests, age, group type
 */

// Use built-in fetch if available (Node 18+), otherwise require node-fetch
let fetch;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    fetch = require('node-fetch');
  }
} catch (e) {
  fetch = require('node-fetch');
}

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/tours/recommend`;

// Helper function to make recommendation requests
async function testRecommendation(testName, userProfile, selectedFloor = 'ground') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${testName}`);
  console.log(`${'='.repeat(60)}`);
  console.log('📋 User Profile:', JSON.stringify(userProfile, null, 2));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userProfile,
        selectedFloor,
        globalTimeBudget: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      console.log('Error details:', error);
      return null;
    }

    const data = await response.json();
    
    console.log(`\n✅ Success! Received ${data.exhibits?.length || 0} recommendations`);
    console.log(`⏱️  Time Budget: ${data.timeBudget} minutes, Used: ${data.totalTime} minutes`);
    
    if (data.exhibits && data.exhibits.length > 0) {
      console.log('\n📊 Top Recommendations:');
      data.exhibits.slice(0, 5).forEach((ex, idx) => {
        console.log(`\n${idx + 1}. ${ex.name}`);
        console.log(`   Score: ${ex.score?.toFixed(2) || 'N/A'}`);
        console.log(`   Category: ${ex.category || 'N/A'}`);
        console.log(`   Time: ${ex.averageTime} minutes`);
        if (ex.reasons && ex.reasons.length > 0) {
          console.log(`   Reasons: ${ex.reasons.slice(0, 3).join(', ')}`);
        }
      });
    } else {
      console.log('\n⚠️  No recommendations returned!');
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return null;
  }
}

// Test scenarios
async function runTests() {
  console.log('🚀 Starting Recommendation System Tests');
  console.log('📡 Testing endpoint:', API_URL);
  
  // Test 1: Physics interest only - should ONLY show physics exhibits
  await testRecommendation(
    'Strict Physics Filtering',
    {
      ageBand: 'adults',
      groupType: 'individual',
      interests: ['physics'],
      timeBudget: 60,
      groupSize: 1
    }
  );

  // Test 2: Robotics interest - should NOT show environment exhibits
  await testRecommendation(
    'Robotics Interest (No Environment)',
    {
      ageBand: 'teens',
      groupType: 'student',
      interests: ['robotics', 'ai', 'technology'],
      timeBudget: 90,
      groupSize: 5
    }
  );

  // Test 3: Age filtering - kids should only see kid-friendly exhibits
  await testRecommendation(
    'Age Filtering - Kids Only',
    {
      ageBand: 'kids',
      groupType: 'family',
      interests: ['science', 'nature'],
      timeBudget: 45,
      groupSize: 4
    }
  );

  // Test 4: Environment interest - should show environment, NOT physics/robotics
  await testRecommendation(
    'Environment Interest (No Physics/Robotics)',
    {
      ageBand: 'adults',
      groupType: 'individual',
      interests: ['environment', 'nature', 'conservation'],
      timeBudget: 60,
      groupSize: 1
    }
  );

  // Test 5: Mixed interests - physics AND biology
  await testRecommendation(
    'Mixed Interests - Physics & Biology',
    {
      ageBand: 'adults',
      groupType: 'research',
      interests: ['physics', 'biology'],
      timeBudget: 120,
      groupSize: 3
    }
  );

  // Test 6: No interests - should still work but with lower scores
  await testRecommendation(
    'No Specific Interests (General)',
    {
      ageBand: 'adults',
      groupType: 'tourist',
      interests: [],
      timeBudget: 30,
      groupSize: 2
    }
  );

  // Test 7: Strict filtering - physics interest should exclude non-physics exhibits
  await testRecommendation(
    'Physics Only - Verify Filtering',
    {
      ageBand: 'adults',
      groupType: 'individual',
      interests: ['physics', 'mechanics', 'energy'],
      timeBudget: 60,
      groupSize: 1,
      interactivity: 'interactive'
    }
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ All tests completed!');
  console.log(`${'='.repeat(60)}\n`);
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Server is running at', BASE_URL);
      return true;
    }
  } catch (error) {
    console.error('❌ Server not running!');
    console.error('Please start the backend server first:');
    console.error('  cd project/backend/backend');
    console.error('  npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await runTests();
}

main().catch(console.error);

