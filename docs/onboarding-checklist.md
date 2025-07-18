# 🎯 신규 개발자 온보딩 체크리스트

TFT Meta Analyzer 프로젝트에 오신 것을 환영합니다! 이 체크리스트는 신규 개발자가 하루 안에 개발 환경을 구성하고 첫 번째 기여를 할 수 있도록 도와줍니다.

## 📋 온보딩 개요

**목표**: 하루 안에 개발 환경 구성 및 첫 번째 기여 완료  
**예상 소요 시간**: 4-6시간  
**지원**: 팀 슬랙 채널 또는 GitHub Issues 활용  

## 🚀 1단계: 필수 도구 설치 (30분)

### ✅ 시스템 요구사항 확인
- [ ] **Node.js 20.x 이상** 설치
  ```bash
  node --version  # v20.0.0 이상 확인
  ```
- [ ] **pnpm 8.x 이상** 설치
  ```bash
  npm install -g pnpm
  pnpm --version  # 8.0.0 이상 확인
  ```
- [ ] **Git 설정** 확인
  ```bash
  git --version
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```

### ✅ 개발 도구 설치
- [ ] **IDE 설치**: VS Code (권장) 또는 WebStorm
- [ ] **VS Code 확장 프로그램** (VS Code 사용 시)
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - GitLens
  - Thunder Client (API 테스트용)
- [ ] **데이터베이스 도구** (선택사항)
  - MongoDB Compass
  - Redis Desktop Manager

### ✅ 외부 서비스 계정 생성
- [ ] **Riot Games 개발자 계정**: https://developer.riotgames.com/
  - Personal API Key 발급 (개발용)
  - Production API Key 신청 (필요시)
- [ ] **MongoDB Atlas 계정**: https://www.mongodb.com/cloud/atlas (또는 로컬 MongoDB)
- [ ] **Upstash Redis 계정**: https://upstash.com/ (선택사항)

## 🏗️ 2단계: 프로젝트 설정 (45분)

### ✅ 저장소 클론 및 설정
- [ ] **저장소 클론**
  ```bash
  git clone https://github.com/your-org/tft-meta-analyzer.git
  cd tft-meta-analyzer
  ```
- [ ] **의존성 설치**
  ```bash
  pnpm install
  ```
- [ ] **환경 변수 설정**
  ```bash
  cp backend/.env.example backend/.env
  ```

### ✅ 환경 변수 구성
`backend/.env` 파일을 열고 다음 값들을 설정하세요:

#### 필수 설정
- [ ] **RIOT_API_KEY**: Riot Games API 키
- [ ] **MONGODB_URI**: MongoDB 연결 URI
- [ ] **NODE_ENV**: `development`
- [ ] **PORT**: `4001` (기본값)

#### 선택적 설정 (기능 사용 시)
- [ ] **UPSTASH_REDIS_URL**: Redis 캐시 URL
- [ ] **GOOGLE_AI_MAIN_API_KEY**: AI 기능 사용 시
- [ ] **GOOGLE_AI_TRANSLATION_API_KEY**: 번역 기능 사용 시

### ✅ 개발 서버 실행
- [ ] **백엔드 서버 시작**
  ```bash
  pnpm dev:backend
  ```
- [ ] **프론트엔드 서버 시작** (새 터미널)
  ```bash
  pnpm dev:frontend
  ```
- [ ] **서버 접속 확인**
  - 백엔드: http://localhost:4001
  - 프론트엔드: http://localhost:5173
  - API 문서: http://localhost:4001/api-docs

## 📚 3단계: 아키텍처 이해 (60분)

### ✅ 필수 문서 읽기
- [ ] **[프로젝트 개요](../README.md)** - 전체 프로젝트 구조 파악
- [ ] **[AI CLI 협업 가이드](../CLAUDE.md)** - AI 도구 활용 방법
- [ ] **[TypeScript 철의 장막 규칙](adr/001-typescript-strict-mode.md)** - 핵심 개발 규칙
- [ ] **[모노레포 구조](adr/003-pnpm-monorepo.md)** - 프로젝트 구조 이해

