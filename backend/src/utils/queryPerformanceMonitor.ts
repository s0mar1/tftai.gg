// backend/src/utils/queryPerformanceMonitor.ts

import logger from '../config/logger';
import mongoose, { Query } from 'mongoose';

/**
 * 쿼리 성능 모니터링을 위한 유틸리티
 * MongoDB 쿼리의 성능을 분석하고 최적화 권장사항을 제공합니다.
 */

export interface QueryPerformanceStats {
  queryId: string;
  collection: string;
  operation: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  filter?: any;
  sort?: any;
  limit?: number;
  skip?: number;
  success: boolean;
  error?: string;
  explainStats?: any;
  optimizationSuggestions?: string[];
}

export interface QueryExplainStats {
  executionTimeMillis: number;
  totalExamined: number;
  totalReturned: number;
  indexesUsed: string[];
  stage: string;
  needsOptimization: boolean;
  optimizationSuggestions: string[];
}

/**
 * 쿼리 성능 통계 저장소
 */
class QueryPerformanceTracker {
  private stats: QueryPerformanceStats[] = [];
  private readonly maxStats = 1000; // 최대 저장 개수
  private slowQueryThreshold = 1000; // 느린 쿼리 임계값 (ms)

  /**
   * 쿼리 성능 기록 추가
   */
  addStat(stat: QueryPerformanceStats): void {
    this.stats.push(stat);
    
    // 최대 개수 초과시 오래된 것 제거
    if (this.stats.length > this.maxStats) {
      this.stats.shift();
    }

    // 느린 쿼리 로깅
    if (stat.duration > this.slowQueryThreshold) {
      logger.warn('느린 쿼리 감지:', {
        queryId: stat.queryId,
        collection: stat.collection,
        operation: stat.operation,
        duration: `${stat.duration}ms`,
        suggestions: stat.optimizationSuggestions
      });
    }
  }

  /**
   * 통계 조회
   */
  getStats(): QueryPerformanceStats[] {
    return [...this.stats];
  }

  /**
   * 느린 쿼리 조회
   */
  getSlowQueries(): QueryPerformanceStats[] {
    return this.stats.filter(stat => stat.duration > this.slowQueryThreshold);
  }

  /**
   * 컬렉션별 통계
   */
  getStatsByCollection(collection: string): QueryPerformanceStats[] {
    return this.stats.filter(stat => stat.collection === collection);
  }

  /**
   * 통계 요약
   */
  getSummary(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    collectionStats: Record<string, { count: number; avgDuration: number }>;
  } {
    const totalQueries = this.stats.length;
    const averageDuration = totalQueries > 0 ? 
      this.stats.reduce((sum, stat) => sum + stat.duration, 0) / totalQueries : 0;
    const slowQueries = this.getSlowQueries().length;

    const collectionStats: Record<string, { count: number; avgDuration: number }> = {};
    this.stats.forEach(stat => {
      if (!collectionStats[stat.collection]) {
        collectionStats[stat.collection] = { count: 0, avgDuration: 0 };
      }
      collectionStats[stat.collection].count++;
    });

    // 각 컬렉션의 평균 실행 시간 계산
    Object.keys(collectionStats).forEach(collection => {
      const collectionQueries = this.getStatsByCollection(collection);
      collectionStats[collection].avgDuration = collectionQueries.length > 0 ?
        collectionQueries.reduce((sum, stat) => sum + stat.duration, 0) / collectionQueries.length : 0;
    });

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration),
      slowQueries,
      collectionStats
    };
  }

  /**
   * 통계 초기화
   */
  clear(): void {
    this.stats = [];
    logger.info('쿼리 성능 통계가 초기화되었습니다.');
  }

  /**
   * 느린 쿼리 임계값 설정
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
    logger.info(`느린 쿼리 임계값이 ${threshold}ms로 설정되었습니다.`);
  }
}

// 싱글톤 인스턴스
const queryTracker = new QueryPerformanceTracker();

/**
 * 쿼리 explain 결과 분석
 */
