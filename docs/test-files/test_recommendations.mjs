/**
 * Test script for Enhanced Recommendation System
 * Run with: node test_recommendations.mjs
 */

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
      
      // Verify filtering
      console.log('\n🔍 Filtering Verification:');
      const matchedInterests = data.exhibits
        .flatMap(ex => ex.reasons || [])
        .filter(r => r.includes('Strong match for:'))
        .map(r => r.replace('Strong match for: ', ''));
      
      if (matchedInterests.length > 0) {
        console.log(`   ✅ Found matches for: ${[...new Set(matchedInterests)].join(', ')}`);
      } else {
        console.log(`   ⚠️  No explicit interest matches found in reasons`);
      }
    } else {
      console.log('\n⚠️  No recommendations returned!');
      console.log('   This might mean:');
      console.log('   - No exhibits match the strict filters');
      console.log('   - All exhibits were filtered out');
      console.log('   - Check exhibit descriptions contain interest keywords');
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    console.error('   Make sure backend server is running at', BASE_URL);
    return null;
  }
}

// Test scenarios
async function runTests() {
  console.log('🚀 Starting Recommendation System Tests');
  console.log('📡 Testing endpoint:', API_URL);
  
  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/health`);
    if (healthCheck.ok) {
      console.log('✅ Server is running at', BASE_URL);
    } else {
      console.log('⚠️  Server returned status:', healthCheck.status);
    }
  } catch (error) {
    console.error('❌ Cannot connect to server!');
    console.error('   Please start the backend server first:');
    console.error('   cd project/backend/backend');
    console.error('   npm run dev');
    process.exit(1);
  }
  
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
    },
    'all'
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
    },
    'all'
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
    },
    'all'
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ All tests completed!');
  console.log(`\n💡 Tips:`);
  console.log('   - Check that exhibits match the selected interests');
  console.log('   - Verify age-appropriate filtering works');
  console.log('   - Ensure reasons explain why exhibits were recommended');
  console.log(`${'='.repeat(60)}\n`);
}

// Main execution
runTests().catch(console.error);

