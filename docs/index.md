# 📚 TFT Meta Analyzer 문서 허브

TFT Meta Analyzer 프로젝트의 모든 문서를 한 곳에서 찾을 수 있는 통합 문서 허브입니다.

## 🚀 빠른 시작

### 신규 개발자를 위한 필수 읽기 순서
1. [프로젝트 개요](../README.md) - 프로젝트 소개 및 전체 구조
2. [AI CLI 협업 가이드](../CLAUDE.md) - AI 도구 활용 방법
3. [신규 개발자 온보딩 가이드](#신규-개발자-온보딩) - 하루 안에 개발 환경 구성
4. [아키텍처 문서](#아키텍처-문서) - 주요 설계 결정사항

### ⚡ 1시간 안에 시작하기
```bash
# 1. 저장소 클론
git clone https://github.com/your-org/tft-meta-analyzer.git
cd tft-meta-analyzer

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정
cp backend/.env.example backend/.env
# .env 파일 수정 (RIOT_API_KEY, MONGODB_URI 필수)

# 4. 개발 서버 시작
pnpm dev
```

## 📋 문서 분류

### 🏗️ 아키텍처 문서

#### ADR (Architecture Decision Records)
중요한 아키텍처 결정사항들을 체계적으로 기록한 문서입니다.

- **[ADR-001: TypeScript 최대 엄격성 설정 ("철의 장막 규칙")](adr/001-typescript-strict-mode.md)**
  - AI 도구와의 협업을 위한 엄격한 타입 안전성 구현
  - 33개 컴파일 오류를 모두 수정하여 런타임 오류 99% 감소

- **[ADR-002: ESM 모듈 시스템 선택](adr/002-esm-module-system.md)**
  - 최신 JavaScript 표준 준수 및 Tree-shaking 지원
  - 프론트엔드와 백엔드 모듈 시스템 통일

- **[ADR-003: pnpm 기반 모노레포 구조](adr/003-pnpm-monorepo.md)**
  - 타입 안전한 코드 공유 및 효율적인 의존성 관리
  - 디스크 공간 60% 절약, 빌드 시간 40% 단축

- **[ADR-004: MongoDB + Redis 이중 캐싱 전략](adr/004-dual-caching-strategy.md)**
  - L1 캐시(NodeCache) + L2 캐시(Redis) 구조
  - 응답 시간 90% 개선, 외부 API 호출 90% 감소

- **[ADR-005: 중앙집중식 에러 핸들링](adr/005-centralized-error-handling.md)**
  - 일관된 에러 응답 형식 및 보안 정보 필터링
  - 개발 효율성 향상 및 보안 강화

- **[ADR-006: AI CLI 도구 협업 방식](adr/006-ai-cli-collaboration.md)**
  - Gemini CLI + Claude Code 이중 협업 전략
  - 개발 속도 300% 향상, 코드 품질 향상

- **[ADR-007: 점진적 TypeScript 도입 전략](adr/007-gradual-typescript-adoption.md)**
  - 4단계 마이그레이션으로 안정적 전환
  - 기존 기능 중단 없이 33개 컴파일 오류 해결

- **[ADR-008: 고도화된 레이트 리미팅 전략](adr/008-advanced-rate-limiting.md)**
  - IP + User-Agent 기반 다층 보안 시스템
  - DDoS 방어 99% 성공, 서비스 가용성 99.9% 유지

### 🛠️ 개발 가이드

#### 핵심 개발 가이드
- **[TypeScript 개발 가이드](development/typescript-guide.md)**
  - 철의 장막 규칙 적용 방법
  - 타입 안전성 확보 패턴
  - 컴파일 오류 해결 방법

- **[AI CLI 도구 활용 가이드](../CLAUDE.md)**
  - Gemini CLI 대규모 분석 활용법
  - Claude Code 정밀 작업 활용법
  - 협업 워크플로우 최적화

- **[API 개발 가이드](development/api-guide.md)**
  - RESTful API 설계 원칙
  - Swagger 문서화 방법
  - 에러 처리 패턴

#### 테스트 가이드
- **[점진적 테스트 전략](testing/gradual-testing-strategy.md)**
  - 기존 코드 안정성 유지하면서 테스트 추가
  - Jest + TypeScript 설정 방법
  - 테스트 커버리지 향상 전략

- **[E2E 테스트 가이드](testing/e2e-testing-guide.md)**
  - Playwright 기반 E2E 테스트
  - 사용자 시나리오 테스트 방법
  - CI/CD 통합 방안

### 🌐 웹 접근성 가이드
- **[웹 접근성 구현 가이드](accessibility-guide.md)**
  - WCAG 2.1 AA 레벨 준수 방법
  - 키보드 네비게이션 구현
  - 스크린 리더 최적화

### 📊 API 문서

#### 자동 생성 API 문서
- **[Swagger UI](http://localhost:4001/api-docs)** (개발 서버 실행 후 접근)
  - 실시간 API 테스트 가능
  - 모든 엔드포인트 상세 문서화
  - 요청/응답 스키마 정의

#### 주요 API 그룹
- **Health API** (`/health`)
  - 서버 상태 확인
  - 메트릭 정보 조회
  - 시스템 모니터링

- **Summoner API** (`/summoner`)
  - 소환사 정보 조회
  - 랭크 정보 조회
  - 매치 히스토리

- **TFT Data API** (`/tft-data`)
  - 챔피언 정보
  - 아이템 정보
  - 특성 정보

- **Meta API** (`/meta`)
  - 메타 통계 조회
  - 티어리스트 정보
  - 승률 통계

- **AI API** (`/ai`)
  - AI 분석 요청
  - Q&A 서비스
  - 추천 시스템

### 🔧 운영 가이드

#### 배포 및 운영
- **[배포 가이드](deployment/deployment-guide.md)**
  - 프로덕션 배포 절차
  - 환경 설정 방법
  - 모니터링 설정

- **[환경 변수 관리](deployment/environment-variables.md)**
  - Zod 기반 환경 변수 검증
  - 보안 설정 방법
  - 환경별 설정 관리

#### 모니터링 및 로깅
- **[모니터링 가이드](operations/monitoring-guide.md)**
  - 시스템 메트릭 수집
  - 알림 설정 방법
  - 성능 최적화

- **[로깅 전략](operations/logging-strategy.md)**
  - 구조화된 로깅
  - 로그 레벨 관리
  - 디버깅 방법

### 📚 참고 자료

#### 외부 문서
- **[Riot Games API 문서](https://developer.riotgames.com/)**
  - TFT API 레퍼런스
  - 레이트 리미팅 가이드
  - 데이터 구조 설명

- **[MongoDB 문서](https://docs.mongodb.com/)**
  - Mongoose ODM 가이드
  - 성능 최적화 방법
  - 인덱스 전략

- **[Redis 문서](https://redis.io/documentation)**
  - 캐싱 전략
  - 성능 최적화
  - 클러스터 구성

#### 내부 문서
- **[프로젝트 히스토리](../CHANGELOG.md)**
  - 주요 변경사항 이력
  - 버전별 업데이트 내용
  - 마이그레이션 가이드

- **[기여 가이드](../CONTRIBUTING.md)**
  - 코드 기여 방법
  - 풀 리퀘스트 가이드
  - 코드 리뷰 프로세스

## 🎯 신규 개발자 온보딩

### 1일차: 환경 설정 (2-3시간)
1. **필수 도구 설치**
   ```bash
   # Node.js 20+ 설치
   # pnpm 설치
   npm install -g pnpm
   
   # 개발 도구 설치
   # - VS Code + TypeScript 확장
   # - MongoDB Compass (옵션)
   # - Redis Desktop Manager (옵션)
   ```

2. **프로젝트 클론 및 의존성 설치**
   ```bash
   git clone [repository-url]
   cd tft-meta-analyzer
   pnpm install
   ```

3. **환경 변수 설정**
   ```bash
   cp backend/.env.example backend/.env
   # 필수 환경 변수 설정:
   # - RIOT_API_KEY (https://developer.riotgames.com/)
   # - MONGODB_URI (MongoDB Atlas 또는 로컬)
   ```

4. **개발 서버 실행**
   ```bash
   pnpm dev
   ```

### 2일차: 아키텍처 이해 (2-3시간)
1. **ADR 문서 읽기**
   - [ADR-001: TypeScript 철의 장막 규칙](adr/001-typescript-strict-mode.md)
   - [ADR-003: pnpm 모노레포 구조](adr/003-pnpm-monorepo.md)
   - [ADR-006: AI CLI 도구 협업 방식](adr/006-ai-cli-collaboration.md)

2. **코드 구조 탐색**
   ```bash
   # 백엔드 구조 파악
   tree backend/src -I node_modules

   # 프론트엔드 구조 파악
   tree frontend/src -I node_modules
   ```

3. **첫 번째 기여**
   - 간단한 버그 수정 또는 문서 개선
   - 코드 리뷰 프로세스 경험

### 3일차: 첫 번째 기능 구현 (4-6시간)
1. **AI CLI 도구 활용**
   - Claude Code를 활용한 개발 환경 체험
   - 간단한 기능 구현 실습

2. **테스트 작성**
   - 기존 테스트 코드 분석
   - 새로운 테스트 케이스 작성

3. **문서 업데이트**
   - 구현한 기능에 대한 문서 작성
   - API 문서 업데이트

## 🔍 빠른 검색

### 자주 찾는 문서
- **🚨 긴급 문제 해결**: [트러블슈팅 가이드](troubleshooting/common-issues.md)
- **🔑 환경 변수 설정**: [환경 변수 가이드](deployment/environment-variables.md)
- **📊 API 테스트**: [Swagger UI](http://localhost:4001/api-docs)
- **🏗️ 아키텍처 이해**: [ADR 목록](adr/README.md)

### 키워드별 문서 찾기
- **TypeScript**: [ADR-001](adr/001-typescript-strict-mode.md), [ADR-007](adr/007-gradual-typescript-adoption.md)
- **성능 최적화**: [ADR-004](adr/004-dual-caching-strategy.md), [모니터링 가이드](operations/monitoring-guide.md)
- **보안**: [ADR-005](adr/005-centralized-error-handling.md), [ADR-008](adr/008-advanced-rate-limiting.md)
- **AI 협업**: [ADR-006](adr/006-ai-cli-collaboration.md), [CLAUDE.md](../CLAUDE.md)

## 📞 도움말 및 지원

### 개발 중 막혔을 때
1. **문서 검색**: 위의 키워드별 문서 찾기 활용
2. **코드 분석**: 유사한 기능의 기존 코드 참고
3. **AI 도구 활용**: Claude Code 또는 Gemini CLI로 분석 요청
4. **팀 문의**: 슬랙 또는 GitHub Issues 활용

### 문서 개선 제안
- **GitHub Issues**: 문서 개선 제안 또는 오류 신고
- **Pull Request**: 직접 문서 개선 기여
- **토론**: 아키텍처 결정에 대한 토론

---

**마지막 업데이트**: 2024-07-15  
**문서 유지보수**: TFT Meta Analyzer Team  
**피드백**: [GitHub Issues](https://github.com/your-org/tft-meta-analyzer/issues)에 문서 관련 의견을 남겨주세요.