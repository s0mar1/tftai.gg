/**
 * 느린 쿼리 탐지 시스템
 * MongoDB 쿼리 성능을 실시간으로 모니터링하고 느린 쿼리를 탐지
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SlowQueryInfo {
  id: string;
  collection: string;
  operation: string;
  query: Record<string, any>;
  duration: number;
  timestamp: Date;
  stackTrace?: string;
  indexesUsed?: string[];
  docsExamined?: number;
  docsReturned?: number;
  executionStats?: Record<string, any>;
}

export interface SlowQueryThresholds {
  warning: number;  // 경고 임계값 (ms)
  error: number;    // 오류 임계값 (ms)
  critical: number; // 치명적 임계값 (ms)
}

export interface SlowQueryConfig {
  thresholds: SlowQueryThresholds;
  enabled: boolean;
  logToFile: boolean;
  logToConsole: boolean;
  maxLogSize: number;
  enableStackTrace: boolean;
  enableExplainPlan: boolean;
  collectionsToMonitor: string[];
}

const DEFAULT_CONFIG: SlowQueryConfig = {
  thresholds: {
    warning: 1000,   // 1초
    error: 3000,     // 3초
    critical: 5000   // 5초
  },
  enabled: true,
  logToFile: true,
  logToConsole: true,
  maxLogSize: 10 * 1024 * 1024, // 10MB
  enableStackTrace: true,
  enableExplainPlan: true,
  collectionsToMonitor: ['match', 'decktier', 'itemstats', 'traitstats', 'userdeck']
};

export class SlowQueryDetector extends EventEmitter {
  private config: SlowQueryConfig;
  private logFilePath: string;
  private queryCount: number = 0;
  private slowQueryCount: number = 0;
  private startTime: number = Date.now();

  constructor(config: Partial<SlowQueryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logFilePath = path.join(__dirname, '../logs/slow-queries.log');
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
   * 쿼리 실행 모니터링
   */
  async monitorQuery<T>(
    collection: string,
    operation: string,
    query: Record<string, any>,
    executor: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enabled) {
      return executor();
    }

    // 모니터링 대상 컬렉션 체크
    if (this.config.collectionsToMonitor.length > 0 && 
        !this.config.collectionsToMonitor.includes(collection.toLowerCase())) {
      return executor();
    }

    const queryId = this.generateQueryId();
    const startTime = performance.now();
    
    this.queryCount++;

    try {
      const result = await executor();
      const duration = performance.now() - startTime;

      // 느린 쿼리 체크
      if (duration > this.config.thresholds.warning) {
        await this.handleSlowQuery({
          id: queryId,
          collection,
          operation,
          query,
          duration,
          timestamp: new Date(),
          stackTrace: this.config.enableStackTrace ? this.getStackTrace() : undefined
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // 실패한 쿼리도 기록
      await this.handleSlowQuery({
        id: queryId,
        collection,
        operation,
        query,
        duration,
        timestamp: new Date(),
        stackTrace: this.config.enableStackTrace ? this.getStackTrace() : undefined
      });

      throw error;
    }
  }

  /**
   * 느린 쿼리 처리
   */
  private async handleSlowQuery(slowQuery: SlowQueryInfo): Promise<void> {
    this.slowQueryCount++;
    
    const severity = this.getSeverity(slowQuery.duration);
    
    // 이벤트 발생
    this.emit('slowQuery', { ...slowQuery, severity });
    
    // 콘솔 로그
    if (this.config.logToConsole) {
      this.logToConsole(slowQuery, severity);
    }
    
    // 파일 로그
    if (this.config.logToFile) {
      await this.logToFile(slowQuery, severity);
    }
    
    // 실행 계획 수집 (중요한 쿼리만)
    if (this.config.enableExplainPlan && severity !== 'warning') {
      try {
        slowQuery.executionStats = await this.getExecutionStats(slowQuery);
      } catch (error) {
        // 실행 계획 수집 실패는 무시
      }
    }
  }

  /**
   * 쿼리 심각도 결정
   */
  private getSeverity(duration: number): 'warning' | 'error' | 'critical' {
    if (duration >= this.config.thresholds.critical) return 'critical';
    if (duration >= this.config.thresholds.error) return 'error';
    return 'warning';
  }

  /**
   * 콘솔 로그 출력
   */
  private logToConsole(slowQuery: SlowQueryInfo, severity: string): void {
    const emoji = severity === 'critical' ? '🚨' : severity === 'error' ? '⚠️' : '💡';
    const color = severity === 'critical' ? '\x1b[31m' : severity === 'error' ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${emoji} [SLOW QUERY] ${severity.toUpperCase()}${reset}`);
    console.log(`   ID: ${slowQuery.id}`);
    console.log(`   Collection: ${slowQuery.collection}`);
    console.log(`   Operation: ${slowQuery.operation}`);
    console.log(`   Duration: ${slowQuery.duration.toFixed(2)}ms`);
    console.log(`   Query: ${JSON.stringify(slowQuery.query, null, 2)}`);
    
    if (slowQuery.stackTrace) {
      console.log(`   Stack Trace: ${slowQuery.stackTrace}`);
    }
    
    console.log('');
  }

  /**
   * 파일 로그 저장
   */
  private async logToFile(slowQuery: SlowQueryInfo, severity: string): Promise<void> {
    const logEntry = {
      ...slowQuery,
      severity,
      timestamp: slowQuery.timestamp.toISOString()
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      // 로그 파일 크기 체크
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size > this.config.maxLogSize) {
          await this.rotateLogFile();
        }
      }

      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error('로그 파일 쓰기 실패:', error);
    }
  }

  /**
   * 로그 파일 회전
   */
  private async rotateLogFile(): Promise<void> {
    try {
      const backupPath = this.logFilePath + '.backup';
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      fs.renameSync(this.logFilePath, backupPath);
    } catch (error) {
      console.error('로그 파일 회전 실패:', error);
    }
  }

  /**
   * 스택 추적 정보 생성
   */
  private getStackTrace(): string {
    const stack = new Error().stack;
    if (!stack) return '';
    
    const lines = stack.split('\n');
    // 현재 메서드들을 제외한 실제 호출 지점 찾기
    const relevantLines = lines.slice(3, 8).filter(line => 
      !line.includes('slow-query-detector') && 
      !line.includes('node_modules')
    );
    
    return relevantLines.join('\n');
  }

  /**
   * 실행 계획 수집 (실제 구현은 MongoDB 연결이 필요)
   */
  private async getExecutionStats(slowQuery: SlowQueryInfo): Promise<Record<string, any>> {
    // 실제 구현에서는 MongoDB의 explain() 메서드를 사용
    // 여기서는 mock 데이터 반환
    return {
      executionTimeMillis: slowQuery.duration,
      totalKeysExamined: 0,
      totalDocsExamined: 0,
      totalDocsReturned: 0,
      executionStages: {
        stage: 'COLLSCAN', // 실제로는 explain()에서 가져옴
        direction: 'forward',
        docsExamined: 0
      }
    };
  }

  /**
   * 쿼리 ID 생성
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 통계 정보 반환
   */
  getStats(): {
    totalQueries: number;
    slowQueries: number;
    slowQueryRate: number;
    uptime: number;
    thresholds: SlowQueryThresholds;
  } {
    const uptime = Date.now() - this.startTime;
    
    return {
      totalQueries: this.queryCount,
      slowQueries: this.slowQueryCount,
      slowQueryRate: this.queryCount > 0 ? (this.slowQueryCount / this.queryCount) * 100 : 0,
      uptime,
      thresholds: this.config.thresholds
    };
  }

  /**
   * 느린 쿼리 로그 분석
   */
  async analyzeSlowQueries(limit: number = 50): Promise<{
    queries: SlowQueryInfo[];
    summary: {
      total: number;
      byCollection: Record<string, number>;
      byOperation: Record<string, number>;
      bySeverity: Record<string, number>;
      averageDuration: number;
    };
  }> {
    if (!fs.existsSync(this.logFilePath)) {
      return {
        queries: [],
        summary: {
          total: 0,
          byCollection: {},
          byOperation: {},
          bySeverity: {},
          averageDuration: 0
        }
      };
    }

    const logContent = fs.readFileSync(this.logFilePath, 'utf8');
    const lines = logContent.trim().split('\n').filter(line => line.trim());
    
    const queries: SlowQueryInfo[] = [];
    const summary = {
      total: 0,
      byCollection: {} as Record<string, number>,
      byOperation: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      averageDuration: 0
    };

    let totalDuration = 0;

    for (const line of lines.slice(-limit)) {
      try {
        const entry = JSON.parse(line);
        queries.push(entry);
        
        summary.total++;
        summary.byCollection[entry.collection] = (summary.byCollection[entry.collection] || 0) + 1;
        summary.byOperation[entry.operation] = (summary.byOperation[entry.operation] || 0) + 1;
        summary.bySeverity[entry.severity] = (summary.bySeverity[entry.severity] || 0) + 1;
        totalDuration += entry.duration;
      } catch (error) {
        // 잘못된 JSON 라인 무시
      }
    }

    summary.averageDuration = summary.total > 0 ? totalDuration / summary.total : 0;

    return {
      queries: queries.reverse(), // 최신 순으로 정렬
      summary
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<SlowQueryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * 리셋
   */
  reset(): void {
    this.queryCount = 0;
    this.slowQueryCount = 0;
    this.startTime = Date.now();
    this.emit('reset');
  }
}

// 글로벌 인스턴스 생성
export const slowQueryDetector = new SlowQueryDetector();

// 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n📊 느린 쿼리 탐지 시스템 종료...');
  const stats = slowQueryDetector.getStats();
  console.log(`총 쿼리 수: ${stats.totalQueries}`);
  console.log(`느린 쿼리 수: ${stats.slowQueries}`);
  console.log(`느린 쿼리 비율: ${stats.slowQueryRate.toFixed(2)}%`);
  process.exit(0);
});

export default slowQueryDetector;