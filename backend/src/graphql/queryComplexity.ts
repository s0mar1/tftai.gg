/**
 * GraphQL 쿼리 복잡도 분석 및 제한 시스템
 * DOS 공격 방지 및 성능 최적화를 위한 쿼리 복잡도 관리
 */

import { 
  createComplexityRule,
  getComplexity,
  fieldExtensionsEstimator,
  simpleEstimator,
  ComplexityEstimatorArgs 
} from 'graphql-query-complexity';
import { ValidationRule, DocumentNode } from 'graphql';
import logger from '../config/logger';

// 환경변수 기반 설정
const MAX_COMPLEXITY = parseInt(process.env.GRAPHQL_MAX_COMPLEXITY || '100', 10);
const MAX_DEPTH = parseInt(process.env.GRAPHQL_MAX_DEPTH || '10', 10);
const INTROSPECTION_COMPLEXITY = parseInt(process.env.GRAPHQL_INTROSPECTION_COMPLEXITY || '200', 10);

/**
 * 필드별 복잡도 매핑
 * 각 GraphQL 필드의 기본 복잡도를 정의합니다.
 */
const FIELD_COMPLEXITY_MAP: Record<string, number> = {
  // Query 복잡도
  'Query.champions': 3,
  'Query.tierlist': 5,
  'Query.summoner': 2,
  'Query.serviceInfo': 1,
  
  // Champion 관련 필드
  'ChampionData.name': 1,
  'ChampionData.cost': 1,
  'ChampionData.traits': 1,
  'ChampionData.ability': 2,
  'ChampionData.stats': 2,
  
  // Tierlist 관련 필드
  'Deck.champions': 2,
  'Deck.traits': 2,
  'Deck.items': 2,
  
  // Summoner 관련 필드
  'SummonerInfo.tier': 1,
  'SummonerInfo.rank': 1,
  'SummonerInfo.wins': 1,
  'SummonerInfo.losses': 1,
  
  // Subscription 복잡도 (실시간 데이터)
  'Subscription.matchAnalysisUpdated': 4,
  'Subscription.tierlistUpdated': 6,
  'Subscription.summonerDataUpdated': 3,
  'Subscription.systemStatus': 2,
  
  // Mutation 복잡도
  'Mutation.analyzeMatch': 8
};

/**
 * 커스텀 복잡도 추정기
 */
function customComplexityEstimator(args: ComplexityEstimatorArgs): number {
  const { field, args: fieldArgs, childComplexity } = args;
  const fieldKey = `${field.parentType?.name}.${field.name}`;
  
  // 필드별 기본 복잡도 조회
  let baseComplexity = FIELD_COMPLEXITY_MAP[fieldKey] || 1;
  
  // 특별한 경우 처리
  if (field.name === 'tierlist' && fieldArgs?.language) {
    // 다국어 지원으로 인한 추가 복잡도
    baseComplexity += 1;
  }
  
  if (field.name === 'summoner') {
    // 실시간 데이터 조회로 인한 추가 복잡도
    baseComplexity += 1;
  }
  
  // 배열 필드의 경우 예상 개수를 반영
  if (field.name === 'champions' || field.name === 'decks') {
    // 배열의 경우 자식 복잡도에 예상 개수를 곱함
    const estimatedArraySize = field.name === 'champions' ? 60 : 50;
    return baseComplexity + (childComplexity * Math.min(estimatedArraySize, 10));
  }
  
  return baseComplexity + childComplexity;
}

/**
 * 쿼리 깊이 계산기
 */
function calculateQueryDepth(document: DocumentNode): number {
  let maxDepth = 0;
  
  function visitSelectionSet(selectionSet: any, currentDepth: number): void {
    if (currentDepth > maxDepth) {
      maxDepth = currentDepth;
    }
    
    if (selectionSet?.selections) {
      for (const selection of selectionSet.selections) {
        if (selection.selectionSet) {
          visitSelectionSet(selection.selectionSet, currentDepth + 1);
        }
      }
    }
  }
  
  if (document.definitions) {
    for (const definition of document.definitions) {
      if (definition.kind === 'OperationDefinition' && definition.selectionSet) {
        visitSelectionSet(definition.selectionSet, 1);
      }
    }
  }
  
  return maxDepth;
}

/**
 * 복잡도 검증 규칙 생성
 */
export function createComplexityValidationRule(): ValidationRule {
  return createComplexityRule({
    maximumComplexity: MAX_COMPLEXITY,
    estimators: [
      fieldExtensionsEstimator(),
      customComplexityEstimator,
      simpleEstimator({ defaultComplexity: 1 })
    ],
    
    onComplete: (complexity: number, context: any) => {
      const operationName = context?.request?.operationName || 'Unknown';
      
      if (complexity > MAX_COMPLEXITY * 0.8) {
        logger.warn(`⚠️ [Query Complexity] 높은 복잡도 쿼리 감지:`, {
          operationName,
          complexity,
          maxComplexity: MAX_COMPLEXITY,
          threshold: MAX_COMPLEXITY * 0.8,
          clientIP: context?.request?.ip
        });
      } else {
        logger.debug(`📊 [Query Complexity] 쿼리 복잡도:`, {
          operationName,
          complexity
        });
      }
    }
  });
}

/**
 * 깊이 제한 검증 규칙
 */
