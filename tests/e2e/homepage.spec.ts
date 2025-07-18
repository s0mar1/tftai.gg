import { test, expect } from '@playwright/test';
import { runAccessibilityAudit } from '../utils/accessibility';

/**
 * 홈페이지 기본 기능 테스트
 * 
 * 이 테스트는 사용자가 홈페이지에 접속했을 때 기본 요소들이 정상적으로 
 * 로드되고 표시되는지 확인합니다.
 */
test.describe('홈페이지 기본 기능', () => {
  
  test.beforeEach(async ({ page }) => {
    // 홈페이지로 이동
    await page.goto('/');
  });

  test('페이지 제목과 헤더 확인', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/TFT Meta Analyzer/);
    
    // 헤더 요소 확인
    await expect(page.locator('header')).toBeVisible();
    
    // 로고 또는 메인 타이틀 확인
    await expect(page.locator('h1, [data-testid="logo"]')).toBeVisible();
  });

  test('네비게이션 메뉴 확인', async ({ page }) => {
    // 주요 네비게이션 링크들이 표시되는지 확인
    const expectedLinks = [
      '소환사 검색',
      '티어리스트', 
      '메타 분석',
      '덱 빌더'
    ];
    
    for (const linkText of expectedLinks) {
      // 정확한 텍스트 또는 부분 일치로 링크 찾기
      const link = page.locator(`a:has-text("${linkText}"), [data-testid="${linkText.toLowerCase()}"]`);
      await expect(link).toBeVisible();
    }
  });

  test('검색 입력 폼 확인', async ({ page }) => {
    // 소환사 검색 입력 필드가 있는지 확인
    const searchInput = page.locator('input[type="text"], input[placeholder*="소환사"], input[placeholder*="summoner"]');
    await expect(searchInput.first()).toBeVisible();
    
    // 검색 버튼 확인
    const searchButton = page.locator('button:has-text("검색"), button[type="submit"]');
    await expect(searchButton.first()).toBeVisible();
  });

  test('다크모드 토글 확인', async ({ page }) => {
    // 다크모드 토글 버튼 찾기
    const darkModeToggle = page.locator(
      'button:has-text("다크"), button:has-text("라이트"), [data-testid="dark-mode-toggle"], .dark-mode-toggle'
    );
    
    if (await darkModeToggle.count() > 0) {
      // 다크모드 토글이 있다면 클릭해보기
      await darkModeToggle.first().click();
      
      // 테마 변경 확인 (body 클래스나 스타일 변경)
      await expect(page.locator('body')).toHaveClass(/dark|light/);
    } else {
      // 다크모드 토글이 없으면 테스트 스킵
      test.skip('다크모드 토글 기능이 구현되지 않았습니다.');
    }
  });

  test('페이지 로딩 성능 확인', async ({ page }) => {
    // 페이지 로딩 시간 측정
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // 3초 이내 로딩 확인
    expect(loadTime).toBeLessThan(3000);
  });

  test('에러 없이 페이지 로딩 확인', async ({ page }) => {
    // 콘솔 에러 모니터링
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 네트워크 에러 모니터링
    const networkErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 치명적인 에러가 없는지 확인
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && // favicon 에러는 무시
      !error.includes('404') // 일반적인 404 에러는 무시
    );
    
    expect(criticalErrors).toHaveLength(0);
    expect(networkErrors.filter(error => !error.includes('favicon'))).toHaveLength(0);
  });

  test('기본 접근성 검사', async ({ page }) => {
    // 홈페이지 기본 접근성 스캔
    await runAccessibilityAudit(page, {
      includeTags: ['wcag2a', 'wcag2aa'],
      // 개발 중인 기능들은 임시로 제외
      exclude: []
    });
  });
});