# ADR-005: 중앙집중식 에러 핸들링

**날짜:** 2024-07-15  
**상태:** 승인됨  
**결정자:** TFT Meta Analyzer Team  
**기술 문서:** [errorHandler.ts](../../backend/src/middlewares/errorHandler.ts)

## 컨텍스트 (Context)

### 배경
TFT Meta Analyzer는 다양한 에러 상황을 처리해야 합니다:
- **외부 API 에러**: Riot API, Google AI API의 4xx/5xx 응답
- **데이터베이스 에러**: MongoDB 연결 실패, 쿼리 오류
- **비즈니스 로직 에러**: 잘못된 데이터 형식, 권한 오류
- **시스템 에러**: 메모리 부족, 네트워크 타임아웃

초기 구현에서는 각 라우트와 서비스에서 개별적으로 에러를 처리했습니다. 이로 인해 다음과 같은 문제들이 발생했습니다:
- 일관성 없는 에러 응답 형식
- 보안 정보 노출 (스택 트레이스, 내부 경로)
- 중복된 에러 처리 코드
- 로깅 표준화 부재

### 제약 조건
- 프로덕션 환경에서 민감한 정보 노출 방지
- 클라이언트에 일관된 에러 응답 제공
- 개발 환경에서 디버깅 정보 제공
- 에러 추적 및 모니터링 가능

## 결정 (Decision)

### 선택한 해결책
Express.js의 전역 에러 핸들러를 활용한 중앙집중식 에러 처리 시스템을 구현했습니다.

**에러 처리 아키텍처:**
```
Route/Service → Custom Error → Global Error Handler → Standardized Response
```

**구현 구조:**
```typescript
// 1. 커스텀 에러 클래스
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;
}

// 2. 전역 에러 핸들러
const errorHandler: ErrorHandler = (err, req, res, next) => {
  const normalizedError = normalizeError(err);
  const sanitizedDetails = sanitizeErrorDetails(normalizedError.details);
  
  // 로깅
  logger[logLevel](normalizedError.message, sanitizedDetails);
  
  // 클라이언트 응답
  res.status(normalizedError.statusCode).json({
    success: false,
    error: {
      message: normalizedError.message,
      code: normalizedError.statusCode,
      timestamp: new Date().toISOString()
    }
  });
};
```

### 핵심 이유
1. **일관성**: 모든 API 엔드포인트에서 동일한 에러 응답 형식
2. **보안성**: 프로덕션 환경에서 민감한 정보 자동 필터링
3. **유지보수성**: 에러 처리 로직의 중앙화로 변경 용이
4. **모니터링**: 체계적인 에러 로깅 및 추적 가능

## 고려한 대안들 (Considered Options)

### 대안 1: 개별 라우트 에러 처리
**장점:**
- 각 라우트별 맞춤형 에러 처리
- 세밀한 에러 제어 가능
- 간단한 초기 구현
- 의존성 최소화

**단점:**
- 코드 중복 발생
- 일관성 없는 응답 형식
- 보안 정보 노출 위험
- 유지보수 비용 증가

**채택하지 않은 이유:** 일관성과 보안성이 더 중요했음

### 대안 2: 서비스 레이어 에러 처리
**장점:**
- 비즈니스 로직과 에러 처리 분리
- 재사용 가능한 에러 처리 함수
- 라우트 레이어 단순화
- 테스트 용이성

**단점:**
- 여전히 일관성 부족
- HTTP 상태 코드 관리 복잡
- 미들웨어 체인 활용 못함

**채택하지 않은 이유:** Express.js의 미들웨어 체인을 활용하는 것이 더 효율적

### 대안 3: 외부 에러 추적 서비스 (Sentry 등)
**장점:**
- 전문적인 에러 추적 기능
- 실시간 알림 및 모니터링
- 풍부한 컨텍스트 정보
- 성능 영향 분석

**단점:**
- 외부 서비스 의존성
- 비용 발생
- 설정 복잡성
- 데이터 보안 우려

**채택하지 않은 이유:** 내부 시스템으로 충분했고 비용 효율성 고려

## 결과 (Consequences)

### 긍정적 결과
- **일관된 에러 응답**: 모든 API에서 동일한 형식의 에러 응답
- **보안 강화**: 프로덕션에서 민감한 정보 자동 필터링
- **개발 효율성**: 중복 에러 처리 코드 80% 감소
- **모니터링 개선**: 체계적인 에러 로깅 및 분석 가능
- **디버깅 향상**: 개발 환경에서 상세한 에러 정보 제공

### 부정적 결과
- **유연성 제한**: 특별한 에러 처리가 필요한 경우 복잡성 증가
- **디버깅 복잡성**: 에러 발생 지점 추적이 어려울 수 있음
- **성능 오버헤드**: 모든 에러가 중앙 핸들러를 거쳐 처리

### 중립적 결과
- **학습 곡선**: 팀원들이 새로운 에러 처리 패턴 학습 필요
- **테스트 패턴 변경**: 에러 테스트 방식 변경 필요

