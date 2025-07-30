/**
 * GraphQL 쿼리 복잡도 모니터링 플러그인 (LOG-ONLY 모드)
 * 쿼리를 차단하지 않고 복잡도만 측정하여 로깅
 */

import type { ApolloServerPlugin, GraphQLRequestContext } from '@apollo/server';
import { visit, DocumentNode, FieldNode, SelectionSetNode } from 'graphql';
import logger from '../config/logger';
import type { GraphQLContext } from './types';

/**
 * 쿼리 복잡도 임계값 설정
 */
const COMPLEXITY_THRESHOLDS = {
  INFO: 50,      // 정보성 로깅
  WARNING: 100,  // 주의 필요
  ALERT: 200,    // 경고 필요
  CRITICAL: 500  // 심각한 복잡도
};

/**
 * 필드별 기본 가중치
 */
const FIELD_WEIGHTS: Record<string, number> = {
  // 기본 쿼리 가중치
  'Query.champions': 5,
  'Query.tierlist': 8,
  'Query.summoner': 3,
  'Query.summonerIntegrated': 15, // 통합 쿼리는 더 무거움
  'Query.serviceInfo': 1,
  
  // 중첩 필드 가중치
  'Champion.ability': 2,
  'Champion.stats': 2,
  'Champion.traits': 1,
  
  'Deck.champions': 3,
  'Deck.traits': 2,
  'Deck.augments': 2,
  'Deck.items': 1,
  
  'SummonerInfo.matches': 10, // 매치 데이터는 무거움
  'SummonerInfo.league': 2,
  
  'MatchInfo.participants': 5,
  'MatchInfo.traits': 3,
  'MatchInfo.units': 4,
  
  // Subscription 가중치
  'Subscription.matchAnalysisUpdated': 8,
  'Subscription.tierlistUpdated': 12,
  
  // Mutation 가중치
  'Mutation.analyzeMatch': 20
};

/**
 * 쿼리 복잡도 계산기
 */
interface ComplexityResult {
  totalComplexity: number;
  maxDepth: number;
  fieldCount: number;
  operationType: string;
  operationName?: string;
  heaviestFields: Array<{
    field: string;
    weight: number;
    depth: number;
  }>;
}

/**
 * 쿼리 문서에서 복잡도 계산
 */
function calculateQueryComplexity(document: DocumentNode, operationName?: string): ComplexityResult {
  let totalComplexity = 0;
  let maxDepth = 0;
  let fieldCount = 0;
  let operationType = 'unknown';
  const heaviestFields: Array<{ field: string; weight: number; depth: number }> = [];
  
  visit(document, {
    OperationDefinition(node) {
      if (!operationName || node.name?.value === operationName) {
        operationType = node.operation;
      }
    },
    
    Field(node, key, parent, path) {
      fieldCount++;
      const currentDepth = path.filter(p => typeof p === 'string').length;
      maxDepth = Math.max(maxDepth, currentDepth);
      
      // 필드 경로 구성
      const fieldPath = buildFieldPath(path, node);
      const fieldWeight = getFieldWeight(fieldPath, node);
      
      totalComplexity += fieldWeight;
      
      // 가중치가 높은 필드 추적
      if (fieldWeight > 2) {
        heaviestFields.push({
          field: fieldPath,
          weight: fieldWeight,
          depth: currentDepth
        });
      }
    }
  });
  
  // 가장 무거운 필드들만 상위 10개 유지
  heaviestFields.sort((a, b) => b.weight - a.weight).splice(10);
  
  return {
    totalComplexity,
    maxDepth,
    fieldCount,
    operationType,
    operationName,
    heaviestFields
  };
}

/**
 * 필드 경로 구성
 */
function buildFieldPath(path: ReadonlyArray<string | number>, node: FieldNode): string {
  const pathStrings = path.filter(p => typeof p === 'string') as string[];
  return pathStrings.join('.') + '.' + node.name.value;
}

/**
 * 필드 가중치 계산
 */
function getFieldWeight(fieldPath: string, node: FieldNode): number {
  // 정확한 경로 매칭
  if (FIELD_WEIGHTS[fieldPath]) {
    return FIELD_WEIGHTS[fieldPath];
  }
  
  // 부분 매칭 시도
  for (const [pattern, weight] of Object.entries(FIELD_WEIGHTS)) {
    if (fieldPath.includes(pattern.split('.').pop() || '')) {
      return weight;
    }
  }
  
  // 기본 가중치
  let baseWeight = 1;
  
  // 배열 필드는 더 무거움
  if (node.selectionSet && hasArrayIndicators(node)) {
    baseWeight += 2;
  }
  
  // 중첩이 깊을수록 가중치 증가
  const depth = fieldPath.split('.').length;
  if (depth > 3) {
    baseWeight += depth - 3;
  }
  
  return baseWeight;
}

/**
 * 배열 필드 감지
 */
