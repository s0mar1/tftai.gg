# TFT Meta Analyzer OpenTelemetry 구현 가이드

## 🚀 개요

이 문서는 TFT Meta Analyzer 프로젝트에 OpenTelemetry를 구현한 완전한 솔루션을 제공합니다. 실시간 성능 모니터링, 분산 추적, 비즈니스 메트릭 추적을 포함한 종합적인 관찰성(Observability) 시스템을 구축했습니다.

## 📋 구현된 주요 기능

### 1. 🔧 OpenTelemetry 기본 설정
- **파일**: `src/config/telemetry.ts`
- **기능**: 
  - NodeSDK 자동 계측
  - Prometheus 메트릭 익스포터
  - OTLP 트레이스 익스포터
  - 리소스 정의 (서비스 이름, 환경 등)

### 2. 📊 TFT 특화 메트릭 시스템
- **파일**: `src/services/telemetry/tftMetrics.ts`
- **주요 메트릭**:
  - API 응답 시간 분포
  - 캐시 히트율 (L1, L2별)
  - 외부 API 성공률 (Riot API, Google AI)
  - 동시 접속 사용자 수
  - AI 분석 응답 시간 및 토큰 사용량
  - 에러율 및 타입별 분석

### 3. 🔍 분산 추적 시스템
- **파일**: `src/services/telemetry/distributedTracing.ts`
- **주요 플로우**:
  - **SummonerFlowTracer**: 소환사 정보 조회 플로우
  - **AiAnalysisFlowTracer**: AI 분석 요청 플로우
  - **CacheFlowTracer**: 다단계 캐시 조회 플로우
  - **ErrorFlowTracer**: 에러 전파 추적

### 4. 🛠️ 미들웨어 시스템
- **파일**: `src/middlewares/telemetryMiddleware.ts`
- **기능**:
  - 모든 HTTP 요청 추적
  - 사용자 세션 추적
  - 캐시 헤더 자동 추가
  - 외부 API 호출 추적

## 🔧 설치 및 설정

### 1. 의존성 설치
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-prometheus @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http
npm install @opentelemetry/instrumentation-mongoose @opentelemetry/instrumentation-ioredis
```

### 2. 환경 변수 설정
```bash
# .env 파일에 추가
OTEL_SERVICE_NAME=tft-meta-analyzer-backend
OTEL_SERVICE_VERSION=1.0.0
PROMETHEUS_PORT=9090
JAEGER_ENDPOINT=http://localhost:14268/api/traces
OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
```

### 3. 서버 초기화 수정
```typescript
// src/server.ts 파일 시작 부분에 추가
import { initializeTelemetry } from './config/telemetry';
initializeTelemetry();

// 미들웨어 등록
app.use(tftTelemetryMiddleware);
app.use(cacheHeaderMiddleware);
```

## 📊 모니터링 스택 구성

### 1. Docker Compose로 모니터링 스택 실행
```bash
cd backend/src/config
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. 접속 정보
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686
- **AlertManager**: http://localhost:9093

### 3. 대시보드 구성
- **실시간 성능 대시보드**: API 응답 시간, 캐시 히트율, 에러율
- **비즈니스 메트릭 대시보드**: AI 분석 통계, 사용자 분포, 매치 분석
- **인프라 모니터링**: 메모리, DB 쿼리, 외부 API 상태

## 🚀 사용 방법

### 1. 텔레메트리 강화된 서비스 사용
```typescript
// 캐시 서비스
import { telemetryEnhancedCacheManager } from './services/telemetry-enhanced-cache';

// 사용 예시
const result = await telemetryEnhancedCacheManager.get('summoner_data_key');
await telemetryEnhancedCacheManager.set('key', data, 3600);

// Riot API 서비스
import { getAccountByRiotIdWithTracing } from './services/telemetry-enhanced-riot-api';

// 사용 예시
const account = await getAccountByRiotIdWithTracing('gameName', 'tagLine', 'kr');

// AI 분석 서비스
import { telemetryEnhancedAIService } from './services/telemetry-enhanced-ai-service';

// 사용 예시
const analysis = await telemetryEnhancedAIService.analyzeMatchWithTracing(matchId, userPuuid);
```

### 2. 커스텀 메트릭 기록
```typescript
import { 
  recordApiResponseTime, 
  recordCacheHit, 
  recordExternalApiCall,
  recordAiAnalysis 
} from './services/telemetry/tftMetrics';

// API 응답 시간 기록
recordApiResponseTime('/api/summoner', 'GET', 200, 150);

// 캐시 히트 기록
recordCacheHit('L1', 'summoner_data');

// 외부 API 호출 기록
recordExternalApiCall('riot', 'kr', true, 250);

// AI 분석 기록
recordAiAnalysis('match', true, 3000, 150);
```

