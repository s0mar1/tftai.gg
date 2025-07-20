// 메트릭 수집 및 모니터링 시스템
import { Response, NextFunction } from 'express';
import { ExtendedRequest } from '../types/express';
import logger from '../config/logger';
// import { alertService } from '../services/alertService'; // Unused

/**
 * 백분위수 계산 함수
 * @param values 정렬된 숫자 배열
 * @param percentile 백분위수 (0-100)
 * @returns 백분위수 값
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  // 값들을 정렬
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  
  if (index % 1 === 0) {
    // 정수 인덱스인 경우
    return sorted[Math.floor(index)] || 0;
  } else {
    // 소수 인덱스인 경우 보간법 사용
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    const lowerVal = sorted[lower] || 0;
    const upperVal = sorted[upper] || 0;
    
    return lowerVal * (1 - weight) + upperVal * weight;
  }
}

/**
 * 백분위수 메트릭 계산
 * @param values 숫자 배열
 * @returns 백분위수 객체
 */
function calculatePercentiles(values: number[]): {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
} {
  if (values.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
  }
  
  return {
    p50: calculatePercentile(values, 50),
    p75: calculatePercentile(values, 75),
    p90: calculatePercentile(values, 90),
    p95: calculatePercentile(values, 95),
    p99: calculatePercentile(values, 99)
  };
}

interface RequestMetric {
  count: number;
  methods: Set<string>;
  userAgents: Set<string>;
  ips: Set<string>;
  timestamps: number[];
}

interface ResponseMetric {
  count: number;
  statusCodes: Map<number, number>;
  responseTimes: number[];
  sizes: number[];
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p75ResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

interface ErrorMetric {
  count: number;
  errorTypes: Map<string, number>;
  statusCodes: Map<number, number>;
  messages: Set<string>;
  timestamps: number[];
}

interface PerformanceMetric {
  count: number;
  durations: number[];
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p75Duration: number;
  p90Duration: number;
  p95Duration: number;
  p99Duration: number;
  metadata: Map<string, Map<string, number>>;
}

interface CacheMetric {
  hits: number;
  misses: number;
  hitRate: number;
  keys: Set<string>;
  avgTTL: number;
  ttls: number[];
  evictions: number;
  memoryUsage: number;
  averageKeySize: number;
  totalOperations: number;
  lastAccess: number;
  recentHitRates: number[];
  keyAccessPatterns: Map<string, number>;
}

interface APIMetric {
  calls: number;
  successes: number;
  failures: number;
  successRate: number;
  durations: number[];
  avgDuration: number;
  p50Duration: number;
  p75Duration: number;
  p90Duration: number;
  p95Duration: number;
  p99Duration: number;
  statusCodes: Map<number, number>;
  timestamps: number[];
  timeouts: number;
  rateLimits: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  consecutiveFailures: number;
  lastFailureTime: number;
  uptime: number;
  slaCompliance: number;
  errorPatterns: Map<string, number>;
  responseTimeThreshold: number;
  slowResponses: number;
}

interface Metrics {
  requests: Map<string, RequestMetric>;
  responses: Map<string, ResponseMetric>;
  errors: Map<string, ErrorMetric>;
  performance: Map<string, PerformanceMetric>;
  cache: Map<string, CacheMetric>;
  api: Map<string, APIMetric>;
}

interface MetricsSummary {
  uptime: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgResponseTime: number;
  topEndpoints: { endpoint: string; count: number }[];
  timestamp: string;
}

class MetricsCollector {
  private metrics: Metrics;
  private startTime: number;
  private requestCount: number;
  private errorCount: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.metrics = {
      requests: new Map(),
      responses: new Map(),
      errors: new Map(),
      performance: new Map(),
      cache: new Map(),
      api: new Map()
    };
    
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    
    // 정리 작업 스케줄 (1시간마다)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 3600000);
    
