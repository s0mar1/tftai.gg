// backend/src/utils/batchProcessor.ts

import logger from '../config/logger';

/**
 * 배치 처리를 위한 유틸리티 함수
 * N+1 쿼리 문제를 해결하기 위해 대량의 비동기 작업을 배치로 처리합니다.
 */

export interface BatchProcessorOptions {
  /** 배치 크기 (기본값: 5) */
  batchSize?: number;
  /** 배치 간 딜레이 (ms, 기본값: 100ms) */
  delayBetweenBatches?: number;
  /** 최대 재시도 횟수 (기본값: 3) */
  maxRetries?: number;
  /** 재시도 간 딜레이 (ms, 기본값: 1000ms) */
  retryDelay?: number;
  /** 작업 설명 (로깅용) */
  description?: string;
}

export interface BatchResult<T> {
  /** 성공한 결과들 */
  success: T[];
  /** 실패한 항목들 */
  failed: Array<{
    item: any;
    error: Error;
    retryCount: number;
  }>;
  /** 처리 통계 */
  stats: {
    totalItems: number;
    successCount: number;
    failedCount: number;
    totalBatches: number;
    processingTime: number;
  };
}

/**
 * 배치 처리 함수
 * @param items 처리할 항목들
 * @param processor 각 항목을 처리하는 함수
 * @param options 배치 처리 옵션
 * @returns 배치 처리 결과
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchProcessorOptions = {}
): Promise<BatchResult<R>> {
  const {
    batchSize = 5,
    delayBetweenBatches = 100,
    maxRetries = 3,
    retryDelay = 1000,
    description = '배치 처리'
  } = options;

  const startTime = Date.now();
  const results: R[] = [];
  const failedItems: Array<{ item: T; error: Error; retryCount: number }> = [];

  logger.info(`[${description}] 배치 처리 시작`, {
    totalItems: items.length,
    batchSize,
    maxRetries,
    description
  });

  // 배치별로 처리
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    logger.debug(`[${description}] 배치 ${batchNumber}/${totalBatches} 처리 중`, {
      batchSize: batch.length,
      fromIndex: i,
      toIndex: i + batch.length - 1
    });

    // 배치 내 병렬 처리
    const batchPromises = batch.map(async (item, index) => {
      const globalIndex = i + index;
      return await processItemWithRetry(item, globalIndex, processor, maxRetries, retryDelay, description);
    });

    const batchResults = await Promise.all(batchPromises);

    // 결과 분류
    batchResults.forEach(result => {
      if (result.success && result.data !== undefined) {
        results.push(result.data);
      } else {
        failedItems.push({
          item: result.item,
          error: result.error || new Error('Unknown error'),
          retryCount: result.retryCount
        });
      }
    });

    // 배치 간 딜레이 (마지막 배치가 아닐 경우)
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  const processingTime = Date.now() - startTime;
  const stats = {
    totalItems: items.length,
    successCount: results.length,
    failedCount: failedItems.length,
    totalBatches: Math.ceil(items.length / batchSize),
    processingTime
  };

  logger.info(`[${description}] 배치 처리 완료`, {
    ...stats,
    successRate: `${((stats.successCount / stats.totalItems) * 100).toFixed(1)}%`,
    averageTimePerItem: `${(processingTime / stats.totalItems).toFixed(1)}ms`
  });

  return {
    success: results,
    failed: failedItems,
    stats
  };
}

/**
 * 재시도 로직이 포함된 항목 처리 함수
 */
async function processItemWithRetry<T, R>(
  item: T,
  index: number,
  processor: (item: T) => Promise<R>,
  maxRetries: number,
  retryDelay: number,
  description: string
): Promise<{ success: boolean; data?: R; item: T; error?: Error; retryCount: number }> {
  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await processor(item);
      if (attempt > 0) {
        logger.debug(`[${description}] 항목 ${index} 재시도 성공`, {
          item: typeof item === 'string' ? item.substring(0, 10) : `item_${index}`,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });
      }
      return {
        success: true,
        data: result,
        item,
        retryCount: attempt
      };
    } catch (error) {
      lastError = error as Error;
      retryCount = attempt;

      if (attempt < maxRetries) {
        logger.warn(`[${description}] 항목 ${index} 처리 실패, 재시도 ${attempt + 1}/${maxRetries}`, {
          item: typeof item === 'string' ? item.substring(0, 10) : `item_${index}`,
          error: lastError.message,
          nextRetryIn: `${retryDelay}ms`
        });

        // 재시도 전 대기
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        logger.error(`[${description}] 항목 ${index} 최종 실패`, {
          item: typeof item === 'string' ? item.substring(0, 10) : `item_${index}`,
          error: lastError.message,
          totalRetries: maxRetries + 1
        });
      }
    }
  }

  return {
    success: false,
    item,
    error: lastError!,
    retryCount
  };
}

/**
 * 매치 상세 정보 전용 배치 처리 함수
 * Riot API 특성에 맞게 최적화된 설정을 사용합니다.
 */
export async function processMatchDetailsBatch<T>(
  matchIds: string[],
  region: any,
  processor: (matchId: string, region: any) => Promise<T>
): Promise<BatchResult<T>> {
  return processBatches(
    matchIds,
    (matchId) => processor(matchId, region),
    {
      batchSize: 5, // Riot API 제한 고려하여 보수적 설정
      delayBetweenBatches: 200, // Rate limit 고려
      maxRetries: 2, // 매치 데이터는 실패 시 재시도 2번
      retryDelay: 1000, // 1초 대기
      description: '매치 상세 정보 조회'
    }
  );
}

/**
 * 배치 처리 결과를 안전하게 필터링하는 함수
 * null/undefined 값을 제거하고 타입 안전성을 보장합니다.
 */
export function filterBatchResults<T>(results: (T | null | undefined)[]): T[] {
  return results.filter((result): result is T => result != null);
}

/**
 * 배치 처리 통계를 로깅하는 함수
 */
export function logBatchStats(stats: BatchResult<any>['stats'], description: string): void {
  const successRate = stats.totalItems > 0 ? (stats.successCount / stats.totalItems) * 100 : 0;
  const avgTimePerItem = stats.totalItems > 0 ? stats.processingTime / stats.totalItems : 0;

  logger.info(`[${description}] 배치 처리 완료 통계`, {
    총항목수: stats.totalItems,
    성공개수: stats.successCount,
    실패개수: stats.failedCount,
    총배치수: stats.totalBatches,
    성공률: `${successRate.toFixed(1)}%`,
    총처리시간: `${stats.processingTime}ms`,
    평균처리시간: `${avgTimePerItem.toFixed(1)}ms/item`
  });
}