export function analyzeExplainStats(explain: any): QueryExplainStats {
  const stats = explain.executionStats || explain;
  
  const executionTimeMillis = stats.executionTimeMillis || 0;
  const totalExamined = stats.totalDocsExamined || 0;
  const totalReturned = stats.totalDocsReturned || 0;
  
  // 인덱스 사용 여부 확인
  const indexesUsed: string[] = [];
  const stage = stats.stage || 'unknown';
  
  if (stats.indexName) {
    indexesUsed.push(stats.indexName);
  }
  
  // 인덱스 사용 분석
  const isIndexScan = stage === 'IXSCAN';
  const isCollectionScan = stage === 'COLLSCAN';
  
  // 최적화 필요 여부 판단
  const needsOptimization = 
    isCollectionScan || 
    (totalExamined > totalReturned * 10) || // 10배 이상 더 많은 문서 검사
    executionTimeMillis > 100; // 100ms 이상 실행

  // 최적화 제안 생성
  const optimizationSuggestions: string[] = [];
  
  if (isCollectionScan) {
    optimizationSuggestions.push('컬렉션 스캔이 발생했습니다. 적절한 인덱스를 생성하세요.');
  }
  
  if (totalExamined > totalReturned * 10) {
    optimizationSuggestions.push('검사된 문서 수가 반환된 문서 수보다 너무 많습니다. 쿼리 필터나 인덱스를 최적화하세요.');
  }
  
  if (executionTimeMillis > 100 && !isIndexScan) {
    optimizationSuggestions.push('실행 시간이 깁니다. 인덱스 사용을 확인하세요.');
  }
  
  if (indexesUsed.length === 0) {
    optimizationSuggestions.push('인덱스가 사용되지 않았습니다. 쿼리 조건에 맞는 인덱스를 생성하세요.');
  }

  return {
    executionTimeMillis,
    totalExamined,
    totalReturned,
    indexesUsed,
    stage,
    needsOptimization,
    optimizationSuggestions
  };
}

/**
 * 쿼리 성능 모니터링 래퍼
 */
export async function monitorQuery<T>(
  queryExecutor: () => Promise<T>,
  options: {
    queryId?: string;
    collection: string;
    operation: string;
    enableExplain?: boolean;
    explainQuery?: () => Promise<any>;
    filter?: any;
    sort?: any;
    limit?: number;
    skip?: number;
  }
): Promise<T> {
  const queryId = options.queryId || `${options.collection}_${options.operation}_${Date.now()}`;
  const startTime = new Date();
  let result: T;
  let error: string | undefined;
  let explainStats: any;

  try {
    // 쿼리 실행
    const startMs = Date.now();
    result = await queryExecutor();
    const duration = Date.now() - startMs;

    // explain 분석 (옵션)
    if (options.enableExplain && options.explainQuery) {
      try {
        const explainResult = await options.explainQuery();
        explainStats = analyzeExplainStats(explainResult);
      } catch (explainError) {
        logger.warn('쿼리 explain 분석 실패:', explainError);
      }
    }

    // 성능 통계 기록
    const stat: QueryPerformanceStats = {
      queryId,
      collection: options.collection,
      operation: options.operation,
      duration,
      startTime,
      endTime: new Date(),
      filter: options.filter,
      sort: options.sort,
      limit: options.limit,
      skip: options.skip,
      success: true,
      explainStats,
      optimizationSuggestions: explainStats?.optimizationSuggestions || []
    };

    queryTracker.addStat(stat);

    // 결과 반환
    return result;
  } catch (err) {
    error = (err as Error).message;
    
    // 에러 통계 기록
    const stat: QueryPerformanceStats = {
      queryId,
      collection: options.collection,
      operation: options.operation,
      duration: Date.now() - startTime.getTime(),
      startTime,
      endTime: new Date(),
      filter: options.filter,
      sort: options.sort,
      limit: options.limit,
      skip: options.skip,
      success: false,
      error,
      optimizationSuggestions: []
    };

    queryTracker.addStat(stat);
    
    throw err;
  }
}