### 3. 분산 추적 사용
```typescript
import { SummonerFlowTracer, AiAnalysisFlowTracer } from './services/telemetry/distributedTracing';

// 소환사 조회 플로우
const flowTracer = new SummonerFlowTracer('gameName', 'tagLine', 'kr');

try {
  const result = await flowTracer.traceCacheLookup('cache_key', 'L1', async () => {
    return await cacheManager.get('cache_key');
  });
  
  flowTracer.finish(true);
} catch (error) {
  flowTracer.finish(false, error.message);
}

// AI 분석 플로우
const aiTracer = new AiAnalysisFlowTracer('matchId', 'userPuuid', 'match');
const result = await aiTracer.traceAiModelCall('gemini-2.5-pro', 1000, async () => {
  return await model.generateContent(prompt);
});
```

## 📈 주요 대시보드 메트릭

### 1. 성능 메트릭
- **API 응답 시간**: 95th percentile, 평균 응답 시간
- **캐시 성능**: L1/L2 히트율, 캐시 효율성
- **외부 API**: Riot API, Google AI 성공률 및 응답 시간

### 2. 비즈니스 메트릭
- **AI 분석**: 일별/시간별 분석 요청 수
- **사용자 활동**: 지역별, 티어별 사용자 분포
- **매치 분석**: 분석된 매치 수, 성공률

### 3. 인프라 메트릭
- **시스템 리소스**: 메모리, CPU 사용률
- **데이터베이스**: 쿼리 응답 시간, 연결 풀 상태
- **외부 의존성**: Redis, MongoDB 연결 상태

## 🚨 알림 설정

### 1. 성능 알림
- API 응답 시간 1초 초과
- 캐시 히트율 70% 미만
- 외부 API 실패율 5% 초과

### 2. 비즈니스 알림
- AI 분석 응답 시간 30초 초과
- Riot API 속도 제한 근접
- 동시 접속자 수 급증

### 3. 인프라 알림
- 메모리 사용량 80% 초과
- 데이터베이스 쿼리 지연
- 외부 서비스 연결 실패

## 🔍 트러블슈팅

### 1. 메트릭이 표시되지 않는 경우
```bash
# Prometheus 엔드포인트 확인
curl http://localhost:9090/metrics

# 애플리케이션 메트릭 확인
curl http://localhost:3001/metrics
```

### 2. 트레이스가 표시되지 않는 경우
```bash
# Jaeger 연결 확인
curl http://localhost:16686/api/traces

# OTLP 엔드포인트 확인
curl http://localhost:14268/api/traces
```

### 3. 대시보드 임포트 실패
```bash
# Grafana 프로비저닝 확인
docker logs tft-grafana

# 대시보드 파일 권한 확인
chmod 644 ./grafana/dashboards/*.json
```

## 🎯 성능 최적화 팁

### 1. 메트릭 샘플링
```typescript
// 높은 트래픽 엔드포인트의 경우 샘플링 적용
if (Math.random() < 0.1) { // 10% 샘플링
  recordApiResponseTime(endpoint, method, statusCode, duration);
}
```

### 2. 스팬 속성 최적화
```typescript
// 너무 많은 속성 추가 피하기
span.setAttributes({
  'tft.endpoint': endpoint,
  'tft.user.region': region,
  // 필요한 속성만 추가
});
```

### 3. 캐시 최적화
```typescript
// 자주 조회되는 메트릭은 캐시 활용
const cachedMetrics = await cacheManager.get('metrics_summary');
if (!cachedMetrics) {
  const metrics = await generateMetrics();
  await cacheManager.set('metrics_summary', metrics, 60); // 1분 캐시
}
```

## 📝 추가 고려사항

### 1. 보안
- 민감한 데이터는 스팬 속성에 포함하지 않기
- 사용자 식별자는 해시 처리 또는 마스킹
- API 키는 환경 변수로 관리

### 2. 성능
- 메트릭 수집이 애플리케이션 성능에 미치는 영향 모니터링
- 필요 시 샘플링 비율 조정
- 메모리 사용량 정기적 점검

### 3. 확장성
- 마이크로서비스 환경에서의 분산 추적
- 멀티 리전 배포 시 메트릭 집계
- 로그 레벨별 텔레메트리 분리

이 구현을 통해 TFT Meta Analyzer는 완전한 관찰성을 갖추게 되며, 성능 최적화와 문제 진단이 크게 향상됩니다.