export function createDepthLimitRule(): ValidationRule {
  return (context) => ({
    Document: {
      enter(node: DocumentNode) {
        const depth = calculateQueryDepth(node);
        
        if (depth > MAX_DEPTH) {
          const operationName = node.definitions.find(
            def => def.kind === 'OperationDefinition'
          )?.name?.value || 'Unknown';
          
          logger.error(`❌ [Query Depth] 깊이 제한 초과:`, {
            operationName,
            depth,
            maxDepth: MAX_DEPTH
          });
          
          context.reportError(
            new Error(`Query depth of ${depth} exceeds maximum depth of ${MAX_DEPTH}`)
          );
        } else {
          logger.debug(`📏 [Query Depth] 쿼리 깊이: ${depth}`);
        }
      }
    }
  });
}

/**
 * 복잡도 분석 유틸리티
 */
export class QueryComplexityAnalyzer {
  /**
   * 쿼리 복잡도 계산
   */
  static analyzeQuery(document: DocumentNode, variableValues?: Record<string, any>): {
    complexity: number;
    depth: number;
    analysis: {
      isHighComplexity: boolean;
      isDeepQuery: boolean;
      shouldCache: boolean;
      suggestedTTL: number;
      warnings: string[];
    };
  } {
    const complexity = getComplexity({
      estimators: [
        fieldExtensionsEstimator(),
        customComplexityEstimator,
        simpleEstimator({ defaultComplexity: 1 })
      ],
      query: document,
      variables: variableValues
    });
    
    const depth = calculateQueryDepth(document);
    
    const analysis = {
      isHighComplexity: complexity > MAX_COMPLEXITY * 0.7,
      isDeepQuery: depth > MAX_DEPTH * 0.7,
      shouldCache: complexity >= 3, // 복잡도 3 이상은 캐시 권장
      suggestedTTL: this.calculateSuggestedTTL(complexity, depth),
      warnings: this.generateWarnings(complexity, depth)
    };
    
    return {
      complexity,
      depth,
      analysis
    };
  }
  
  /**
   * 복잡도 기반 권장 TTL 계산
   */
  private static calculateSuggestedTTL(complexity: number, depth: number): number {
    const baseTime = 300; // 5분 기본
    const complexityMultiplier = Math.log(complexity + 1) * 60; // 복잡도가 높을수록 더 길게
    const depthMultiplier = depth * 30; // 깊이가 깊을수록 더 길게
    
    return Math.min(baseTime + complexityMultiplier + depthMultiplier, 3600); // 최대 1시간
  }
  
  /**
   * 경고 메시지 생성
   */
  private static generateWarnings(complexity: number, depth: number): string[] {
    const warnings: string[] = [];
    
    if (complexity > MAX_COMPLEXITY * 0.8) {
      warnings.push(`높은 복잡도 (${complexity}/${MAX_COMPLEXITY}): 성능 저하가 예상됩니다`);
    }
    
    if (depth > MAX_DEPTH * 0.7) {
      warnings.push(`깊은 쿼리 (${depth}/${MAX_DEPTH}): 메모리 사용량이 증가할 수 있습니다`);
    }
    
    if (complexity > 10 && depth > 5) {
      warnings.push('복잡하고 깊은 쿼리: DataLoader와 캐시 최적화를 권장합니다');
    }
    
    return warnings;
  }
  
  /**
   * 복잡도 통계
   */
  static getComplexityStats(): any {
    return {
      limits: {
        maxComplexity: MAX_COMPLEXITY,
        maxDepth: MAX_DEPTH,
        introspectionComplexity: INTROSPECTION_COMPLEXITY
      },
      fieldComplexities: FIELD_COMPLEXITY_MAP,
      thresholds: {
        cacheRecommendation: 3,
        highComplexityWarning: MAX_COMPLEXITY * 0.7,
        maxComplexityError: MAX_COMPLEXITY,
        deepQueryWarning: MAX_DEPTH * 0.7,
        maxDepthError: MAX_DEPTH
      }
    };
  }
}

/**
 * 복잡도 관련 메트릭스
 */
export interface ComplexityMetrics {
  operationName: string;
  complexity: number;
  depth: number;
  executionTime: number;
  timestamp: string;
  cacheHit: boolean;
  warnings: string[];
}

class ComplexityMetricsCollector {
  private metrics: ComplexityMetrics[] = [];
  private readonly MAX_METRICS = 1000;
  
  recordMetrics(metrics: ComplexityMetrics): void {
    this.metrics.push(metrics);
    
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift(); // 오래된 메트릭스 제거
    }
    
    logger.debug(`📈 [Complexity Metrics] 기록:`, metrics);
  }
  
  getMetrics(limit: number = 50): ComplexityMetrics[] {
    return this.metrics.slice(-limit).reverse();
  }
  
  getAverageComplexity(): number {
    if (this.metrics.length === 0) return 0;
    
    const sum = this.metrics.reduce((acc, metric) => acc + metric.complexity, 0);
    return sum / this.metrics.length;
  }
  
  getHighComplexityQueries(): ComplexityMetrics[] {
    return this.metrics.filter(m => m.complexity > MAX_COMPLEXITY * 0.7);
  }
}

export const complexityMetricsCollector = new ComplexityMetricsCollector();

// 설정값들을 외부에서 접근 가능하도록 내보내기
export {
  MAX_COMPLEXITY,
  MAX_DEPTH,
  INTROSPECTION_COMPLEXITY,
  FIELD_COMPLEXITY_MAP
};