### ✅ 코드 구조 탐색
- [ ] **백엔드 구조 파악**
  ```bash
  tree backend/src -I node_modules
  ```
- [ ] **프론트엔드 구조 파악**
  ```bash
  tree frontend/src -I node_modules
  ```
- [ ] **공통 모듈 확인**
  ```bash
  tree shared/src -I node_modules
  ```

### ✅ 핵심 개념 이해
- [ ] **모노레포 구조**: 백엔드, 프론트엔드, 공통 모듈 관계
- [ ] **타입 안전성**: TypeScript 엄격 모드 적용 방식
- [ ] **AI 협업**: Gemini CLI + Claude Code 활용 방법
- [ ] **캐싱 전략**: L1(NodeCache) + L2(Redis) 이중 캐싱

## 🧪 4단계: 개발 환경 검증 (30분)

### ✅ 테스트 실행
- [ ] **백엔드 테스트**
  ```bash
  pnpm test:backend
  ```
- [ ] **프론트엔드 테스트**
  ```bash
  pnpm test:frontend
  ```
- [ ] **타입 체크**
  ```bash
  pnpm type-check
  ```
- [ ] **린트 검사**
  ```bash
  pnpm lint
  ```

### ✅ API 테스트
- [ ] **헬스체크 API 테스트**
  ```bash
  curl http://localhost:4001/health/ping
  ```
- [ ] **Swagger UI 접속 확인**
  - 브라우저에서 http://localhost:4001/api-docs 접속
  - 주요 API 엔드포인트 확인

### ✅ 프론트엔드 기능 확인
- [ ] **페이지 로딩 확인**
  - 메인 페이지: http://localhost:5173
  - 다크 모드 토글 동작
- [ ] **API 통신 확인**
  - 개발자 도구 Network 탭에서 API 호출 확인

## 🎨 5단계: 첫 번째 기여 준비 (60분)

### ✅ 개발 워크플로우 체험
- [ ] **브랜치 생성**
  ```bash
  git checkout -b feature/onboarding-test
  ```
- [ ] **간단한 변경 사항 만들기**
  - 예: README.md에 본인 이름 추가
  - 예: 새로운 API 엔드포인트 추가
- [ ] **변경 사항 커밋**
  ```bash
  git add .
  git commit -m "feat: 온보딩 테스트 변경사항"
  ```

### ✅ AI 도구 활용 체험
- [ ] **Claude Code 기본 사용법**
  - 간단한 코드 수정 요청
  - 타입 안전성 확인 요청
- [ ] **Gemini CLI 사용법** (선택사항)
  ```bash
  gemini -p "@src/ 프로젝트 구조를 설명해주세요"
  ```

### ✅ 코드 리뷰 프로세스 이해
- [ ] **PR 템플릿 확인**: `.github/pull_request_template.md`
- [ ] **코드 리뷰 가이드라인 숙지**
- [ ] **CI/CD 파이프라인 이해**

## 🎯 6단계: 첫 번째 실제 기여 (90분)

### ✅ 기여할 이슈 선택
- [ ] **Good First Issue 라벨** 확인
- [ ] **문서 개선** 기여 (추천)
- [ ] **간단한 버그 수정** 기여
- [ ] **테스트 코드 추가** 기여

### ✅ 구현 및 테스트
- [ ] **기능 구현**
  - TypeScript 엄격 모드 준수
  - 기존 코드 스타일 따르기
- [ ] **테스트 작성**
  - 단위 테스트 추가
  - 통합 테스트 확인
- [ ] **문서 업데이트**
  - API 문서 업데이트 (필요시)
  - README 업데이트 (필요시)

