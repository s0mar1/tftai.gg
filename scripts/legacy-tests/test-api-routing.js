import { chromium } from 'playwright';

async function testApiRouting() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Store network requests and console logs
  const requests = [];
  const consoleLogs = [];
  
  // Listen for network requests
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    });
    console.log(`→ ${request.method()} ${request.url()}`);
  });

  // Listen for network responses
  page.on('response', response => {
    console.log(`← ${response.status()} ${response.url()}`);
  });

  // Listen for console logs
  page.on('console', msg => {
    consoleLogs.push(msg.text());
    console.log(`Console: ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.error(`Page error: ${error.message}`);
  });

  console.log('🚀 Navigating to http://localhost:5174');
  
  try {
    // Navigate to the page
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for initial API calls to complete
    await page.waitForTimeout(3000);
    
    // Try to find navigation links and click them
    const navLinks = await page.locator('nav a, [role="navigation"] a').all();
    console.log(`Found ${navLinks.length} navigation links`);
    
    for (const link of navLinks.slice(0, 3)) { // Test first 3 links
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        console.log(`🔗 Clicking link: "${text}" (${href})`);
        
        await link.click();
        await page.waitForTimeout(2000); // Wait for any API calls
        
        console.log(`✅ Successfully navigated to: ${text}`);
      } catch (error) {
        console.error(`❌ Error clicking link: ${error.message}`);
      }
    }
    
    // Look for specific API calls
    const apiRequests = requests.filter(req => req.url.includes('/api/'));
    console.log(`\n📊 Found ${apiRequests.length} API requests:`);
    
    for (const req of apiRequests) {
      console.log(`  - ${req.method} ${req.url}`);
    }
    
    // Check for specific endpoints mentioned in the issue
    const tierlistRequests = requests.filter(req => req.url.includes('/tierlist') || req.url.includes('/decks'));
    console.log(`\n🎯 Tierlist/Decks API requests: ${tierlistRequests.length}`);
    
    for (const req of tierlistRequests) {
      console.log(`  - ${req.method} ${req.url}`);
    }
    
    // Check for undefined path issues
    const undefinedRequests = requests.filter(req => req.url.includes('undefined'));
    console.log(`\n⚠️  Undefined path requests: ${undefinedRequests.length}`);
    
    for (const req of undefinedRequests) {
      console.log(`  - ${req.method} ${req.url}`);
    }
    
    // Check console logs for errors
    const errorLogs = consoleLogs.filter(log => log.toLowerCase().includes('error'));
    console.log(`\n🐛 Console errors: ${errorLogs.length}`);
    
    for (const log of errorLogs) {
      console.log(`  - ${log}`);
    }
    
    console.log('\n📋 Summary:');
    console.log(`  - Total requests: ${requests.length}`);
    console.log(`  - API requests: ${apiRequests.length}`);
    console.log(`  - Tierlist/Decks requests: ${tierlistRequests.length}`);
    console.log(`  - Undefined path requests: ${undefinedRequests.length}`);
    console.log(`  - Console errors: ${errorLogs.length}`);
    
    if (undefinedRequests.length === 0) {
      console.log('✅ No undefined path issues found!');
    } else {
      console.log('❌ Undefined path issues still exist!');
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testApiRouting().catch(console.error);