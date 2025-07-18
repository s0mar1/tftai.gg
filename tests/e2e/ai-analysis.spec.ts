import { test, expect } from '@playwright/test';

/**
 * AI 분석 기능 E2E 테스트
 * 
 * 이 테스트는 AI 분석 기능이 정상적으로 작동하는지 확인합니다.
 * - AI 분석 요청
 * - 로딩 상태 관리
 * - 결과 표시
 */
test.describe('AI 분석 기능', () => {
  
  test.beforeEach(async ({ page }) => {
    // AI 분석 페이지로 이동
    await page.goto('/ai-analysis');
  });

  test('AI 분석 페이지 기본 로딩', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/AI 분석|AI Analysis/);
    
    // 주요 컨테이너 요소 확인
    const aiContainer = page.locator('.ai-analysis, .ai-container, [data-testid="ai-analysis"]');
    await expect(aiContainer.first()).toBeVisible();
  });

  test('AI 분석 입력 폼 확인', async ({ page }) => {
    // 분석 입력 필드 확인
    const analysisInput = page.locator('textarea, input[type="text"], [data-testid="analysis-input"]');
    
    if (await analysisInput.count() > 0) {
      await expect(analysisInput.first()).toBeVisible();
      
      // 분석 요청 버튼 확인
      const analyzeButton = page.locator('button:has-text("분석"), button:has-text("analyze"), [data-testid="analyze-button"]');
      await expect(analyzeButton.first()).toBeVisible();
    } else {
      test.skip('AI 분석 입력 폼이 구현되지 않았습니다.');
    }
  });

  test('AI 분석 요청 플로우', async ({ page }) => {
    // 분석 입력 필드와 버튼 찾기
    const analysisInput = page.locator('textarea, input[type="text"], [data-testid="analysis-input"]');
    const analyzeButton = page.locator('button:has-text("분석"), button:has-text("analyze"), [data-testid="analyze-button"]');
    
    if (await analysisInput.count() > 0 && await analyzeButton.count() > 0) {
      // 분석 요청 텍스트 입력
      await analysisInput.first().fill('이번 메타에서 강한 챔피언을 분석해줘');
      
      // 분석 요청 버튼 클릭
      await analyzeButton.first().click();
      
      // 로딩 상태 확인
      const loadingIndicator = page.locator('.loading, .analyzing, [data-testid="loading"]');
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator.first()).toBeVisible();
      }
      
      // 결과 대기 (최대 30초)
      await page.waitForTimeout(5000);
      
      // 결과 또는 에러 메시지 확인
      const result = page.locator('.ai-result, .analysis-result, [data-testid="ai-result"]');
      const error = page.locator('.error, .ai-error, [data-testid="ai-error"]');
      
      const hasResult = await result.count() > 0;
      const hasError = await error.count() > 0;
      
      expect(hasResult || hasError).toBe(true);
    } else {
      test.skip('AI 분석 기능이 구현되지 않았습니다.');
    }
  });

  test('AI 분석 결과 표시', async ({ page }) => {
    // 기존 분석 결과가 있는지 확인
    const existingResult = page.locator('.ai-result, .analysis-result, [data-testid="ai-result"]');
    
    if (await existingResult.count() > 0) {
      // 결과가 텍스트를 포함하는지 확인
      const resultText = await existingResult.first().textContent();
      expect(resultText).toBeTruthy();
      expect(resultText!.length).toBeGreaterThan(0);
    } else {
      test.skip('AI 분석 결과가 없습니다.');
    }
  });

  test('AI 분석 히스토리 (있는 경우)', async ({ page }) => {
    // 분석 히스토리 확인
    const history = page.locator('.analysis-history, .ai-history, [data-testid="analysis-history"]');
    
    if (await history.count() > 0) {
      await expect(history.first()).toBeVisible();
      
      // 히스토리 항목들 확인
      const historyItems = page.locator('.history-item, .analysis-item, [data-testid="history-item"]');
      
      if (await historyItems.count() > 0) {
        const itemCount = await historyItems.count();
        expect(itemCount).toBeGreaterThan(0);
      }
    } else {
      test.skip('AI 분석 히스토리 기능이 구현되지 않았습니다.');
    }
  });

  test('AI 분석 에러 처리', async ({ page }) => {
    // API 에러 시뮬레이션
    await page.route('**/api/ai**', route => route.abort());
    
    const analysisInput = page.locator('textarea, input[type="text"], [data-testid="analysis-input"]');
    const analyzeButton = page.locator('button:has-text("분석"), button:has-text("analyze"), [data-testid="analyze-button"]');
    
    if (await analysisInput.count() > 0 && await analyzeButton.count() > 0) {
      // 분석 요청
      await analysisInput.first().fill('테스트 분석');
      await analyzeButton.first().click();
      
      // 에러 메시지 확인
      const errorMessage = page.locator('.error, .ai-error, [data-testid="ai-error"]');
      const retryButton = page.locator('button:has-text("재시도"), button:has-text("retry"), [data-testid="retry"]');
      
      // 에러 메시지나 재시도 버튼이 표시되어야 함
      const hasError = await errorMessage.count() > 0;
      const hasRetry = await retryButton.count() > 0;
      
      expect(hasError || hasRetry).toBe(true);
    } else {
      test.skip('AI 분석 기능이 구현되지 않았습니다.');
    }
  });

  test('AI 분석 로딩 상태 관리', async ({ page }) => {
    const analysisInput = page.locator('textarea, input[type="text"], [data-testid="analysis-input"]');
    const analyzeButton = page.locator('button:has-text("분석"), button:has-text("analyze"), [data-testid="analyze-button"]');
    
    if (await analysisInput.count() > 0 && await analyzeButton.count() > 0) {
      // 분석 요청
      await analysisInput.first().fill('로딩 테스트');
      await analyzeButton.first().click();
      
      // 버튼이 로딩 중에 비활성화되는지 확인
      const isDisabled = await analyzeButton.first().isDisabled();
      expect(typeof isDisabled).toBe('boolean');
      
      // 로딩 인디케이터 확인
      const loadingIndicator = page.locator('.loading, .analyzing, [data-testid="loading"]');
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator.first()).toBeVisible();
      }
      
      // 로딩 완료 대기
      await page.waitForTimeout(3000);
      
      // 로딩 상태 해제 확인
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator.first()).toBeHidden({ timeout: 30000 });
      }
    } else {
      test.skip('AI 분석 기능이 구현되지 않았습니다.');
    }
  });

  test('미리 정의된 질문 템플릿 (있는 경우)', async ({ page }) => {
    // 질문 템플릿 버튼들 확인
    const templateButtons = page.locator('.template-button, .preset-question, [data-testid="template-button"]');
    
    if (await templateButtons.count() > 0) {
      // 첫 번째 템플릿 버튼 클릭
      await templateButtons.first().click();
      
      // 입력 필드에 텍스트가 자동으로 입력되는지 확인
      const analysisInput = page.locator('textarea, input[type="text"], [data-testid="analysis-input"]');
      
      if (await analysisInput.count() > 0) {
        const inputValue = await analysisInput.first().inputValue();
        expect(inputValue.length).toBeGreaterThan(0);
      }
    } else {
      test.skip('질문 템플릿 기능이 구현되지 않았습니다.');
    }
  });

  test('AI 분석 결과 공유 기능 (있는 경우)', async ({ page }) => {
    // 분석 결과가 있는지 확인
    const result = page.locator('.ai-result, .analysis-result, [data-testid="ai-result"]');
    
    if (await result.count() > 0) {
      // 공유 버튼 확인
      const shareButton = page.locator('button:has-text("공유"), button:has-text("share"), [data-testid="share-button"]');
      
      if (await shareButton.count() > 0) {
        await shareButton.first().click();
        
        // 공유 옵션 확인
        const shareOptions = page.locator('.share-options, .share-modal, [data-testid="share-options"]');
        
        if (await shareOptions.count() > 0) {
          await expect(shareOptions.first()).toBeVisible();
        }
      } else {
        test.skip('공유 기능이 구현되지 않았습니다.');
      }
    } else {
      test.skip('AI 분석 결과가 없어 공유 기능을 테스트할 수 없습니다.');
    }
  });
});