### ✅ 코드 품질 확인
- [ ] **린트 검사 통과**
  ```bash
  pnpm lint
  ```
- [ ] **타입 체크 통과**
  ```bash
  pnpm type-check
  ```
- [ ] **테스트 통과**
  ```bash
  pnpm test
  ```

### ✅ Pull Request 생성
- [ ] **PR 제목 작성**: 컨벤션 준수 (`feat:`, `fix:`, `docs:` 등)
- [ ] **PR 설명 작성**: 변경사항 상세 설명
- [ ] **리뷰어 지정**: 팀 멤버 멘션
- [ ] **라벨 추가**: 적절한 라벨 선택

## 📊 온보딩 완료 체크리스트

### ✅ 개발 환경 완료
- [ ] 모든 필수 도구 설치 완료
- [ ] 개발 서버 정상 실행
- [ ] 테스트 스위트 정상 실행
- [ ] API 문서 접속 가능

### ✅ 지식 습득 완료
- [ ] 프로젝트 아키텍처 이해
- [ ] TypeScript 엄격 모드 이해
- [ ] AI 협업 워크플로우 이해
- [ ] 모노레포 구조 이해

### ✅ 실습 완료
- [ ] 첫 번째 코드 변경 완료
- [ ] AI 도구 활용 체험 완료
- [ ] 첫 번째 PR 생성 완료
- [ ] 코드 리뷰 프로세스 이해

## 🎉 온보딩 완료 후 다음 단계

### 📚 추가 학습 자료
- [ ] **심화 아키텍처 문서**
  - [ADR-004: 이중 캐싱 전략](adr/004-dual-caching-strategy.md)
  - [ADR-005: 중앙집중식 에러 핸들링](adr/005-centralized-error-handling.md)
  - [ADR-008: 고도화된 레이트 리미팅](adr/008-advanced-rate-limiting.md)
- [ ] **성능 최적화 가이드**
- [ ] **보안 가이드라인**

### 🚀 전문 영역 선택
- [ ] **백엔드 개발**: API 설계, 데이터베이스 최적화
- [ ] **프론트엔드 개발**: React 성능 최적화, UI/UX 개선
- [ ] **DevOps**: CI/CD 파이프라인, 모니터링 시스템
- [ ] **AI 통합**: AI 서비스 개발, 데이터 분석

### 🤝 팀 통합
- [ ] **정기 회의 참석**: 스프린트 계획, 회고
- [ ] **멘토링 시스템**: 시니어 개발자와 페어링
- [ ] **지식 공유**: 학습한 내용 팀과 공유

## 🆘 도움이 필요할 때

### 💬 소통 채널
- **긴급 문제**: 팀 슬랙 `#dev-help` 채널
- **기술 질문**: GitHub Discussions
- **버그 신고**: GitHub Issues
- **기능 요청**: GitHub Issues (Feature Request 템플릿)

### 📖 참고 자료
- **[문서 허브](index.md)**: 모든 문서 통합 페이지
- **[트러블슈팅 가이드](troubleshooting/common-issues.md)**: 일반적인 문제 해결
- **[FAQ](faq.md)**: 자주 묻는 질문
- **[코딩 가이드](development/coding-guidelines.md)**: 코딩 규칙 및 베스트 프랙티스

## 📝 피드백

온보딩 과정에서 개선사항이나 제안사항이 있다면 언제든지 알려주세요!

- **즉시 피드백**: 팀 슬랙 `#dev-feedback` 채널
- **상세 피드백**: GitHub Issues에 `documentation` 라벨로 등록
- **온보딩 가이드 개선**: PR로 직접 기여

---

**🎯 목표 달성!** 이 체크리스트를 완료하면 TFT Meta Analyzer 프로젝트의 핵심 구성원이 되어 효과적으로 기여할 수 있습니다.

**마지막 업데이트**: 2024-07-15  
**다음 업데이트**: 피드백 반영하여 지속적 개선