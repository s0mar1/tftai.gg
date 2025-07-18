# 🤖 TFT Meta Analyzer - AI CLI 최적화 프로젝트

> **AI CLI 도구 전용 개발 환경** - Gemini CLI와 Claude Code에 최적화된 TFT 메타 분석 웹 애플리케이션

## 🎯 프로젝트 개요

TFT Meta Analyzer는 Teamfight Tactics 게임의 메타 데이터를 분석하고 시각화하는 풀스택 웹 애플리케이션입니다. 이 프로젝트는 **AI CLI 도구(Gemini CLI, Claude Code)와의 협업**을 전제로 개발되었으며, AI가 효율적으로 코드를 이해하고 수정할 수 있도록 구조화되었습니다.

### 🏗️ TypeScript 철의 장막 규칙

> **"우리 프로젝트의 TypeScript 설정을 가장 엄격하게 만들어줘. `tsconfig.json` 파일에서 `strict`와 관련된 모든 옵션을 활성화해서, AI인 네가 사소한 실수도 할 수 없도록 만들어. 이걸 우리 프로젝트의 '철의 장막' 규칙으로 삼자."**

이 프로젝트는 최대 엄격성의 TypeScript 설정을 사용하여 AI와 개발자 모두가 타입 안전성을 보장받습니다.

---

## 📁 프로젝트 구조 (모노레포)

```
tft-meta-analyzer/                      # 🏗️ 모노레포 루트
├── 📋 README.md                       # 이 파일 - AI CLI 작업 가이드
├── 📋 CLAUDE.md                       # AI CLI 도구 사용법 및 컨텍스트 관리
├── 📦 package.json                    # 워크스페이스 설정 및 통합 스크립트
├── 🔧 pnpm-workspace.yaml             # pnpm 워크스페이스 설정
├── 📦 backend/                        # Node.js + Express + TypeScript API 서버
├── 🎨 frontend/                       # React + TypeScript + Vite 클라이언트
├── 🔗 shared/                         # 공유 타입 정의 및 유틸리티 (@tft-meta-analyzer/shared)
│   ├── src/types.ts                   # 백엔드-프론트엔드 공통 타입 정의
│   ├── package.json                   # 공유 패키지 설정
│   └── tsconfig.json                  # TypeScript 설정
└── 🧪 test-*.js                      # 통합 테스트 스크립트
```

### 🎯 AI CLI 도구를 위한 핵심 파일 위치

#### Backend 핵심 파일 (`backend/src/`)
```
🚀 server.ts                    # 메인 서버 진입점
⚙️  config/
   ├── db.ts                    # MongoDB 연결 설정
   ├── logger.ts                # Winston 로거 설정
   └── cacheTTL.ts              # 캐시 TTL 설정
🛤️  routes/                    # API 엔드포인트 (AI가 가장 자주 수정하는 영역)
   ├── summoner.ts              # 소환사 조회 API
   ├── tierlist.ts              # 티어리스트 API
   ├── ai.ts                    # AI 분석 API
   └── [12개 라우트 파일]
🔧 services/                   # 비즈니스 로직 (핵심 로직 위치)
   ├── riotApi.ts               # Riot Games API 통신
   ├── tftData.ts               # TFT 정적 데이터 관리
   ├── metaService.ts           # 메타 분석 로직
   ├── ai/                      # AI 서비스
   │   ├── AIAnalysisService.ts # AI 매치 분석
   │   └── QnAService.ts        # AI Q&A 서비스
   └── [15개 서비스 파일]
📊 models/                     # MongoDB 스키마 정의
🔗 types/                      # TypeScript 타입 정의
🛠️  utils/                     # 유틸리티 함수
```

#### Frontend 핵심 파일 (`frontend/src/`)
```
🚀 main.tsx                    # React 앱 진입점
📱 App.tsx                     # 루트 컴포넌트 + 라우팅
📄 pages/                      # 페이지 컴포넌트
   ├── summoner/SummonerPage.tsx     # 소환사 페이지
   ├── tierlist/TierListPage.jsx     # 티어리스트 페이지
   ├── AiQnaPage/AiQnaPage.jsx       # AI Q&A 페이지
   └── [9개 페이지]
🧩 components/                 # 재사용 가능한 컴포넌트
   ├── common/                       # 공통 컴포넌트
   ├── layout/                       # 레이아웃 컴포넌트
   └── [특화 컴포넌트들]
🔗 api/index.ts                # API 통신 레이어
🎣 hooks/                      # 커스텀 React 훅스
🌍 context/TFTDataContext.tsx  # 전역 상태 관리
🔗 types/index.ts              # 프론트엔드 타입 정의
```

