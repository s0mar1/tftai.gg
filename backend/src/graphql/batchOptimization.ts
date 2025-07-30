/**
 * GraphQL 배치 쿼리 및 멀티플렉싱 최적화 시스템
 * 여러 클라이언트의 유사한 요청을 배치 처리하여 성능 최적화
 */

import logger from '../config/logger';
import graphqlResponseCache from './responseCache';
import { GraphQLPerformanceTracker } from './telemetry';

/**
 * 배치 요청 인터페이스
 */
interface BatchRequest {
  id: string;
  operation: string;
  args: Record<string, any>;
  timestamp: number;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  complexity: number;
}

/**
 * 배치 실행 결과
 */
interface BatchExecutionResult {
  batchId: string;
  requests: BatchRequest[];
  executionTime: number;
  cacheHits: number;
  errors: number;
}

/**
 * 배치 쿼리 최적화 관리자
 */
export class BatchQueryOptimizer {
  private pendingRequests = new Map<string, BatchRequest[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private readonly BATCH_WINDOW_MS = 50; // 50ms 배치 윈도우
  private readonly MAX_BATCH_SIZE = 10; // 최대 배치 크기
  private readonly MIN_BATCH_SIZE = 2; // 최소 배치 크기
  private batchExecutionHistory: BatchExecutionResult[] = [];

  /**
   * 배치 가능한 요청인지 확인
   */
  private isBatchable(operation: string, args: Record<string, any>): boolean {
    // 배치 처리 가능한 작업들
    const batchableOperations = ['champions', 'tierlist'];
    
    if (!batchableOperations.includes(operation)) {
      return false;
    }
    
    // 사용자별 데이터는 배치하지 않음
    if (args.name || args.puuid || args.userId) {
      return false;
    }
    
    return true;
  }

  /**
   * 배치 키 생성 (유사한 요청들을 그룹화)
   */
  private generateBatchKey(operation: string, args: Record<string, any>): string {
    // language를 제외한 나머지 인자로 배치 키 생성
    const { language, ...otherArgs } = args;
    const batchArgs = Object.keys(otherArgs).length > 0 ? JSON.stringify(otherArgs) : '';
    return `${operation}:${batchArgs}`;
  }

  /**
   * 배치 요청 추가
   */
  async addToBatch<T>(
    operation: string,
    args: Record<string, any>,
    complexity: number = 1,
    executor: (batchedArgs: Record<string, any>[]) => Promise<T[]>
  ): Promise<T> {
    // 배치 불가능한 요청은 즉시 실행
    if (!this.isBatchable(operation, args)) {
      logger.debug(`🔄 [Batch] 즉시 실행: ${operation}`);
      const results = await executor([args]);
      return results[0];
    }

    const batchKey = this.generateBatchKey(operation, args);
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest = {
        id: requestId,
        operation,
        args,
        timestamp: Date.now(),
        resolve,
        reject,
        complexity
      };

      // 배치에 요청 추가
      if (!this.pendingRequests.has(batchKey)) {
        this.pendingRequests.set(batchKey, []);
      }
      
      const batch = this.pendingRequests.get(batchKey)!;
      batch.push(request);

      logger.debug(`📦 [Batch] 요청 추가: ${operation} (${batch.length}/${this.MAX_BATCH_SIZE})`);

      // 최대 배치 크기에 도달하면 즉시 실행
      if (batch.length >= this.MAX_BATCH_SIZE) {
        this.executeBatch(batchKey, executor);
      } else {
        // 타이머가 없으면 새로 설정
        if (!this.batchTimers.has(batchKey)) {
          const timer = setTimeout(() => {
            this.executeBatch(batchKey, executor);
          }, this.BATCH_WINDOW_MS);
          
          this.batchTimers.set(batchKey, timer);
        }
      }
    });
  }

  /**
   * 배치 실행
   */
  private async executeBatch<T>(
    batchKey: string,
    executor: (batchedArgs: Record<string, any>[]) => Promise<T[]>
  ): Promise<void> {
    const batch = this.pendingRequests.get(batchKey);
    if (!batch || batch.length === 0) return;

    // 타이머 정리
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // 배치에서 제거
    this.pendingRequests.delete(batchKey);

    logger.info(`🚀 [Batch] 배치 실행: ${batchKey} (${batch.length}개 요청)`);

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();
    let cacheHits = 0;
    let errors = 0;

    try {
      // 캐시에서 먼저 확인
      const cachedResults: (T | null)[] = [];
      const uncachedRequests: BatchRequest[] = [];
      const uncachedIndices: number[] = [];

      for (let i = 0; i < batch.length; i++) {
        const request = batch[i];
        const cached = await graphqlResponseCache.get<T>(request.operation, request.args);
        
        if (cached) {
          cachedResults[i] = cached.data;
          cacheHits++;
          logger.debug(`🎯 [Batch Cache] 히트: ${request.operation}`);
        } else {
          cachedResults[i] = null;
          uncachedRequests.push(request);
          uncachedIndices.push(i);
        }
      }

      // 캐시되지 않은 요청들만 실행
      if (uncachedRequests.length > 0) {
        logger.debug(`⚡ [Batch] 실제 실행: ${uncachedRequests.length}개 요청`);
        
        const batchedArgs = uncachedRequests.map(req => req.args);
        const results = await executor(batchedArgs);

        // 결과를 캐시에 저장하고 응답
        for (let i = 0; i < uncachedRequests.length; i++) {
          const request = uncachedRequests[i];
          const result = results[i];
          const originalIndex = uncachedIndices[i];
          
          cachedResults[originalIndex] = result;

          // 캐시에 저장
          await graphqlResponseCache.set(
            request.operation,
            request.args,
            result,
            { 
              complexity: request.complexity,
              tags: [request.operation],
              ttl: 600 // 10분 기본 캐시
            },
            request.id,
            Date.now() - startTime
          );
        }

        // DataLoader 배치 추적
        GraphQLPerformanceTracker.traceDataLoaderBatch(
          `batch_${batchKey}`,
          uncachedRequests.length,
          cacheHits
        );
      }

      // 모든 요청에 결과 반환
      for (let i = 0; i < batch.length; i++) {
        const request = batch[i];
        const result = cachedResults[i];
        
        if (result !== null) {
          request.resolve(result);
        } else {
          errors++;
          request.reject(new Error(`배치 실행 결과가 없습니다: ${request.operation}`));
        }
      }

    } catch (error: any) {
      logger.error(`❌ [Batch] 배치 실행 실패: ${batchKey}`, error);
      
      // 모든 요청에 에러 반환
      batch.forEach(request => {
        request.reject(error);
        errors++;
      });
    }

    const executionTime = Date.now() - startTime;
    
    // 배치 실행 결과 기록
    const result: BatchExecutionResult = {
      batchId,
      requests: batch,
      executionTime,
      cacheHits,
      errors
    };
    
    this.batchExecutionHistory.push(result);
    
    // 히스토리 크기 제한
    if (this.batchExecutionHistory.length > 100) {
      this.batchExecutionHistory.shift();
    }

    logger.info(`✅ [Batch] 배치 완료: ${batchKey} - ${executionTime}ms, 캐시 히트: ${cacheHits}, 에러: ${errors}`);
  }

  /**
   * 배치 성능 통계
   */
  getBatchStats(): any {
    if (this.batchExecutionHistory.length === 0) {
      return {
        totalBatches: 0,
        averageExecutionTime: 0,
        averageBatchSize: 0,
        cacheHitRate: 0,
        errorRate: 0
      };
    }

    const totalBatches = this.batchExecutionHistory.length;
    const totalExecutionTime = this.batchExecutionHistory.reduce((sum, batch) => sum + batch.executionTime, 0);
    const totalRequests = this.batchExecutionHistory.reduce((sum, batch) => sum + batch.requests.length, 0);
    const totalCacheHits = this.batchExecutionHistory.reduce((sum, batch) => sum + batch.cacheHits, 0);
    const totalErrors = this.batchExecutionHistory.reduce((sum, batch) => sum + batch.errors, 0);

    return {
      totalBatches,
      totalRequests,
      averageExecutionTime: Math.round(totalExecutionTime / totalBatches),
      averageBatchSize: Math.round(totalRequests / totalBatches),
      cacheHitRate: Math.round((totalCacheHits / totalRequests) * 100),
      errorRate: Math.round((totalErrors / totalRequests) * 100),
      recentBatches: this.batchExecutionHistory.slice(-5).map(batch => ({
        batchId: batch.batchId,
        requestCount: batch.requests.length,
        executionTime: batch.executionTime,
        cacheHits: batch.cacheHits
      }))
    };
  }

  /**
   * 현재 대기 중인 배치 상태
   */
  getPendingBatchStatus(): any {
    const pendingStatus = Array.from(this.pendingRequests.entries()).map(([key, requests]) => ({
      batchKey: key,
      requestCount: requests.length,
      oldestRequest: Math.min(...requests.map(r => r.timestamp)),
      avgComplexity: requests.reduce((sum, r) => sum + r.complexity, 0) / requests.length
    }));

    return {
      pendingBatches: this.pendingRequests.size,
      totalPendingRequests: Array.from(this.pendingRequests.values()).reduce((sum, batch) => sum + batch.length, 0),
      batches: pendingStatus
    };
  }
}