    // Feature flag로 메트릭 정리 제어
    if (process.env.ENABLE_METRICS_CLEANUP === 'true') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  // 요청 메트릭 기록
  recordRequest(method: string, path: string, userAgent?: string | null, ip?: string | null): void {
    this.requestCount++;
    const key = `${method}:${path}`;
    
    if (!this.metrics.requests.has(key)) {
      this.metrics.requests.set(key, {
        count: 0,
        methods: new Set(),
        userAgents: new Set(),
        ips: new Set(),
        timestamps: []
      });
    }
    
    const metric = this.metrics.requests.get(key);
    if (!metric) {
      throw new Error(`Request metric not found for key: ${key}`);
    }
    metric.count++;
    metric.methods.add(method);
    
    if (userAgent) metric.userAgents.add(userAgent);
    if (ip) metric.ips.add(ip);
    
    metric.timestamps.push(Date.now());
    
    // 최근 100개의 타임스탬프만 유지
    if (metric.timestamps.length > 100) {
      metric.timestamps = metric.timestamps.slice(-100);
    }
  }

  // 응답 메트릭 기록
  recordResponse(method: string, path: string, statusCode: number, responseTime: number, size?: number | null): void {
    const key = `${method}:${path}`;
    
    if (!this.metrics.responses.has(key)) {
      this.metrics.responses.set(key, {
        count: 0,
        statusCodes: new Map(),
        responseTimes: [],
        sizes: [],
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p50ResponseTime: 0,
        p75ResponseTime: 0,
        p90ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      });
    }
    
    const metric = this.metrics.responses.get(key);
    if (!metric) {
      throw new Error(`Response metric not found for key: ${key}`);
    }
    metric.count++;
    
    // 상태 코드 통계
    const statusCount = metric.statusCodes.get(statusCode) || 0;
    metric.statusCodes.set(statusCode, statusCount + 1);
    
    // 응답 시간 통계
    metric.responseTimes.push(responseTime);
    metric.minResponseTime = Math.min(metric.minResponseTime, responseTime);
    metric.maxResponseTime = Math.max(metric.maxResponseTime, responseTime);
    
    // 평균 응답 시간 계산
    const sum = metric.responseTimes.reduce((a, b) => a + b, 0);
    metric.avgResponseTime = sum / metric.responseTimes.length;
    
    // 백분위수 계산
    const percentiles = calculatePercentiles(metric.responseTimes);
    metric.p50ResponseTime = percentiles.p50;
    metric.p75ResponseTime = percentiles.p75;
    metric.p90ResponseTime = percentiles.p90;
    metric.p95ResponseTime = percentiles.p95;
    metric.p99ResponseTime = percentiles.p99;
    
    // 성능 알림 체크 (에러가 없는 경우에만)
    if (statusCode < 400 && metric.responseTimes.length >= 10) {
      // alertService.checkPerformance(
      //   metric.p95ResponseTime,
      //   metric.p99ResponseTime,
      //   metric.responseTimes.filter(time => time > 1000).length
      // );
    }
    
    // 최근 100개의 응답 시간만 유지
    if (metric.responseTimes.length > 100) {
      metric.responseTimes = metric.responseTimes.slice(-100);
    }
    
    // 사이즈 통계
    if (size !== null && size !== undefined) {
      metric.sizes.push(size);
      if (metric.sizes.length > 100) {
        metric.sizes = metric.sizes.slice(-100);
      }
    }
  }

  // 에러 메트릭 기록
  recordError(method: string, path: string, _error: Error, statusCode?: number | null): void {
    this.errorCount++;
    const key = `${method}:${path}`;
    
    if (!this.metrics.errors.has(key)) {
      this.metrics.errors.set(key, {
        count: 0,
        errorTypes: new Map(),
        statusCodes: new Map(),
        messages: new Set(),
        timestamps: []
      });
    }
    
    const metric = this.metrics.errors.get(key);
    if (!metric) {
      throw new Error(`Error metric not found for key: ${key}`);
    }
    metric.count++;
    
    // 에러 타입 통계
    const errorType = _error.name || 'Unknown';
    const typeCount = metric.errorTypes.get(errorType) || 0;
    metric.errorTypes.set(errorType, typeCount + 1);
    
    // 상태 코드 통계
    if (statusCode) {
      const statusCount = metric.statusCodes.get(statusCode) || 0;
      metric.statusCodes.set(statusCode, statusCount + 1);
    }
    
    // 에러 메시지 수집 (최대 50개)
    if (metric.messages.size < 50) {
      metric.messages.add(_error.message);
    }
    
    metric.timestamps.push(Date.now());
    
    // 에러율 알림 체크
    if (this.requestCount >= 10) {
      // const _errorRate = this.errorCount / this.requestCount; // unused
      // alertService.checkErrorRate(errorRate, this.requestCount);
    }
    
    // 최근 100개의 타임스탬프만 유지
    if (metric.timestamps.length > 100) {
      metric.timestamps = metric.timestamps.slice(-100);
    }
  }

