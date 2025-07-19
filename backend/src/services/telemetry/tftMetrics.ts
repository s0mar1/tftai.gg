// backend/src/services/telemetry/tftMetrics.ts - TFT 특화 메트릭 정의
import { metrics } from '@opentelemetry/api';
// import { MeterProvider } from '@opentelemetry/sdk-metrics'; // Unused
import logger from '../../config/logger';

// 메터 인스턴스 생성
const meter = metrics.getMeter('tft-meta-analyzer', '1.0.0');

// === TFT 특화 메트릭 정의 ===

// 1. API 응답 시간 메트릭 (엔드포인트별)
export const apiResponseTimeHistogram = meter.createHistogram('tft_api_response_time', {
  description: 'API 응답 시간 분포',
  unit: 'ms',
});

// 2. 캐시 히트율 메트릭 (L1, L2 캐시별)
export const cacheHitCounter = meter.createCounter('tft_cache_hits_total', {
  description: '캐시 히트 카운터',
});

export const cacheMissCounter = meter.createCounter('tft_cache_misses_total', {
  description: '캐시 미스 카운터',
});

// 3. 외부 API 호출 성공률 메트릭
export const externalApiCallsCounter = meter.createCounter('tft_external_api_calls_total', {
  description: '외부 API 호출 총 횟수',
});

export const externalApiErrorsCounter = meter.createCounter('tft_external_api_errors_total', {
  description: '외부 API 호출 에러 횟수',
});

// 4. 사용자 요청 패턴 분석 메트릭
export const userRequestCounter = meter.createCounter('tft_user_requests_total', {
  description: '사용자 요청 총 횟수',
});

export const concurrentUsersGauge = meter.createUpDownCounter('tft_concurrent_users', {
  description: '동시 접속 사용자 수',
});

// 5. 에러율 및 타입별 분석 메트릭
export const errorCounter = meter.createCounter('tft_errors_total', {
  description: '에러 발생 총 횟수',
});

export const errorRateGauge = meter.createUpDownCounter('tft_error_rate', {
  description: '에러율 (errors/requests)',
});

// 6. AI 분석 관련 메트릭
export const aiAnalysisCounter = meter.createCounter('tft_ai_analysis_total', {
  description: 'AI 분석 요청 총 횟수',
});

export const aiAnalysisLatencyHistogram = meter.createHistogram('tft_ai_analysis_latency', {
  description: 'AI 분석 응답 시간 분포',
  unit: 'ms',
});

export const aiTokenUsageCounter = meter.createCounter('tft_ai_token_usage_total', {
  description: 'AI 토큰 사용량',
});

// 7. Riot API 특화 메트릭
export const riotApiRateLimitGauge = meter.createUpDownCounter('tft_riot_api_rate_limit', {
  description: 'Riot API 속도 제한 상태',
});

export const riotApiQuotaGauge = meter.createUpDownCounter('tft_riot_api_quota_remaining', {
  description: 'Riot API 남은 할당량',
});

// 8. 데이터베이스 관련 메트릭
export const dbQueryLatencyHistogram = meter.createHistogram('tft_db_query_latency', {
  description: '데이터베이스 쿼리 응답 시간',
  unit: 'ms',
});

export const dbConnectionPoolGauge = meter.createUpDownCounter('tft_db_connection_pool', {
  description: '데이터베이스 연결 풀 상태',
});

// 9. 비즈니스 메트릭
export const matchesAnalyzedCounter = meter.createCounter('tft_matches_analyzed_total', {
  description: '분석된 매치 총 횟수',
});

export const uniquePlayersCounter = meter.createCounter('tft_unique_players_total', {
  description: '분석된 고유 플레이어 수',
});

export const tierDistributionGauge = meter.createUpDownCounter('tft_tier_distribution', {
  description: '분석된 플레이어 티어 분포',
});

// 10. 메모리 및 성능 메트릭
export const memoryUsageGauge = meter.createUpDownCounter('tft_memory_usage_bytes', {
  description: '메모리 사용량',
  unit: 'bytes',
});

export const cpuUsageGauge = meter.createUpDownCounter('tft_cpu_usage_percent', {
  description: 'CPU 사용률',
  unit: 'percent',
});

// === 메트릭 헬퍼 함수들 ===

/**
 * API 응답 시간 기록
 */
export function recordApiResponseTime(endpoint: string, method: string, statusCode: number, duration: number): void {
  apiResponseTimeHistogram.record(duration, {
    endpoint,
    method,
    status_code: statusCode.toString(),
    endpoint_category: getTFTEndpointCategory(endpoint),
  });
}

