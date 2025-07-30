/**
 * GraphQL OpenTelemetry 통합 및 성능 모니터링
 * 분산 추적, 메트릭 수집, 성능 모니터링을 위한 통합 솔루션
 */

import { trace, metrics, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import logger from '../config/logger';
import type { GraphQLContext } from './types';
import { complexityMetricsCollector, type ComplexityMetrics } from './queryComplexity';

// OpenTelemetry tracer와 meter 생성
const tracer = trace.getTracer('tft-graphql', '1.0.0');
const meter = metrics.getMeter('tft-graphql', '1.0.0');

// 메트릭 정의
const graphqlRequestDuration = meter.createHistogram('graphql_request_duration_ms', {
  description: 'GraphQL request duration in milliseconds'
});

const graphqlRequestComplexity = meter.createHistogram('graphql_request_complexity', {
  description: 'GraphQL request complexity score'
});

const graphqlRequestDepth = meter.createHistogram('graphql_request_depth', {
  description: 'GraphQL request depth level'
});

const graphqlRequestsTotal = meter.createCounter('graphql_requests_total', {
  description: 'Total number of GraphQL requests'
});

const graphqlErrorsTotal = meter.createCounter('graphql_errors_total', {
  description: 'Total number of GraphQL errors'
});

const graphqlCacheHitsTotal = meter.createCounter('graphql_cache_hits_total', {
  description: 'Total number of GraphQL cache hits'
});

const graphqlDataLoaderBatchSize = meter.createHistogram('graphql_dataloader_batch_size', {
  description: 'DataLoader batch size distribution'
});

/**
 * GraphQL 성능 추적기
 */
export class GraphQLPerformanceTracker {
  private static requestSpans = new Map<string, any>();

  /**
   * GraphQL 요청 추적 시작
   */
  static startRequestTracing(
    operationName: string, 
    operationType: 'query' | 'mutation' | 'subscription',
    context: GraphQLContext
  ) {
    const span = tracer.startSpan(`graphql.${operationType}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'graphql.operation.name': operationName,
        'graphql.operation.type': operationType,
        'graphql.request.id': context.requestId,
        'http.method': context.req.method,
        'http.url': context.req.url || '',
        'user.agent': context.req.get('user-agent') || ''
      }
    });
    
    this.requestSpans.set(context.requestId, span);
    
    // 카운터 증가
    graphqlRequestsTotal.add(1, {
      operation_name: operationName,
      operation_type: operationType
    });
    
    logger.debug(`🔍 [GraphQL Telemetry] 추적 시작:`, {
      operationName,
      operationType,
      requestId: context.requestId,
      spanId: span.spanContext().spanId
    });
    
    return span;
  }

  /**
   * 필드 리졸버 추적
   */
  static traceFieldResolver<T>(
    fieldName: string,
    parentType: string,
    resolver: () => Promise<T>,
    context: GraphQLContext
  ): Promise<T> {
    const span = tracer.startSpan(`graphql.resolve.${parentType}.${fieldName}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'graphql.field.name': fieldName,
        'graphql.field.parent_type': parentType,
        'graphql.request.id': context.requestId
      }
    });
    
    return span.recordException(async () => {
      try {
        const startTime = Date.now();
        const result = await resolver();
        const duration = Date.now() - startTime;
        
        span.setAttributes({
          'graphql.field.duration_ms': duration,
          'graphql.field.success': true
        });
        
        span.setStatus({ code: SpanStatusCode.OK });
        
        logger.debug(`⚡ [GraphQL Field] ${parentType}.${fieldName} - ${duration}ms`);
        
        return result;
      } catch (error: any) {
        span.setAttributes({
          'graphql.field.success': false,
          'graphql.field.error': error.message
        });
        
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: error.message 
        });
        
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * DataLoader 배치 추적
   */
  static traceDataLoaderBatch(
    loaderName: string,
    batchSize: number,
    cacheHitCount: number = 0
  ) {
    const span = tracer.startSpan(`graphql.dataloader.${loaderName}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'dataloader.name': loaderName,
        'dataloader.batch_size': batchSize,
        'dataloader.cache_hits': cacheHitCount,
        'dataloader.cache_miss': batchSize - cacheHitCount
      }
    });
    
    // DataLoader 배치 크기 메트릭
    graphqlDataLoaderBatchSize.record(batchSize, {
      loader_name: loaderName
    });
    
    // 캐시 히트 메트릭
    if (cacheHitCount > 0) {
      graphqlCacheHitsTotal.add(cacheHitCount, {
        cache_type: 'dataloader',
        loader_name: loaderName
      });
    }
    
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    
    logger.debug(`📊 [DataLoader] ${loaderName}: ${batchSize}개 요청, ${cacheHitCount}개 캐시 히트`);
  }

  /**
   * GraphQL 요청 완료 추적
   */
  static finishRequestTracing(
    context: GraphQLContext,
    complexity: number = 0,
    depth: number = 0,
    cacheHit: boolean = false,
    error?: Error
  ) {
    const span = this.requestSpans.get(context.requestId);
    if (!span) return;
    
    const duration = Date.now() - context.startTime;
    
    // 스팬에 성능 정보 추가
    span.setAttributes({
      'graphql.request.duration_ms': duration,
      'graphql.request.complexity': complexity,
      'graphql.request.depth': depth,
      'graphql.request.cache_hit': cacheHit
    });
    
    // 메트릭 기록 (안전한 attributes 접근)
    const attributes = span.attributes || {};
    graphqlRequestDuration.record(duration, {
      operation_name: attributes['graphql.operation.name'] || 'unknown',
      operation_type: attributes['graphql.operation.type'] || 'unknown',
      cache_hit: cacheHit.toString()
    });
    
    graphqlRequestComplexity.record(complexity);
    graphqlRequestDepth.record(depth);
    
    if (cacheHit) {
      graphqlCacheHitsTotal.add(1, {
        cache_type: 'response'
      });
    }
    
    if (error) {
      span.setAttributes({
        'graphql.request.error': error.message,
        'graphql.request.success': false
      });
      
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      
      // 에러 메트릭 (안전한 attributes 접근)
      const attributes = span.attributes || {};
      graphqlErrorsTotal.add(1, {
        operation_name: attributes['graphql.operation.name'] || 'unknown',
        error_type: error.constructor.name
      });
      
      logger.error(`❌ [GraphQL Request] 실패:`, {
        requestId: context.requestId,
        duration,
        error: error.message
      });
    } else {
      span.setAttributes({
        'graphql.request.success': true
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      
      logger.info(`✅ [GraphQL Request] 성공:`, {
        requestId: context.requestId,
        duration,
        complexity,
        depth,
        cacheHit
      });
    }
    
    span.end();
    this.requestSpans.delete(context.requestId);
  }

  /**
   * 캐시 성능 추적
   */
  static traceCacheOperation(
    operation: 'get' | 'set' | 'invalidate',
    cacheType: 'response' | 'dataloader' | 'redis',
    key: string,
    hit: boolean = false,
    duration: number = 0
  ) {
    const span = tracer.startSpan(`cache.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'cache.operation': operation,
        'cache.type': cacheType,
        'cache.key': key.substring(0, 50) + (key.length > 50 ? '...' : ''),
        'cache.hit': hit,
        'cache.duration_ms': duration
      }
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }
}

/**
 * 성능 분석기
 */
export class GraphQLPerformanceAnalyzer {
  private static performanceData: Array<{
    timestamp: string;
    operationName: string;
    duration: number;
    complexity: number;
    depth: number;
    cacheHit: boolean;
  }> = [];

  /**
   * 성능 데이터 기록
   */
  static recordPerformance(
    operationName: string,
    duration: number,
    complexity: number,
    depth: number,
    cacheHit: boolean
  ) {
    this.performanceData.push({
      timestamp: new Date().toISOString(),
      operationName,
      duration,
      complexity,
      depth,
      cacheHit
    });
    
    // 최근 1000개만 유지
    if (this.performanceData.length > 1000) {
      this.performanceData.shift();
    }
  }

  /**
   * 성능 통계 생성
   */
  static getPerformanceStats() {
    if (this.performanceData.length === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        averageComplexity: 0,
        cacheHitRate: 0,
        slowQueries: []
      };
    }
    
    const totalRequests = this.performanceData.length;
    const totalDuration = this.performanceData.reduce((sum, data) => sum + data.duration, 0);
    const totalComplexity = this.performanceData.reduce((sum, data) => sum + data.complexity, 0);
    const cacheHits = this.performanceData.filter(data => data.cacheHit).length;
    
    const slowQueries = this.performanceData
      .filter(data => data.duration > 1000) // 1초 이상
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    return {
      totalRequests,
      averageDuration: Math.round(totalDuration / totalRequests),
      averageComplexity: Math.round(totalComplexity / totalRequests),
      cacheHitRate: Math.round((cacheHits / totalRequests) * 100),
      slowQueries: slowQueries.map(q => ({
        operationName: q.operationName,
        duration: q.duration,
        complexity: q.complexity,
        timestamp: q.timestamp
      }))
    };
  }

  /**
   * 실시간 성능 모니터링 알림
   */
  static checkPerformanceThresholds() {
    const recentData = this.performanceData.slice(-10); // 최근 10개 요청
    if (recentData.length < 10) return;
    
    const averageDuration = recentData.reduce((sum, data) => sum + data.duration, 0) / 10;
    const slowQueryCount = recentData.filter(data => data.duration > 2000).length;
    
    if (averageDuration > 1000) {
      logger.warn(`⚠️ [GraphQL Performance] 평균 응답시간 증가: ${Math.round(averageDuration)}ms`);
    }
    
    if (slowQueryCount >= 3) {
      logger.warn(`⚠️ [GraphQL Performance] 느린 쿼리 다발 감지: ${slowQueryCount}/10개`);
    }
  }
}

