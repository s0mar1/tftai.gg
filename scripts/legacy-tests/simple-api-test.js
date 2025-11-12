import { chromium } from 'playwright';

async function simpleApiTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Store network requests
  const requests = [];
  
  // Listen for network requests
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method()
    });
  });

  // Listen for console logs
  page.on('console', msg => {
    console.log(`Console: ${msg.text()}`);
  });

  console.log('🚀 Testing API routing on http://localhost:5174');
  
  try {
    // Navigate to the page with a shorter timeout
    await page.goto('http://localhost:5174', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    console.log('✅ Page loaded');
    
    // Wait for initial load
    await page.waitForTimeout(5000);
    
    // Filter API requests
    const apiRequests = requests.filter(req => req.url.includes('/api/'));
    console.log(`\n📊 API requests found: ${apiRequests.length}`);
    
    for (const req of apiRequests) {
      console.log(`  - ${req.method} ${req.url}`);
    }
    
    // Check for undefined paths
    const undefinedRequests = requests.filter(req => req.url.includes('undefined'));
    console.log(`\n⚠️  Undefined path requests: ${undefinedRequests.length}`);
    
    for (const req of undefinedRequests) {
      console.log(`  - ${req.method} ${req.url}`);
    }
    
    // Check for tierlist/decks specifically
    const tierlistRequests = requests.filter(req => 
      req.url.includes('/tierlist') || req.url.includes('/decks')
    );
    console.log(`\n🎯 Tierlist/Decks requests: ${tierlistRequests.length}`);
    
    for (const req of tierlistRequests) {
      console.log(`  - ${req.method} ${req.url}`);
    }
    
    console.log('\n📋 Summary:');
    console.log(`  - Total requests: ${requests.length}`);
    console.log(`  - API requests: ${apiRequests.length}`);
    console.log(`  - Undefined requests: ${undefinedRequests.length}`);
    console.log(`  - Tierlist/Decks requests: ${tierlistRequests.length}`);
    
    if (undefinedRequests.length === 0) {
      console.log('✅ No undefined path issues found!');
    } else {
      console.log('❌ Undefined path issues detected!');
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

simpleApiTest().catch(console.error);