  // 성능 메트릭 기록
  recordPerformance(operation: string, duration: number, metadata: Record<string, string> = {}): void {
    if (!this.metrics.performance.has(operation)) {
      this.metrics.performance.set(operation, {
        count: 0,
        durations: [],
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        p50Duration: 0,
        p75Duration: 0,
        p90Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        metadata: new Map()
      });
    }
    
    const metric = this.metrics.performance.get(operation);
    if (!metric) {
      throw new Error(`Performance metric not found for operation: ${operation}`);
    }
    metric.count++;
    metric.durations.push(duration);
    
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    
    // 평균 시간 계산
    const sum = metric.durations.reduce((a, b) => a + b, 0);
    metric.avgDuration = sum / metric.durations.length;
    
    // 백분위수 계산
    const percentiles = calculatePercentiles(metric.durations);
    metric.p50Duration = percentiles.p50;
    metric.p75Duration = percentiles.p75;
    metric.p90Duration = percentiles.p90;
    metric.p95Duration = percentiles.p95;
    metric.p99Duration = percentiles.p99;
    
    // 최근 100개의 duration만 유지
    if (metric.durations.length > 100) {
      metric.durations = metric.durations.slice(-100);
    }
    
    // 메타데이터 저장
    Object.entries(metadata).forEach(([key, value]) => {
      if (!metric.metadata.has(key)) {
        metric.metadata.set(key, new Map());
      }
      const valueCount = metric.metadata.get(key)!.get(value) || 0;
      metric.metadata.get(key)!.set(value, valueCount + 1);
    });
  }

  // 캐시 메트릭 기록 (강화된 버전)
  recordCache(
    operation: string, 
    hit: boolean, 
    key?: string | null, 
    ttl?: number | null, 
    keySize?: number | null,
    evicted?: boolean | null
  ): void {
    if (!this.metrics.cache.has(operation)) {
      this.metrics.cache.set(operation, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: new Set(),
        avgTTL: 0,
        ttls: [],
        evictions: 0,
        memoryUsage: 0,
        averageKeySize: 0,
        totalOperations: 0,
        lastAccess: Date.now(),
        recentHitRates: [],
        keyAccessPatterns: new Map()
      });
    }
    
    const metric = this.metrics.cache.get(operation);
    if (!metric) {
      throw new Error(`Cache metric not found for operation: ${operation}`);
    }
    
    metric.totalOperations++;
    metric.lastAccess = Date.now();
    
    if (hit) {
      metric.hits++;
    } else {
      metric.misses++;
    }
    
    // 히트율 계산
    const total = metric.hits + metric.misses;
    metric.hitRate = metric.hits / total;
    
    // 최근 히트율 추적 (최근 100개 작업 기준)
    if (metric.totalOperations % 10 === 0) {
      metric.recentHitRates.push(metric.hitRate);
      if (metric.recentHitRates.length > 100) {
        metric.recentHitRates = metric.recentHitRates.slice(-100);
      }
    }
    
    if (key) {
      metric.keys.add(key);
      
      // 키 접근 패턴 추적
      const accessCount = metric.keyAccessPatterns.get(key) || 0;
      metric.keyAccessPatterns.set(key, accessCount + 1);
    }
    
    if (ttl !== null && ttl !== undefined) {
      metric.ttls.push(ttl);
      const sum = metric.ttls.reduce((a, b) => a + b, 0);
      metric.avgTTL = sum / metric.ttls.length;
      
      // 최근 100개의 TTL만 유지
      if (metric.ttls.length > 100) {
        metric.ttls = metric.ttls.slice(-100);
      }
    }
    
    if (keySize !== null && keySize !== undefined) {
      metric.memoryUsage += keySize;
      metric.averageKeySize = metric.memoryUsage / metric.keys.size;
    }
    
    if (evicted) {
      metric.evictions++;
    }
    
    // 캐시 효율성 알림 체크
    if (metric.totalOperations >= 20) {
      // alertService.checkCacheEfficiency(metric.hitRate, operation);
    }
  }

