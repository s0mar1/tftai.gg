# TFT Meta Analyzer 서버 리팩토링 가이드

## 개요
이 문서는 TFT Meta Analyzer 백엔드 서버의 리팩토링 과정과 새로운 구조를 설명합니다.

## 주요 변경사항

### 1. 서버 초기화 순서 개선

#### 기존 구조 (server.ts)
```
1. Express 앱 생성
2. dotenv.config() (늦은 시점)
3. Phase 1: MongoDB & Redis 연결
4. Phase 2: TFT 데이터 로드
5. Phase 3: 초기 데이터 분석 (동기적)
6. Phase 4: Express 설정 및 스케줄러
```

#### 새로운 구조 (server-refactored.ts)
```
0. 환경 변수 로드 및 검증 (가장 먼저!)
1. 외부 서비스 연결 (MongoDB & Redis)
2. 정적 데이터 로드 (Community Dragon)
3. 핵심 모듈 초기화
4. 라우팅 설정
5. 초기 데이터 수집 (비동기 옵션)
6. 서버 리스닝 시작
```

### 2. 모듈화된 초기화 구조

새로운 구조는 각 초기화 단계를 독립적인 모듈로 분리했습니다:

- `initialization/envLoader.ts`: 환경 변수 관리
- `initialization/externalServices.ts`: DB/캐시 연결
- `initialization/staticDataLoader.ts`: 정적 데이터 로드
- `initialization/coreModules.ts`: 핵심 모듈 초기화
- `initialization/routeSetup.ts`: 라우팅 설정

### 3. 환경 변수 개선

#### 새로운 환경 변수
```bash
# 초기 데이터 수집 제어
ENABLE_INITIAL_DATA_COLLECTION=false  # 기본값: false (서버 빠른 시작)
INITIAL_DATA_COLLECTION_DELAY=30000   # 백그라운드 실행 지연 시간 (ms)
DATA_COLLECTION_TIMEOUT=300000        # 데이터 수집 타임아웃 (ms)

# 연결 타임아웃 설정
MONGODB_TIMEOUT=10000                 # MongoDB 연결 타임아웃 (ms)
REDIS_TIMEOUT=10000                   # Redis 연결 타임아웃 (ms)

# 정적 데이터 언어 설정
STATIC_DATA_LANGUAGES=ko,en,ja,fr     # 로드할 언어 목록
```

### 4. 에러 처리 개선

- 각 초기화 단계별 독립적인 에러 처리
- 필수/선택 서비스 구분
- 상세한 에러 로깅 및 복구 전략

### 5. 성능 최적화

- 병렬 언어 데이터 로드
- 비동기 초기 데이터 수집 옵션
- 캐시 우선 전략

## 마이그레이션 가이드

### 1단계: 테스트
```bash
# 새 서버 구조 테스트 (포트 4002)
node test-refactored-server.js
```

### 2단계: 환경 변수 업데이트
`.env` 파일에 새로운 환경 변수 추가:
```env
ENABLE_INITIAL_DATA_COLLECTION=false
INITIAL_DATA_COLLECTION_DELAY=30000
```

### 3단계: package.json 스크립트 업데이트
```json
{
  "scripts": {
    "start": "node dist/server-refactored.js",
    "start:old": "node dist/server.js",
    "dev": "nodemon src/server-refactored.ts",
    "dev:old": "nodemon src/server.ts"
  }
}
```

### 4단계: 점진적 마이그레이션
1. 먼저 개발 환경에서 새 서버 구조 테스트
2. 문제가 없으면 스테이징 환경에 배포
3. 최종적으로 프로덕션 환경에 배포

## 롤백 계획

문제 발생 시 기존 server.ts로 즉시 롤백 가능:
```bash
npm run start:old
```

## 모니터링 포인트

새 서버 구조 배포 후 다음 항목들을 모니터링:

1. **서버 시작 시간**: 이전보다 빨라야 함
2. **메모리 사용량**: 초기화 단계별 메모리 사용 확인
3. **에러 로그**: 새로운 에러 패턴 확인
4. **API 응답 시간**: 정적 데이터 로드 영향 확인

## 추가 개선 사항

### 향후 계획
1. 초기화 상태 대시보드 구현
2. 건강 체크 엔드포인트 강화
3. 초기화 메트릭 수집 및 분석
4. 다중 인스턴스 지원

### 성능 최적화 옵션
1. 정적 데이터 CDN 캐싱
2. 데이터베이스 연결 풀 최적화
3. Redis 클러스터 지원

## 문의사항

리팩토링 관련 문의사항이 있으면 이슈를 생성해주세요.