/**
 * 캐시 히트/미스 기록
 */
export function recordCacheHit(cacheLayer: 'L1' | 'L2', keyType: string): void {
  cacheHitCounter.add(1, {
    cache_layer: cacheLayer,
    key_type: keyType,
  });
}

export function recordCacheMiss(cacheLayer: 'L1' | 'L2', keyType: string): void {
  cacheMissCounter.add(1, {
    cache_layer: cacheLayer,
    key_type: keyType,
  });
}

/**
 * 외부 API 호출 결과 기록
 */
export function recordExternalApiCall(apiType: 'riot' | 'google_ai', region: string, success: boolean, _duration: number): void {
  externalApiCallsCounter.add(1, {
    api_type: apiType,
    region,
    success: success.toString(),
  });

  if (!success) {
    externalApiErrorsCounter.add(1, {
      api_type: apiType,
      region,
    });
  }
}

/**
 * 사용자 요청 패턴 기록
 */
export function recordUserRequest(endpoint: string, userRegion: string, userTier?: string): void {
  userRequestCounter.add(1, {
    endpoint,
    user_region: userRegion,
    user_tier: userTier || 'unknown',
  });
}

/**
 * 에러 발생 기록
 */
export function recordError(errorType: string, endpoint: string, statusCode: number): void {
  errorCounter.add(1, {
    error_type: errorType,
    endpoint,
    status_code: statusCode.toString(),
  });
}

/**
 * AI 분석 메트릭 기록
 */
export function recordAiAnalysis(analysisType: 'match' | 'meta' | 'deck', success: boolean, duration: number, tokenUsage?: number): void {
  aiAnalysisCounter.add(1, {
    analysis_type: analysisType,
    success: success.toString(),
  });

  aiAnalysisLatencyHistogram.record(duration, {
    analysis_type: analysisType,
    success: success.toString(),
  });

  if (tokenUsage) {
    aiTokenUsageCounter.add(tokenUsage, {
      analysis_type: analysisType,
    });
  }
}

/**
 * Riot API 속도 제한 상태 업데이트
 */
export function updateRiotApiRateLimit(region: string, remainingRequests: number, quotaRemaining: number): void {
  riotApiRateLimitGauge.add(remainingRequests, {
    region,
    limit_type: 'requests',
  });

  riotApiQuotaGauge.add(quotaRemaining, {
    region,
  });
}

/**
 * 데이터베이스 쿼리 메트릭 기록
 */
export function recordDbQuery(collection: string, operation: string, duration: number, success: boolean): void {
  dbQueryLatencyHistogram.record(duration, {
    collection,
    operation,
    success: success.toString(),
  });
}

/**
 * 비즈니스 메트릭 기록
 */
export function recordMatchAnalysis(region: string, tier: string, placement: number): void {
  matchesAnalyzedCounter.add(1, {
    region,
    tier,
    placement: placement.toString(),
  });
}

export function recordUniquePlayer(region: string, tier: string): void {
  uniquePlayersCounter.add(1, {
    region,
    tier,
  });
}

export function updateTierDistribution(tier: string, count: number): void {
  tierDistributionGauge.add(count, {
    tier,
  });
}

/**
 * 시스템 메트릭 업데이트
 */
export function updateSystemMetrics(): void {
  const usage = process.memoryUsage();
  
  memoryUsageGauge.add(usage.heapUsed, {
    type: 'heap_used',
  });
  
  memoryUsageGauge.add(usage.heapTotal, {
    type: 'heap_total',
  });
  
  memoryUsageGauge.add(usage.rss, {
    type: 'rss',
  });
  
  // CPU 사용률은 더 복잡한 계산이 필요하므로 추후 구현
}

// 헬퍼 함수
function getTFTEndpointCategory(endpoint: string): string {
  if (endpoint.includes('/summoner')) return 'summoner';
  if (endpoint.includes('/ai')) return 'ai_analysis';
  if (endpoint.includes('/match')) return 'match_data';
  if (endpoint.includes('/tierlist')) return 'tierlist';
  if (endpoint.includes('/ranking')) return 'ranking';
  if (endpoint.includes('/static-data')) return 'static_data';
  if (endpoint.includes('/cache')) return 'cache_management';
  if (endpoint.includes('/health')) return 'health_check';
  return 'other';
}

// 시스템 메트릭 주기적 업데이트
setInterval(() => {
  updateSystemMetrics();
}, 30000); // 30초마다 업데이트

logger.info('🔍 TFT 특화 메트릭 시스템 초기화 완료');