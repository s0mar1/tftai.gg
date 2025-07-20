# 🚀 TFT Meta Analyzer 배포 가이드

> **Render (백엔드) + Cloudflare Pages (프론트엔드)** 배포 환경 완료 가이드

## 📋 배포 요약

| 구분 | 플랫폼 | URL 패턴 | 설정 파일 |
|------|--------|----------|-----------|
| **백엔드** | Render | `https://your-service.onrender.com` | `render.yaml` |
| **프론트엔드** | Cloudflare Pages | `https://your-project.pages.dev` | `wrangler.toml` |

### ✅ **배포 준비 완료 상태**
- [x] render.yaml Blueprint 설정 완료
- [x] wrangler.toml 설정 완료  
- [x] Turbo 모노레포 빌드 시스템 적용
- [x] CORS 설정 및 환경변수 최적화
- [x] GitHub 저장소 URL 업데이트

## 🔧 배포 전 준비사항

### TypeScript 컴파일 확인
```bash
# 백엔드 타입 체크
cd backend && npm run type-check

# 프론트엔드 타입 체크  
cd frontend && npm run type-check
```

### 필수 환경변수 준비

## 📋 배포 전 체크리스트

### 필수 사항
- [ ] GitHub 저장소가 최신 상태로 업데이트됨
- [ ] MongoDB Atlas 클러스터 생성 및 연결 URI 확보
- [ ] Riot Games API 키 발급 (https://developer.riotgames.com/)
- [ ] 모든 TypeScript 컴파일 오류 해결
- [ ] 로컬 환경에서 정상 작동 확인

### 선택 사항
- [ ] Redis 캐시 서버 설정 (Upstash 권장)
- [ ] AI 기능용 Google AI API 키 발급
- [ ] 에러 모니터링용 Slack/Discord webhook URL
- [ ] 도메인 및 SSL 인증서 준비

---

## 🖥️ 백엔드 배포 (Render.com)

### 1. Render Blueprint 배포 (권장)

#### Step 1: Blueprint로 자동 배포
1. [Render.com](https://render.com/)에서 GitHub 계정으로 로그인
2. Dashboard에서 **"New +"** → **"Blueprint"** 선택
3. GitHub 저장소 연결: `https://github.com/s0mar1/tftai.gg.git`
4. `render.yaml` 파일이 자동으로 인식됨

#### Step 2: 자동 설정 확인
```yaml
# render.yaml에서 자동 적용되는 설정들
✅ 서비스명: tft-meta-analyzer-backend
✅ 빌드 명령어: Turbo + pnpm 사용
✅ 시작 명령어: pnpm start (수정 완료)
✅ 환경변수: 체계적으로 정의됨
✅ 배포 필터: backend/shared 파일만 감지
```

### 2. 대안: 수동 Web Service 생성

수동으로 생성하는 경우:

```yaml
# 서비스 설정
Name: tft-meta-analyzer-backend
Environment: Node
Region: Singapore (Asia) 권장
Branch: main
Root Directory: / (모노레포 루트)

# 빌드 명령어
corepack enable && pnpm install --frozen-lockfile && turbo build --filter=@tft-meta-analyzer/backend...

# 시작 명령어  
cd backend && pnpm start
```

### 3. 환경변수 설정 (수동 입력 필요)

Render 대시보드에서 다음 환경변수들을 **수동으로 설정**해야 합니다:

#### 🔑 필수 환경변수
```bash
# 코어 서비스
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # Riot Games에서 발급
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db_name  # MongoDB Atlas URI

# CORS 설정 (이미 render.yaml에 포함됨)
# ALLOWED_ORIGINS=https://tft-meta-analyzer-frontend.pages.dev,https://tftai.gg
```

#### 🔧 선택적 환경변수 (기능 확장 시)
```bash
# 캐싱 시스템 (성능 향상)
UPSTASH_REDIS_URL=redis://default:password@host:port

# AI 기능 활성화
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_AI_MAIN_API_KEY=AIzaSyXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_AI_TRANSLATION_API_KEY=AIzaSyXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### ⚙️ 자동 설정되는 환경변수 (render.yaml)
```bash
# 이미 render.yaml에 정의된 환경변수들
✅ NODE_ENV=production
✅ MONGODB_TIMEOUT=10000
✅ MONGODB_RETRY_COUNT=3
✅ TFT_DATA_TIMEOUT=15000
✅ REDIS_TIMEOUT=10000
✅ PORT는 Render가 자동 할당
```

### 5. 배포 확인

1. Render 대시보드에서 빌드 로그 확인
2. 서비스 URL 접속하여 헬스체크: `GET /health`
3. API 응답 확인: `GET /` → `{"message": "TFT Meta Analyzer API is running."}`

---

## 🌐 프론트엔드 배포 (Cloudflare Pages)

### 1. Cloudflare Pages 프로젝트 생성

#### Step 1: 프로젝트 연결
1. [Cloudflare Dashboard](https://dash.cloudflare.com/)에서 "Workers & Pages" 선택
2. "Create application" → "Pages" → "Connect to Git"
3. GitHub 저장소 연결: `https://github.com/s0mar1/tftai.gg.git`

#### Step 2: 빌드 설정 (모노레포 대응)
```yaml
# 프로젝트 설정
Project name: tft-meta-analyzer-frontend
Production branch: main
Root directory: / (모노레포 루트)

# 빌드 설정 (Turbo 사용)  
Build command: corepack enable && pnpm install --frozen-lockfile && turbo build --filter=@tft-meta-analyzer/frontend...
Build output directory: frontend/dist

# 고급 설정
Node.js version: 18
Install dependencies command: 자동 감지됨 (pnpm)
```

### 2. 대안: 빌드 스크립트 사용

기본 빌드 명령어 대신 준비된 스크립트 사용:

```bash
# Build command
chmod +x frontend/build-cloudflare.sh && frontend/build-cloudflare.sh

# 또는 wrangler.toml 설정 활용
npx wrangler pages deploy frontend/dist
```

### 3. 환경변수 설정

Cloudflare Pages의 Settings → Environment variables에서 설정:

#### 🔑 필수 환경변수
```bash
# API 연결 (백엔드 URL 입력 필요)
NODE_ENV=production
VITE_API_BASE_URL=https://your-actual-backend-name.onrender.com  # 실제 Render URL로 변경
VITE_APP_TITLE=TFT Meta Analyzer
```

#### 📋 wrangler.toml에서 자동 설정 (참고용)
```bash
# 이미 wrangler.toml에 정의되어 있음 (Cloudflare 대시보드가 우선)
NODE_ENV=production
VITE_API_BASE_URL=https://tft-meta-analyzer-backend.onrender.com  # 예시 URL
VITE_APP_TITLE=TFT Meta Analyzer
```

#### 🎯 추가 설정 (선택)
```bash
# 성능 최적화
VITE_ENABLE_DEBUG_MODE=false
VITE_CACHE_TTL=300000

# 국제화
VITE_DEFAULT_LANGUAGE=ko
VITE_SUPPORTED_LANGUAGES=ko,en,ja,zh

# 분석 도구 (선택)
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

#### ⚠️ 중요: API URL 설정
백엔드 배포 완료 후 **반드시** `VITE_API_BASE_URL`을 실제 Render URL로 업데이트하세요:
```bash
# 예시
VITE_API_BASE_URL=https://tft-meta-analyzer-backend-abc123.onrender.com
```

### 4. 배포 확인

1. Cloudflare Pages 대시보드에서 빌드 로그 확인
2. 배포된 URL 접속하여 정상 작동 확인
3. API 연결 상태 확인 (개발자 도구 Network 탭)

---

## 🔧 배포 후 설정

### 도메인 설정 (선택)

#### Cloudflare Pages (프론트엔드)
1. "Custom domains" 탭에서 도메인 추가
2. DNS 설정: `CNAME` 레코드로 `your-project.pages.dev` 지정
3. SSL/TLS 인증서 자동 발급 확인

#### Render.com (백엔드)
1. "Settings" → "Custom Domain"에서 도메인 추가
2. DNS 설정: `CNAME` 레코드로 Render URL 지정
3. SSL 인증서 자동 발급 확인

### CORS 설정 확인 및 업데이트

#### 1. 기본 CORS 설정 (render.yaml)
```bash
# 이미 render.yaml에 설정되어 있음
ALLOWED_ORIGINS=https://tft-meta-analyzer-frontend.pages.dev,https://tftai.gg
```

#### 2. Custom Domain 사용 시 CORS 업데이트
Custom Domain을 설정한 경우, Render 환경변수를 업데이트:
```bash
# Render 대시보드에서 환경변수 추가/수정
ALLOWED_ORIGINS=https://your-custom-domain.com,https://your-project.pages.dev
```

#### 3. CORS 문제 해결
```bash
# 브라우저 개발자 도구에서 CORS 오류 발생 시:
# 1. 실제 프론트엔드 URL 확인
# 2. Render 환경변수 ALLOWED_ORIGINS 업데이트
# 3. 백엔드 서비스 재시작
```

### MongoDB 네트워크 액세스
MongoDB Atlas에서 Render.com IP 주소를 허용 목록에 추가:
1. MongoDB Atlas → Network Access
2. "Add IP Address" → "Allow access from anywhere" (0.0.0.0/0)
   또는 Render의 특정 IP 대역 추가

---

## 🚨 문제 해결

### 자주 발생하는 문제들

#### 1. MongoDB 연결 실패
```bash
# 증상: "MongoNetworkError: failed to connect to server"
# 해결방법:
# - MongoDB Atlas Network Access에서 IP 허용
# - MONGODB_URI 형식 확인
# - MongoDB 클러스터 상태 확인
```

#### 2. CORS 오류
```bash
# 증상: "Access to fetch blocked by CORS policy"
# 해결방법:
# - 백엔드 CORS_ORIGIN 환경변수 확인
# - 프론트엔드 VITE_API_URL 확인
# - 브라우저 개발자 도구에서 실제 요청 URL 확인
```

#### 3. API 404 오류
```bash
# 증상: "404 Not Found" for API endpoints
# 해결방법:
# - 백엔드 빌드 로그에서 라우트 등록 확인
# - 프론트엔드 API URL 설정 확인
# - 백엔드 서버 시작 로그 확인
```

#### 4. 환경변수 미인식
```bash
# 증상: 환경변수가 undefined로 나타남
# 해결방법:
# - Render/Cloudflare 대시보드에서 환경변수 재확인
# - 변수명 오타 확인 (VITE_ 접두사 포함)
# - 서비스 재시작
```

### 로그 확인 방법

#### Render.com 로그
1. 서비스 대시보드 → "Logs" 탭
2. 실시간 로그 스트림 확인
3. 오류 시점의 로그 상세 분석

#### Cloudflare Pages 로그
1. 프로젝트 대시보드 → "Deployments"
2. 실패한 배포 클릭 → "Build logs" 확인
3. 빌드 오류 메시지 분석

---

## 📊 성능 최적화

### 백엔드 최적화
```bash
# Redis 캐시 활성화
UPSTASH_REDIS_URL=redis://default:password@host:port

# 성능 모니터링 활성화
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_MEMORY_MONITORING=true

# 로그 레벨 조정
LOG_LEVEL=warn
```

### 프론트엔드 최적화
```bash
# 프로덕션 빌드 최적화
VITE_ENABLE_DEBUG_MODE=false
VITE_CACHE_TTL=600000

# 분석 도구 활성화
VITE_ENABLE_ANALYTICS=true
```

---

## 🔒 보안 체크리스트

### 백엔드 보안
- [ ] JWT_SECRET 강력한 비밀키 설정
- [ ] CORS_ORIGIN 특정 도메인으로 제한
- [ ] API 키들 환경변수로 안전하게 관리
- [ ] MongoDB 네트워크 액세스 제한
- [ ] HTTPS 활성화

### 프론트엔드 보안
- [ ] API URL HTTPS 사용
- [ ] 민감한 정보 환경변수 제외
- [ ] CSP (Content Security Policy) 설정 고려
- [ ] XSS 방지 조치 확인

---

## 📞 지원 및 문의

### 공식 문서
- [Render.com 문서](https://render.com/docs)
- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)
- [MongoDB Atlas 문서](https://docs.atlas.mongodb.com/)

### 커뮤니티 지원
- Render 커뮤니티 포럼
- Cloudflare Discord
- MongoDB Community Forums

---

## 🎯 배포 체크리스트

### 🚀 사전 배포 확인
- [ ] **로컬 테스트 완료**
  - [ ] `pnpm build` 성공 (루트에서 실행)
  - [ ] `pnpm test` 통과
  - [ ] TypeScript 컴파일 에러 없음
- [ ] **환경변수 준비**
  - [ ] RIOT_API_KEY 발급 완료
  - [ ] MongoDB Atlas 클러스터 생성
  - [ ] GitHub 저장소 최신 상태

### 🔧 백엔드 배포 (Render)
- [ ] **Blueprint 배포**
  - [ ] Render에서 Blueprint로 프로젝트 생성
  - [ ] render.yaml 자동 인식 확인
  - [ ] 빌드 로그에서 에러 없음 확인
- [ ] **환경변수 설정**
  - [ ] RIOT_API_KEY 입력
  - [ ] MONGODB_URI 입력
  - [ ] UPSTASH_REDIS_URL 입력 (선택)
  - [ ] GEMINI_API_KEY 입력 (선택)
- [ ] **배포 확인**
  - [ ] Health check: `GET /health` 응답 정상
  - [ ] API 테스트: `GET /api/static-data/champions`
  - [ ] Render URL 메모: `https://your-service.onrender.com`

### 🌐 프론트엔드 배포 (Cloudflare Pages)
- [ ] **프로젝트 생성**
  - [ ] Cloudflare Pages에서 Git 연결
  - [ ] 빌드 설정: Turbo 명령어 사용
  - [ ] 빌드 성공 확인
- [ ] **환경변수 설정**
  - [ ] NODE_ENV=production
  - [ ] VITE_API_BASE_URL=실제_백엔드_URL
  - [ ] VITE_APP_TITLE 설정
- [ ] **배포 확인**
  - [ ] 사이트 접속 정상
  - [ ] API 연결 상태 확인 (개발자 도구)
  - [ ] 주요 페이지 기능 테스트

### 🔗 통합 테스트
- [ ] **CORS 확인**
  - [ ] 브라우저 콘솔에 CORS 에러 없음
  - [ ] API 호출 정상 작동
- [ ] **기능 테스트**
  - [ ] 챔피언 데이터 로딩 정상
  - [ ] 티어리스트 페이지 작동
  - [ ] 소환사 검색 기능 테스트
- [ ] **성능 확인**
  - [ ] 페이지 로딩 속도 확인
  - [ ] 모바일 반응형 디자인 확인

### 📊 배포 후 모니터링
- [ ] **로그 모니터링**
  - [ ] Render 로그에서 에러 확인
  - [ ] Cloudflare 빌드 로그 확인
- [ ] **성능 메트릭**
  - [ ] Render 메트릭스 확인
  - [ ] Cloudflare Analytics 설정
- [ ] **백업 및 보안**
  - [ ] 환경변수 백업 (안전한 곳에 저장)
  - [ ] MongoDB 백업 설정 확인

---

## 📞 지원 및 문의

### 🔧 설정 파일 위치
- **백엔드 설정**: `/render.yaml`
- **프론트엔드 설정**: `/wrangler.toml` 
- **환경변수 예시**: `backend/.env.example`, `frontend/.env.example`

### 📚 공식 문서
- [Render.com 문서](https://render.com/docs)
- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)
- [Turbo 문서](https://turbo.build/repo/docs)

### 🎯 배포 완료 시 예상 URL
- **프론트엔드**: `https://your-project.pages.dev`
- **백엔드 API**: `https://your-service.onrender.com`
- **API 문서**: `https://your-service.onrender.com/api-docs`

**이 가이드를 따라 배포하시면 TFT Meta Analyzer가 안정적으로 운영됩니다! 🚀**