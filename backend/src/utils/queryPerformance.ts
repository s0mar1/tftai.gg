// backend/src/utils/queryPerformance.ts

import logger from '../config/logger';
import mongoose, { Query } from 'mongoose';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 통합된 쿼리 성능 모니터링 시스템
 * MongoDB 쿼리의 성능을 분석하고 최적화 권장사항을 제공합니다.
 */

// 인터페이스 정의
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
  explainStats?: QueryExplainStats;
  optimizationSuggestions?: string[];
  severity?: 'normal' | 'warning' | 'error' | 'critical';
  stackTrace?: string;
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

export interface SlowQueryThresholds {
  warning: number;
  error: number;
  critical: number;
}

export interface QueryPerformanceConfig {
  thresholds: SlowQueryThresholds;
  maxStats: number;
  logToFile: boolean;
  logToConsole: boolean;
  maxLogSize: number;
  enableStackTrace: boolean;
  enableExplain: boolean;
  collectionsToMonitor: string[];
}

const DEFAULT_CONFIG: QueryPerformanceConfig = {
  thresholds: {
    warning: 1000,
    error: 3000,
    critical: 5000
  },
  maxStats: 1000,
  logToFile: true,
  logToConsole: true,
  maxLogSize: 10 * 1024 * 1024, // 10MB
  enableStackTrace: true,
  enableExplain: true,
  collectionsToMonitor: []
};

/**
 * 쿼리 성능 추적 및 분석 클래스
 */
export class QueryPerformanceTracker extends EventEmitter {
  private stats: QueryPerformanceStats[] = [];
  public config: QueryPerformanceConfig;
  private logFilePath: string;
  private queryCount: number = 0;
  private slowQueryCount: number = 0;
  private startTime: number = Date.now();

  constructor(config: Partial<QueryPerformanceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logFilePath = path.join(__dirname, '../logs/query-performance.log');
    this.ensureLogDirectory();
  }

  /**
   * 로그 디렉토리 생성
   */
  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 쿼리 성능 기록 추가
   */
  addStat(stat: QueryPerformanceStats): void {
    this.stats.push(stat);
    this.queryCount++;

    // 최대 개수 초과시 오래된 것 제거
    if (this.stats.length > this.config.maxStats) {
      this.stats.shift();
    }

    // 느린 쿼리 처리
    if (stat.duration > this.config.thresholds.warning) {
      this.slowQueryCount++;
      this.handleSlowQuery(stat);
    }
  }

  /**
   * 느린 쿼리 처리
   */
  private handleSlowQuery(stat: QueryPerformanceStats): void {
    const severity = this.getSeverity(stat.duration);
    stat.severity = severity;

    // 이벤트 발생
    this.emit('slowQuery', stat);

    // 콘솔 로그
    if (this.config.logToConsole) {
      this.logToConsole(stat, severity);
    }

    // 파일 로그
    if (this.config.logToFile) {
      this.logToFile(stat, severity);
    }
  }

  /**
   * 쿼리 심각도 결정
   */
  private getSeverity(duration: number): 'normal' | 'warning' | 'error' | 'critical' {
    if (duration >= this.config.thresholds.critical) return 'critical';
    if (duration >= this.config.thresholds.error) return 'error';
    if (duration >= this.config.thresholds.warning) return 'warning';
    return 'normal';
  }

  /**
   * 콘솔 로그 출력
   */
  private logToConsole(stat: QueryPerformanceStats, severity: string): void {
    const emoji = severity === 'critical' ? '🚨' : severity === 'error' ? '⚠️' : severity === 'warning' ? '💡' : '✓';
    
    logger.warn(`${emoji} 느린 쿼리 감지 [${severity.toUpperCase()}]`, {
      queryId: stat.queryId,
      collection: stat.collection,
      operation: stat.operation,
      duration: `${stat.duration}ms`,
      suggestions: stat.optimizationSuggestions,
      stackTrace: stat.stackTrace
    });
  }