/**
 * Mongoose 쿼리 모니터링 헬퍼
 */
export async function monitorMongooseQuery<T>(
  query: Query<T, any>,
  options: {
    queryId?: string;
    collection: string;
    operation: string;
    enableExplain?: boolean;
  }
): Promise<T> {
  const queryConditions = query.getQuery();
  const queryOptions = query.getOptions();

  return monitorQuery(
    () => query.exec(),
    {
      queryId: options.queryId || 'mongoose',
      collection: options.collection,
      operation: options.operation,
      enableExplain: options.enableExplain || false,
      explainQuery: options.enableExplain ? 
        () => query.clone().explain('executionStats') : undefined,
      filter: queryConditions,
      sort: queryOptions.sort,
      limit: queryOptions.limit,
      skip: queryOptions.skip
    }
  );
}

/**
 * 집계 쿼리 모니터링 헬퍼
 */
export async function monitorAggregateQuery<T>(
  model: mongoose.Model<any>,
  pipeline: any[],
  options: {
    queryId?: string;
    collection: string;
    operation: string;
    enableExplain?: boolean;
  }
): Promise<T[]> {
  return monitorQuery(
    () => model.aggregate(pipeline).exec(),
    {
      queryId: options.queryId || 'aggregate',
      collection: options.collection,
      operation: options.operation,
      enableExplain: options.enableExplain || false,
      explainQuery: options.enableExplain ? 
        () => model.aggregate(pipeline).explain('executionStats') : undefined,
      filter: { pipeline: pipeline.slice(0, 2) } // 첫 2개 스테이지만 기록
    }
  );
}

/**
 * 성능 통계 조회 함수들
 */
export const performanceStats = {
  getAll: () => queryTracker.getStats(),
  getSlowQueries: () => queryTracker.getSlowQueries(),
  getByCollection: (collection: string) => queryTracker.getStatsByCollection(collection),
  getSummary: () => queryTracker.getSummary(),
  clear: () => queryTracker.clear(),
  setSlowQueryThreshold: (threshold: number) => queryTracker.setSlowQueryThreshold(threshold)
};

/**
 * 자동 쿼리 최적화 제안 생성
 */
export function generateOptimizationReport(): {
  slowQueries: QueryPerformanceStats[];
  recommendations: string[];
  indexSuggestions: string[];
} {
  const slowQueries = queryTracker.getSlowQueries();
  const recommendations: string[] = [];
  const indexSuggestions: string[] = [];

  // 컬렉션별 분석
  const collectionStats = queryTracker.getSummary().collectionStats;
  
  Object.entries(collectionStats).forEach(([collection, stats]) => {
    if (stats.avgDuration > 500) {
      recommendations.push(`${collection} 컬렉션의 평균 쿼리 시간이 ${stats.avgDuration}ms로 높습니다.`);
    }
  });

  // 자주 나타나는 최적화 제안 분석
  const allSuggestions = queryTracker.getStats()
    .flatMap(stat => stat.optimizationSuggestions || []);
  
  const suggestionCounts = allSuggestions.reduce((acc, suggestion) => {
    acc[suggestion] = (acc[suggestion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 가장 자주 나타나는 제안들을 권장사항으로 추가
  Object.entries(suggestionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([suggestion, count]) => {
      if (count > 3) {
        recommendations.push(`${suggestion} (${count}번 감지됨)`);
      }
    });

  return {
    slowQueries,
    recommendations,
    indexSuggestions
  };
}

export default {
  monitorQuery,
  monitorMongooseQuery,
  monitorAggregateQuery,
  performanceStats,
  generateOptimizationReport,
  analyzeExplainStats
};