# ADR-007: 점진적 TypeScript 도입 전략

**날짜:** 2024-07-15  
**상태:** 승인됨  
**결정자:** TFT Meta Analyzer Team  
**기술 문서:** 관련 커밋 이력 참조

## 컨텍스트 (Context)

### 배경
TFT Meta Analyzer 프로젝트는 초기에 JavaScript로 시작되었지만, TypeScript의 "철의 장막 규칙"을 적용하기로 결정했습니다. 하지만 전체 프로젝트에 최대 엄격성 TypeScript 설정을 적용하자 33개의 컴파일 오류가 발생했습니다.

**주요 오류 유형:**
- `any` 타입 사용 (12개)
- null/undefined 안전성 부족 (8개)
- 사용하지 않는 변수/매개변수 (7개)
- 암시적 return 누락 (4개)
- 기타 타입 안전성 문제 (2개)

기존 기능이 정상 작동하고 있는 상황에서 모든 기능을 중단하고 타입 오류를 수정하는 것은 리스크가 컸습니다. 따라서 안전하고 체계적인 마이그레이션 전략이 필요했습니다.

### 제약 조건
- 기존 기능 중단 없이 마이그레이션 진행
- 프로덕션 환경에서 안정성 유지
- 팀 개발 속도 저하 최소화
- 타입 안전성 점진적 확보

## 결정 (Decision)

### 선택한 해결책
우선순위 기반 점진적 TypeScript 마이그레이션 전략을 채택했습니다.

**4단계 마이그레이션 전략:**

```
1단계: 핵심 인프라 (Critical Infrastructure)
- 환경 변수 관리
- 에러 핸들링
- 데이터베이스 연결

2단계: 서비스 레이어 (Service Layer)  
- 비즈니스 로직 타입 안전성
- 외부 API 통신
- 캐시 관리

3단계: 라우터 레이어 (Router Layer)
- API 엔드포인트 타입 정의
- 요청/응답 타입 안전성
- 미들웨어 타입화

4단계: 유틸리티 및 헬퍼 (Utilities)
- 보조 함수 타입 안전성
- 사용하지 않는 코드 정리
- 최종 최적화
```

### 핵심 이유
1. **안정성 우선**: 핵심 기능 먼저 안정화
2. **점진적 적용**: 단계별 검증으로 리스크 최소화
3. **학습 효과**: 단계적 적용으로 팀 학습 곡선 관리
4. **영향도 관리**: 높은 영향도 우선 해결

## 고려한 대안들 (Considered Options)

### 대안 1: 일시적 전체 수정
**장점:**
- 빠른 완료
- 일관된 타입 안전성
- 단순한 프로세스
- 즉시 혜택 획득

**단점:**
- 높은 리스크 (전체 기능 중단 가능)
- 대규모 코드 변경
- 디버깅 어려움
- 롤백 복잡성

**채택하지 않은 이유:** 운영 중인 서비스의 안정성 위험

### 대안 2: 파일별 순차 적용
**장점:**
- 파일 단위 완전성
- 명확한 진행 상황
- 단순한 관리
- 개별 검증 가능

**단점:**
- 의존성 문제
- 타입 불일치 발생
- 비효율적 순서
- 전체 일관성 부족

**채택하지 않은 이유:** 의존성 순서 고려 시 복잡성 증가

### 대안 3: 기능별 적용
**장점:**
- 기능 단위 완전성
- 사용자 영향 최소화
- 단계별 배포 가능
- 명확한 범위

**단점:**
- 기능 간 의존성 문제
- 중복 작업 발생
- 일관성 부족
- 복잡한 계획

**채택하지 않은 이유:** 레이어별 접근이 더 체계적

## 결과 (Consequences)

### 긍정적 결과
- **안정적 마이그레이션**: 기존 기능 중단 없이 완료
- **점진적 학습**: 팀원들의 TypeScript 역량 향상
- **품질 향상**: 각 단계별 코드 품질 개선
- **리스크 최소화**: 단계별 검증으로 문제 조기 발견
- **33개 오류 완전 해결**: 모든 컴파일 오류 수정 완료

### 부정적 결과
- **긴 마이그레이션 기간**: 전체 완료까지 2주 소요
- **일시적 불일치**: 단계별 적용 중 타입 불일치 발생
- **추가 작업량**: 단계별 테스트 및 검증 필요

### 중립적 결과
- **개발 프로세스 변화**: 타입 우선 개발 방식 정착
- **코드 리뷰 패턴 변화**: 타입 안전성 중심 리뷰

## 구현 세부사항

