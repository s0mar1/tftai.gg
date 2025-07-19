// backend/src/services/telemetry/distributedTracing.ts - TFT 분산 추적 구현
import { trace, context, SpanStatusCode, SpanKind, Span } from '@opentelemetry/api';
import { 
  recordExternalApiCall, 
  recordCacheHit, 
  recordCacheMiss,
  recordAiAnalysis,
  recordDbQuery,
  recordMatchAnalysis,
  updateRiotApiRateLimit
} from './tftMetrics';
import logger from '../../config/logger';

const tracer = trace.getTracer('tft-meta-analyzer', '1.0.0');

/**
 * 소환사 정보 조회 플로우 추적
 */
export class SummonerFlowTracer {
  private parentSpan: Span;

  constructor(gameName: string, tagLine: string, region: string) {
    this.parentSpan = tracer.startSpan('summoner_lookup_flow', {
      kind: SpanKind.SERVER,
      attributes: {
        'tft.summoner.game_name': gameName,
        'tft.summoner.tag_line': tagLine,
        'tft.summoner.region': region,
        'tft.flow.type': 'summoner_lookup',
      },
    });
  }

  /**
   * 캐시 조회 단계 추적
   */
  async traceCacheLookup<T>(
    cacheKey: string, 
    layer: 'L1' | 'L2', 
    operation: () => Promise<T>
  ): Promise<T | null> {
    const span = tracer.startSpan(`cache_lookup_${layer.toLowerCase()}`, {
      attributes: {
        'tft.cache.layer': layer,
        'tft.cache.key': cacheKey,
        'tft.cache.key_type': this.getCacheKeyType(cacheKey),
      },
    }, this.parentSpan ? trace.setSpan(context.active(), this.parentSpan) : context.active());

    try {
      const result = await operation();
      
      if (result !== null) {
        span.setAttributes({
          'tft.cache.hit': true,
          'tft.cache.result_size': JSON.stringify(result).length,
        });
        recordCacheHit(layer, this.getCacheKeyType(cacheKey));
      } else {
        span.setAttributes({ 'tft.cache.hit': false });
        recordCacheMiss(layer, this.getCacheKeyType(cacheKey));
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Riot API 호출 단계 추적
   */
  async traceRiotApiCall<T>(
    endpoint: string,
    region: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('riot_api_call', {
      kind: SpanKind.CLIENT,
      attributes: {
        'tft.api.type': 'riot',
        'tft.api.endpoint': endpoint,
        'tft.api.region': region,
        'http.method': 'GET',
        'http.url': endpoint,
      },
    }, this.parentSpan ? trace.setSpan(context.active(), this.parentSpan) : context.active());

    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'tft.api.success': true,
        'tft.api.response_time': duration,
        'tft.api.response_size': JSON.stringify(result).length,
      });

      recordExternalApiCall('riot', region, true, duration);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      span.recordException(error);
      span.setAttributes({
        'tft.api.success': false,
        'tft.api.response_time': duration,
        'tft.api.error_type': this.getErrorType(error),
        'tft.api.status_code': error.response?.status || 0,
      });

      // Rate limit 정보 업데이트
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        updateRiotApiRateLimit(region, 0, 0);
        span.setAttributes({
          'tft.api.rate_limit_hit': true,
          'tft.api.retry_after': retryAfter,
        });
      }

      recordExternalApiCall('riot', region, false, duration);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 데이터베이스 쿼리 단계 추적
   */
  async traceDbQuery<T>(
    collection: string,
    operation: string,
    query: Record<string, any>,
    dbOperation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('db_query', {
      attributes: {
        'tft.db.collection': collection,
        'tft.db.operation': operation,
        'tft.db.query': JSON.stringify(query),
      },
    });

    const startTime = Date.now();
    try {
      const result = await dbOperation();
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'tft.db.success': true,
        'tft.db.response_time': duration,
        'tft.db.result_count': Array.isArray(result) ? result.length : 1,
      });

      recordDbQuery(collection, operation, duration, true);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      span.recordException(error as Error);
      span.setAttributes({
        'tft.db.success': false,
        'tft.db.response_time': duration,
        'tft.db.error': (error as Error).message,
      });

      recordDbQuery(collection, operation, duration, false);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 플로우 완료
   */
  finish(success: boolean, errorMessage?: string): void {
    if (success) {
      this.parentSpan.setStatus({ code: SpanStatusCode.OK });
    } else {
      this.parentSpan.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: errorMessage || 'Summoner lookup failed' 
      });
    }
    this.parentSpan.end();
  }

  private getCacheKeyType(key: string): string {
    if (key.includes('summoner')) return 'summoner_data';
    if (key.includes('match')) return 'match_data';
    if (key.includes('league')) return 'league_data';
    return 'other';
  }

  private getErrorType(error: any): string {
    if (error.response?.status === 404) return 'not_found';
    if (error.response?.status === 429) return 'rate_limit';
    if (error.response?.status === 403) return 'forbidden';
    if (error.code === 'ENOTFOUND') return 'dns_error';
    if (error.code === 'ECONNREFUSED') return 'connection_refused';
    if (error.code === 'ETIMEDOUT') return 'timeout';
    return 'unknown';
  }
}

/**
 * AI 분석 요청 플로우 추적
 */
export class AiAnalysisFlowTracer {
  private parentSpan: any;

  constructor(matchId: string, userPuuid: string, analysisType: string) {
    this.parentSpan = tracer.startSpan('ai_analysis_flow', {
      kind: SpanKind.SERVER,
      attributes: {
        'tft.match.id': matchId,
        'tft.user.puuid': userPuuid.substring(0, 8) + '...', // 프라이버시 보호
        'tft.ai.analysis_type': analysisType,
        'tft.flow.type': 'ai_analysis',
      },
    });
  }

