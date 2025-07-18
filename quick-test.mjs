import { chromium } from 'playwright';

async function quickTest() {
  console.log('Starting quick functionality test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const issues = [];
  
  // Track console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      issues.push(`Console Error: ${msg.text()}`);
    }
  });
  
  // Track network failures
  page.on('requestfailed', request => {
    issues.push(`Network Failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    // Test 1: Homepage
    console.log('\n1. Testing Homepage...');
    const response = await page.goto('http://localhost:5174', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    if (!response || response.status() >= 400) {
      issues.push(`Homepage failed to load: ${response?.status()}`);
    } else {
      console.log('   ✓ Homepage loaded successfully');
      
      // Check for infinite loading
      await page.waitForTimeout(3000);
      const loadingVisible = await page.isVisible('.loading, .spinner, [class*="loading"], [class*="spinner"]');
      if (loadingVisible) {
        issues.push('Homepage has infinite loading spinner');
      }
    }
    
    // Test 2: Navigation Links
    console.log('\n2. Checking navigation links...');
    const navLinks = await page.$$eval('nav a, header a', links => 
      links.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href')
      }))
    );
    console.log(`   Found ${navLinks.length} navigation links`);
    
    // Test 3: Tier List
    console.log('\n3. Testing Tier List page...');
    const tierLink = await page.$('a[href*="tier"]');
    if (tierLink) {
      await tierLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const url = page.url();
      if (!url.includes('tier')) {
        issues.push('Tier list navigation did not work');
      } else {
        console.log('   ✓ Tier list page loaded');
        const hasContent = await page.$eval('body', el => el.textContent?.length > 100);
        if (!hasContent) {
          issues.push('Tier list page appears empty');
        }
      }
    } else {
      issues.push('Tier list link not found');
    }
    
    // Test 4: Stats Page
    console.log('\n4. Testing Stats page...');
    await page.goto('http://localhost:5174');
    const statsLink = await page.$('a[href*="stat"]');
    if (statsLink) {
      await statsLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const url = page.url();
      if (!url.includes('stat')) {
        issues.push('Stats navigation did not work');
      } else {
        console.log('   ✓ Stats page loaded');
      }
    } else {
      issues.push('Stats link not found');
    }
    
    // Test 5: API Health
    console.log('\n5. Testing API health...');
    const apiResponse = await page.goto('http://localhost:5001/api/health');
    if (!apiResponse || apiResponse.status() !== 200) {
      issues.push(`API health check failed: ${apiResponse?.status()}`);
    } else {
      console.log('   ✓ API is healthy');
    }
    
  } catch (error) {
    issues.push(`Critical error: ${error.message}`);
  } finally {
    await browser.close();
    
    // Final Report
    console.log('\n' + '='.repeat(50));
    console.log('TEST RESULTS');
    console.log('='.repeat(50));
    
    if (issues.length === 0) {
      console.log('\n✅ All tests passed!');
    } else {
      console.log(`\n❌ Found ${issues.length} issues:\n`);
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }
  }
}

quickTest().catch(console.error);