/**
 * OpenTelemetry 메트릭 내보내기 헬퍼
 */
export function getGraphQLMetrics() {
  const performanceStats = GraphQLPerformanceAnalyzer.getPerformanceStats();
  const complexityMetrics = complexityMetricsCollector.getMetrics(50);
  
  return {
    performance: performanceStats,
    complexity: {
      averageComplexity: complexityMetricsCollector.getAverageComplexity(),
      highComplexityQueries: complexityMetricsCollector.getHighComplexityQueries(),
      recentMetrics: complexityMetrics
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * 성능 모니터링 미들웨어 (Apollo Server 플러그인용)
 */
export const graphqlTelemetryPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation(requestContext: any) {
        const operationName = requestContext.operationName || 'Unknown';
        const operationType = requestContext.operation?.operation || 'query';
        
        // 추적 시작
        GraphQLPerformanceTracker.startRequestTracing(
          operationName,
          operationType,
          requestContext.contextValue
        );
      },
      
      async willSendResponse(requestContext: any) {
        const context = requestContext.contextValue as GraphQLContext;
        const duration = Date.now() - context.startTime;
        const analysis = (requestContext.request as any).complexityAnalysis;
        const hasErrors = requestContext.errors && requestContext.errors.length > 0;
        
        // 성능 데이터 기록
        if (analysis) {
          GraphQLPerformanceAnalyzer.recordPerformance(
            requestContext.operationName || 'Unknown',
            duration,
            analysis.complexity,
            analysis.depth,
            false // 캐시 히트 정보는 추후 추가
          );
        }
        
        // 추적 완료
        GraphQLPerformanceTracker.finishRequestTracing(
          context,
          analysis?.complexity || 0,
          analysis?.depth || 0,
          false,
          hasErrors ? requestContext.errors[0] : undefined
        );
        
        // 성능 임계값 체크
        GraphQLPerformanceAnalyzer.checkPerformanceThresholds();
      }
    };
  }
};