  /**
   * 매치 데이터 조회 단계 추적
   */
  async traceMatchDataRetrieval<T>(
    matchId: string,
    region: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('match_data_retrieval', {
      attributes: {
        'tft.match.id': matchId,
        'tft.match.region': region,
      },
    });

    try {
      const result = await operation();
      
      span.setAttributes({
        'tft.match.found': true,
        'tft.match.participants': (result as any)?.info?.participants?.length || 0,
      });

      recordMatchAnalysis(region, 'unknown', 0); // 실제 데이터에서 추출 필요
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 메타 데이터 조회 단계 추적
   */
  async traceMetaDataRetrieval<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('meta_data_retrieval', {
      attributes: {
        'tft.meta.source': 'database',
      },
    });

    try {
      const result = await operation();
      
      span.setAttributes({
        'tft.meta.decks_count': Array.isArray(result) ? result.length : 0,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * AI 모델 호출 단계 추적
   */
  async traceAiModelCall<T>(
    model: string,
    promptLength: number,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('ai_model_call', {
      kind: SpanKind.CLIENT,
      attributes: {
        'tft.ai.model': model,
        'tft.ai.prompt_length': promptLength,
        'tft.api.type': 'google_ai',
      },
    });

    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'tft.ai.success': true,
        'tft.ai.response_time': duration,
        'tft.ai.response_length': JSON.stringify(result).length,
      });

      recordAiAnalysis('match', true, duration);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      span.recordException(error as Error);
      span.setAttributes({
        'tft.ai.success': false,
        'tft.ai.response_time': duration,
        'tft.ai.error': (error as Error).message,
      });

      recordAiAnalysis('match', false, duration);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 분석 결과 저장 단계 추적
   */
  async traceResultSaving<T>(
    cacheKey: string,
    dbSave: boolean,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('analysis_result_saving', {
      attributes: {
        'tft.cache.key': cacheKey,
        'tft.db.save': dbSave,
      },
    });

    try {
      const result = await operation();
      
      span.setAttributes({
        'tft.save.success': true,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 플로우 완료
   */
  finish(success: boolean, errorMessage?: string): void {
    if (success) {
      this.parentSpan.setStatus({ code: SpanStatusCode.OK });
    } else {
      this.parentSpan.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: errorMessage || 'AI analysis failed' 
      });
    }
    this.parentSpan.end();
  }
}

/**
 * 캐시 계층 추적
 */
export class CacheFlowTracer {
  static traceMultiLayerCache<T>(
    key: string,
    l1Operation: () => Promise<T | null>,
    l2Operation: () => Promise<T | null>,
    sourceOperation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('multi_layer_cache_lookup', {
      attributes: {
        'tft.cache.key': key,
        'tft.cache.key_type': this.getCacheKeyType(key),
      },
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        // L1 캐시 시도
        const l1Result = await l1Operation();
        if (l1Result !== null) {
          span.setAttributes({
            'tft.cache.layer_hit': 'L1',
            'tft.cache.total_layers_checked': 1,
          });
          recordCacheHit('L1', this.getCacheKeyType(key));
          span.setStatus({ code: SpanStatusCode.OK });
          return l1Result;
        }
        recordCacheMiss('L1', this.getCacheKeyType(key));

        // L2 캐시 시도
        const l2Result = await l2Operation();
        if (l2Result !== null) {
          span.setAttributes({
            'tft.cache.layer_hit': 'L2',
            'tft.cache.total_layers_checked': 2,
          });
          recordCacheHit('L2', this.getCacheKeyType(key));
          span.setStatus({ code: SpanStatusCode.OK });
          return l2Result;
        }
        recordCacheMiss('L2', this.getCacheKeyType(key));

        // 원본 데이터 소스에서 조회
        const sourceResult = await sourceOperation();
        span.setAttributes({
          'tft.cache.layer_hit': 'source',
          'tft.cache.total_layers_checked': 3,
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return sourceResult;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private static getCacheKeyType(key: string): string {
    if (key.includes('summoner')) return 'summoner_data';
    if (key.includes('match')) return 'match_data';
    if (key.includes('ai_analysis')) return 'ai_analysis';
    if (key.includes('tierlist')) return 'tierlist';
    if (key.includes('meta')) return 'meta_data';
    if (key.includes('translation')) return 'translation';
    return 'other';
  }
}

/**
 * 에러 전파 추적
 */
export class ErrorFlowTracer {
  static traceErrorPropagation(error: Error, context: Record<string, any>): void {
    const span = tracer.startSpan('error_propagation', {
      attributes: {
        'tft.error.name': error.name,
        'tft.error.message': error.message,
        'tft.error.stack': error.stack || '',
        'tft.error.context': JSON.stringify(context),
      },
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.end();
  }
}

/**
 * 스케줄러 작업 추적
 */
export class SchedulerFlowTracer {
  static traceScheduledJob<T>(
    jobName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('scheduled_job', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'tft.scheduler.job_name': jobName,
        'tft.scheduler.execution_time': new Date().toISOString(),
      },
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      const startTime = Date.now();
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        span.setAttributes({
          'tft.scheduler.success': true,
          'tft.scheduler.execution_duration': duration,
        });
        
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        span.recordException(error as Error);
        span.setAttributes({
          'tft.scheduler.success': false,
          'tft.scheduler.execution_duration': duration,
          'tft.scheduler.error': (error as Error).message,
        });
        
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

logger.info('🔍 TFT 분산 추적 시스템 초기화 완료');