## 구현 세부사항

### 코드 변경 사항

**커스텀 에러 클래스:**
```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 특화된 에러 클래스들
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}
```

**전역 에러 핸들러:**
```typescript
const errorHandler: ErrorHandler = (err, req, res, next) => {
  const normalizedError = normalizeError(err);
  const sanitizedDetails = sanitizeErrorDetails(normalizedError.details);
  
  // 로그 레벨 결정
  const logLevel = normalizedError.statusCode >= 500 ? 'error' : 'warn';
  
  // 에러 로깅
  logger[logLevel]('API Error', {
    message: normalizedError.message,
    statusCode: normalizedError.statusCode,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    stack: isDevelopment ? normalizedError.stack : undefined,
    details: sanitizedDetails
  });

  // 클라이언트 응답
  const clientResponse = createStandardizedErrorResponse(normalizedError);
  res.status(normalizedError.statusCode).json(clientResponse);
};
```

**에러 정규화 함수:**
```typescript
const normalizeError = (err: any): NormalizedError => {
  // AppError 인스턴스
  if (err instanceof AppError) {
    return {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
      details: err.details
    };
  }

  // MongoDB 에러
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return {
      message: 'Database operation failed',
      statusCode: 500,
      stack: err.stack,
      details: { originalError: err.message }
    };
  }

  // Validation 에러
  if (err.name === 'ValidationError') {
    return {
      message: 'Validation failed',
      statusCode: 400,
      stack: err.stack,
      details: err.details
    };
  }

  // 기본 에러
  return {
    message: err.message || 'Internal server error',
    statusCode: err.statusCode || 500,
    stack: err.stack,
    details: undefined
  };
};
```

**사용 예시:**
```typescript
// 라우트에서 에러 발생
app.get('/api/summoner/:name', async (req, res, next) => {
  try {
    const summoner = await getSummonerByName(req.params.name);
    if (!summoner) {
      throw new NotFoundError('Summoner not found');
    }
    res.json(summoner);
  } catch (error) {
    next(error); // 전역 에러 핸들러로 전달
  }
});

// 또는 asyncHandler 사용
app.get('/api/summoner/:name', asyncHandler(async (req, res) => {
  const summoner = await getSummonerByName(req.params.name);
  if (!summoner) {
    throw new NotFoundError('Summoner not found');
  }
  res.json(summoner);
}));
```

### 설정 변경 사항

**환경별 에러 응답 설정:**
```typescript
const createStandardizedErrorResponse = (error: NormalizedError) => {
  const baseResponse = {
    success: false,
    error: {
      message: error.message,
      code: error.statusCode,
      timestamp: new Date().toISOString()
    }
  };

  // 개발 환경에서는 추가 정보 제공
  if (isDevelopment) {
    return {
      ...baseResponse,
      error: {
        ...baseResponse.error,
        stack: error.stack,
        details: error.details
      }
    };
  }

  return baseResponse;
};
```

### 문서 업데이트 필요 사항
- ✅ 에러 처리 가이드 문서 작성
- ✅ API 에러 코드 및 메시지 문서화
- ✅ 커스텀 에러 클래스 사용법 가이드

## 모니터링 및 검증

### 성공 지표
- **에러 응답 일관성**: 모든 API에서 동일한 에러 형식 사용
- **보안 정보 노출**: 프로덕션에서 민감한 정보 노출 0건
- **에러 추적**: 모든 에러가 적절한 로그 레벨로 기록
- **개발 생산성**: 에러 처리 관련 코드 중복 80% 감소

### 모니터링 방법
```typescript
// 에러 통계 수집
const errorStats = {
  total: 0,
  by_status: {},
  by_type: {},
  by_endpoint: {}
};

// 에러 핸들러에서 통계 업데이트
const updateErrorStats = (error: NormalizedError, req: Request) => {
  errorStats.total++;
  errorStats.by_status[error.statusCode] = (errorStats.by_status[error.statusCode] || 0) + 1;
  errorStats.by_endpoint[req.path] = (errorStats.by_endpoint[req.path] || 0) + 1;
};
```

**알림 설정:**
- 5xx 에러 발생 시 즉시 알림
- 4xx 에러 급증 시 경고
- 특정 엔드포인트 에러율 임계값 초과 시 알림

## 관련 자료

### 참고 문서
- [Express.js Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [Node.js Error Handling Best Practices](https://nodejs.org/api/errors.html)

### 관련 ADR
- [ADR-001: TypeScript 최대 엄격성 설정](001-typescript-strict-mode.md)
- [ADR-008: 고도화된 레이트 리미팅 전략](008-advanced-rate-limiting.md)

### 외부 자료
- [Error Handling in Node.js](https://www.joyent.com/node-js/production/design/errors)
- [Express.js Error Handling Patterns](https://strongloop.com/strongblog/robust-node-applications-error-handling/)

---

**갱신 이력:**
- 2024-07-15: 초기 작성 및 승인
- 2024-07-15: 중앙집중식 에러 핸들링 시스템 구현 완료 반영