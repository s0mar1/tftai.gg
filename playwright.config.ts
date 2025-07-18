import { defineConfig, devices } from '@playwright/test';

/**
 * TFT Meta Analyzer E2E 테스트 설정
 * 
 * 이 설정은 핵심 사용자 시나리오를 테스트하여 기능 회귀를 방지합니다.
 * - 소환사 검색
 * - 티어리스트 조회
 * - 다크모드 토글
 * - AI 분석 기능
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* 병렬 테스트 실행 */
  fullyParallel: true,
  
  /* CI에서 실패 시 재시도 방지 */
  forbidOnly: !!process.env.CI,
  
  /* 실패 시 재시도 횟수 */
  retries: process.env.CI ? 2 : 0,
  
  /* 병렬 작업자 수 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 테스트 리포터 설정 */
  reporter: 'html',
  
  /* 공통 테스트 설정 */
  use: {
    /* 베이스 URL */
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    
    /* 실패 시 스크린샷 수집 */
    screenshot: 'only-on-failure',
    
    /* 실패 시 비디오 녹화 */
    video: 'retain-on-failure',
    
    /* 테스트 추적 (디버깅용) */
    trace: 'on-first-retry',
  },

  /* 프로젝트별 브라우저 설정 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    /* 모바일 테스트 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 개발 서버 설정 */
  webServer: process.env.CI ? undefined : {
    command: 'cd frontend && pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});