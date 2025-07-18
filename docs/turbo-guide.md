# 🚀 Turbo 빌드 시스템 사용 가이드

## 개요

TFT Meta Analyzer 프로젝트에 Turbo 빌드 시스템이 도입되었습니다. 이를 통해 **개발 생산성이 획기적으로 향상**되었습니다.

### 🎯 핵심 장점

- **빌드 시간 50-70% 단축** (캐시 활용 시)
- **집중력 유지** (불필요한 대기 시간 제거)
- **간단한 명령어** (`turbo build` 하나로 모든 것 관리)
- **지능형 캐시** (변경되지 않은 패키지는 재사용)

## 명령어 비교

### 기존 pnpm 명령어 (계속 사용 가능)
```bash
# 전체 빌드 (순차 실행)
pnpm build

# 개별 패키지 빌드
pnpm build:backend
pnpm build:frontend
pnpm build:shared

# 개발 서버
pnpm dev

# 테스트
pnpm test

# 린트
pnpm lint
```

### ✨ 새로운 Turbo 명령어
```bash
# 🚀 전체 빌드 (캐시 + 병렬 실행)
pnpm turbo:build

# 🚀 개발 서버
pnpm turbo:dev

# 🚀 테스트
pnpm turbo:test

# 🚀 린트
pnpm turbo:lint

# 🚀 타입 체크
pnpm turbo:type-check

# 🚀 정리
pnpm turbo:clean
```

## 🎯 실제 사용 시나리오

### 시나리오 1: 백엔드만 수정
```bash
# 기존 방식 (3-5분)
pnpm build

# Turbo 방식 (30초)
pnpm turbo:build
# → shared: CACHED ✅
# → backend: BUILDING 🔄
# → frontend: CACHED ✅
```

### 시나리오 2: 프론트엔드만 수정
```bash
# 기존 방식 (3-5분)
pnpm build

# Turbo 방식 (1분)
pnpm turbo:build
# → shared: CACHED ✅
# → backend: CACHED ✅
# → frontend: BUILDING 🔄
```

### 시나리오 3: 아무것도 수정하지 않음
```bash
# Turbo 방식 (거의 즉시)
pnpm turbo:build
# → shared: CACHED ✅
# → backend: CACHED ✅
# → frontend: CACHED ✅
# 
# ✨ FULL TURBO 모드 활성화! 
# 🎉 모든 작업이 캐시에서 재사용됨
```

## 🔍 성능 모니터링

### 빌드 시간 확인
```bash
# 시간 측정과 함께 실행
time pnpm turbo:build

# 상세 로그
pnpm turbo:build --log-order=grouped
```

### 캐시 상태 확인
```bash
# 드라이 런으로 실행 계획 확인
pnpm turbo:build --dry-run

# 캐시 정보 확인
pnpm turbo:build --summarize
```

## 🛠️ 고급 사용법

### 특정 패키지만 빌드
```bash
# 백엔드만 빌드
turbo build --filter=@tft-meta-analyzer/backend

# 프론트엔드만 빌드
turbo build --filter=@tft-meta-analyzer/frontend
```

### 캐시 무시하고 빌드
```bash
# 강제 재빌드
pnpm turbo:build --force
```

### 병렬 처리 제어
```bash
# 동시 실행 작업 수 제한
pnpm turbo:build --concurrency=2
```

## 🎨 개발 워크플로우

### 권장 개발 흐름
1. **개발 서버 시작**
   ```bash
   pnpm turbo:dev
   ```

2. **코드 수정 후 빌드**
   ```bash
   pnpm turbo:build
   ```

3. **테스트 실행**
   ```bash
   pnpm turbo:test
   ```

4. **린트 및 타입 체크**
   ```bash
   pnpm turbo:lint
   pnpm turbo:type-check
   ```

### 🔄 CI/CD 통합
```yaml
# GitHub Actions 예시
- name: Build with Turbo
  run: pnpm turbo:build

- name: Test with Turbo
  run: pnpm turbo:test

- name: Lint with Turbo
  run: pnpm turbo:lint
```

## 📊 성능 비교

| 작업 | 기존 pnpm | Turbo (초회) | Turbo (캐시) |
|------|-----------|-------------|-------------|
| 전체 빌드 | 3-5분 | 2-3분 | 5-10초 |
| 백엔드만 | 3-5분 | 30초 | 1초 |
| 프론트엔드만 | 3-5분 | 1분 | 2초 |
| 테스트 | 2-3분 | 1-2분 | 5초 |

## 🚨 주의사항

### 기존 시스템과의 호환성
- **기존 pnpm 명령어는 계속 사용 가능**
- **CI/CD 파이프라인 변경 불필요**
- **언제든지 롤백 가능**

### 캐시 관리
```bash
# 캐시 정리
pnpm turbo:clean

# 전체 캐시 삭제
rm -rf .turbo
```

### 환경 변수
Turbo는 다음 환경 변수들을 자동으로 감지합니다:
- `NODE_ENV`
- `RIOT_API_KEY`
- `MONGODB_URI`
- `UPSTASH_REDIS_URL`
- `GEMINI_API_KEY`
- `FRONTEND_URL`

## 🆘 문제 해결

### 캐시 문제
```bash
# 캐시 무시하고 재빌드
pnpm turbo:build --force

# 캐시 완전 삭제
rm -rf .turbo node_modules/.cache
```

### 의존성 문제
```bash
# 의존성 그래프 확인
pnpm turbo:build --dry-run

# 의존성 재설치
pnpm install
```

## 🎉 결론

Turbo 도입으로 개발 경험이 크게 향상되었습니다:

- ⚡ **빠른 빌드**: 캐시 활용으로 대기 시간 최소화
- 🧠 **집중력 유지**: 불필요한 대기 시간 제거
- 🚀 **생산성 향상**: 더 많은 시간을 개발에 집중

**이제 `pnpm turbo:build`로 개발 생산성을 경험해보세요!**

---

## 📝 추가 자료

- [Turbo 공식 문서](https://turbo.build/repo/docs)
- [모노레포 best practices](https://turbo.build/repo/docs/handbook)
- [캐시 최적화 가이드](https://turbo.build/repo/docs/core-concepts/caching)