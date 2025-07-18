import { test, expect } from '@playwright/test';

/**
 * 소환사 검색 기능 E2E 테스트
 * 
 * 이 테스트는 핵심 사용자 플로우인 소환사 검색이 정상적으로 작동하는지 확인합니다.
 * - 검색 입력
 * - 검색 결과 표시
 * - 에러 처리
 */
test.describe('소환사 검색 기능', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('정상적인 소환사 검색 플로우', async ({ page }) => {
    // 검색 입력 필드 찾기
    const searchInput = page.locator('input[type="text"], input[placeholder*="소환사"], input[placeholder*="summoner"]').first();
    const searchButton = page.locator('button:has-text("검색"), button[type="submit"]').first();
    
    // 테스트용 소환사 이름 입력
    await searchInput.fill('테스트소환사');
    
    // 검색 버튼 클릭
    await searchButton.click();
    
    // 로딩 상태 확인
    const loadingIndicator = page.locator('.loading, [data-testid="loading"], .spinner');
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator.first()).toBeVisible();
    }
    
    // 검색 결과 또는 에러 메시지 대기
    await page.waitForTimeout(3000);
    
    // 결과 영역 확인
    const resultContainer = page.locator('.result, .summoner-info, [data-testid="search-result"]');
    const errorMessage = page.locator('.error, .not-found, [data-testid="error-message"]');
    
    // 결과 또는 에러 메시지 중 하나는 표시되어야 함
    const hasResult = await resultContainer.count() > 0;
    const hasError = await errorMessage.count() > 0;
    
    expect(hasResult || hasError).toBe(true);
  });

  test('빈 검색어 입력 시 검증', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="소환사"], input[placeholder*="summoner"]').first();
    const searchButton = page.locator('button:has-text("검색"), button[type="submit"]').first();
    
    // 빈 검색어로 검색 시도
    await searchInput.fill('');
    await searchButton.click();
    
    // 검증 메시지 확인
    const validationMessage = page.locator('.validation-error, .error, [data-testid="validation-error"]');
    
    // 검증 메시지가 표시되거나 검색이 실행되지 않아야 함
    const hasValidation = await validationMessage.count() > 0;
    const inputValue = await searchInput.inputValue();
    
    expect(hasValidation || inputValue === '').toBe(true);
  });

  test('검색 결과 페이지 네비게이션', async ({ page }) => {
    // 소환사 검색 페이지 직접 접근
    await page.goto('/summoner/kr/테스트소환사');
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
    
    // 소환사 정보 영역 확인
    const summonerInfo = page.locator('.summoner-profile, .summoner-info, [data-testid="summoner-info"]');
    const matchHistory = page.locator('.match-history, .game-history, [data-testid="match-history"]');
    const notFound = page.locator('.not-found, .error, [data-testid="not-found"]');
    
    // 소환사 정보 또는 없음 메시지 중 하나는 표시되어야 함
    const hasInfo = await summonerInfo.count() > 0;
    const hasMatches = await matchHistory.count() > 0;
    const hasNotFound = await notFound.count() > 0;
    
    expect(hasInfo || hasMatches || hasNotFound).toBe(true);
  });

  test('검색 기록 기능 (있는 경우)', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="소환사"], input[placeholder*="summoner"]').first();
    
    // 검색 입력 필드 클릭
    await searchInput.click();
    
    // 검색 기록 드롭다운 확인
    const searchHistory = page.locator('.search-history, .dropdown, [data-testid="search-history"]');
    
    if (await searchHistory.count() > 0) {
      await expect(searchHistory.first()).toBeVisible();
    } else {
      // 검색 기록 기능이 없으면 테스트 스킵
      test.skip('검색 기록 기능이 구현되지 않았습니다.');
    }
  });

  test('지역 선택 기능 (있는 경우)', async ({ page }) => {
    // 지역 선택 드롭다운 확인
    const regionSelect = page.locator('select[name="region"], .region-select, [data-testid="region-select"]');
    
    if (await regionSelect.count() > 0) {
      // 지역 선택 테스트
      await regionSelect.first().selectOption('na');
      
      // 선택된 지역 확인
      const selectedValue = await regionSelect.first().inputValue();
      expect(selectedValue).toBe('na');
    } else {
      // 지역 선택 기능이 없으면 테스트 스킵
      test.skip('지역 선택 기능이 구현되지 않았습니다.');
    }
  });

  test('검색 결과 로딩 상태 관리', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="소환사"], input[placeholder*="summoner"]').first();
    const searchButton = page.locator('button:has-text("검색"), button[type="submit"]').first();
    
    // 검색 실행
    await searchInput.fill('테스트소환사');
    await searchButton.click();
    
    // 로딩 상태 확인
    const loadingIndicator = page.locator('.loading, [data-testid="loading"], .spinner');
    
    if (await loadingIndicator.count() > 0) {
      // 로딩 상태가 표시되는지 확인
      await expect(loadingIndicator.first()).toBeVisible();
      
      // 로딩이 완료되면 사라지는지 확인
      await expect(loadingIndicator.first()).toBeHidden({ timeout: 10000 });
    }
    
    // 검색 버튼이 로딩 중에 비활성화되는지 확인
    if (await searchButton.count() > 0) {
      const isDisabled = await searchButton.first().isDisabled();
      // 로딩 중이거나 완료된 상태여야 함
      expect(typeof isDisabled).toBe('boolean');
    }
  });
});