---

## 🛠️ 기술 스택

### Backend (Node.js Ecosystem)
- **언어**: TypeScript (최대 엄격성 설정)
- **런타임**: Node.js 20+ (ESM 모듈 사용)
- **프레임워크**: Express.js
- **데이터베이스**: MongoDB + Mongoose ODM
- **캐싱**: Redis (Upstash) + 인메모리 캐시
- **AI**: Google Generative AI (Gemini)
- **API 문서**: Swagger/OpenAPI
- **테스팅**: Jest + Supertest
- **번들링**: TypeScript 컴파일러

### Frontend (React Ecosystem)  
- **언어**: TypeScript + JSX
- **라이브러리**: React 18
- **빌드 도구**: Vite
- **상태 관리**: TanStack Query (서버 상태) + Context API (클라이언트 상태)
- **라우팅**: React Router v6
- **스타일링**: Tailwind CSS
- **국제화**: i18next
- **테스팅**: Jest + React Testing Library
- **타입 체킹**: TypeScript strict mode

### 개발 도구
- **패키지 관리**: pnpm (워크스페이스 지원)
- **린팅**: ESLint (TypeScript 엄격 규칙)
- **포매팅**: Prettier
- **Git 훅**: Husky
- **모노레포**: pnpm Workspaces 패턴

---

## 🚀 개발 환경 설정

### 필수 환경 변수
```bash
# Backend (.env)
RIOT_API_KEY=your_riot_api_key        # 필수
MONGODB_URI=mongodb://localhost/tft    # 필수
UPSTASH_REDIS_URL=redis://...          # 선택 (없으면 인메모리 캐시)
GEMINI_API_KEY=your_gemini_key         # 선택 (AI 기능용)
PORT=4001                              # 선택 (기본값 4001)
NODE_ENV=development                   # 선택 (기본값 development)
FRONTEND_URL=http://localhost:5173     # 선택 (CORS 설정)

# 📊 고급 설정 옵션 (신규 추가)
# MongoDB 연결 설정
MONGODB_TIMEOUT=10000                  # MongoDB 연결 타임아웃 (기본: 10초)
MONGODB_RETRY_COUNT=3                  # MongoDB 연결 재시도 횟수 (기본: 3회)
MONGODB_RETRY_DELAY=1000               # MongoDB 재시도 지연 시간 (기본: 1초)
MONGODB_POOL_MIN=2                     # MongoDB 최소 풀 크기 (기본: 2)
MONGODB_POOL_MAX=10                    # MongoDB 최대 풀 크기 (기본: 10)
ENABLE_MONGODB_RETRY=true              # MongoDB 재시도 활성화 (기본: false)

# TFT 데이터 로딩 설정
TFT_DATA_TIMEOUT=15000                 # TFT API 타임아웃 (기본: 15초)
TFT_DATA_RETRY_COUNT=2                 # TFT API 재시도 횟수 (기본: 2회)
TFT_DATA_RETRY_DELAY=2000              # TFT API 재시도 지연 (기본: 2초)

# Redis 설정
REDIS_TIMEOUT=10000                    # Redis 연결 타임아웃 (기본: 10초)
REDIS_RETRY_COUNT=3                    # Redis 연결 재시도 횟수 (기본: 3회)
REDIS_RETRY_DELAY=1000                 # Redis 재시도 지연 시간 (기본: 1초)
```

### 설치 및 실행
```bash
# 1. 의존성 설치 (모노레포 루트에서)
pnpm install

# 2. 개발 서버 실행
# 옵션 1: 통합 개발 서버 (권장)
pnpm dev  # 백엔드 + 프론트엔드 동시 실행

# 옵션 2: 개별 실행
# 터미널 1: 백엔드 서버 (http://localhost:4001)
cd backend && pnpm dev

# 터미널 2: 프론트엔드 서버 (http://localhost:5173)  
cd frontend && pnpm dev
```

### 빌드 및 배포
```bash
# TypeScript 컴파일 체크
cd backend && pnpm run type-check
cd frontend && pnpm run type-check

# 프로덕션 빌드 (모노레포 루트에서)
pnpm build  # 공유 타입 -> 백엔드 -> 프론트엔드 순서로 빌드

# 또는 개별 빌드
cd backend && pnpm build
cd frontend && pnpm build

# 프로덕션 실행
cd backend && pnpm start
```

---

## 🤖 Claude Code MCP 서버 설정

### 📋 설정된 MCP 서버 목록

이 프로젝트에는 Claude Code의 효율적인 개발을 위한 4개의 MCP 서버가 설정되어 있습니다:

