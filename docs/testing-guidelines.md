# 🧪 TFT Meta Analyzer 테스트 가이드라인

## 📋 현재 테스트 환경 상태

### ✅ 기존 작동 중인 테스트 파일들 (보존됨)
```
루트 레벨 임시 테스트 파일들 (삭제하지 마세요):
- test-api.js
- test-frontend-data.js  
- test-frontend-manual.js
- test-integration.js
- debug-frontend-context.js

백엔드 임시 테스트 파일들 (삭제하지 마세요):
- backend/test-cache.js
- backend/test-refactored-server.cjs
- backend/test-server.js
- backend/test-summoner-api.js
- backend/test-tft-data.js
- backend/debug-server.js
```

### 🎯 표준화된 TypeScript 테스트 구조

#### 백엔드 테스트 구조
```
backend/src/
├── __tests__/              # 통합 테스트
├── services/
│   └── __tests__/          # 서비스 테스트 (✅ 이미 구현됨)
├── routes/
│   └── __tests__/          # 라우터 테스트 (✅ 이미 구현됨)
├── middlewares/
│   └── __tests__/          # 미들웨어 테스트 (✅ 이미 구현됨)
└── utils/
    └── __tests__/          # 유틸리티 테스트 (✅ 이미 구현됨)
```

#### 프론트엔드 테스트 구조
```
frontend/src/
├── components/
│   └── **/__tests__/       # 컴포넌트 테스트 (✅ 이미 구현됨)
├── hooks/
│   └── __tests__/          # 훅 테스트 (✅ 이미 구현됨)
├── pages/
│   └── **/__tests__/       # 페이지 테스트 (✅ 이미 구현됨)
└── utils/
    └── __tests__/          # 유틸리티 테스트
```

## 📝 새로운 테스트 작성 규칙

### 파일 네이밍 컨벤션
- **TypeScript 테스트**: `*.test.ts` 또는 `*.test.tsx`
- **기존 임시 테스트**: `test-*.js` (계속 사용 가능)

### TypeScript 테스트 템플릿

#### 백엔드 서비스 테스트
```typescript
// src/services/__tests__/newService.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NewService } from '../newService';

describe('NewService', () => {
  let service: NewService;

  beforeEach(() => {
    service = new NewService();
  });

  afterEach(() => {
    // 정리 작업
  });

  describe('methodName', () => {
    it('should return expected result', async () => {
      // Arrange
      const input = 'test-input';
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual(expectedResult);
    });
  });
});
```

#### 프론트엔드 컴포넌트 테스트
```typescript
// src/components/common/__tests__/NewComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { NewComponent } from '../NewComponent';

describe('NewComponent', () => {
  it('should render correctly', () => {
    // Arrange & Act
    render(<NewComponent />);
    
    // Assert
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    // Arrange
    const onClickMock = jest.fn();
    render(<NewComponent onClick={onClickMock} />);
    
    // Act
    fireEvent.click(screen.getByRole('button'));
    
    // Assert
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
```

## 🔄 마이그레이션 전략 (점진적)

### Phase 1: 새로운 기능에만 TypeScript 테스트 적용
- 새로 생성되는 모든 파일에 TypeScript 테스트 작성
- 기존 `test-*.js` 파일들은 그대로 유지

### Phase 2: 기존 테스트 점진적 마이그레이션 (선택사항)
- 수정이 필요한 파일이 있을 때만 TypeScript로 변환
- 강제 마이그레이션은 하지 않음

### Phase 3: 임시 테스트 파일 정리 (나중에)
- 모든 기능이 정식 테스트로 커버된 후에만 고려
- 현재는 절대 삭제하지 않음

## 🛡️ 안전 규칙

### DO (권장사항)
- ✅ 새로운 기능에는 TypeScript 테스트 작성
- ✅ 기존 `__tests__` 구조 활용
- ✅ Jest + Testing Library 사용
- ✅ 테스트 격리 보장

### DON'T (금지사항)
- ❌ 기존 `test-*.js` 파일 삭제 금지
- ❌ 작동하는 테스트 수정 금지
- ❌ 강제 마이그레이션 금지
- ❌ 테스트 환경 설정 임의 변경 금지

## 📊 현재 테스트 커버리지 상태

### 백엔드
- Services: 15개 파일에 테스트 있음 ✅
- Routes: 13개 파일에 테스트 있음 ✅
- Utils: 일부 테스트 있음 ✅
- Controllers: 2개 파일에 테스트 있음 ✅

### 프론트엔드
- Components: 9개 파일에 테스트 있음 ✅
- Hooks: 1개 파일에 테스트 있음 ✅
- Pages: 2개 파일에 테스트 있음 ✅

## 🎯 향후 개선 방향

1. **테스트 커버리지 확대** (기존 코드 건드리지 않고)
2. **TypeScript 타입 테스트** (새로운 기능에만)
3. **E2E 테스트 도입 검토** (별도 구조로)
4. **성능 테스트 추가** (기존과 독립적으로)

---

**⚠️ 중요 알림**: 이 가이드라인은 기존 작동하는 테스트 파일들을 보호하면서 새로운 표준을 도입하기 위한 것입니다. 기존 `test-*.js` 파일들은 절대 삭제하거나 수정하지 마세요.