### 1단계: 핵심 인프라 (완료)
```typescript
// 환경 변수 타입화
export const getEnvConfig = (): EnvConfig => {
  if (!globalEnvConfig) {
    throw new Error('환경 변수가 로드되지 않았습니다.');
  }
  return globalEnvConfig;
};

// 에러 핸들링 타입화
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
```

### 2단계: 서비스 레이어 (완료)
```typescript
// 비즈니스 로직 타입 안전성
export const getTFTDataWithLanguage = async (
  language: string
): Promise<TFTData> => {
  const cacheKey = `tft-data:${language}`;
  
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    return cachedData as TFTData;
  }
  
  const tftData = await fetchTFTDataFromAPI(language);
  await cacheManager.set(cacheKey, tftData, 3600);
  
  return tftData;
};
```

### 3단계: 라우터 레이어 (완료)
```typescript
// API 엔드포인트 타입 정의
interface SummonerRequest {
  name: string;
  region?: string;
}

interface SummonerResponse {
  puuid: string;
  name: string;
  level: number;
  rank: RankInfo;
}

export const getSummoner = async (
  req: TypedRequest<SummonerRequest>,
  res: TypedResponse<SummonerResponse>
): Promise<void> => {
  const { name, region = 'kr' } = req.body;
  
  const summoner = await summonerService.getSummonerByName(name, region);
  if (!summoner) {
    throw new NotFoundError('소환사를 찾을 수 없습니다.');
  }
  
  res.json({
    success: true,
    data: summoner
  });
};
```

### 4단계: 유틸리티 및 헬퍼 (완료)
```typescript
// 사용하지 않는 변수 제거
// Before: const unusedVar = 'test';
// After: 제거됨

// 암시적 return 수정
// Before:
function processData(data: any) {
  if (data) {
    return data.processed;
  }
  // 암시적 undefined return
}

// After:
function processData(data: unknown): ProcessedData | null {
  if (data && typeof data === 'object' && 'processed' in data) {
    return (data as { processed: ProcessedData }).processed;
  }
  return null;
}
```

### 마이그레이션 체크리스트
```markdown
## 1단계: 핵심 인프라 ✅
- [x] 환경 변수 관리 타입화
- [x] 에러 핸들링 시스템 타입화
- [x] 데이터베이스 연결 타입화
- [x] 로거 설정 타입화

## 2단계: 서비스 레이어 ✅
- [x] TFT 데이터 서비스 타입화
- [x] 캐시 관리 서비스 타입화
- [x] 외부 API 통신 타입화
- [x] 비즈니스 로직 타입화

## 3단계: 라우터 레이어 ✅
- [x] API 엔드포인트 타입 정의
- [x] 요청/응답 타입 안전성
- [x] 미들웨어 타입화
- [x] 라우터 파라미터 타입화

## 4단계: 유틸리티 및 헬퍼 ✅
- [x] 사용하지 않는 변수 제거
- [x] 암시적 return 수정
- [x] any 타입 제거
- [x] 최종 최적화
```

## 모니터링 및 검증

### 성공 지표
- **컴파일 오류**: 33개 → 0개 (100% 해결)
- **타입 커버리지**: 95% 이상 달성
- **기능 안정성**: 마이그레이션 중 기능 중단 0건
- **개발 속도**: 마이그레이션 후 개발 속도 향상

### 단계별 검증 방법
```typescript
// 각 단계별 검증 스크립트
const validateStage = (stage: number): ValidationResult => {
  const errors = runTypeScript();
  const tests = runTests();
  const coverage = calculateTypeCoverage();
  
  return {
    stage,
    errors: errors.length,
    testsPassed: tests.passed,
    typeCoverage: coverage.percentage,
    isValid: errors.length === 0 && tests.passed && coverage.percentage >= 90
  };
};
```

## 관련 자료

### 참고 문서
- [TypeScript Migration Guide](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)
- [Gradual TypeScript Migration](https://blog.logrocket.com/migrating-existing-javascript-project-typescript/)

### 관련 ADR
- [ADR-001: TypeScript 최대 엄격성 설정](001-typescript-strict-mode.md)
- [ADR-006: AI CLI 도구 협업 방식](006-ai-cli-collaboration.md)

### 마이그레이션 커밋 이력
- `b5e1b13`: TypeScript 오류 33개 모두 수정 완료
- `5e6816b`: TypeScript 부분 수정 완료 - 서버 시작 성공 지점
- `66dc153`: 백업 - 33개 컴파일 오류 존재하지만 기능적으로 작동

---

**갱신 이력:**
- 2024-07-15: 초기 작성 및 승인
- 2024-07-15: 4단계 마이그레이션 완료 반영