  // API 호출 메트릭 기록 (강화된 버전)
  recordAPICall(
    service: string, 
    endpoint: string, 
    duration: number, 
    success: boolean, 
    statusCode?: number | null,
    errorType?: string | null,
    isTimeout?: boolean | null,
    isRateLimit?: boolean | null
  ): void {
    const key = `${service}:${endpoint}`;
    
    if (!this.metrics.api.has(key)) {
      this.metrics.api.set(key, {
        calls: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
        durations: [],
        avgDuration: 0,
        p50Duration: 0,
        p75Duration: 0,
        p90Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        statusCodes: new Map(),
        timestamps: [],
        timeouts: 0,
        rateLimits: 0,
        circuitBreakerState: 'closed',
        consecutiveFailures: 0,
        lastFailureTime: 0,
        uptime: 0,
        slaCompliance: 1.0,
        errorPatterns: new Map(),
        responseTimeThreshold: 5000, // 5초 기본값
        slowResponses: 0
      });
    }
    
    const metric = this.metrics.api.get(key);
    if (!metric) {
      throw new Error(`API metric not found for key: ${key}`);
    }
    
    metric.calls++;
    const now = Date.now();
    
    if (success) {
      metric.successes++;
      metric.consecutiveFailures = 0;
      
      // Circuit breaker 상태 업데이트
      if (metric.circuitBreakerState === 'half-open') {
        metric.circuitBreakerState = 'closed';
      }
    } else {
      metric.failures++;
      metric.consecutiveFailures++;
      metric.lastFailureTime = now;
      
      // Circuit breaker 로직
      if (metric.consecutiveFailures >= 5) {
        metric.circuitBreakerState = 'open';
      }
      
      // 에러 패턴 추적
      if (errorType) {
        const errorCount = metric.errorPatterns.get(errorType) || 0;
        metric.errorPatterns.set(errorType, errorCount + 1);
      }
    }
    
    // 타임아웃 추적
    if (isTimeout) {
      metric.timeouts++;
    }
    
    // 레이트 리밋 추적
    if (isRateLimit) {
      metric.rateLimits++;
    }
    
    // 느린 응답 추적
    if (duration > metric.responseTimeThreshold) {
      metric.slowResponses++;
    }
    
    metric.successRate = metric.successes / metric.calls;
    
    metric.durations.push(duration);
    const sum = metric.durations.reduce((a, b) => a + b, 0);
    metric.avgDuration = sum / metric.durations.length;
    
    // 백분위수 계산
    const percentiles = calculatePercentiles(metric.durations);
    metric.p50Duration = percentiles.p50;
    metric.p75Duration = percentiles.p75;
    metric.p90Duration = percentiles.p90;
    metric.p95Duration = percentiles.p95;
    metric.p99Duration = percentiles.p99;
    
    // SLA 준수율 계산 (99.9% 가용성 목표)
    metric.slaCompliance = metric.successRate;
    
    // 가동시간 계산
    if (metric.timestamps.length > 0) {
      const firstCall = metric.timestamps[0];
      if (firstCall) {
        metric.uptime = now - firstCall;
      }
    }
    
    // 최근 100개의 duration만 유지
    if (metric.durations.length > 100) {
      metric.durations = metric.durations.slice(-100);
    }
    
    if (statusCode) {
      const statusCount = metric.statusCodes.get(statusCode) || 0;
      metric.statusCodes.set(statusCode, statusCount + 1);
    }
    
    metric.timestamps.push(now);
    
    // API 상태 알림 체크
    if (metric.calls >= 5) {
      // alertService.checkAPIHealth(service, endpoint, metric.circuitBreakerState, metric.consecutiveFailures);
    }
    
    // 최근 100개의 타임스탬프만 유지
    if (metric.timestamps.length > 100) {
      metric.timestamps = metric.timestamps.slice(-100);
    }
  }

