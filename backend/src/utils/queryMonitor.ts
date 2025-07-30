/**
 * 느린 쿼리 모니터링 유틸리티
 * 데이터베이스 성능 병목점을 실시간으로 감지
 */

import mongoose from 'mongoose';
import logger from '../config/logger';

interface SlowQueryLog {
  collection: string;
  method: string;
  query: any;
  executionTime: number;
  timestamp: Date;
}

class QueryMonitor {
  private slowQueries: SlowQueryLog[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 500; // 500ms 이상이면 느린 쿼리

  /**
   * 쿼리 모니터링 시작
   */
  public startMonitoring(): void {
    if (process.env.NODE_ENV === 'development') {
      // 개발 환경에서만 상세 로그
      mongoose.set('debug', (collectionName: string, methodName: string, query: any, doc: any) => {
        const executionTime = doc?.executedTime || 0;
        
        if (executionTime > this.SLOW_QUERY_THRESHOLD) {
          const slowQuery: SlowQueryLog = {
            collection: collectionName,
            method: methodName,
            query: JSON.stringify(query),
            executionTime,
            timestamp: new Date()
          };

          this.slowQueries.push(slowQuery);
          
          logger.warn('🐌 느린 쿼리 감지!', {
            collection: collectionName,
            method: methodName,
            executionTime: `${executionTime}ms`,
            query: query,
            suggestion: this.getSuggestion(collectionName, methodName, query)
          });
        }
      });
    }

    logger.info('✅ 쿼리 모니터링이 시작되었습니다.', {
      threshold: `${this.SLOW_QUERY_THRESHOLD}ms`
    });
  }

  /**
   * 느린 쿼리에 대한 개선 제안
   */
  private getSuggestion(collection: string, method: string, query: any): string {
    if (method === 'find' || method === 'findOne') {
      const queryKeys = Object.keys(query);
      return `${collection} 컬렉션의 [${queryKeys.join(', ')}] 필드에 인덱스 추가를 고려하세요.`;
    }
    
    if (method === 'aggregate') {
      return `${collection} 컬렉션의 집계 쿼리 파이프라인 최적화를 고려하세요.`;
    }

    return `${collection} 컬렉션의 ${method} 작업 최적화가 필요합니다.`;
  }

  /**
   * 현재까지 감지된 느린 쿼리 목록 반환
   */
  public getSlowQueries(): SlowQueryLog[] {
    return [...this.slowQueries];
  }

  /**
   * 느린 쿼리 통계 반환
   */
  public getStats(): {
    totalSlowQueries: number;
    slowestQuery: SlowQueryLog | null;
    mostProblematicCollection: string | null;
  } {
    if (this.slowQueries.length === 0) {
      return {
        totalSlowQueries: 0,
        slowestQuery: null,
        mostProblematicCollection: null
      };
    }

    // 가장 느린 쿼리 찾기
    const slowestQuery = this.slowQueries.reduce((prev, current) => 
      prev.executionTime > current.executionTime ? prev : current
    );

    // 가장 문제가 많은 컬렉션 찾기
    const collectionCounts = this.slowQueries.reduce((acc, query) => {
      acc[query.collection] = (acc[query.collection] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostProblematicCollection = Object.entries(collectionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    return {
      totalSlowQueries: this.slowQueries.length,
      slowestQuery,
      mostProblematicCollection
    };
  }

  /**
   * 느린 쿼리 로그 초기화
   */
  public clearLogs(): void {
    this.slowQueries = [];
    logger.info('느린 쿼리 로그가 초기화되었습니다.');
  }
}

export const queryMonitor = new QueryMonitor();
export default queryMonitor;