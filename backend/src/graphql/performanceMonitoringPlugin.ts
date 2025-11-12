/**
 * GraphQL 성능 모니터링 플러그인
 * 기존 코드를 전혀 변경하지 않으면서 성능 데이터만 수집
 */

import type { ApolloServerPlugin } from '@apollo/server';
import logger from '../config/logger';
import type { GraphQLContext } from './types';

interface PerformanceMetrics {
  operationName?: string;
  operationType?: string;
  queryDepth: number;
  fieldCount: number;
  resolverCount: number;
  executionTime: number;
  parseTime: number;
  validationTime: number;
  resolveTime: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
  requestId: string;
}

/**
 * 쿼리 깊이 계산 (재귀적으로 선택 세트 분석)
 */
function calculateQueryDepth(selectionSet: any, currentDepth = 0): number {
  if (!selectionSet?.selections) return currentDepth;
  
  let maxDepth = currentDepth;
  
  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field' && selection.selectionSet) {
      const depth = calculateQueryDepth(selection.selectionSet, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    } else if (selection.kind === 'InlineFragment' && selection.selectionSet) {
      const depth = calculateQueryDepth(selection.selectionSet, currentDepth);
      maxDepth = Math.max(maxDepth, depth);
    } else if (selection.kind === 'FragmentSpread') {
      // Fragment는 현재 깊이로 처리 (실제 정의는 별도 분석 필요)
      maxDepth = Math.max(maxDepth, currentDepth + 1);
    }
  }
  
  return maxDepth;
}

/**
 * 필드 수 계산 (재귀적으로 모든 필드 카운트)
 */
function calculateFieldCount(selectionSet: any): number {
  if (!selectionSet?.selections) return 0;
  
  let count = 0;
  
  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field') {
      count++;
      if (selection.selectionSet) {
        count += calculateFieldCount(selection.selectionSet);
      }
    } else if (selection.kind === 'InlineFragment' && selection.selectionSet) {
      count += calculateFieldCount(selection.selectionSet);
    } else if (selection.kind === 'FragmentSpread') {
      count++; // Fragment는 1개 필드로 계산
    }
  }
  
  return count;
}

/**
 * Apollo Server 성능 모니터링 플러그인
 * 기존 동작에 전혀 영향을 주지 않으면서 성능 데이터만 수집
 */
export const performanceMonitoringPlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart(requestContext) {
    const startTime = Date.now();
    let parseStartTime = 0;
    let validationStartTime = 0;
    let executionStartTime = 0;
    let metrics: Partial<PerformanceMetrics> = {};

    return {
      async didResolveOperation(requestContext) {
        try {
          const { document, operationName } = requestContext;
          
          // 기본 메트릭스 수집
          metrics.operationName = operationName || 'Unknown';
          metrics.operationType = document?.definitions[0]?.kind === 'OperationDefinition' 
            ? (document.definitions[0] as any).operation 
            : 'unknown';
          metrics.requestId = requestContext.contextValue?.requestId || 'unknown';
          
          // 쿼리 구조 분석
          if (document?.definitions[0] && (document.definitions[0] as any).selectionSet) {
            const selectionSet = (document.definitions[0] as any).selectionSet;
            metrics.queryDepth = calculateQueryDepth(selectionSet);
            metrics.fieldCount = calculateFieldCount(selectionSet);
          } else {
            metrics.queryDepth = 0;
            metrics.fieldCount = 0;
          }
          
          // 초기값 설정
          metrics.resolverCount = 0;
          metrics.cacheHits = 0;
          metrics.cacheMisses = 0;
          metrics.errorCount = 0;
          
        } catch (error: any) {
          // 메트릭스 수집 실패해도 원본 요청에 영향 없음
          logger.debug('성능 메트릭스 수집 중 오류 (무시됨):', error.message);
        }
      },

      async parsingDidStart() {
        parseStartTime = Date.now();
        return async () => {
          metrics.parseTime = Date.now() - parseStartTime;
        };
      },

      async validationDidStart() {
        validationStartTime = Date.now();
        return async () => {
          metrics.validationTime = Date.now() - validationStartTime;
        };
      },

      async executionDidStart() {
        executionStartTime = Date.now();
        return {
          executionDidEnd: async () => {
            metrics.resolveTime = Date.now() - executionStartTime;
          },
          
          willResolveField: () => {
            // 리졸버 카운트 증가 (안전하게)
            if (metrics.resolverCount !== undefined) {
              metrics.resolverCount++;
            }
            
            return () => {
              // 필드 해결 완료 후 처리 (필요시)
            };
          }
        };
      },

      async didEncounterErrors(requestContext) {
        // 에러 카운트 (기존 에러 처리에 영향 없음)
        metrics.errorCount = requestContext.errors?.length || 0;
      },

      async willSendResponse(requestContext) {
        try {
          // 전체 실행 시간 계산
          metrics.executionTime = Date.now() - startTime;
          
          // DataLoader 캐시 통계 (가능한 경우)
          const dataLoaders = requestContext.contextValue?.dataLoaders;
          if (dataLoaders) {
            // DataLoader 통계는 구현에 따라 다를 수 있으므로 안전하게 처리
            try {
              // 예시: 실제 DataLoader 구현에 맞게 조정 필요
              metrics.cacheHits = 0; // dataLoaders.getCacheHits?.() || 0;
              metrics.cacheMisses = 0; // dataLoaders.getCacheMisses?.() || 0;
            } catch {
              // DataLoader 통계 수집 실패해도 무시
              metrics.cacheHits = 0;
              metrics.cacheMisses = 0;
            }
          }
          
          // 성능 데이터 로깅 (구조화된 로그)
          const finalMetrics: PerformanceMetrics = {
            operationName: metrics.operationName || 'Unknown',
            operationType: metrics.operationType || 'unknown',
            queryDepth: metrics.queryDepth || 0,
            fieldCount: metrics.fieldCount || 0,
            resolverCount: metrics.resolverCount || 0,
            executionTime: metrics.executionTime || 0,
            parseTime: metrics.parseTime || 0,
            validationTime: metrics.validationTime || 0,
            resolveTime: metrics.resolveTime || 0,
            cacheHits: metrics.cacheHits || 0,
            cacheMisses: metrics.cacheMisses || 0,
            errorCount: metrics.errorCount || 0,
            requestId: metrics.requestId || 'unknown'
          };
          
          // 성능 임계값 기반 로깅
          if (finalMetrics.executionTime > 1000) {
            // 1초 이상 걸린 쿼리는 WARNING 레벨
            logger.warn('🐌 [GraphQL Performance] 느린 쿼리 감지:', finalMetrics);
          } else if (finalMetrics.executionTime > 500) {
            // 500ms 이상 걸린 쿼리는 INFO 레벨
            logger.info('⏱️ [GraphQL Performance] 성능 주의 쿼리:', finalMetrics);
          } else {
            // 정상 성능 쿼리는 DEBUG 레벨
            logger.debug('⚡ [GraphQL Performance] 성능 메트릭스:', finalMetrics);
          }
          
          // 추가적으로 메트릭스를 외부 시스템에 전송 가능
          // 예: Prometheus, DataDog, New Relic 등
          // await sendMetricsToExternalSystem(finalMetrics);
          
        } catch (error: any) {
          // 성능 모니터링 실패해도 원본 응답에 영향 없음
          logger.debug('성능 메트릭스 로깅 중 오류 (무시됨):', error.message);
        }
      }
    };
  }
};

