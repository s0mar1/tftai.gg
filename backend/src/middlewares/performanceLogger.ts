// backend/src/middlewares/performanceLogger.ts

import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * API 요청 성능 측정 및 로깅 미들웨어
 */

export interface PerformanceMetrics {
  requestId: string;
  method: string;
  path: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
  startTime: Date;
  endTime: Date;
  duration: number;
  statusCode: number;
  success: boolean;
  error?: string | undefined;
  memoryUsage?: NodeJS.MemoryUsage;
  responseSize?: number;
  queryCount?: number;
  cacheHit?: boolean;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  errorRate: number;
  endpointStats: Record<string, {
    count: number;
    averageTime: number;
    slowRequests: number;
    errorCount: number;
  }>;
  last24Hours: PerformanceMetrics[];
}

/**
 * 성능 통계 추적 클래스
 */
class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 2000; // 최대 저장 개수
  private readonly slowRequestThreshold = 2000; // 느린 요청 임계값 (ms)
  private readonly cleanupInterval = 60 * 60 * 1000; // 1시간마다 정리

  constructor() {
    // 주기적으로 오래된 메트릭 정리
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * 성능 메트릭 추가
   */
  addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // 최대 개수 초과시 오래된 것 제거
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 느린 요청 로깅
    if (metric.duration > this.slowRequestThreshold) {
      logger.warn('느린 API 요청 감지:', {
        requestId: metric.requestId,
        method: metric.method,
        path: metric.path,
        duration: `${metric.duration}ms`,
        statusCode: metric.statusCode,
        ip: metric.ip,
        memoryUsage: metric.memoryUsage
      });
    }

    // 에러 요청 로깅
    if (!metric.success) {
      logger.error('API 요청 에러:', {
        requestId: metric.requestId,
        method: metric.method,
        path: metric.path,
        statusCode: metric.statusCode,
        error: metric.error,
        duration: `${metric.duration}ms`
      });
    }
  }

  /**
   * 24시간 이상 된 메트릭 정리
   */
  private cleanup(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(metric => metric.startTime >= oneDayAgo);
    
    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      logger.info(`성능 메트릭 정리 완료: ${removedCount}개 항목 제거`);
    }
  }

  /**
   * 성능 통계 조회
   */
  getStats(): PerformanceStats {
    const totalRequests = this.metrics.length;
    const averageResponseTime = totalRequests > 0 ? 
      this.metrics.reduce((sum, metric) => sum + metric.duration, 0) / totalRequests : 0;
    
    const slowRequests = this.metrics.filter(metric => metric.duration > this.slowRequestThreshold).length;
    const errorCount = this.metrics.filter(metric => !metric.success).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // 엔드포인트별 통계
    const endpointStats: Record<string, {
      count: number;
      averageTime: number;
      slowRequests: number;
      errorCount: number;
    }> = {};

    this.metrics.forEach(metric => {
      const endpoint = `${metric.method} ${metric.path}`;
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = {
          count: 0,
          averageTime: 0,
          slowRequests: 0,
          errorCount: 0
        };
      }
      
      endpointStats[endpoint].count++;
      endpointStats[endpoint].averageTime += metric.duration;
      
      if (metric.duration > this.slowRequestThreshold) {
        endpointStats[endpoint].slowRequests++;
      }
      
      if (!metric.success) {
        endpointStats[endpoint].errorCount++;
      }
    });

    // 평균 시간 계산
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      if (stats) {
        stats.averageTime = stats.count > 0 ? stats.averageTime / stats.count : 0;
      }
    });

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      endpointStats,
      last24Hours: this.metrics.slice(-100) // 최근 100개 요청
    };
  }

  /**
   * 특정 엔드포인트의 통계 조회
   */
  getEndpointStats(method: string, path: string): PerformanceMetrics[] {
    return this.metrics.filter(metric => 
      metric.method === method && metric.path === path
    );
  }

  /**
   * 느린 요청 조회
   */
  getSlowRequests(): PerformanceMetrics[] {
    return this.metrics.filter(metric => metric.duration > this.slowRequestThreshold);
  }

  /**
   * 에러 요청 조회
   */
  getErrorRequests(): PerformanceMetrics[] {
    return this.metrics.filter(metric => !metric.success);
  }

  /**
   * 통계 초기화
   */
  clear(): void {
    this.metrics = [];
    logger.info('성능 통계가 초기화되었습니다.');
  }

  /**
   * 최근 N개 요청 조회
   */
  getRecentRequests(count: number = 50): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }
}

// 싱글톤 인스턴스
const performanceTracker = new PerformanceTracker();

/**
 * 요청 ID 생성 함수
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 응답 크기 계산 함수
 */
function calculateResponseSize(res: Response): number {
  const contentLength = res.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  
  // content-length가 없으면 추정
  const body = (res as any).body;
  if (body) {
    return Buffer.byteLength(JSON.stringify(body), 'utf8');
  }
  
  return 0;
}

/**
 * 성능 로깅 미들웨어
 */