  /**
   * 파일 로그 저장
   */
  private logToFile(stat: QueryPerformanceStats, severity: string): void {
    const logEntry = {
      ...stat,
      severity,
      timestamp: stat.startTime.toISOString()
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      // 로그 파일 크기 체크
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size > this.config.maxLogSize) {
          this.rotateLogFile();
        }
      }

      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      logger.error('로그 파일 쓰기 실패:', error);
    }
  }

  /**
   * 로그 파일 회전
   */
  private rotateLogFile(): void {
    try {
      const backupPath = this.logFilePath + '.backup';
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      fs.renameSync(this.logFilePath, backupPath);
    } catch (error) {
      logger.error('로그 파일 회전 실패:', error);
    }
  }

  /**
   * 스택 추적 정보 생성
   */
  private getStackTrace(): string {
    const stack = new Error().stack;
    if (!stack) return '';

    const lines = stack.split('\n');
    const relevantLines = lines.slice(3, 8).filter(line =>
      !line.includes('queryPerformance') &&
      !line.includes('node_modules')
    );

    return relevantLines.join('\n');
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
    return this.stats.filter(stat => stat.duration > this.config.thresholds.warning);
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
    slowQueryRate: number;
    collectionStats: Record<string, { count: number; avgDuration: number }>;
    uptime: number;
    thresholds: SlowQueryThresholds;
  } {
    const totalQueries = this.stats.length;
    const averageDuration = totalQueries > 0 ?
      this.stats.reduce((sum, stat) => sum + stat.duration, 0) / totalQueries : 0;
    // const _slowQueries = this.getSlowQueries().length; // unused
    const uptime = Date.now() - this.startTime;

    const collectionStats: Record<string, { count: number; avgDuration: number }> = {};
    this.stats.forEach(stat => {
      if (!collectionStats[stat.collection]) {
        collectionStats[stat.collection] = { count: 0, avgDuration: 0 };
      }
      collectionStats[stat.collection]!.count++;
    });

    // 각 컬렉션의 평균 실행 시간 계산
    Object.keys(collectionStats).forEach(collection => {
      const collectionQueries = this.getStatsByCollection(collection);
      collectionStats[collection]!.avgDuration = collectionQueries.length > 0 ?
        collectionQueries.reduce((sum, stat) => sum + stat.duration, 0) / collectionQueries.length : 0;
    });

    return {
      totalQueries: this.queryCount,
      averageDuration: Math.round(averageDuration),
      slowQueries: this.slowQueryCount,
      slowQueryRate: this.queryCount > 0 ? (this.slowQueryCount / this.queryCount) * 100 : 0,
      collectionStats,
      uptime,
      thresholds: this.config.thresholds
    };
  }

  /**
   * 통계 초기화
   */
  clear(): void {
    this.stats = [];
    this.queryCount = 0;
    this.slowQueryCount = 0;
    this.startTime = Date.now();
    logger.info('쿼리 성능 통계가 초기화되었습니다.');
    this.emit('reset');
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<QueryPerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
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
    (totalExamined > totalReturned * 10) ||
    executionTimeMillis > 100;

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
  // 모니터링 대상 컬렉션 체크
  if (queryTracker.config.collectionsToMonitor.length > 0 &&
    !queryTracker.config.collectionsToMonitor.includes(options.collection.toLowerCase())) {
    return queryExecutor();
  }

  const queryId = options.queryId || `${options.collection}_${options.operation}_${Date.now()}`;
  const startTime = new Date();
  const startMs = performance.now();
  let result: T;
  let error: string | undefined;
  let explainStats: QueryExplainStats | undefined;

  try {
    // 쿼리 실행
    result = await queryExecutor();
    const duration = performance.now() - startMs;

    // explain 분석 (옵션)
    if ((options.enableExplain ?? queryTracker.config.enableExplain) && options.explainQuery) {
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
      limit: options.limit || 0,
      skip: options.skip || 0,
      success: true,
      explainStats: explainStats || { stage: 'unknown', executionTimeMillis: 0, totalExamined: 0, totalReturned: 0, indexesUsed: [], needsOptimization: false, optimizationSuggestions: [] },
      optimizationSuggestions: explainStats?.optimizationSuggestions || [],
      stackTrace: (queryTracker.config.enableStackTrace && duration > queryTracker.config.thresholds.warning ?
        queryTracker['getStackTrace']() : undefined) || 'No stack trace'
    };

    queryTracker.addStat(stat);

    return result;
  } catch (err) {
    error = (err as Error).message;
    const duration = performance.now() - startMs;

    // 에러 통계 기록
    const stat: QueryPerformanceStats = {
      queryId,
      collection: options.collection,
      operation: options.operation,
      duration,
      startTime,
      endTime: new Date(),
      filter: options.filter,
      sort: options.sort,
      limit: options.limit || 0,
      skip: options.skip || 0,
      success: false,
      error,
      optimizationSuggestions: [],
      stackTrace: queryTracker.config.enableStackTrace ? (queryTracker['getStackTrace']() || 'Stack trace unavailable') : 'Stack trace disabled'
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
        async () => query.clone().explain('executionStats') : async () => ({}),
      filter: queryConditions,
      sort: queryOptions.sort,
      limit: queryOptions.limit || 0,
      skip: queryOptions.skip || 0
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
        async () => model.aggregate(pipeline).explain('executionStats') : async () => ({}),
      filter: { pipeline: pipeline.slice(0, 2) }
    }
  );
}

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
  const summary = queryTracker.getSummary();

  Object.entries(summary.collectionStats).forEach(([collection, stats]) => {
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

  // 인덱스 생성 제안
  slowQueries.forEach(query => {
    if (query.explainStats?.stage === 'COLLSCAN' && query.filter) {
      const keys = Object.keys(query.filter);
      if (keys.length > 0) {
        indexSuggestions.push(`${query.collection} 컬렉션에 { ${keys.join(': 1, ')} : 1 } 인덱스 생성 검토`);
      }
    }
  });

  return {
    slowQueries,
    recommendations,
    indexSuggestions
  };
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
  updateConfig: (config: Partial<QueryPerformanceConfig>) => queryTracker.updateConfig(config)
};

// 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n📊 쿼리 성능 모니터링 시스템 종료...');
  const stats = queryTracker.getSummary();
  console.log(`총 쿼리 수: ${stats.totalQueries}`);
  console.log(`느린 쿼리 수: ${stats.slowQueries}`);
  console.log(`느린 쿼리 비율: ${stats.slowQueryRate.toFixed(2)}%`);
  process.exit(0);
});

export default {
  monitorQuery,
  monitorMongooseQuery,
  monitorAggregateQuery,
  performanceStats,
  generateOptimizationReport,
  analyzeExplainStats,
  queryTracker
};