/**
 * 멀티플렉싱 최적화 관리자
 * 중복된 요청을 하나로 합쳐서 처리
 */
export class MultiplexingOptimizer {
  private inflightRequests = new Map<string, Promise<any>>();
  private requestCounts = new Map<string, number>();

  /**
   * 요청 키 생성
   */
  private generateRequestKey(operation: string, args: Record<string, any>): string {
    return `${operation}:${JSON.stringify(args, Object.keys(args).sort())}`;
  }

  /**
   * 멀티플렉싱 최적화된 요청
   */
  async multiplex<T>(
    operation: string,
    args: Record<string, any>,
    executor: () => Promise<T>
  ): Promise<T> {
    const requestKey = this.generateRequestKey(operation, args);
    
    // 이미 진행 중인 동일한 요청이 있는지 확인
    if (this.inflightRequests.has(requestKey)) {
      const count = this.requestCounts.get(requestKey) || 0;
      this.requestCounts.set(requestKey, count + 1);
      
      logger.debug(`🔄 [Multiplex] 중복 요청 대기: ${operation} (${count + 1}개 클라이언트)`);
      
      return this.inflightRequests.get(requestKey) as Promise<T>;
    }

    // 새로운 요청 실행
    this.requestCounts.set(requestKey, 1);
    
    const promise = executor()
      .then(result => {
        const clientCount = this.requestCounts.get(requestKey) || 1;
        
        logger.info(`✅ [Multiplex] 요청 완료: ${operation} (${clientCount}개 클라이언트에 전송)`);
        
        return result;
      })
      .catch(error => {
        logger.error(`❌ [Multiplex] 요청 실패: ${operation}`, error);
        throw error;
      })
      .finally(() => {
        // 완료된 요청 정리
        this.inflightRequests.delete(requestKey);
        this.requestCounts.delete(requestKey);
      });
    
    this.inflightRequests.set(requestKey, promise);
    
    return promise;
  }

