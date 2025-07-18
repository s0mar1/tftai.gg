# 🚀 TFT Meta Analyzer 배포 가이드

이 문서는 TFT Meta Analyzer 프로젝트를 Render.com(백엔드)와 Cloudflare Pages(프론트엔드)에 배포하는 방법을 설명합니다.

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

### 1. 계정 설정 및 서비스 생성

1. [Render.com](https://render.com/)에서 GitHub 계정으로 로그인
2. Dashboard에서 "New +" → "Web Service" 선택
3. GitHub 저장소 연결: `https://github.com/s0mar1/metamind11`

### 2. 기본 설정

```yaml
# 서비스 설정
Name: tft-meta-analyzer-backend
Environment: Node
Region: Oregon (US West) 또는 Frankfurt (Europe)
Branch: main
Root Directory: backend
```

### 3. 빌드 및 시작 명령어

```bash
# Build Command
npm run build

# Start Command  
npm start
```

### 4. 환경변수 설정

Render 대시보드의 Environment 탭에서 다음 환경변수를 설정하세요:

#### 필수 환경변수
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tft-meta-analyzer
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CORS_ORIGIN=https://tftai.gg,https://www.tftai.gg
```

#### 선택적 환경변수
```bash
# Redis 캐시 (성능 향상)
UPSTASH_REDIS_URL=redis://default:password@host:port

# AI 기능
GOOGLE_AI_MAIN_API_KEY=AIzaSyXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_AI_TRANSLATION_API_KEY=AIzaSyXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 보안
JWT_SECRET=your-super-secret-jwt-key-here

# 모니터링
LOG_LEVEL=warn
ENABLE_PERFORMANCE_MONITORING=true

# 알림 (선택)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX
```

### 5. 배포 확인

1. Render 대시보드에서 빌드 로그 확인
2. 서비스 URL 접속하여 헬스체크: `GET /health`
3. API 응답 확인: `GET /` → `{"message": "TFT Meta Analyzer API is running."}`

---

## 🌐 프론트엔드 배포 (Cloudflare Pages)

### 1. 계정 설정 및 프로젝트 생성

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)에서 "Workers & Pages" 선택
2. "Create application" → "Pages" → "Connect to Git"
3. GitHub 저장소 연결: `https://github.com/s0mar1/metamind11`

### 2. 빌드 설정

```yaml
# 프로젝트 설정
Project name: tft-meta-analyzer
Production branch: main
Root directory: frontend

# 빌드 설정  
Build command: npm run build
Build output directory: dist
```

### 3. 환경변수 설정

Cloudflare Pages의 Settings → Environment variables에서 설정:

#### 필수 환경변수
```bash
NODE_ENV=production
VITE_API_URL=https://your-backend-app.onrender.com
VITE_API_VERSION=v1
VITE_API_TIMEOUT=30000
```

#### 기능 설정
```bash
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_MOCK_DATA=false
```

#### 로케일 설정
```bash
VITE_DEFAULT_LANGUAGE=ko
VITE_SUPPORTED_LANGUAGES=ko,en,ja,fr
VITE_DEFAULT_REGION=kr
VITE_CACHE_TTL=300000
```

#### 외부 서비스 (선택)
```bash
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
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

### CORS 업데이트
도메인 설정 후 백엔드의 `CORS_ORIGIN` 환경변수를 업데이트하세요:
```bash
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
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

이 가이드를 따라 배포하시면 TFT Meta Analyzer가 안정적으로 운영됩니다. 추가 질문이나 문제가 발생하면 각 플랫폼의 지원 채널을 이용하세요.