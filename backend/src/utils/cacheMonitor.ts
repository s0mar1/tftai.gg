// backend/src/utils/cacheMonitor.ts
// 캐시 성능 모니터링 유틸리티 (기존 캐싱 시스템에 영향 없음)

import logger from '../config/logger';

// 캐시 통계 타입
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
  lastUpdated: Date;
}

// 캐시 이벤트 타입
type CacheEvent = 'hit' | 'miss' | 'set' | 'delete' | 'error';

// 캐시 모니터링 클래스
class CacheMonitor {
  private stats: Map<string, CacheStats> = new Map();
  private enabled: boolean = true;

  constructor() {
    // 주기적으로 통계 로깅 (5분마다)
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => {
        this.logStats();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * 캐시 이벤트 기록
   */
  recordEvent(cacheKey: string, event: CacheEvent): void {
    if (!this.enabled) return;

    const stats = this.getOrCreateStats(cacheKey);
    
    switch (event) {
      case 'hit':
        stats.hits++;
        break;
      case 'miss':
        stats.misses++;
        break;
      case 'set':
        stats.sets++;
        break;
      case 'delete':
        stats.deletes++;
        break;
      case 'error':
        stats.errors++;
        break;
    }

    stats.totalRequests = stats.hits + stats.misses;
    stats.hitRate = stats.totalRequests > 0 ? (stats.hits / stats.totalRequests) * 100 : 0;
    stats.lastUpdated = new Date();
  }

  /**
   * 캐시 키별 통계 조회
   */
  getStats(cacheKey?: string): CacheStats | Map<string, CacheStats> {
    if (cacheKey) {
      return this.stats.get(cacheKey) || this.createEmptyStats();
    }
    return new Map(this.stats);
  }

  /**
   * 전체 캐시 통계 요약
   */
  getSummary(): {
    totalKeys: number;
    overallHitRate: number;
    totalHits: number;
    totalMisses: number;
    totalRequests: number;
  } {
    let totalHits = 0;
    let totalMisses = 0;
    
    for (const stats of this.stats.values()) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
    }

    const totalRequests = totalHits + totalMisses;
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    return {
      totalKeys: this.stats.size,
      overallHitRate,
      totalHits,
      totalMisses,
      totalRequests
    };
  }

  /**
   * 통계 초기화
   */
  resetStats(cacheKey?: string): void {
    if (cacheKey) {
      this.stats.delete(cacheKey);
    } else {
      this.stats.clear();
    }
  }

  /**
   * 모니터링 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info(`Cache monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 성능이 낮은 캐시 키 식별
   */
  getPerformanceReport(): {
    lowHitRate: Array<{ key: string; hitRate: number; requests: number }>;
    highErrorRate: Array<{ key: string; errorRate: number; errors: number }>;
  } {
    const lowHitRate: Array<{ key: string; hitRate: number; requests: number }> = [];
    const highErrorRate: Array<{ key: string; errorRate: number; errors: number }> = [];

    for (const [key, stats] of this.stats.entries()) {
      // 히트율이 낮은 키들 (50% 미만, 최소 10회 요청)
      if (stats.hitRate < 50 && stats.totalRequests >= 10) {
        lowHitRate.push({
          key,
          hitRate: stats.hitRate,
          requests: stats.totalRequests
        });
      }

      // 에러율이 높은 키들 (5% 이상)
      const errorRate = stats.totalRequests > 0 ? (stats.errors / stats.totalRequests) * 100 : 0;
      if (errorRate > 5) {
        highErrorRate.push({
          key,
          errorRate,
          errors: stats.errors
        });
      }
    }

    return { lowHitRate, highErrorRate };
  }

  /**
   * 통계 로깅
   */
  private logStats(): void {
    const summary = this.getSummary();
    const performance = this.getPerformanceReport();

    logger.info('Cache Performance Summary', {
      summary,
      lowPerformance: performance.lowHitRate.length > 0 ? performance.lowHitRate : undefined,
      highErrors: performance.highErrorRate.length > 0 ? performance.highErrorRate : undefined
    });
  }

  /**
   * 캐시 통계 객체 생성 또는 가져오기
   */
  private getOrCreateStats(cacheKey: string): CacheStats {
    if (!this.stats.has(cacheKey)) {
      this.stats.set(cacheKey, this.createEmptyStats());
    }
    return this.stats.get(cacheKey)!;
  }

  /**
   * 빈 통계 객체 생성
   */
  private createEmptyStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0,
      lastUpdated: new Date()
    };
  }
}

// 싱글톤 인스턴스
export const cacheMonitor = new CacheMonitor();

/**
 * 캐시 작업을 모니터링하는 데코레이터 함수
 * 
 * @example
 * const value = await monitorCacheOperation('user:123', async () => {
 *   return await cache.get('user:123');
 * }, 'get');
 */
export async function monitorCacheOperation<T>(
  cacheKey: string,
  operation: () => Promise<T>,
  operationType: 'get' | 'set' | 'delete'
): Promise<T> {
  try {
    const result = await operation();
    
    if (operationType === 'get') {
      cacheMonitor.recordEvent(cacheKey, result !== null && result !== undefined ? 'hit' : 'miss');
    } else {
      cacheMonitor.recordEvent(cacheKey, operationType as CacheEvent);
    }
    
    return result;
  } catch (error) {
    cacheMonitor.recordEvent(cacheKey, 'error');
    throw error;
  }
}

/**
 * 캐시 통계를 Express 라우터에서 조회할 수 있는 헬퍼
 */
export function getCacheStatsForAPI() {
  return {
    summary: cacheMonitor.getSummary(),
    performance: cacheMonitor.getPerformanceReport(),
    timestamp: new Date().toISOString()
  };
}

export default cacheMonitor;