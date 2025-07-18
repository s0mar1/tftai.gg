# E2E 테스트 가이드

## 개요

TFT Meta Analyzer는 Playwright를 사용하여 핵심 사용자 시나리오를 자동으로 테스트합니다. 이 E2E 테스트는 다음과 같은 기능들이 실제 사용자 관점에서 정상적으로 작동하는지 확인합니다:

- 📋 **홈페이지 기본 기능**: 페이지 로딩, 네비게이션, 다크모드 토글
- 🔍 **소환사 검색**: 검색 입력, 결과 표시, 에러 처리
- 🏆 **티어리스트**: 데이터 로딩, 필터링, 정렬
- 🤖 **AI 분석**: 분석 요청, 결과 표시, 로딩 상태 관리

## 테스트 구조

```
tests/e2e/
├── homepage.spec.ts        # 홈페이지 기본 기능 테스트
├── summoner-search.spec.ts # 소환사 검색 기능 테스트
├── tierlist.spec.ts        # 티어리스트 기능 테스트
└── ai-analysis.spec.ts     # AI 분석 기능 테스트
```

## 로컬 실행

### 1. 의존성 설치

```bash
# Playwright 설치
pnpm add -D @playwright/test

# 브라우저 설치
pnpm exec playwright install
```

### 2. 테스트 실행

#### 간단한 실행 (추천)
```bash
# 자동화된 스크립트 사용
./scripts/run-e2e-tests.sh
```

#### 수동 실행
```bash
# 1. 백엔드 서버 시작
cd backend
pnpm start &

# 2. 프론트엔드 서버 시작
cd frontend
pnpm preview &

# 3. E2E 테스트 실행
pnpm test:e2e
```

#### 추가 옵션
```bash
# UI 모드로 실행 (테스트 디버깅에 유용)
pnpm test:e2e:ui

# 디버그 모드로 실행
pnpm test:e2e:debug

# 테스트 리포트 보기
pnpm test:e2e:report
```

## CI/CD 통합

### GitHub Actions

E2E 테스트는 GitHub Actions를 통해 자동으로 실행됩니다:

1. **트리거**: `main`, `develop` 브랜치에 push 또는 PR 생성 시
2. **실행 순서**: 
   - 단위 테스트 및 린팅 → E2E 테스트 → 배포 준비
3. **결과**: 테스트 리포트와 실패 비디오가 아티팩트로 저장

### 워크플로우 파일

- `.github/workflows/ci.yml`: 전체 CI 파이프라인
- `.github/workflows/e2e-tests.yml`: E2E 테스트 전용 워크플로우

## 테스트 작성 가이드

### 1. 기본 구조

```typescript
import { test, expect } from '@playwright/test';

test.describe('기능 이름', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 실행
    await page.goto('/');
  });

  test('테스트 케이스 이름', async ({ page }) => {
    // 테스트 로직
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### 2. 선택자 우선순위

1. **data-testid 속성** (권장)
   ```typescript
   page.locator('[data-testid="search-button"]')
   ```

2. **의미있는 텍스트**
   ```typescript
   page.locator('button:has-text("검색")')
   ```

3. **CSS 클래스**
   ```typescript
   page.locator('.search-button')
   ```

4. **일반 선택자** (최후의 수단)
   ```typescript
   page.locator('button[type="submit"]')
   ```

### 3. 견고한 테스트 작성

```typescript
// ✅ 좋은 예: 여러 선택자 옵션 제공
const searchButton = page.locator(
  'button:has-text("검색"), button[type="submit"], [data-testid="search-button"]'
);

// ✅ 좋은 예: 적절한 대기 시간
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible({ timeout: 10000 });

// ✅ 좋은 예: 조건부 테스트
if (await element.count() > 0) {
  await expect(element).toBeVisible();
} else {
  test.skip('기능이 구현되지 않았습니다.');
}
```

### 4. 에러 처리

```typescript
// 네트워크 에러 시뮬레이션
await page.route('**/api/summoner**', route => route.abort());