  // 전체 메트릭 조회
  getMetrics(): any {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    
    return {
      overview: {
        uptime: uptimeSeconds,
        totalRequests: this.requestCount,
        totalErrors: this.errorCount,
        errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
        timestamp: new Date().toISOString()
      },
      requests: Object.fromEntries(
        Array.from(this.metrics.requests.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            userAgents: Array.from(value.userAgents),
            ips: Array.from(value.ips),
            methods: Array.from(value.methods),
            recentTimestamps: value.timestamps.slice(-10)
          }
        ])
      ),
      responses: Object.fromEntries(
        Array.from(this.metrics.responses.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            statusCodes: Object.fromEntries(value.statusCodes),
            recentResponseTimes: value.responseTimes.slice(-10),
            recentSizes: value.sizes.slice(-10)
          }
        ])
      ),
      errors: Object.fromEntries(
        Array.from(this.metrics.errors.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            errorTypes: Object.fromEntries(value.errorTypes),
            statusCodes: Object.fromEntries(value.statusCodes),
            messages: Array.from(value.messages),
            recentTimestamps: value.timestamps.slice(-10)
          }
        ])
      ),
      performance: Object.fromEntries(
        Array.from(this.metrics.performance.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            recentDurations: value.durations.slice(-10),
            metadata: Object.fromEntries(
              Array.from(value.metadata.entries()).map(([k, v]) => [
                k,
                Object.fromEntries(v)
              ])
            )
          }
        ])
      ),
      cache: Object.fromEntries(
        Array.from(this.metrics.cache.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            keys: Array.from(value.keys).slice(-20),
            recentTTLs: value.ttls.slice(-10),
            recentHitRates: value.recentHitRates.slice(-10),
            topAccessedKeys: Array.from(value.keyAccessPatterns.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([key, count]) => ({ key, accessCount: count })),
            memoryEfficiency: value.hits > 0 ? Math.round(value.memoryUsage / value.hits) : 0,
            evictionRate: value.totalOperations > 0 ? value.evictions / value.totalOperations : 0,
            lastAccessTime: new Date(value.lastAccess).toISOString()
          }
        ])
      ),
      api: Object.fromEntries(
        Array.from(this.metrics.api.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            statusCodes: Object.fromEntries(value.statusCodes),
            recentDurations: value.durations.slice(-10),
            recentTimestamps: value.timestamps.slice(-10)
          }
        ])
      )
    };
  }

  // 요약 메트릭 조회
  getSummary(): MetricsSummary {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    
    // 상위 엔드포인트 계산
    const topEndpoints = Array.from(this.metrics.requests.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([key, value]) => ({ endpoint: key, count: value.count }));
    
    // 평균 응답 시간 계산
    const allResponseTimes = Array.from(this.metrics.responses.values())
      .flatMap(metric => metric.responseTimes);
    const avgResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length 
      : 0;
    
    return {
      uptime: uptimeSeconds,
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      avgResponseTime: Math.round(avgResponseTime),
      topEndpoints,
      timestamp: new Date().toISOString()
    };
  }

  // 정리 작업
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1시간
    
    // 오래된 타임스탬프 정리
    (['requests', 'errors', 'api'] as const).forEach(category => {
      for (const [_key, metric] of this.metrics[category].entries()) {
        if ('timestamps' in metric && metric.timestamps) {
          metric.timestamps = metric.timestamps.filter(ts => now - ts < maxAge);
        }
      }
    });
    
    logger.info('Metrics cleanup completed', {
      requestsCount: this.metrics.requests.size,
      responsesCount: this.metrics.responses.size,
      errorsCount: this.metrics.errors.size
    });
  }

  // 캐시 효율성 분석
  analyzeCacheEfficiency(): any {
    const analysis: any = {};
    
    for (const [operation, metric] of this.metrics.cache.entries()) {
      const recentHitRate = metric.recentHitRates.length > 0 
        ? metric.recentHitRates[metric.recentHitRates.length - 1] 
        : metric.hitRate;
      
      // 히트율 트렌드 분석
      const hitRateTrend = metric.recentHitRates.length >= 2
        ? (metric.recentHitRates[metric.recentHitRates.length - 1] || 0) - (metric.recentHitRates[0] || 0)
        : 0;
      
      // 메모리 효율성 계산
      const memoryEfficiency = metric.hits > 0 
        ? metric.memoryUsage / metric.hits 
        : 0;
      
      // 상위 접근 키 추출
      const topKeys = Array.from(metric.keyAccessPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ key, accessCount: count }));
      
      // 캐시 성능 점수 계산 (0-100)
      const hitRateScore = metric.hitRate * 100;
      const evictionScore = metric.evictions > 0 
        ? Math.max(0, 100 - (metric.evictions / metric.totalOperations) * 100)
        : 100;
      const performanceScore = (hitRateScore + evictionScore) / 2;
      
      analysis[operation] = {
        overall: {
          hitRate: metric.hitRate,
          recentHitRate,
          hitRateTrend,
          totalOperations: metric.totalOperations,
          evictionRate: metric.evictions / metric.totalOperations,
          performanceScore: Math.round(performanceScore),
          lastAccess: new Date(metric.lastAccess).toISOString()
        },
        memory: {
          totalUsage: metric.memoryUsage,
          averageKeySize: metric.averageKeySize,
          memoryEfficiency: Math.round(memoryEfficiency),
          totalKeys: metric.keys.size
        },
        patterns: {
          topAccessedKeys: topKeys,
          averageTTL: metric.avgTTL,
          recentTTLs: metric.ttls.slice(-10)
        },
        recommendations: this.generateCacheRecommendations(metric)
      };
    }
    
    return analysis;
  }
  
  // 캐시 개선 권장사항 생성
  private generateCacheRecommendations(metric: CacheMetric): string[] {
    const recommendations: string[] = [];
    
    if (metric.hitRate < 0.7) {
      recommendations.push('히트율이 낮습니다. 캐시 전략을 재검토하세요.');
    }
    
    if (metric.evictions / metric.totalOperations > 0.1) {
      recommendations.push('제거율이 높습니다. 캐시 크기를 늘리거나 TTL을 조정하세요.');
    }
    
    if (metric.averageKeySize > 1024 * 1024) {
      recommendations.push('평균 키 크기가 큽니다. 데이터 압축을 고려하세요.');
    }
    
    if (metric.avgTTL < 300) {
      recommendations.push('TTL이 짧습니다. 더 긴 TTL을 고려하세요.');
    }
    
    const recentHitRates = metric.recentHitRates;
    if (recentHitRates && recentHitRates.length >= 5) {
      const recent = recentHitRates.slice(-5);
      const isDecreasing = recent.every((rate, i) => i === 0 || (rate || 0) <= (recent[i - 1] || 0));
      if (isDecreasing) {
        recommendations.push('히트율이 감소 추세입니다. 캐시 무효화 전략을 검토하세요.');
      }
    }
    
    return recommendations;
  }
  
  // API 상태 분석
  analyzeAPIHealth(): any {
    const analysis: any = {};
    
    for (const [key, metric] of this.metrics.api.entries()) {
      const [service, endpoint] = key.split(':');
      
      // 가용성 계산
      const availability = metric.successRate;
      const slaTarget = 0.999; // 99.9% SLA 목표
      const slaStatus = availability >= slaTarget ? 'healthy' : 'degraded';
      
      // 성능 분석
      const avgLatency = metric.avgDuration;
      const p95Latency = metric.p95Duration;
      const p99Latency = metric.p99Duration;
      
      // 에러 분석
      const errorRate = metric.failures / metric.calls;
      const timeoutRate = metric.timeouts / metric.calls;
      const rateLimitRate = metric.rateLimits / metric.calls;
      
      // 트렌드 분석
      const recentCalls = metric.timestamps.slice(-10);
      const recentSuccesses = recentCalls.length > 0 ? 
        Math.round(recentCalls.length * metric.successRate) : 0;
      
      // 상태 점수 계산 (0-100)
      const availabilityScore = availability * 100;
      const performanceScore = Math.max(0, 100 - (p95Latency / 1000) * 10); // 1초당 10점 감점
      const errorScore = Math.max(0, 100 - (errorRate * 100));
      const overallScore = (availabilityScore + performanceScore + errorScore) / 3;
      
      analysis[key] = {
        service,
        endpoint,
        health: {
          status: slaStatus,
          availability: Math.round(availability * 10000) / 100, // 99.xx% 형태
          overallScore: Math.round(overallScore),
          circuitBreakerState: metric.circuitBreakerState,
          consecutiveFailures: metric.consecutiveFailures,
          lastFailureTime: metric.lastFailureTime > 0 ? new Date(metric.lastFailureTime).toISOString() : null
        },
        performance: {
          avgLatency: Math.round(avgLatency),
          p50Latency: Math.round(metric.p50Duration),
          p95Latency: Math.round(p95Latency),
          p99Latency: Math.round(p99Latency),
          slowResponses: metric.slowResponses,
          slowResponseRate: Math.round((metric.slowResponses / metric.calls) * 100) / 100
        },
        errors: {
          errorRate: Math.round(errorRate * 10000) / 100,
          timeoutRate: Math.round(timeoutRate * 10000) / 100,
          rateLimitRate: Math.round(rateLimitRate * 10000) / 100,
          topErrors: Array.from(metric.errorPatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }))
        },
        traffic: {
          totalCalls: metric.calls,
          recentCalls: recentCalls.length,
          recentSuccesses,
          uptime: Math.round(metric.uptime / 1000), // 초 단위
          slaCompliance: Math.round(metric.slaCompliance * 10000) / 100
        },
        recommendations: this.generateAPIRecommendations(metric)
      };
    }
    
    return analysis;
  }
  
  // API 개선 권장사항 생성
  private generateAPIRecommendations(metric: APIMetric): string[] {
    const recommendations: string[] = [];
    
    if (metric.successRate < 0.95) {
      recommendations.push('성공률이 낮습니다. 에러 핸들링과 재시도 로직을 검토하세요.');
    }
    
    if (metric.p95Duration > 5000) {
      recommendations.push('95퍼센타일 응답 시간이 느립니다. 성능 최적화를 고려하세요.');
    }
    
    if (metric.circuitBreakerState === 'open') {
      recommendations.push('Circuit breaker가 열려있습니다. 외부 서비스 상태를 확인하세요.');
    }
    
    if (metric.timeouts / metric.calls > 0.05) {
      recommendations.push('타임아웃이 빈번합니다. 타임아웃 설정을 검토하세요.');
    }
    
    if (metric.rateLimits / metric.calls > 0.01) {
      recommendations.push('레이트 리밋이 발생하고 있습니다. 호출 빈도를 조절하세요.');
    }
    
    if (metric.consecutiveFailures > 3) {
      recommendations.push('연속 실패가 발생하고 있습니다. 즉시 점검이 필요합니다.');
    }
    
    return recommendations;
  }

  // 메트릭 리셋
  reset(): void {
    this.metrics = {
      requests: new Map(),
      responses: new Map(),
      errors: new Map(),
      performance: new Map(),
      cache: new Map(),
      api: new Map()
    };
    
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    
    logger.info('Metrics reset completed');
  }

  // Cleanup interval 정리
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// 싱글톤 인스턴스 생성
const metricsCollector = new MetricsCollector();