function hasArrayIndicators(node: FieldNode): boolean {
  const fieldName = node.name.value;
  const arrayIndicators = ['s', 'list', 'items', 'data'];
  
  return arrayIndicators.some(indicator => 
    fieldName.endsWith(indicator) || fieldName.includes(indicator)
  );
}

/**
 * 복잡도 레벨 결정
 */
function getComplexityLevel(complexity: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (complexity >= COMPLEXITY_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (complexity >= COMPLEXITY_THRESHOLDS.ALERT) return 'HIGH';
  if (complexity >= COMPLEXITY_THRESHOLDS.WARNING) return 'MEDIUM';
  return 'LOW';
}

/**
 * 쿼리 복잡도 모니터링 플러그인 (LOG-ONLY)
 */
export const queryComplexityMonitorPlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async didResolveOperation(requestContext) {
        try {
          const { document, operationName } = requestContext;
          
          if (!document) return;
          
          // 복잡도 계산
          const complexity = calculateQueryComplexity(document, operationName || undefined);
          const level = getComplexityLevel(complexity.totalComplexity);
          
          // 요청 컨텍스트 정보
          const contextInfo = {
            requestId: requestContext.contextValue?.requestId || 'unknown',
            userId: requestContext.contextValue?.user?.id || 'anonymous',
            timestamp: new Date().toISOString()
          };
          
          // 복잡도 데이터
          const complexityData = {
            ...complexity,
            level,
            thresholds: COMPLEXITY_THRESHOLDS,
            ...contextInfo
          };
          
          // 레벨에 따른 로깅
          switch (level) {
            case 'CRITICAL':
              logger.error('🚨 [GraphQL Complexity] 매우 복잡한 쿼리 감지', complexityData);
              break;
            case 'HIGH':
              logger.warn('⚠️ [GraphQL Complexity] 복잡한 쿼리 감지', complexityData);
              break;
            case 'MEDIUM':
              logger.info('📊 [GraphQL Complexity] 중간 복잡도 쿼리', complexityData);
              break;
            case 'LOW':
              logger.debug('✅ [GraphQL Complexity] 단순한 쿼리', complexityData);
              break;
          }
          
          // 통계 수집을 위한 추가 로깅
          if (complexity.totalComplexity > COMPLEXITY_THRESHOLDS.INFO) {
            logger.info('📈 [GraphQL Complexity Stats]', {
              operationName: complexity.operationName || 'Anonymous',
              operationType: complexity.operationType,
              complexity: complexity.totalComplexity,
              depth: complexity.maxDepth,
              fieldCount: complexity.fieldCount,
              topFields: complexity.heaviestFields.slice(0, 5),
              requestId: contextInfo.requestId,
              timestamp: contextInfo.timestamp
            });
          }
          
        } catch (error: any) {
          // 복잡도 계산 실패해도 원본 쿼리 실행에 영향 없음
          logger.debug('쿼리 복잡도 계산 중 오류 (무시됨):', error.message);
        }
      }
    };
  }
};

/**
 * 복잡도 통계 집계를 위한 헬퍼 함수들
 */
export class ComplexityStatsCollector {
  private static stats = new Map<string, {
    count: number;
    totalComplexity: number;
    maxComplexity: number;
    avgComplexity: number;
    lastSeen: number;
  }>();
  
  static recordComplexity(operationName: string, complexity: number): void {
    const existing = this.stats.get(operationName) || {
      count: 0,
      totalComplexity: 0,
      maxComplexity: 0,
      avgComplexity: 0,
      lastSeen: 0
    };
    
    existing.count++;
    existing.totalComplexity += complexity;
    existing.maxComplexity = Math.max(existing.maxComplexity, complexity);
    existing.avgComplexity = existing.totalComplexity / existing.count;
    existing.lastSeen = Date.now();
    
    this.stats.set(operationName, existing);
  }
  
  static getStats(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [operation, stats] of this.stats.entries()) {
      result[operation] = {
        ...stats,
        lastSeenAgo: Date.now() - stats.lastSeen
      };
    }
    
    return result;
  }
  
  static getTopComplexOperations(limit = 10): Array<{ operation: string; avgComplexity: number; maxComplexity: number }> {
    return Array.from(this.stats.entries())
      .map(([operation, stats]) => ({
        operation,
        avgComplexity: stats.avgComplexity,
        maxComplexity: stats.maxComplexity
      }))
      .sort((a, b) => b.avgComplexity - a.avgComplexity)
      .slice(0, limit);
  }
  
  static reset(): void {
    this.stats.clear();
  }
}

/**
 * 복잡도 임계값 동적 조정
 */
export function adjustComplexityThresholds(
  info: number,
  warning: number,
  alert: number,
  critical: number
): void {
  COMPLEXITY_THRESHOLDS.INFO = info;
  COMPLEXITY_THRESHOLDS.WARNING = warning;
  COMPLEXITY_THRESHOLDS.ALERT = alert;
  COMPLEXITY_THRESHOLDS.CRITICAL = critical;
  
  logger.info('복잡도 임계값이 조정되었습니다:', COMPLEXITY_THRESHOLDS);
}