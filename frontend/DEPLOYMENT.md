# TFT Meta Analyzer 배포 가이드

## 📋 배포 환경 설정

### 1. Cloudflare Pages 설정

#### 빌드 설정
- **빌드 명령어**: `npm run build`
- **빌드 출력 디렉토리**: `frontend/dist`
- **루트 디렉토리**: `frontend`

#### 환경 변수 설정
Cloudflare Pages 대시보드에서 다음 환경 변수를 설정하세요:

```bash
# 백엔드 API URL (선택사항)
# 설정하지 않으면 _redirects 파일이 처리합니다
VITE_API_BASE_URL=https://your-backend-server.com

# 기타 설정
VITE_DEFAULT_LANGUAGE=ko
VITE_SUPPORTED_LANGUAGES=ko,en,ja,zh
VITE_DEFAULT_REGION=kr
```

### 2. _redirects 파일 설정

`frontend/public/_redirects` 파일이 자동으로 배포됩니다:

```
# API 요청을 백엔드 서버로 프록시
/api/* https://your-backend-server.com/api/:splat 200

# SPA 라우팅을 위한 fallback
/* /index.html 200
```

⚠️ **중요**: 백엔드 서버 URL을 실제 배포된 서버 주소로 변경하세요!

### 3. 백엔드 서버 설정 (Render.com 예시)

#### 환경 변수
```bash
NODE_ENV=production
PORT=4001
MONGODB_URI=mongodb+srv://...
CORS_ORIGINS=https://tftai.gg,https://your-cloudflare-pages.pages.dev
```

### 4. 문제 해결

#### "Unexpected token '<'" 에러
- 원인: API 요청이 HTML (보통 404 페이지)을 반환
- 해결:
  1. `_redirects` 파일의 백엔드 URL 확인
  2. 백엔드 서버가 실행 중인지 확인
  3. CORS 설정 확인

#### 405 Method Not Allowed 에러
- 원인: 존재하지 않는 API 엔드포인트 호출
- 해결: 
  1. 프론트엔드와 백엔드 API 엔드포인트 일치 확인
  2. HTTP 메서드 (GET/POST/PUT/DELETE) 확인

### 5. 배포 체크리스트

- [ ] `_redirects` 파일에 올바른 백엔드 URL 설정
- [ ] 백엔드 서버 배포 및 실행 확인
- [ ] CORS 설정에 프론트엔드 도메인 추가
- [ ] 환경 변수 설정 완료
- [ ] API 엔드포인트 접근 테스트
- [ ] 주요 페이지 동작 확인

### 6. 로컬 vs 배포 환경 차이점

| 항목 | 로컬 환경 | 배포 환경 |
|------|-----------|-----------|
| API 프록시 | Vite dev server | Cloudflare _redirects |
| API Base URL | http://localhost:4001 | 상대 경로 또는 환경 변수 |
| CORS | localhost:3000 허용 | 배포 도메인 허용 |
| 정적 파일 서빙 | Vite dev server | Cloudflare Pages |

### 7. 디버깅 팁

1. **브라우저 Network 탭 확인**
   - API 요청의 실제 URL 확인
   - Response가 JSON인지 HTML인지 확인

2. **콘솔 로그 확인**
   - fetchApi 디버그 로그 확인
   - 에러 메시지 상세 확인

3. **직접 API 테스트**
   ```bash
   curl https://your-backend-server.com/api/tierlist/decks/ko
   ```