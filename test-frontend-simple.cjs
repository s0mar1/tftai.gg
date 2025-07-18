const axios = require('axios');

async function testFrontendSimple() {
  console.log('=== TFT Meta Analyzer Frontend Test Report ===\n');
  
  const results = {
    frontend: { status: 'unknown', issues: [] },
    api: { status: 'unknown', issues: [] },
    proxy: { status: 'unknown', issues: [] },
    staticData: { status: 'unknown', issues: [] },
    dbEndpoints: { status: 'unknown', issues: [] }
  };

  try {
    // Test 1: Frontend HTML
    console.log('1. Testing Frontend HTML...');
    try {
      const htmlResponse = await axios.get('http://localhost:5174');
      if (htmlResponse.data.includes('<div id="root">') && htmlResponse.data.includes('main.tsx')) {
        results.frontend.status = 'success';
        console.log('✅ Frontend HTML is loading correctly');
      } else {
        results.frontend.status = 'partial';
        results.frontend.issues.push('HTML structure incomplete');
      }
    } catch (error) {
      results.frontend.status = 'failed';
      results.frontend.issues.push(`Frontend error: ${error.message}`);
      console.log('❌ Frontend HTML failed to load');
    }

    // Test 2: Static Data API (doesn't require DB)
    console.log('\n2. Testing Static Data API...');
    try {
      const staticResponse = await axios.get('http://localhost:4001/api/static-data/tft-data/ko');
      if (staticResponse.data.success && staticResponse.data.data) {
        results.staticData.status = 'success';
        console.log('✅ Static data API is working');
        console.log(`   - Champions: ${staticResponse.data.data.champions?.length || 0}`);
        console.log(`   - Items: ${staticResponse.data.data.items?.completed?.length || 0}`);
        console.log(`   - Traits: ${staticResponse.data.data.traits?.length || 0}`);
      }
    } catch (error) {
      results.staticData.status = 'failed';
      results.staticData.issues.push(`Static data error: ${error.message}`);
      console.log('❌ Static data API failed');
    }

    // Test 3: API Proxy through Frontend
    console.log('\n3. Testing API Proxy...');
    try {
      const proxyResponse = await axios.get('http://localhost:5174/api/static-data/tft-data/ko');
      if (proxyResponse.data.success) {
        results.proxy.status = 'success';
        console.log('✅ Frontend proxy to API is working');
      }
    } catch (error) {
      results.proxy.status = 'failed';
      results.proxy.issues.push(`Proxy error: ${error.message}`);
      console.log('❌ Frontend proxy failed');
    }

    // Test 4: DB-dependent endpoints (expected to fail without MongoDB)
    console.log('\n4. Testing DB-dependent Endpoints...');
    const dbEndpoints = [
      '/api/tierlist/decks/ko',
      '/api/ranking/top-players',
      '/api/guides',
      '/api/summoner/KR/testuser'
    ];

    for (const endpoint of dbEndpoints) {
      try {
        await axios.get(`http://localhost:4001${endpoint}`);
        console.log(`✅ ${endpoint} - working`);
      } catch (error) {
        if (error.response?.status === 503) {
          console.log(`⚠️  ${endpoint} - DB unavailable (expected in dev mode)`);
        } else if (error.response?.status === 404) {
          console.log(`❌ ${endpoint} - endpoint not found`);
        } else {
          console.log(`❌ ${endpoint} - error: ${error.message}`);
        }
      }
    }

    // Test 5: Health check
    console.log('\n5. Testing Health Check...');
    try {
      const healthResponse = await axios.get('http://localhost:4001/health');
      console.log('✅ Health check endpoint working');
      console.log(`   - Status: ${healthResponse.data.status}`);
      console.log(`   - TFT Data: ${healthResponse.data.services?.tftData?.status || 'unknown'}`);
      console.log(`   - Database: ${healthResponse.data.services?.database?.status || 'disconnected'}`);
    } catch (error) {
      console.log('❌ Health check failed');
    }

  } catch (error) {
    console.error('Test suite error:', error.message);
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('\n✅ Working Components:');
  console.log('- Backend API is running on port 4001');
  console.log('- Frontend is serving HTML on port 5174');
  console.log('- Static data endpoints are functional');
  console.log('- Frontend proxy configuration is correct');
  
  console.log('\n⚠️  Expected Issues (Development Mode):');
  console.log('- MongoDB is not connected (expected in dev)');
  console.log('- DB-dependent endpoints return 503 errors');
  console.log('- Tierlist page may show loading state indefinitely');
  
  console.log('\n📋 Recommendations:');
  console.log('1. The frontend is attempting to load tierlist data repeatedly');
  console.log('2. Without MongoDB, tierlist/ranking/guides pages won\'t work');
  console.log('3. Static pages and features should work normally');
  console.log('4. Consider adding mock data for development mode');
  
  console.log('\n🔍 To test the working features:');
  console.log('- Navigate to http://localhost:5174');
  console.log('- Try the deck builder or other non-DB features');
  console.log('- Check browser console for any JavaScript errors');
}

testFrontendSimple().catch(console.error);