#### 1. 🗂️ Filesystem MCP Server
- **명령어**: `claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem .`
- **기능**: 프로젝트 파일 시스템 직접 조작
- **사용 예시**:
  ```bash
  # 프로젝트 구조 분석
  claude "프로젝트의 전체 구조를 분석하고 주요 파일들을 설명해줘"
  
  # 파일 생성 및 수정
  claude "새로운 React 컴포넌트를 생성해줘"
  
  # 코드 분석
  claude "TypeScript 에러가 있는 파일을 찾아서 수정해줘"
  ```

#### 2. 🐙 GitHub MCP Server
- **명령어**: `claude mcp add github -- env GITHUB_TOKEN=your_token npx -y @modelcontextprotocol/server-github`
- **기능**: GitHub API 연동 및 저장소 관리
- **필요 설정**: GitHub Personal Access Token
- **사용 예시**:
  ```bash
  # 저장소 상태 확인
  claude "현재 저장소의 이슈와 PR 상태를 확인해줘"
  
  # 이슈 생성
  claude "새로운 기능 요청 이슈를 생성해줘"
  
  # PR 생성
  claude "현재 변경사항으로 PR을 생성해줘"
  ```

#### 3. 🕷️ Puppeteer MCP Server
- **명령어**: `claude mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer`
- **기능**: 웹 스크래핑 및 브라우저 자동화
- **사용 예시**:
  ```bash
  # TFT 데이터 수집
  claude "TFT 공식 사이트에서 최신 패치 정보를 수집해줘"
  
  # 경쟁사 분석
  claude "다른 TFT 메타 사이트의 구조를 분석해줘"
  
  # 스크린샷 생성
  claude "현재 개발 중인 웹사이트의 스크린샷을 촬영해줘"
  ```

#### 4. 🧠 Memory MCP Server
- **명령어**: `claude mcp add memory -- npx -y @modelcontextprotocol/server-memory`
- **기능**: 세션 간 컨텍스트 유지 및 메모리 관리
- **사용 예시**:
  ```bash
  # 프로젝트 정보 저장
  claude "이 프로젝트의 핵심 아키텍처를 기억해줘"
  
  # 이전 대화 참조
  claude "이전에 논의했던 성능 최적화 방안을 다시 설명해줘"
  
  # 개발 히스토리 관리
  claude "오늘 작업한 내용을 요약해서 저장해줘"
  ```

### 🔧 MCP 서버 설정 방법

#### 1. 기본 설정 (프로젝트 루트에서 실행)
```bash
# 파일 시스템 접근
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem .

# GitHub 연동 (토큰 설정 필요)
claude mcp add github -- env GITHUB_TOKEN=your_token_here npx -y @modelcontextprotocol/server-github

# 웹 스크래핑
claude mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer

# 메모리 관리
claude mcp add memory -- npx -y @modelcontextprotocol/server-memory
```

#### 2. 환경 변수 설정
```bash
# GitHub Personal Access Token 설정
export GITHUB_TOKEN=your_github_personal_access_token

# 또는 .env 파일에 추가
echo "GITHUB_TOKEN=your_github_personal_access_token" >> .env
```

#### 3. GitHub Token 권한 설정
GitHub Personal Access Token 생성 시 다음 권한 필요:
- `repo` (저장소 접근)
- `issues` (이슈 관리)
- `pull_requests` (PR 관리)
- `contents` (파일 내용 접근)

### 🛠️ MCP 서버 관리 명령어

```bash
# 설정된 MCP 서버 목록 확인
claude mcp list

# 특정 서버 세부 정보 확인
claude mcp get <server_name>

# 서버 제거
claude mcp remove <server_name>

# 서버 재설정
claude mcp remove <server_name>
claude mcp add <server_name> -- <command>
```

### 💡 MCP 서버 활용 팁

#### 개발 워크플로우 최적화
```bash
# 1. 프로젝트 분석 → 2. 코드 수정 → 3. 테스트 → 4. 커밋
claude "프로젝트 구조를 분석하고 성능 개선점을 찾아줘"
claude "찾은 문제점들을 수정해줘"
claude "수정된 코드를 테스트해줘"
claude "변경사항을 커밋하고 PR을 생성해줘"
```

#### 데이터 수집 자동화
```bash
# TFT 메타 데이터 수집
claude "최신 TFT 패치 정보를 수집하고 데이터베이스에 저장해줘"

# 경쟁사 분석
claude "다른 TFT 사이트들의 기능을 분석하고 개선 아이디어를 제안해줘"
```

