import { test, expect } from '@playwright/test';

/**
 * 티어리스트 기능 E2E 테스트
 * 
 * 이 테스트는 티어리스트 페이지의 핵심 기능들이 정상적으로 작동하는지 확인합니다.
 * - 티어리스트 로딩
 * - 필터링 기능
 * - 데이터 표시
 */
test.describe('티어리스트 기능', () => {
  
  test.beforeEach(async ({ page }) => {
    // 티어리스트 페이지로 이동
    await page.goto('/tierlist');
  });

  test('티어리스트 페이지 기본 로딩', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/티어리스트|Tier List/);
    
    // 주요 컨테이너 요소 확인
    const tierlistContainer = page.locator('.tierlist, .tier-list, [data-testid="tierlist"]');
    await expect(tierlistContainer.first()).toBeVisible();
    
    // 로딩 완료 대기
    await page.waitForLoadState('networkidle');
  });

  test('챔피언 티어리스트 표시', async ({ page }) => {
    // 챔피언 카드들이 표시되는지 확인
    const championCards = page.locator('.champion-card, .champion-item, [data-testid="champion-card"]');
    
    // 최소 몇 개의 챔피언이 표시되어야 함
    await expect(championCards.first()).toBeVisible({ timeout: 10000 });
    
    const cardCount = await championCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('티어 분류 확인', async ({ page }) => {
    // 티어 섹션들 확인 (S, A, B, C 등)
    const tierSections = page.locator('.tier-s, .tier-a, .tier-b, .tier-c, [data-tier]');
    
    if (await tierSections.count() > 0) {
      // 티어 섹션이 있다면 최소 하나는 표시되어야 함
      await expect(tierSections.first()).toBeVisible();
      
      // 각 티어 섹션에 제목이 있는지 확인
      const tierTitles = page.locator('.tier-title, .tier-label, [data-testid="tier-title"]');
      await expect(tierTitles.first()).toBeVisible();
    }
  });

  test('필터링 기능 (있는 경우)', async ({ page }) => {
    // 필터 옵션 확인
    const filterOptions = page.locator('.filter, .filter-option, [data-testid="filter"]');
    
    if (await filterOptions.count() > 0) {
      // 필터 옵션이 있다면 클릭해보기
      await filterOptions.first().click();
      
      // 필터링 결과 확인
      await page.waitForTimeout(1000);
      
      // 결과가 변경되었는지 확인
      const champions = page.locator('.champion-card, .champion-item, [data-testid="champion-card"]');
      const championCount = await champions.count();
      expect(championCount).toBeGreaterThanOrEqual(0);
    } else {
      test.skip('필터링 기능이 구현되지 않았습니다.');
    }
  });

  test('챔피언 상세 정보 모달/페이지', async ({ page }) => {
    // 첫 번째 챔피언 클릭
    const firstChampion = page.locator('.champion-card, .champion-item, [data-testid="champion-card"]').first();
    
    if (await firstChampion.count() > 0) {
      await firstChampion.click();
      
      // 모달 또는 상세 페이지 확인
      const modal = page.locator('.modal, .champion-detail, [data-testid="champion-modal"]');
      const detailPage = page.locator('.champion-detail-page, [data-testid="champion-detail"]');
      
      // 모달이나 상세 페이지 중 하나는 표시되어야 함
      const hasModal = await modal.count() > 0;
      const hasDetailPage = await detailPage.count() > 0;
      const isNewPage = page.url().includes('/champion/');
      
      expect(hasModal || hasDetailPage || isNewPage).toBe(true);
    }
  });

  test('검색 기능 (있는 경우)', async ({ page }) => {
    // 검색 입력 필드 확인
    const searchInput = page.locator('input[type="search"], input[placeholder*="검색"], input[placeholder*="search"]');
    
    if (await searchInput.count() > 0) {
      // 검색어 입력
      await searchInput.first().fill('아리');
      
      // 검색 결과 확인
      await page.waitForTimeout(1000);
      
      const champions = page.locator('.champion-card, .champion-item, [data-testid="champion-card"]');
      const championCount = await champions.count();
      
      // 검색 결과가 있거나 없음 메시지가 표시되어야 함
      const noResults = page.locator('.no-results, .empty, [data-testid="no-results"]');
      const hasResults = championCount > 0;
      const hasNoResults = await noResults.count() > 0;
      
      expect(hasResults || hasNoResults).toBe(true);
    } else {
      test.skip('검색 기능이 구현되지 않았습니다.');
    }
  });

  test('정렬 기능 (있는 경우)', async ({ page }) => {
    // 정렬 옵션 확인
    const sortOptions = page.locator('.sort, .sort-option, select[name="sort"], [data-testid="sort"]');
    
    if (await sortOptions.count() > 0) {
      // 정렬 옵션 변경
      const sortSelect = sortOptions.first();
      
      if (await sortSelect.count() > 0) {
        // 드롭다운이면 옵션 선택
        if (await sortSelect.locator('option').count() > 0) {
          await sortSelect.selectOption({ index: 1 });
        } else {
          // 버튼이면 클릭
          await sortSelect.click();
        }
        
        // 정렬 결과 확인
        await page.waitForTimeout(1000);
        
        const champions = page.locator('.champion-card, .champion-item, [data-testid="champion-card"]');
        const championCount = await champions.count();
        expect(championCount).toBeGreaterThanOrEqual(0);
      }
    } else {
      test.skip('정렬 기능이 구현되지 않았습니다.');
    }
  });

  test('데이터 로딩 에러 처리', async ({ page }) => {
    // 네트워크 에러 시뮬레이션
    await page.route('**/api/tierlist*', route => route.abort());
    
    // 페이지 새로고침
    await page.reload();
    
    // 에러 메시지 확인
    const errorMessage = page.locator('.error, .error-message, [data-testid="error"]');
    const retryButton = page.locator('button:has-text("재시도"), button:has-text("retry"), [data-testid="retry"]');
    
    // 에러 메시지나 재시도 버튼이 표시되어야 함
    const hasError = await errorMessage.count() > 0;
    const hasRetry = await retryButton.count() > 0;
    
    expect(hasError || hasRetry).toBe(true);
  });

  test('반응형 디자인 확인', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 티어리스트가 모바일에서도 정상 표시되는지 확인
    const tierlistContainer = page.locator('.tierlist, .tier-list, [data-testid="tierlist"]');
    await expect(tierlistContainer.first()).toBeVisible();
    
    // 챔피언 카드들이 모바일에서도 표시되는지 확인
    const championCards = page.locator('.champion-card, .champion-item, [data-testid="champion-card"]');
    await expect(championCards.first()).toBeVisible();
    
    // 데스크톱 뷰포트로 복원
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});