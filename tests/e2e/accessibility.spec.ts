import { test, expect } from '@playwright/test';
import { 
  runAccessibilityAudit, 
  runAccessibilityAuditForElement,
  testKeyboardNavigation,
  validateAriaAttributes,
  checkColorContrast,
  validateImageAltText,
  validateFormAccessibility,
  validateHeadingStructure
} from '../utils/accessibility';

/**
 * 웹 접근성 테스트 스위트
 * WCAG 2.1 AA 수준을 기준으로 자동화된 접근성 검사를 수행합니다.
 */
test.describe('웹 접근성 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    // 홈페이지로 이동
    await page.goto('/');
    // 페이지 로딩 완료 대기
    await page.waitForLoadState('networkidle');
  });

  test('홈페이지 전체 접근성 스캔', async ({ page }) => {
    await runAccessibilityAudit(page, {
      includeTags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      // 개발 중인 요소들은 임시로 제외할 수 있음
      exclude: [
        // 예: '.under-development'
      ]
    });
  });

  test('헤더 네비게이션 접근성', async ({ page }) => {
    // 헤더 영역만 스캔
    await runAccessibilityAuditForElement(page, 'header');
    
    // 헤더의 ARIA 속성 검증
    await validateAriaAttributes(page, 'header', {
      'role': null // header 태그는 기본적으로 banner role을 가짐
    });
    
    // 로고 링크 접근성 확인
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toBeFocusable();
  });

  test('키보드 네비게이션 테스트', async ({ page }) => {
    // 헤더에서 시작하여 Tab 키로 이동
    await page.focus('header a[href="/"]'); // 로고 링크에서 시작
    
    // 주요 네비게이션 요소들이 키보드로 접근 가능한지 확인
    const focusableElements = [
      'header a[href="/"]', // 로고
      'input[type="text"]', // 검색창
      'button[aria-label*="mode"]', // 다크모드 토글
      'a[href="/tierlist"]', // 티어리스트
      'a[href="/guides"]', // 가이드
      'a[href="/ranking"]', // 랭킹
      'a[href="/stats"]', // 통계
      'a[href="/deck-builder"]', // 덱 빌더
      'a[href="/ai-chat"]', // AI 채팅
      'a[href="/about"]' // 소개
    ];

    for (const selector of focusableElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await expect(element.first()).toBeFocusable();
      }
    }
  });

  test('다크모드 토글 접근성', async ({ page }) => {
    const darkModeToggle = page.locator('button[aria-label*="mode"]');
    
    if (await darkModeToggle.count() > 0) {
      // ARIA 라벨 확인
      const ariaLabel = await darkModeToggle.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/(dark|light|mode)/i);
      
      // 키보드 접근성 확인
      await darkModeToggle.focus();
      await expect(darkModeToggle).toBeFocused();
      
      // Enter 키로 토글 가능 확인
      await page.keyboard.press('Enter');
      
      // 상태 변경 후 ARIA 라벨 업데이트 확인
      await page.waitForTimeout(500); // 상태 변경 대기
      const newAriaLabel = await darkModeToggle.getAttribute('aria-label');
      expect(newAriaLabel).not.toBe(ariaLabel);
    }
  });

  test('검색창 접근성', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]').first();
    
    if (await searchInput.count() > 0) {
      // 검색창 폼 접근성 검증
      await validateFormAccessibility(page, 'form, div:has(input[type="text"])');
      
      // 라벨 또는 placeholder 확인
      const placeholder = await searchInput.getAttribute('placeholder');
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const associatedLabel = await page.locator('label[for]').count();
      
      // 접근 가능한 이름이 있는지 확인 (placeholder, aria-label, 또는 label 중 하나)
      expect(placeholder || ariaLabel || associatedLabel > 0).toBeTruthy();
      
      // 키보드 접근성 확인
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    }
  });

  test('네비게이션 링크 접근성', async ({ page }) => {
    const navLinks = page.locator('nav a');
    const linkCount = await navLinks.count();
    
    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      
      // 링크가 접근 가능한 이름을 가지는지 확인
      const linkText = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      expect(linkText?.trim() || ariaLabel).toBeTruthy();
      
      // 키보드 접근성 확인
      await expect(link).toBeFocusable();
    }
  });

  test('색상 대비 검사', async ({ page }) => {
    await checkColorContrast(page);
  });

  test('이미지 대체 텍스트 검증', async ({ page }) => {
    await validateImageAltText(page);
  });

  test('헤딩 구조 검증', async ({ page }) => {
    await validateHeadingStructure(page);
  });

  test('Skip Link 접근성 (있는 경우)', async ({ page }) => {
    // Skip to content 링크가 있는지 확인
    const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link');
    
    if (await skipLink.count() > 0) {
      // Tab 키를 눌렀을 때 skip link가 표시되는지 확인
      await page.keyboard.press('Tab');
      await expect(skipLink.first()).toBeVisible();
      
      // Enter 키로 작동하는지 확인
      await skipLink.first().press('Enter');
      
      // 메인 콘텐츠로 포커스가 이동했는지 확인
      const mainContent = page.locator('#main, #content, main');
      if (await mainContent.count() > 0) {
        await expect(mainContent.first()).toBeFocused();
      }
    }
  });

  test('언어 선택기 접근성 (있는 경우)', async ({ page }) => {
    const languageSelector = page.locator('[data-testid="language-selector"], .language-selector, select[name*="lang"]');
    
    if (await languageSelector.count() > 0) {
      // 언어 선택기 접근성 검증
      await runAccessibilityAuditForElement(page, '[data-testid="language-selector"], .language-selector, select[name*="lang"]');
      
      // 키보드 접근성 확인
      await expect(languageSelector.first()).toBeFocusable();
      
      // ARIA 속성 확인 (select 요소인 경우)
      const tagName = await languageSelector.first().evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        const ariaLabel = await languageSelector.first().getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    }
  });
});

/**
 * 모바일 접근성 테스트
 */
test.describe('모바일 접근성 테스트', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE 크기
  });

  test('모바일 화면에서 전체 접근성 스캔', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await runAccessibilityAudit(page, {
      includeTags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    });
  });

  test('모바일 터치 타겟 크기 확인', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 44px 이상의 터치 타겟 크기 권장
    const interactiveElements = page.locator('button, a, input, select, [role="button"]');
    const count = await interactiveElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = interactiveElements.nth(i);
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        // 최소 44px x 44px 권장 (WCAG 2.1 AAA)
        // 최소 24px x 24px 필수 (WCAG 2.1 AA)
        expect(boundingBox.width).toBeGreaterThanOrEqual(24);
        expect(boundingBox.height).toBeGreaterThanOrEqual(24);
      }
    }
  });
});