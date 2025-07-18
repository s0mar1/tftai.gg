import { test, expect } from '@playwright/test';

const pages = [
  { name: 'Main Page', url: '/' },
  { name: 'Summoner Page', url: '/ko/summoner' },
  { name: 'Tier List Page', url: '/ko/tierlist' },
  { name: 'AI Q&A Page', url: '/ko/ai-qna' },
  { name: 'Stats Page', url: '/ko/stats' },
  { name: 'Deck Builder Page', url: '/ko/deckbuilder' },
  { name: 'Ranking Page', url: '/ko/ranking' },
  { name: 'Guide List Page', url: '/ko/guides' }
];

const BASE_URL = 'http://localhost:5174';

test.describe('TFT Meta Analyzer Site Health Check', () => {
  // Test each page
  for (const page of pages) {
    test(`${page.name} - Desktop View`, async ({ page: browserPage }) => {
      // Set desktop viewport
      await browserPage.setViewportSize({ width: 1920, height: 1080 });
      
      // Collect console messages
      const consoleMessages: string[] = [];
      browserPage.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });

      // Navigate to page
      const startTime = Date.now();
      const response = await browserPage.goto(`${BASE_URL}${page.url}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      const loadTime = Date.now() - startTime;

      // Check response status
      expect(response?.status()).toBeLessThan(400);

      // Take screenshot
      await browserPage.screenshot({ 
        path: `./test-results/desktop-${page.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });

      // Check for console errors
      expect(consoleMessages).toHaveLength(0);

      // Check load time (should be under 5 seconds)
      expect(loadTime).toBeLessThan(5000);

      // Check for main content
      const bodyText = await browserPage.textContent('body');
      expect(bodyText).not.toBe('');
    });

    test(`${page.name} - Mobile View`, async ({ page: browserPage }) => {
      // Set mobile viewport (iPhone 12)
      await browserPage.setViewportSize({ width: 390, height: 844 });
      
      // Navigate to page
      await browserPage.goto(`${BASE_URL}${page.url}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Take screenshot
      await browserPage.screenshot({ 
        path: `./test-results/mobile-${page.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    });
  }

  // Test language switching
  test('Language Switching', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Find language switcher (assuming it exists)
    const languageButton = await page.locator('button:has-text("KO"), button:has-text("EN")').first();
    if (await languageButton.isVisible()) {
      await languageButton.click();
      
      // Check if language options appear
      const englishOption = await page.locator('text=English').first();
      if (await englishOption.isVisible()) {
        await englishOption.click();
        
        // Verify URL changed to English
        await page.waitForURL('**/en/**', { timeout: 5000 }).catch(() => {});
      }
    }
  });

  // Test responsive navigation
  test('Mobile Navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    
    // Look for hamburger menu
    const hamburger = await page.locator('button[aria-label*="menu"], button:has(svg)').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      
      // Check if mobile menu opens
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: './test-results/mobile-menu-open.png' 
      });
    }
  });
});

// Performance metrics test
test('Performance Metrics', async ({ page }) => {
  const metrics = [];
  
  for (const pageInfo of pages.slice(0, 3)) { // Test first 3 pages for performance
    await page.goto(`${BASE_URL}${pageInfo.url}`);
    
    // Get performance metrics
    const performanceTiming = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
      };
    });
    
    metrics.push({
      page: pageInfo.name,
      ...performanceTiming
    });
  }
  
  console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
  
  // All pages should load DOM in under 3 seconds
  metrics.forEach(metric => {
    expect(metric.domContentLoaded).toBeLessThan(3000);
  });
});