// 콘솔 에러 모니터링
const consoleErrors: string[] = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});
```

## 모범 사례

### 1. 테스트 독립성
- 각 테스트는 다른 테스트에 의존하지 않아야 합니다
- `beforeEach`에서 초기 상태를 설정하세요

### 2. 실제 사용자 시나리오 반영
- 사용자가 실제로 수행할 작업을 테스트하세요
- 기술적 구현보다는 사용자 경험에 초점을 맞추세요

### 3. 유연한 선택자 사용
- 구현 변경에 영향받지 않는 선택자를 사용하세요
- 여러 선택자 옵션을 제공하여 견고성을 높이세요

### 4. 적절한 대기 시간
- 하드코딩된 `sleep` 대신 `waitFor` 메서드를 사용하세요
- 네트워크 요청은 `waitForLoadState('networkidle')`를 사용하세요

### 5. 조건부 테스트
- 구현되지 않은 기능은 `test.skip()`을 사용하세요
- 다양한 상황에 대응할 수 있도록 조건문을 활용하세요

## 디버깅

### 1. 테스트 실패 시 확인 사항

1. **스크린샷 확인**: `test-results/` 폴더의 스크린샷
2. **비디오 확인**: 실패한 테스트의 비디오 녹화
3. **콘솔 로그**: 브라우저 콘솔 에러 메시지
4. **네트워크 탭**: API 요청/응답 확인

### 2. 로컬 디버깅

```bash
# 디버그 모드로 실행 (브라우저가 열린 상태로 실행)
pnpm test:e2e:debug

# UI 모드로 실행 (테스트 실행 과정을 시각적으로 확인)
pnpm test:e2e:ui
```

### 3. 헤드리스 모드 해제

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    headless: false, // 브라우저 UI 표시
    slowMo: 1000,    // 액션 간 지연 시간
  },
});
```

## 성능 최적화

### 1. 병렬 실행
- 테스트는 기본적으로 병렬로 실행됩니다
- 공유 상태가 있는 테스트는 `test.describe.serial()` 사용

### 2. 브라우저 재사용
- 동일한 브라우저 컨텍스트에서 여러 테스트 실행
- 필요한 경우에만 새 컨텍스트 생성

### 3. 선택적 테스트 실행
```bash
# 특정 테스트 파일만 실행
pnpm test:e2e homepage.spec.ts

# 특정 테스트 케이스만 실행
pnpm test:e2e --grep "소환사 검색"
```

## 문제 해결

### 1. 브라우저 설치 오류
```bash
# 브라우저 재설치
pnpm exec playwright install --force

# 시스템 의존성 설치 (Linux)
sudo pnpm exec playwright install-deps
```

### 2. 타임아웃 오류
```typescript
// 타임아웃 증가
await expect(element).toBeVisible({ timeout: 30000 });

// 또는 전역 설정
export default defineConfig({
  timeout: 30000,
});
```

### 3. 서버 연결 오류
```bash
# 서버 상태 확인
curl http://localhost:4002/health
curl http://localhost:3000

# 포트 충돌 확인
lsof -i :4002
lsof -i :3000
```

## 결론

E2E 테스트는 TFT Meta Analyzer의 핵심 기능들이 실제 사용자 관점에서 정상적으로 작동하는지 확인하는 중요한 안전장치입니다. 

- 🔄 **지속적 통합**: 모든 코드 변경사항이 사용자 경험을 해치지 않음을 보장
- 🛡️ **회귀 방지**: 새로운 기능이 기존 기능을 손상시키지 않음을 확인
- 📊 **신뢰성**: 실제 브라우저 환경에서의 동작을 검증

정기적인 E2E 테스트 실행을 통해 안정적이고 신뢰할 수 있는 사용자 경험을 제공할 수 있습니다.