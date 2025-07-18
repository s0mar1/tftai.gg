const { chromium } = require('playwright');

async function testSiteFunctionality() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    homepage: { status: 'pending', errors: [], networkErrors: [], loadTime: 0 },
    tierlist: { status: 'pending', errors: [], networkErrors: [], loadTime: 0 },
    stats: { status: 'pending', errors: [], networkErrors: [], loadTime: 0 },
    summoner: { status: 'pending', errors: [], networkErrors: [], loadTime: 0 },
    navigation: { status: 'pending', errors: [] },
    apiCalls: []
  };

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const url = page.url();
      const section = Object.keys(results).find(key => url.includes(key)) || 'general';
      if (results[section] && results[section].errors) {
        results[section].errors.push(msg.text());
      }
    }
  });

  // Monitor network requests
  page.on('requestfailed', request => {
    const url = page.url();
    const section = Object.keys(results).find(key => url.includes(key)) || 'general';
    if (results[section] && results[section].networkErrors) {
      results[section].networkErrors.push({
        url: request.url(),
        failure: request.failure()
      });
    }
  });

  // Monitor API calls
  page.on('request', request => {
    if (request.url().includes('api') || request.url().includes('localhost:5001')) {
      results.apiCalls.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    }
  });

  page.on('response', response => {
    if (response.url().includes('api') || response.url().includes('localhost:5001')) {
      const apiCall = results.apiCalls.find(call => call.url === response.url());
      if (apiCall) {
        apiCall.status = response.status();
        apiCall.statusText = response.statusText();
      }
    }
  });

  try {
    console.log('=== Testing Homepage ===');
    const startTime = Date.now();
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    results.homepage.loadTime = Date.now() - startTime;
    
    // Check for infinite loading
    const loadingElement = await page.$('.loading, .spinner, [class*="loading"], [class*="spinner"]');
    if (loadingElement) {
      await page.waitForTimeout(5000); // Wait 5 seconds to see if loading persists
      const stillLoading = await loadingElement.isVisible();
      if (stillLoading) {
        results.homepage.errors.push('Infinite loading detected on homepage');
      }
    }
    
    results.homepage.status = 'success';
    console.log(`Homepage loaded in ${results.homepage.loadTime}ms`);
    
    // Take screenshot
    await page.screenshot({ path: 'homepage-test.png', fullPage: true });

    // Test navigation links
    console.log('\n=== Testing Navigation ===');
    const navLinks = await page.$$('nav a, header a, [class*="nav"] a');
    console.log(`Found ${navLinks.length} navigation links`);

    // Test Tier List page
    console.log('\n=== Testing Tier List Page ===');
    const tierStartTime = Date.now();
    const tierListLink = await page.$('a[href*="tier"], a:has-text("Tier"), a:has-text("tier")');
    if (tierListLink) {
      await tierListLink.click();
      await page.waitForLoadState('networkidle');
      results.tierlist.loadTime = Date.now() - tierStartTime;
      
      // Check for content
      const tierContent = await page.$('.tier-list, [class*="tier"], main');
      if (tierContent) {
        const hasContent = await tierContent.textContent();
        if (!hasContent || hasContent.trim().length < 10) {
          results.tierlist.errors.push('Tier list page appears empty');
        }
      }
      results.tierlist.status = 'success';
      await page.screenshot({ path: 'tierlist-test.png', fullPage: true });
    } else {
      results.tierlist.status = 'not found';
      results.tierlist.errors.push('Tier list navigation link not found');
    }

    // Test Stats page
    console.log('\n=== Testing Stats Page ===');
    const statsStartTime = Date.now();
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    const statsLink = await page.$('a[href*="stat"], a:has-text("Stats"), a:has-text("통계")');
    if (statsLink) {
      await statsLink.click();
      await page.waitForLoadState('networkidle');
      results.stats.loadTime = Date.now() - statsStartTime;
      
      // Check for content
      const statsContent = await page.$('.stats, [class*="stat"], main');
      if (statsContent) {
        const hasContent = await statsContent.textContent();
        if (!hasContent || hasContent.trim().length < 10) {
          results.stats.errors.push('Stats page appears empty');
        }
      }
      results.stats.status = 'success';
      await page.screenshot({ path: 'stats-test.png', fullPage: true });
    } else {
      results.stats.status = 'not found';
      results.stats.errors.push('Stats navigation link not found');
    }

    // Test Summoner search
    console.log('\n=== Testing Summoner Search ===');
    const summonerStartTime = Date.now();
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    
    // Look for summoner search or link
    const summonerLink = await page.$('a[href*="summoner"], a:has-text("Summoner"), a:has-text("소환사")');
    const searchInput = await page.$('input[type="search"], input[placeholder*="summoner"], input[placeholder*="소환사"]');
    
    if (summonerLink) {
      await summonerLink.click();
      await page.waitForLoadState('networkidle');
      results.summoner.loadTime = Date.now() - summonerStartTime;
      
      // Try to find search input on summoner page
      const searchOnPage = await page.$('input[type="search"], input[type="text"]');
      if (searchOnPage) {
        await searchOnPage.type('TestSummoner');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
      }
      results.summoner.status = 'success';
      await page.screenshot({ path: 'summoner-test.png', fullPage: true });
    } else if (searchInput) {
      await searchInput.type('TestSummoner');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      results.summoner.loadTime = Date.now() - summonerStartTime;
      results.summoner.status = 'success';
      await page.screenshot({ path: 'summoner-search-test.png', fullPage: true });
    } else {
      results.summoner.status = 'not found';
      results.summoner.errors.push('Summoner search functionality not found');
    }

    // Test other navigation elements
    console.log('\n=== Testing Other Features ===');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    
    // Look for other features
    const features = await page.$$eval('a, button', elements => 
      elements.map(el => ({
        text: el.textContent?.trim(),
        href: el.getAttribute('href'),
        type: el.tagName.toLowerCase()
      })).filter(el => el.text && el.text.length > 0)
    );
    
    console.log('Found features:', features);

  } catch (error) {
    console.error('Test failed:', error);
    results.general = { error: error.message };
  } finally {
    // Generate final report
    console.log('\n=== TEST RESULTS ===');
    console.log(JSON.stringify(results, null, 2));
    
    await browser.close();
  }
}

testSiteFunctionality().catch(console.error);