#### 프로젝트 관리
```bash
# 이슈 관리
claude "현재 버그 리포트들을 정리하고 우선순위를 매겨줘"

# 문서화
claude "새로 추가된 기능들을 문서화해줘"
```

### ⚠️ 주의사항 및 제약사항

1. **보안**: GitHub Token 등 민감한 정보는 환경 변수로 관리
2. **권한**: 각 MCP 서버별 필요한 권한 설정 확인
3. **성능**: 대규모 작업 시 시스템 리소스 사용량 주의
4. **네트워크**: 웹 스크래핑 시 대상 사이트의 robots.txt 준수

### 🔧 문제 해결

#### MCP 서버가 인식되지 않는 경우
```bash
# 현재 디렉토리 확인
pwd

# MCP 서버 목록 확인
claude mcp list

# 서버 재설정
claude mcp remove filesystem
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem .
```

#### GitHub Token 오류
```bash
# 환경 변수 확인
echo $GITHUB_TOKEN

# Token 재설정
export GITHUB_TOKEN=your_new_token
claude mcp remove github
claude mcp add github -- env GITHUB_TOKEN=$GITHUB_TOKEN npx -y @modelcontextprotocol/server-github
```

#### 패키지 설치 오류
```bash
# npx 캐시 정리
npx clear-npx-cache

# Node.js 버전 확인 (16+ 필요)
node --version

# 패키지 업데이트
npm update -g
```

---

## 📝 AI CLI 작업 가이드라인

### 🎯 AI가 알아야 할 핵심 사항

1. **모듈 시스템**: 전체 프로젝트가 ESM 모듈을 사용합니다
2. **TypeScript 엄격성**: 모든 타입이 엄격하게 정의되어야 합니다
3. **API 패턴**: RESTful API + JSON 응답 형식 통일
4. **에러 처리**: 중앙집중식 에러 핸들링 (backend/src/middlewares/errorHandler.ts)
5. **캐싱 전략**: Redis + 인메모리 이중 캐싱 구조
6. **국제화**: 한국어/영어/일본어/중국어 지원

### 🔧 AI CLI 작업 시 주의사항

#### ✅ DO (권장사항)
- 기존 타입 정의를 최대한 활용하기 (`shared/types.ts`, `backend/src/types/`)
- API 변경 시 프론트엔드 API 레이어도 함께 수정 (`frontend/src/api/index.ts`)
- 새로운 라우트 추가 시 Swagger 문서화 포함
- 테스트 파일도 함께 생성/수정 (`__tests__/` 폴더)
- 에러 로깅을 위한 logger 사용 (`import logger from './config/logger'`)

#### ❌ DON'T (금지사항)  
- `any` 타입 사용 금지 (TypeScript 철의 장막 위반)
- 환경변수 하드코딩 금지 (dotenv 사용)
- DB 직접 쿼리 금지 (서비스 레이어를 통해 접근)
- CORS 설정 임의 변경 금지 (보안 이슈)
- node_modules나 dist 폴더 수정 금지

### 🧩 새로운 기능 추가 패턴

```typescript
// 1. 타입 정의 (shared/types.ts 또는 해당 모듈)
export interface NewFeature {
  id: string;
  name: string;
  // 엄격한 타입 정의 필수
}

// 2. 백엔드 서비스 로직 (backend/src/services/)
export class NewFeatureService {
  async createFeature(data: NewFeature): Promise<NewFeature> {
    // 비즈니스 로직
  }
}

// 3. API 라우트 (backend/src/routes/)
router.post('/new-feature', async (req, res, next) => {
  try {
    // 라우트 로직
  } catch (error) {
    next(error); // 중앙 에러 핸들러로 전달
  }
});

// 4. 프론트엔드 API (frontend/src/api/index.ts)
export const newFeatureApi = {
  create: (data: NewFeature) => apiClient.post('/new-feature', data)
};

// 5. React 컴포넌트 (frontend/src/components/ 또는 pages/)
export const NewFeatureComponent: React.FC = () => {
  // TanStack Query 사용 권장
  const { data, isLoading } = useQuery({
    queryKey: ['new-feature'],
    queryFn: () => newFeatureApi.getAll()
  });
};
```

---

## 🔧 개발 명령어 모음

### 모노레포 명령어
```bash
# 루트에서 실행 (권장)
pnpm dev             # 모든 패키지 개발 서버 동시 실행
pnpm build           # 종속성 순서에 따라 모든 패키지 빌드
pnpm test            # 모든 패키지 테스트 실행
pnpm lint            # 모든 패키지 린트 실행

# 특정 패키지만 실행
pnpm --filter backend dev     # 백엔드만 개발 서버
pnpm --filter frontend dev    # 프론트엔드만 개발 서버
pnpm --filter shared build    # 공유 패키지만 빌드
```