export const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = generateRequestId();
  const startTime = new Date();
  const startHrTime = process.hrtime();

  // 요청 정보 로깅
  logger.info('API 요청 시작:', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: startTime.toISOString()
  });

  // 요청 ID를 req 객체에 추가 (다른 미들웨어에서 사용 가능)
  (req as any).requestId = requestId;

  // 응답 완료 시 성능 메트릭 수집
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    // 원래 end 메서드 호출
    const result = originalEnd.call(this, chunk, encoding);
    // 종료 시간 계산
    const endTime = new Date();
    const hrDuration = process.hrtime(startHrTime);
    const duration = hrDuration[0] * 1000 + hrDuration[1] / 1000000; // ms로 변환

    // 메모리 사용량 수집
    const memoryUsage = process.memoryUsage();

    // 응답 크기 계산
    const responseSize = calculateResponseSize(res);

    // 성공 여부 판단
    const success = res.statusCode < 400;

    // 성능 메트릭 생성
    const metric: PerformanceMetrics = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      userAgent: req.get('user-agent') || undefined,
      ip: req.ip || undefined,
      startTime,
      endTime,
      duration: Math.round(duration),
      statusCode: res.statusCode,
      success,
      error: success ? undefined : `HTTP ${res.statusCode}`,
      memoryUsage,
      responseSize,
      cacheHit: (res as any).fromCache // 캐시 히트 여부 (다른 미들웨어에서 설정)
    };

    // 성능 통계에 추가
    performanceTracker.addMetric(metric);

    // 요청 완료 로깅
    logger.info('API 요청 완료:', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${metric.duration}ms`,
      success,
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
      }
    });

    return result;
  };

  next();
};

/**
 * 성능 통계 조회 함수들
 */
export const performanceStats = {
  getStats: () => performanceTracker.getStats(),
  getEndpointStats: (method: string, path: string) => performanceTracker.getEndpointStats(method, path),
  getSlowRequests: () => performanceTracker.getSlowRequests(),
  getErrorRequests: () => performanceTracker.getErrorRequests(),
  getRecentRequests: (count?: number) => performanceTracker.getRecentRequests(count),
  clear: () => performanceTracker.clear()
};

/**
 * 성능 리포트 생성 함수
 */
export function generatePerformanceReport(): {
  summary: PerformanceStats;
  topSlowEndpoints: Array<{ endpoint: string; averageTime: number; count: number }>;
  topErrorEndpoints: Array<{ endpoint: string; errorRate: number; count: number }>;
  recommendations: string[];
} {
  const summary = performanceTracker.getStats();
  
  // 가장 느린 엔드포인트 top 10
  const topSlowEndpoints = Object.entries(summary.endpointStats)
    .sort(([, a], [, b]) => b.averageTime - a.averageTime)
    .slice(0, 10)
    .map(([endpoint, stats]) => ({
      endpoint,
      averageTime: Math.round(stats.averageTime),
      count: stats.count
    }));

  // 에러율이 높은 엔드포인트 top 10
  const topErrorEndpoints = Object.entries(summary.endpointStats)
    .map(([endpoint, stats]) => ({
      endpoint,
      errorRate: stats.count > 0 ? Math.round((stats.errorCount / stats.count) * 100) : 0,
      count: stats.count
    }))
    .filter(item => item.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 10);

  // 최적화 권장사항
  const recommendations: string[] = [];
  
  if (summary.averageResponseTime > 1000) {
    recommendations.push('전체 평균 응답 시간이 1초를 초과합니다. 성능 최적화가 필요합니다.');
  }
  
  if (summary.slowRequests > summary.totalRequests * 0.1) {
    recommendations.push('느린 요청이 전체의 10%를 초과합니다. 병목 지점을 찾아 최적화하세요.');
  }
  
  if (summary.errorRate > 5) {
    recommendations.push('에러율이 5%를 초과합니다. 에러 원인을 파악하고 개선하세요.');
  }

  topSlowEndpoints.forEach(endpoint => {
    if (endpoint.averageTime > 2000) {
      recommendations.push(`${endpoint.endpoint} 엔드포인트의 평균 응답 시간이 ${endpoint.averageTime}ms로 매우 느립니다.`);
    }
  });

  return {
    summary,
    topSlowEndpoints,
    topErrorEndpoints,
    recommendations
  };
}

/**
 * 실시간 성능 모니터링 활성화
 */
export function enableRealTimeMonitoring(intervalMs: number = 60000): void {
  setInterval(() => {
    const stats = performanceTracker.getStats();
    const recentRequests = performanceTracker.getRecentRequests(100);
    
    // 최근 1분간 통계
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentStats = recentRequests.filter(req => req.startTime >= oneMinuteAgo);
    
    if (recentStats.length > 0) {
      const avgResponseTime = recentStats.reduce((sum, req) => sum + req.duration, 0) / recentStats.length;
      const errorCount = recentStats.filter(req => !req.success).length;
      const errorRate = (errorCount / recentStats.length) * 100;
      
      logger.info('실시간 성능 모니터링:', {
        timestamp: new Date().toISOString(),
        recent1Min: {
          requestCount: recentStats.length,
          avgResponseTime: Math.round(avgResponseTime),
          errorRate: Math.round(errorRate * 100) / 100
        },
        overall: {
          totalRequests: stats.totalRequests,
          avgResponseTime: stats.averageResponseTime,
          errorRate: stats.errorRate
        }
      });
    }
  }, intervalMs);
}

export default performanceLogger;