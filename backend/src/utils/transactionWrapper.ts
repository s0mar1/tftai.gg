/**
 * MongoDB 트랜잭션 래퍼 유틸리티
 * 기존 코드를 변경하지 않고 트랜잭션 기능을 추가하는 안전한 래퍼
 */

import mongoose, { ClientSession } from 'mongoose';
import logger from '../config/logger';

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  executionTime: number;
}

export interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeoutMs?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

const DEFAULT_OPTIONS: Required<TransactionOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeoutMs: 30000, // 30초
  logLevel: 'info'
};

/**
 * 트랜잭션 안전 래퍼 함수
 * 기존 함수를 변경하지 않고 트랜잭션으로 실행할 수 있게 해주는 래퍼
 */
export async function withTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
  options: TransactionOptions = {}
): Promise<TransactionResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  
  // MongoDB 연결 상태 확인
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB 연결이 활성화되지 않았습니다');
    if (opts.logLevel !== 'none') {
      logger.error('[Transaction Wrapper] MongoDB 연결 상태 확인 실패', { error: error.message });
    }
    return {
      success: false,
      error,
      executionTime: Date.now() - startTime
    };
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    const session = await mongoose.startSession();
    
    try {
      if (opts.logLevel === 'debug') {
        logger.debug(`[Transaction Wrapper] 트랜잭션 시작 (시도 ${attempt}/${opts.maxRetries})`);
      }
      
      // 트랜잭션 시작
      session.startTransaction({
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary'
      });

      // 타임아웃 설정
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`트랜잭션 타임아웃 (${opts.timeoutMs}ms)`));
        }, opts.timeoutMs);
      });

      // 실제 작업 실행 (타임아웃과 함께)
      const result = await Promise.race([
        operation(session),
        timeoutPromise
      ]);

      // 트랜잭션 커밋
      await session.commitTransaction();
      
      const executionTime = Date.now() - startTime;
      
      if (opts.logLevel === 'info' || opts.logLevel === 'debug') {
        logger.info(`[Transaction Wrapper] ✅ 트랜잭션 성공 (${executionTime}ms)`);
      }

      return {
        success: true,
        data: result,
        executionTime
      };

    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 트랜잭션 롤백
      try {
        await session.abortTransaction();
        if (opts.logLevel === 'debug') {
          logger.debug('[Transaction Wrapper] 트랜잭션 롤백 완료');
        }
      } catch (rollbackError: any) {
        if (opts.logLevel !== 'none') {
          logger.warn('[Transaction Wrapper] 트랜잭션 롤백 중 경고', { 
            rollbackError: rollbackError.message 
          });
        }
      }

      // 재시도 가능한 에러인지 확인
      const isRetryableError = (
        lastError.message.includes('WriteConflict') ||
        lastError.message.includes('TransientTransactionError') ||
        lastError.message.includes('UnknownTransactionCommitResult') ||
        lastError.message.includes('network') ||
        lastError.message.includes('timeout')
      );

      if (attempt < opts.maxRetries && isRetryableError) {
        if (opts.logLevel !== 'none') {
          logger.warn(`[Transaction Wrapper] 재시도 가능한 에러 발생 (시도 ${attempt}/${opts.maxRetries})`, {
            error: lastError.message,
            nextRetryIn: `${opts.retryDelay}ms`
          });
        }
        
        // 지수 백오프로 재시도 대기
        const delay = opts.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 재시도 불가능하거나 최대 재시도 횟수 도달
        if (opts.logLevel !== 'none') {
          logger.error(`[Transaction Wrapper] ❌ 트랜잭션 실패 (최종)`, {
            attempt,
            maxRetries: opts.maxRetries,
            error: lastError.message,
            isRetryable: isRetryableError
          });
        }
        break;
      }
    } finally {
      // 세션 종료
      await session.endSession();
    }
  }

  return {
    success: false,
    error: lastError || new Error('알 수 없는 트랜잭션 에러'),
    executionTime: Date.now() - startTime
  };
}

/**
 * 배치 트랜잭션 래퍼 (대량의 작업을 하나의 트랜잭션으로 처리)
 * DeckAnalyzer의 여러 DeckTier 업데이트를 하나의 트랜잭션으로 묶을 때 사용
 */
export async function withBatchTransaction<T>(
  operations: Array<(session: ClientSession) => Promise<T>>,
  options: TransactionOptions = {}
): Promise<TransactionResult<T[]>> {
  return withTransaction(async (session: ClientSession) => {
    const results: T[] = [];
    
    for (const operation of operations) {
      const result = await operation(session);
      results.push(result);
    }
    
    return results;
  }, options);
}

/**
 * 트랜잭션 통계 수집기 (성능 모니터링용)
 */
export interface TransactionStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageExecutionTime: number;
  totalRetries: number;
}

class TransactionStatsCollector {
  private stats: TransactionStats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    averageExecutionTime: 0,
    totalRetries: 0
  };

  recordTransaction(result: TransactionResult<any>, retries: number = 0): void {
    this.stats.totalTransactions++;
    
    if (result.success) {
      this.stats.successfulTransactions++;
    } else {
      this.stats.failedTransactions++;
    }
    
    this.stats.totalRetries += retries;
    
    // 평균 실행 시간 업데이트
    const totalTime = this.stats.averageExecutionTime * (this.stats.totalTransactions - 1) + result.executionTime;
    this.stats.averageExecutionTime = totalTime / this.stats.totalTransactions;
  }

  getStats(): TransactionStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageExecutionTime: 0,
      totalRetries: 0
    };
  }
}

export const transactionStats = new TransactionStatsCollector();

/**
 * 트랜잭션 래퍼의 성능 모니터링 데코레이터
 */
export function withTransactionMonitoring<T>(
  operation: (session: ClientSession) => Promise<T>,
  options: TransactionOptions = {}
): Promise<TransactionResult<T>> {
  let retryCount = 0;
  
  const monitoredOperation = async (session: ClientSession) => {
    return operation(session);
  };

  const originalMaxRetries = options.maxRetries || DEFAULT_OPTIONS.maxRetries;
  
  return withTransaction(monitoredOperation, options).then(result => {
    // 재시도 횟수 계산 (실패한 경우 최대 재시도 횟수만큼 시도했을 것으로 가정)
    retryCount = result.success ? 0 : originalMaxRetries - 1;
    
    // 통계 기록
    transactionStats.recordTransaction(result, retryCount);
    
    return result;
  });
}