  /**
   * 멀티플렉싱 통계
   */
  getMultiplexStats(): any {
    const inflightCount = this.inflightRequests.size;
    const totalClients = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);

    return {
      inflightRequests: inflightCount,
      totalClients,
      averageClientsPerRequest: inflightCount > 0 ? Math.round(totalClients / inflightCount) : 0,
      requests: Array.from(this.requestCounts.entries()).map(([key, count]) => ({
        operation: key.split(':')[0],
        clientCount: count
      }))
    };
  }
}

// 싱글톤 인스턴스들
export const batchQueryOptimizer = new BatchQueryOptimizer();
export const multiplexingOptimizer = new MultiplexingOptimizer();

// 통합 최적화 함수
export async function optimizedGraphQLExecution<T>(
  operation: string,
  args: Record<string, any>,
  complexity: number,
  executor: (batchedArgs?: Record<string, any>[]) => Promise<T[] | T>
): Promise<T> {
  // 1. 멀티플렉싱으로 중복 요청 제거
  return multiplexingOptimizer.multiplex(
    operation,
    args,
    async () => {
      // 2. 배치 처리로 성능 최적화
      return batchQueryOptimizer.addToBatch(
        operation,
        args,
        complexity,
        async (batchedArgs: Record<string, any>[]) => {
          const results = await executor(batchedArgs);
          return Array.isArray(results) ? results : [results];
        }
      );
    }
  );
}

/**
 * 통합 최적화 통계
 */
export function getOptimizationStats() {
  return {
    batch: batchQueryOptimizer.getBatchStats(),
    pending: batchQueryOptimizer.getPendingBatchStatus(),
    multiplex: multiplexingOptimizer.getMultiplexStats(),
    timestamp: new Date().toISOString()
  };
}