// 미들웨어 함수
export const metricsMiddleware = (_req: ExtendedRequest, _res: Response, _next: NextFunction): void => {
  const startTime = Date.now();
  
  // 요청 메트릭 기록
  metricsCollector.recordRequest(
    _req.method,
    _req.route?.path || _req.path,
    _req.get('User-Agent') || null,
    _req.ip || null
  );
  
  // 응답 완료 시 메트릭 기록
  const originalEnd = _res.end;
  _res.end = function(this: Response, chunk?: any, encoding?: BufferEncoding | (() => void)): Response {
    const responseTime = Date.now() - startTime;
    let size: number | null = null;
    
    if (chunk) {
      if (typeof encoding === 'string') {
        size = Buffer.byteLength(chunk, encoding);
      } else if (Buffer.isBuffer(chunk)) {
        size = chunk.length;
      } else if (typeof chunk === 'string') {
        size = Buffer.byteLength(chunk, 'utf8');
      }
    }
    
    metricsCollector.recordResponse(
      _req.method,
      _req.route?.path || _req.path,
      _res.statusCode,
      responseTime,
      size
    );
    
    if (typeof encoding === 'function') {
      return originalEnd.call(this, chunk, encoding as any);
    } else {
      return originalEnd.call(this, chunk, encoding as BufferEncoding);
    }
  } as any;
  
  _next();
};

// 에러 메트릭 미들웨어
export const errorMetricsMiddleware = (_error: Error, _req: ExtendedRequest, _res: Response, _next: NextFunction): void => {
  metricsCollector.recordError(
    _req.method,
    _req.route?.path || _req.path,
    _error,
    _res.statusCode
  );
  
  _next(_error);
};

export default metricsCollector;