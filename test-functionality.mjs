import { chromium } from 'playwright';

async function testSiteFunctionality() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    homepage: { status: 'pending', errors: [], networkErrors: [], loadTime: 0, consoleErrors: [] },
    tierlist: { status: 'pending', errors: [], networkErrors: [], loadTime: 0, consoleErrors: [] },
    stats: { status: 'pending', errors: [], networkErrors: [], loadTime: 0, consoleErrors: [] },
    summoner: { status: 'pending', errors: [], networkErrors: [], loadTime: 0, consoleErrors: [] },
    navigation: { status: 'pending', errors: [] },
    apiCalls: []
  };

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const url = page.url();
      let section = 'homepage';
      if (url.includes('tier')) section = 'tierlist';
      else if (url.includes('stat')) section = 'stats';
      else if (url.includes('summoner')) section = 'summoner';
      
      if (results[section] && results[section].consoleErrors) {
        results[section].consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    }
  });

  // Monitor network requests
  page.on('requestfailed', request => {
    const url = page.url();
    let section = 'homepage';
    if (url.includes('tier')) section = 'tierlist';
    else if (url.includes('stat')) section = 'stats';
    else if (url.includes('summoner')) section = 'summoner';
    
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
      const apiCall = results.apiCalls.find(call => call.url === response.url() && !call.status);
      if (apiCall) {
        apiCall.status = response.status();
        apiCall.statusText = response.statusText();
      }
    }
  });

  try {
    console.log('=== Testing Homepage ===');
    const startTime = Date.now();
    
    try {
      await page.goto('http://localhost:5174', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      results.homepage.loadTime = Date.now() - startTime;
      
      // Check for infinite loading
      await page.waitForTimeout(2000); // Wait a bit to see if any loading indicators appear
      
      const loadingSelectors = [
        '.loading',
        '.spinner', 
        '[class*="loading"]',
        '[class*="spinner"]',
        '[class*="loader"]',
        'div[role="status"]',
        '[aria-busy="true"]'
      ];
      
      for (const selector of loadingSelectors) {
        const loadingElement = await page.$(selector);
        if (loadingElement && await loadingElement.isVisible()) {
          console.log(`Found loading element: ${selector}`);
          await page.waitForTimeout(5000); // Wait 5 seconds
          const stillVisible = await loadingElement.isVisible();
          if (stillVisible) {
            results.homepage.errors.push(`Infinite loading detected - ${selector} still visible after 5 seconds`);
          }
        }
      }
      
      // Check page content
      const mainContent = await page.$('main, #root, #app, body');
      const contentText = await mainContent?.textContent();
      if (!contentText || contentText.trim().length < 20) {
        results.homepage.errors.push('Homepage appears to have no content');
      }
      
      results.homepage.status = 'success';
      console.log(`Homepage loaded in ${results.homepage.loadTime}ms`);
      
      // Take screenshot
      await page.screenshot({ path: 'homepage-test.png', fullPage: true });
      
    } catch (error) {
      results.homepage.status = 'failed';
      results.homepage.errors.push(`Failed to load homepage: ${error.message}`);
    }

    // Test navigation
    console.log('\n=== Testing Navigation ===');
    const navSelectors = [
      'nav a',
      'header a',
      '[class*="nav"] a',
      '[class*="menu"] a',
      'aside a'
    ];
    
    let allNavLinks = [];
    for (const selector of navSelectors) {
      const links = await page.$$(selector);
      allNavLinks = allNavLinks.concat(links);
    }
    
    console.log(`Found ${allNavLinks.length} navigation links`);
    
    // Get unique link texts
    const linkTexts = await Promise.all(
      allNavLinks.map(async link => {
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        return { text: text?.trim(), href };
      })
    );
    
    const uniqueLinks = linkTexts.filter((link, index, self) => 
      index === self.findIndex(l => l.text === link.text && l.href === link.href)
    );
    
    console.log('Navigation links found:', uniqueLinks);

    // Test Tier List page
    console.log('\n=== Testing Tier List Page ===');
    const tierStartTime = Date.now();
    
    try {
      // Go back to homepage first
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
      
      // Find tier list link
      const tierListLink = await page.$('a[href*="tier"], a:has-text("Tier"), a:has-text("tier"), a:has-text("티어")');
      
      if (tierListLink) {
        await tierListLink.click();
        await page.waitForLoadState('networkidle');
        results.tierlist.loadTime = Date.now() - tierStartTime;
        
        // Wait a bit for content to load
        await page.waitForTimeout(2000);
        
        // Check for content
        const tierContent = await page.$('main, [class*="tier"], #root > div');
        const contentText = await tierContent?.textContent();
        
        if (!contentText || contentText.trim().length < 20) {
          results.tierlist.errors.push('Tier list page appears empty');
        }
        
        // Check for specific tier list elements
        const tierElements = await page.$$('[class*="tier-"], [class*="champion"], img[alt*="champion"], img[src*="champion"]');
        if (tierElements.length === 0) {
          results.tierlist.errors.push('No tier list elements found on page');
        }
        
        results.tierlist.status = 'success';
        await page.screenshot({ path: 'tierlist-test.png', fullPage: true });
      } else {
        results.tierlist.status = 'not found';
        results.tierlist.errors.push('Tier list navigation link not found');
      }
    } catch (error) {
      results.tierlist.status = 'failed';
      results.tierlist.errors.push(`Tier list test failed: ${error.message}`);
    }

    // Test Stats page
    console.log('\n=== Testing Stats Page ===');
    const statsStartTime = Date.now();
    
    try {
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
      
      const statsLink = await page.$('a[href*="stat"], a:has-text("Stats"), a:has-text("통계"), a:has-text("Stat")');
      
      if (statsLink) {
        await statsLink.click();
        await page.waitForLoadState('networkidle');
        results.stats.loadTime = Date.now() - statsStartTime;
        
        await page.waitForTimeout(2000);
        
        // Check for content
        const statsContent = await page.$('main, [class*="stat"], #root > div');
        const contentText = await statsContent?.textContent();
        
        if (!contentText || contentText.trim().length < 20) {
          results.stats.errors.push('Stats page appears empty');
        }
        
        // Check for stats elements like charts, tables, or numbers
        const statsElements = await page.$$('canvas, svg, table, [class*="chart"], [class*="graph"], [class*="percent"]');
        if (statsElements.length === 0) {
          results.stats.errors.push('No statistical elements found on page');
        }
        
        results.stats.status = 'success';
        await page.screenshot({ path: 'stats-test.png', fullPage: true });
      } else {
        results.stats.status = 'not found';
        results.stats.errors.push('Stats navigation link not found');
      }
    } catch (error) {
      results.stats.status = 'failed';
      results.stats.errors.push(`Stats test failed: ${error.message}`);
    }

    // Test Summoner search
    console.log('\n=== Testing Summoner Search ===');
    const summonerStartTime = Date.now();
    
    try {
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
      
      // Look for summoner link or search input
      const summonerLink = await page.$('a[href*="summoner"], a:has-text("Summoner"), a:has-text("소환사"), a:has-text("Profile")');
      let searchInput = await page.$('input[type="search"], input[placeholder*="summoner"], input[placeholder*="소환사"], input[placeholder*="search"]');
      
      if (summonerLink) {
        await summonerLink.click();
        await page.waitForLoadState('networkidle');
        
        // Try to find search input on summoner page
        searchInput = await page.$('input[type="search"], input[type="text"], input[placeholder*="summoner"], input[placeholder*="name"]');
      }
      
      if (searchInput) {
        await searchInput.type('TestSummoner#KR1');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000); // Wait for search results
        
        results.summoner.loadTime = Date.now() - summonerStartTime;
        results.summoner.status = 'success';
        
        // Check if any error message appeared
        const errorElement = await page.$('[class*="error"], [class*="not-found"], [class*="no-result"]');
        if (errorElement && await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          results.summoner.errors.push(`Search returned error: ${errorText}`);
        }
        
        await page.screenshot({ path: 'summoner-test.png', fullPage: true });
      } else {
        results.summoner.status = 'not found';
        results.summoner.errors.push('Summoner search functionality not found');
      }
    } catch (error) {
      results.summoner.status = 'failed';
      results.summoner.errors.push(`Summoner test failed: ${error.message}`);
    }

    // Test other features
    console.log('\n=== Checking Other Features ===');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    
    // Look for all interactive elements
    const allLinks = await page.$$eval('a', links => 
      links.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href'),
        visible: link.offsetParent !== null
      })).filter(link => link.visible && link.text)
    );
    
    const allButtons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent?.trim(),
        type: btn.type,
        visible: btn.offsetParent !== null
      })).filter(btn => btn.visible && btn.text)
    );
    
    console.log('\nAll visible links:', allLinks);
    console.log('\nAll visible buttons:', allButtons);

  } catch (error) {
    console.error('Test failed with critical error:', error);
    results.general = { 
      status: 'critical_failure',
      error: error.message,
      stack: error.stack
    };
  } finally {
    // Generate comprehensive report
    console.log('\n' + '='.repeat(50));
    console.log('=== COMPREHENSIVE TEST REPORT ===');
    console.log('='.repeat(50));
    
    // Homepage Report
    console.log('\n📄 HOMEPAGE:');
    console.log(`  Status: ${results.homepage.status}`);
    console.log(`  Load Time: ${results.homepage.loadTime}ms`);
    if (results.homepage.errors.length > 0) {
      console.log('  ❌ Errors:');
      results.homepage.errors.forEach(err => console.log(`    - ${err}`));
    }
    if (results.homepage.consoleErrors.length > 0) {
      console.log('  ⚠️  Console Errors:');
      results.homepage.consoleErrors.forEach(err => console.log(`    - ${err.text}`));
    }
    if (results.homepage.networkErrors.length > 0) {
      console.log('  🌐 Network Errors:');
      results.homepage.networkErrors.forEach(err => console.log(`    - ${err.url}: ${err.failure?.errorText}`));
    }
    
    // Tier List Report
    console.log('\n📊 TIER LIST:');
    console.log(`  Status: ${results.tierlist.status}`);
    console.log(`  Load Time: ${results.tierlist.loadTime}ms`);
    if (results.tierlist.errors.length > 0) {
      console.log('  ❌ Errors:');
      results.tierlist.errors.forEach(err => console.log(`    - ${err}`));
    }
    if (results.tierlist.consoleErrors.length > 0) {
      console.log('  ⚠️  Console Errors:');
      results.tierlist.consoleErrors.forEach(err => console.log(`    - ${err.text}`));
    }
    
    // Stats Report
    console.log('\n📈 STATS PAGE:');
    console.log(`  Status: ${results.stats.status}`);
    console.log(`  Load Time: ${results.stats.loadTime}ms`);
    if (results.stats.errors.length > 0) {
      console.log('  ❌ Errors:');
      results.stats.errors.forEach(err => console.log(`    - ${err}`));
    }
    if (results.stats.consoleErrors.length > 0) {
      console.log('  ⚠️  Console Errors:');
      results.stats.consoleErrors.forEach(err => console.log(`    - ${err.text}`));
    }
    
    // Summoner Report
    console.log('\n🔍 SUMMONER SEARCH:');
    console.log(`  Status: ${results.summoner.status}`);
    console.log(`  Load Time: ${results.summoner.loadTime}ms`);
    if (results.summoner.errors.length > 0) {
      console.log('  ❌ Errors:');
      results.summoner.errors.forEach(err => console.log(`    - ${err}`));
    }
    if (results.summoner.consoleErrors.length > 0) {
      console.log('  ⚠️  Console Errors:');
      results.summoner.consoleErrors.forEach(err => console.log(`    - ${err.text}`));
    }
    
    // API Calls Report
    console.log('\n🔌 API CALLS:');
    console.log(`  Total API calls: ${results.apiCalls.length}`);
    if (results.apiCalls.length > 0) {
      const failedCalls = results.apiCalls.filter(call => call.status && call.status >= 400);
      const successfulCalls = results.apiCalls.filter(call => call.status && call.status < 400);
      console.log(`  ✅ Successful: ${successfulCalls.length}`);
      console.log(`  ❌ Failed: ${failedCalls.length}`);
      
      if (failedCalls.length > 0) {
        console.log('\n  Failed API calls:');
        failedCalls.forEach(call => {
          console.log(`    - ${call.method} ${call.url}`);
          console.log(`      Status: ${call.status} ${call.statusText}`);
        });
      }
    }
    
    // Overall Summary
    console.log('\n' + '='.repeat(50));
    console.log('=== OVERALL SUMMARY ===');
    console.log('='.repeat(50));
    
    const totalErrors = 
      results.homepage.errors.length + 
      results.tierlist.errors.length + 
      results.stats.errors.length + 
      results.summoner.errors.length;
    
    const totalConsoleErrors = 
      results.homepage.consoleErrors.length + 
      results.tierlist.consoleErrors.length + 
      results.stats.consoleErrors.length + 
      results.summoner.consoleErrors.length;
    
    console.log(`\nTotal Issues Found: ${totalErrors + totalConsoleErrors}`);
    console.log(`  - Page Errors: ${totalErrors}`);
    console.log(`  - Console Errors: ${totalConsoleErrors}`);
    
    if (totalErrors + totalConsoleErrors === 0) {
      console.log('\n✅ All tests passed successfully!');
    } else {
      console.log('\n❌ Tests completed with issues. Please review the errors above.');
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('  - homepage-test.png');
    console.log('  - tierlist-test.png');
    console.log('  - stats-test.png');
    console.log('  - summoner-test.png');
    
    await browser.close();
  }
}

// Run the test
testSiteFunctionality().catch(console.error);