### Backend 명령어
```bash
pnpm run dev          # 개발 서버 (nodemon + tsx)
pnpm run dev-debug    # 디버그 모드 개발 서버  
pnpm run build        # TypeScript 컴파일
pnpm run start        # 프로덕션 서버 실행
pnpm run type-check   # 타입 체크만 실행
pnpm run test         # Jest 테스트 실행
pnpm run test:watch   # Jest 감시 모드
pnpm run test:coverage # 테스트 커버리지
```

### Frontend 명령어
```bash
pnpm run dev          # Vite 개발 서버
pnpm run build        # 프로덕션 빌드
pnpm run preview      # 빌드 결과 미리보기
pnpm run lint         # ESLint 실행
pnpm run test         # Jest 테스트 실행
pnpm run test:watch   # Jest 감시 모드
pnpm run test:coverage # 테스트 커버리지
```

---

## ⚠️ 중요한 제약사항 및 주의사항

### 🚨 TypeScript 철의 장막 규칙
- `strict: true` + 모든 엄격 옵션 활성화
- `any` 타입 사용 절대 금지
- `null`/`undefined` 체크 필수
- 사용하지 않는 변수/매개변수 허용 안함
- 도달할 수 없는 코드 허용 안함

### 🔒 보안 제약사항
- API 키나 비밀 정보를 코드에 하드코딩 금지
- 모든 사용자 입력에 대한 검증 필수
- CORS 설정 임의 변경 금지
- SQL/NoSQL 인젝션 방지를 위한 파라미터화된 쿼리 사용

### 🏗️ 아키텍처 제약사항
- 서버 코드에서 프론트엔드 코드 직접 import 금지
- 비즈니스 로직은 services 레이어에만 구현
- 라우트 핸들러는 가볍게 유지 (요청/응답 처리만)
- 전역 상태 남용 금지 (필요한 경우에만 Context 사용)

---

## 🎓 AI CLI 도구별 사용법

### Gemini CLI 사용 (대규모 분석)
```bash
# 전체 코드베이스 분석
gemini -p "@./ 이 프로젝트의 전체 구조를 분석하고 개선점을 제안해줘"

# 특정 영역 분석  
gemini -p "@backend/src/services/ 서비스 레이어의 코드 품질을 평가해줘"

# 기능 구현 확인
gemini -p "@backend/src/ @frontend/src/ AI 분석 기능이 제대로 구현되어 있는지 확인해줘"
```

### Claude Code 사용 (정밀 작업)
- 단일 파일 수정이나 버그 수정에 최적화
- TypeScript 컴파일 에러 수정
- 코드 리팩토링 및 최적화
- 테스트 작성 및 디버깅

---

## 📊 프로젝트 현재 상태

### ✅ 완료된 작업
- [x] TypeScript 마이그레이션 100% 완료
- [x] 33개 TypeScript 컴파일 에러 모두 수정
- [x] 레거시 서버 파일 정리 완료
- [x] ESM 모듈 시스템 적용
- [x] AI 서비스 통합 (Gemini API)
- [x] 국제화(i18n) 구현
- [x] 캐싱 시스템 구축
- [x] 포괄적인 테스트 커버리지

### 🚧 진행 중인 작업
- [x] **모노레포 구조 구현** - pnpm Workspaces로 통합 개발 환경 구축
- [x] **고급 설정 시스템** - 환경변수 기반 MongoDB/Redis/TFT 데이터 설정
- [x] **백엔드 의존성 최적화** - 불필요한 패키지 제거 및 성능 개선
- [ ] UI/UX 개선 및 반응형 디자인
- [ ] 성능 최적화 및 메모리 관리
- [ ] 추가 AI 기능 개발
- [ ] API 확장 및 새로운 엔드포인트

### 🎯 향후 계획
- [ ] PWA 변환
- [ ] 실시간 데이터 업데이트 (WebSocket)
- [ ] 고급 데이터 시각화
- [ ] 사용자 맞춤 추천 시스템

---

**🤖 AI CLI 도구 개발자를 위한 마지막 당부:**

이 프로젝트는 당신과의 협업을 전제로 설계되었습니다. TypeScript의 철의 장막 규칙을 지키며, 기존 아키텍처 패턴을 따라 안전하고 확장 가능한 코드를 작성해 주세요. 궁금한 점이 있다면 언제든 CLAUDE.md 파일을 참조하거나, Gemini CLI를 사용하여 대규모 분석을 수행하세요.

> **Happy Coding with AI! 🚀**