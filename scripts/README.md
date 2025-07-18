# TFT Meta Analyzer - 테스트 스크립트 가이드

이 디렉터리는 프로젝트의 테스트, 디버깅, 유틸리티 스크립트들을 체계적으로 관리하는 곳입니다.

## 📁 디렉터리 구조

```
scripts/
├── test/
│   ├── api/                    # API 테스트 스크립트
│   │   └── basic-api-test.js   # 기본 API 응답 구조 테스트
│   ├── frontend/               # 프론트엔드 테스트 스크립트
│   │   ├── context-debug.js    # TFTDataContext 디버깅
│   │   ├── data-processing-test.js # 데이터 처리 로직 테스트
│   │   └── context-manual-test.js  # 컨텍스트 수동 테스트
│   └── integration/            # 통합 테스트 스크립트
│       └── system-integration-test.js # 전체 시스템 통합 테스트
└── README.md                   # 이 파일
```

## 🚀 사용법

### NPM Scripts를 통한 실행 (권장)

```bash
# 사용 가능한 테스트 스크립트 목록 보기
npm run test:scripts

# 개별 스크립트 실행
npm run test:api:basic        # API 기본 테스트
npm run test:frontend:debug   # 프론트엔드 디버그
npm run test:frontend:data    # 프론트엔드 데이터 처리 테스트
npm run test:frontend:manual  # 프론트엔드 수동 테스트
npm run test:integration      # 통합 테스트
```

### 직접 실행

```bash
# API 테스트
node scripts/test/api/basic-api-test.js

# 프론트엔드 테스트
node scripts/test/frontend/context-debug.js
node scripts/test/frontend/data-processing-test.js
node scripts/test/frontend/context-manual-test.js

# 통합 테스트
node scripts/test/integration/system-integration-test.js
```

## 📋 스크립트 상세 설명

### API 테스트 (`scripts/test/api/`)

#### `basic-api-test.js`
- **목적**: 백엔드 API의 기본 응답 구조 확인
- **테스트 대상**: `/api/static-data/tft-data` 엔드포인트
- **사용 시기**: 
  - 백엔드 API 응답 구조 변경 후 검증
  - 새로운 API 엔드포인트 추가 후 기본 동작 확인
- **실행 전 조건**: 백엔드 서버가 `http://localhost:4001`에서 실행 중이어야 함

### 프론트엔드 테스트 (`scripts/test/frontend/`)

#### `context-debug.js`
- **목적**: TFTDataContext의 데이터 구조 디버깅
- **기능**: 
  - 백엔드 API 응답과 프론트엔드 기대 구조 비교
  - 데이터 변환 과정에서의 불일치 확인
- **사용 시기**: 
  - 프론트엔드 Context 관련 버그 디버깅
  - API 응답 구조 변경 후 호환성 확인

#### `data-processing-test.js`
- **목적**: 프론트엔드 데이터 처리 로직 테스트
- **기능**: 
  - API 응답을 Map으로 변환하는 로직 검증
  - 데이터 정규화 과정 테스트
- **사용 시기**: 
  - 데이터 처리 로직 변경 후 검증
  - 성능 최적화 후 결과 확인

#### `context-manual-test.js`
- **목적**: TFTDataContext의 전체 로직 수동 테스트
- **기능**: 
  - 여러 API 엔드포인트 동시 호출 테스트
  - 전체 데이터 로딩 과정 시뮬레이션
- **사용 시기**: 
  - 프론트엔드 Context 로직 전체 검증
  - 데이터 로딩 성능 측정

### 통합 테스트 (`scripts/test/integration/`)

#### `system-integration-test.js`
- **목적**: 전체 시스템 통합 테스트
- **기능**: 
  - 백엔드 API 서버 상태 확인
  - 프론트엔드 서버 상태 확인
  - 전체 시스템 타입 정합성 검증
- **사용 시기**: 
  - 배포 전 전체 시스템 검증
  - 대규모 변경 후 시스템 안정성 확인
- **실행 전 조건**: 백엔드와 프론트엔드 서버가 모두 실행 중이어야 함

## ⚠️ 주의사항

1. **서버 실행 상태 확인**: 대부분의 스크립트는 백엔드 서버가 실행 중이어야 합니다.
2. **포트 충돌 방지**: 기본적으로 `localhost:4001` (백엔드), `localhost:5173` (프론트엔드)를 사용합니다.
3. **환경 변수**: 백엔드 환경 변수(RIOT_API_KEY, MONGODB_URI 등)가 올바르게 설정되어 있어야 합니다.
4. **의존성**: 모든 스크립트는 Node.js 18+ 내장 API만 사용하므로 별도 의존성 설치가 불필요합니다.

## 🔧 문제 해결

### 연결 오류 (ECONNREFUSED)
- 백엔드 서버가 실행 중인지 확인: `cd backend && npm run dev`
- 포트 번호가 올바른지 확인: 기본값은 4001번

### 타임아웃 오류
- 서버 응답 시간이 오래 걸리는 경우 정상입니다.
- 필요시 스크립트 내 타임아웃 값을 조정할 수 있습니다.

### 데이터 불일치 오류
- API 응답 구조가 변경되었을 가능성이 있습니다.
- 백엔드 로그를 확인하여 오류 원인을 파악하세요.

## 📝 새로운 스크립트 추가

새로운 테스트 스크립트를 추가할 때는 다음 규칙을 따르세요:

1. **적절한 폴더 선택**: api, frontend, integration 중 용도에 맞는 폴더
2. **네이밍 규칙**: `[기능명]-[타입].js` (예: `auth-test.js`, `performance-benchmark.js`)
3. **주석 추가**: 파일 상단에 목적과 사용법 설명
4. **package.json 업데이트**: npm script 추가
5. **README 업데이트**: 이 문서에 새 스크립트 설명 추가

## 🤝 기여 가이드

스크립트를 수정하거나 추가할 때:

1. TypeScript 철의 장막 규칙 준수
2. 에러 처리 포함
3. 명확한 로그 메시지 사용
4. 실행 전 조건 문서화
5. 테스트 결과 해석 방법 설명

---

**💡 팁**: 개발 중 문제가 발생했을 때는 `npm run test:integration`으로 전체 시스템 상태를 먼저 확인하세요.