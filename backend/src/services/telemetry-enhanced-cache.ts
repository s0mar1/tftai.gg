// backend/src/services/telemetry-enhanced-cache.ts - 텔레메트리 강화된 캐시 서비스
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { trace, context } from '@opentelemetry/api';
import { CacheFlowTracer } from './telemetry/distributedTracing';
import { recordCacheHit, recordCacheMiss } from './telemetry/tftMetrics';
// import { trackCacheOperation } from '../middlewares/telemetryMiddleware'; // 임시 비활성화
import logger from '../config/logger';
import { CACHE_TTL, validateTTL } from '../config/cacheTTL';

const REDIS_URL = process.env.UPSTASH_REDIS_URL;
const tracer = trace.getTracer('tft-meta-analyzer', '1.0.0');

/**
 * 텔레메트리가 강화된 캐시 관리자
 * 기존 CacheManager를 확장하여 OpenTelemetry 추적 기능 추가
 */
export class TelemetryEnhancedCacheManager {
  private l1Cache: NodeCache;
  private l2Cache: Redis | null = null;
  private isL2CacheConnected: boolean = false;

  constructor() {
    this.l1Cache = new NodeCache({
      stdTTL: CACHE_TTL.DEFAULT,
      checkperiod: 120,
      useClones: false,
    });
    logger.info('🔍 텔레메트리 강화된 L1 Memory Cache 초기화 완료');
  }

  async connect(): Promise<void> {
    const span = tracer.startSpan('cache_initialization');
    
    try {
      if (this.isL2CacheConnected) {
        logger.info('Redis is already connected.');
        return;
      }

      if (REDIS_URL) {
        logger.info('L2 Redis Cache 연결 시도 중...');
        this.l2Cache = new Redis(REDIS_URL, {
          tls: { rejectUnauthorized: false },
          maxRetriesPerRequest: 3,
          connectTimeout: 10000,
          lazyConnect: false,
        });

        this.l2Cache.on('error', (err: any) => {
          logger.error('L2 Redis Cache 에러:', err.message);
          this.isL2CacheConnected = false;
          span.recordException(err);
        });

        const pingResponse = await this.l2Cache.ping();
        if (pingResponse !== 'PONG') {
          throw new Error('Redis 연결 실패: PING 명령 실패');
        }
        
        this.isL2CacheConnected = true;
        span.setAttributes({
          'tft.cache.l2_connected': true,
          'tft.cache.redis_url': REDIS_URL.substring(0, 30) + '...',
        });
        logger.info('🔍 L2 Redis Cache 연결 성공!');
      } else {
        span.setAttributes({
          'tft.cache.l2_connected': false,
          'tft.cache.redis_disabled': true,
        });
        logger.warn('UPSTASH_REDIS_URL이 설정되지 않았습니다. L2 Redis Cache가 비활성화됩니다.');
      }
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 멀티 레이어 캐시 조회 (텔레메트리 추적 포함)
   */
  async get<T>(key: string): Promise<T | null> {
    return CacheFlowTracer.traceMultiLayerCache<T>(
      key,
      async () => {
        // L1 캐시 조회
        const l1Value = this.l1Cache.get<T>(key);
        if (l1Value) {
          logger.debug(`Cache HIT (L1) for key: ${key}`);
          recordCacheHit('L1', this.getCacheKeyType(key));
          // trackCacheOperation('get', 'L1', key, true); // 임시 비활성화
          return l1Value;
        }
        
        recordCacheMiss('L1', this.getCacheKeyType(key));
        // trackCacheOperation('get', 'L1', key, false); // 임시 비활성화
        return null;
      },
      async () => {
        // L2 캐시 조회
        if (this.l2Cache && this.isL2CacheConnected) {
          try {
            const l2Value = await this.l2Cache.get(key);
            if (l2Value) {
              logger.debug(`Cache HIT (L2) for key: ${key}`);
              const parsedValue = JSON.parse(l2Value) as T;
              
              // L2에서 찾은 데이터를 L1에 저장
              this.l1Cache.set(key, parsedValue);
              
              recordCacheHit('L2', this.getCacheKeyType(key));
              // trackCacheOperation('get', 'L2', key, true); // 임시 비활성화
              return parsedValue;
            }
          } catch (error) {
            logger.warn(`L2 Cache GET 에러 for key ${key}:`, (error as Error).message);
          }
        }
        
        recordCacheMiss('L2', this.getCacheKeyType(key));
// trackCacheOperation('get', 'L2', key, false);
        return null;
      },
      async () => {
        // 원본 데이터 소스 (실제로는 null 반환)
        logger.debug(`Cache MISS for key: ${key}`);
        return null;
      }
    );
  }

  /**
   * 멀티 레이어 캐시 저장 (텔레메트리 추적 포함)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const span = tracer.startSpan('cache_set_operation', {
      attributes: {
        'tft.cache.key': key,
        'tft.cache.key_type': this.getCacheKeyType(key),
        'tft.cache.ttl': ttlSeconds || CACHE_TTL.DEFAULT,
        'tft.cache.value_size': JSON.stringify(value).length,
      },
    });

    try {
      const ttl = validateTTL(ttlSeconds);

      // L1 캐시에 저장
      this.l1Cache.set(key, value, ttl);
      logger.debug(`Cache SET (L1) for key: ${key} with TTL: ${ttl}s`);
// trackCacheOperation('set', 'L1', key, true);

      // L2 캐시에 저장
      if (this.l2Cache && this.isL2CacheConnected) {
        try {
          const stringValue = JSON.stringify(value);
          await this.l2Cache.setex(key, ttl, stringValue);
          logger.debug(`Cache SET (L2) for key: ${key} with TTL: ${ttl}s`);
// trackCacheOperation('set', 'L2', key, true);
          
          span.setAttributes({
            'tft.cache.l2_set_success': true,
          });
        } catch (error) {
          logger.warn(`L2 Cache SET 에러 for key ${key}:`, (error as Error).message);
          span.recordException(error as Error);
// trackCacheOperation('set', 'L2', key, false);
        }
      }

      span.setAttributes({
        'tft.cache.operation_success': true,
      });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 캐시 삭제 (텔레메트리 추적 포함)
   */
  async del(key: string): Promise<void> {
    const span = tracer.startSpan('cache_delete_operation', {
      attributes: {
        'tft.cache.key': key,
        'tft.cache.key_type': this.getCacheKeyType(key),
      },
    });

    try {
      // L2 캐시에서 삭제
      if (this.l2Cache && this.isL2CacheConnected) {
        try {
          await this.l2Cache.del(key);
// trackCacheOperation('del', 'L2', key, true);
        } catch (error) {
          logger.warn(`L2 Cache DEL 에러 for key ${key}:`, (error as Error).message);
          span.recordException(error as Error);
// trackCacheOperation('del', 'L2', key, false);
        }
      }

      // L1 캐시에서 삭제
      this.l1Cache.del(key);
// trackCacheOperation('del', 'L1', key, true);
      logger.debug(`Cache DEL for key: ${key}`);

      span.setAttributes({
        'tft.cache.operation_success': true,
      });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 캐시 통계 조회 (텔레메트리 포함)
   */
  getStats() {
    const span = tracer.startSpan('cache_stats_retrieval');
    
    try {
      const stats = {
        l1CacheStats: this.l1Cache.getStats(),
        l2CacheConnected: this.isL2CacheConnected,
        telemetryEnabled: true,
      };
      
      span.setAttributes({
        'tft.cache.l1_keys': stats.l1CacheStats.keys,
        'tft.cache.l1_hits': stats.l1CacheStats.hits,
        'tft.cache.l1_misses': stats.l1CacheStats.misses,
        'tft.cache.l1_hit_rate': stats.l1CacheStats.hits / (stats.l1CacheStats.hits + stats.l1CacheStats.misses),
        'tft.cache.l2_connected': stats.l2CacheConnected,
      });
      
      return stats;
    } finally {
      span.end();
    }
  }

  /**
   * 캐시 키 타입 분류
   */
  private getCacheKeyType(key: string): string {
    if (key.includes('summoner')) return 'summoner_data';
    if (key.includes('match')) return 'match_data';
    if (key.includes('ai_analysis')) return 'ai_analysis';
    if (key.includes('tierlist')) return 'tierlist';
    if (key.includes('meta')) return 'meta_data';
    if (key.includes('translation')) return 'translation';
    if (key.includes('tft_data')) return 'tft_static_data';
    return 'other';
  }

  /**
   * 캐시 워밍업 (자주 사용되는 데이터 사전 로드)
   */
  async warmupCache(): Promise<void> {
    const span = tracer.startSpan('cache_warmup');
    
    try {
      logger.info('🔍 캐시 워밍업 시작...');
      
      // TFT 정적 데이터 워밍업
      const staticDataKeys = [
        'tft_data_ko',
        'tft_data_en',
        'tft_data_ja',
        'tft_champions_ko',
        'tft_items_ko',
        'tft_traits_ko',
      ];
      
      const warmupResults = await Promise.allSettled(
        staticDataKeys.map(key => this.get(key))
      );
      
      const successCount = warmupResults.filter(r => r.status === 'fulfilled').length;
      
      span.setAttributes({
        'tft.cache.warmup_keys_total': staticDataKeys.length,
        'tft.cache.warmup_keys_success': successCount,
        'tft.cache.warmup_success_rate': successCount / staticDataKeys.length,
      });
      
      logger.info(`🔍 캐시 워밍업 완료: ${successCount}/${staticDataKeys.length} 성공`);
    } catch (error) {
      span.recordException(error as Error);
      logger.error('캐시 워밍업 실패:', error);
    } finally {
      span.end();
    }
  }

  /**
   * 캐시 플래시 (텔레메트리 추적 포함)
   */
  async flush(): Promise<void> {
    const span = tracer.startSpan('cache_flush_operation');
    
    try {
      // L2 캐시 플래시
      if (this.l2Cache && this.isL2CacheConnected) {
        try {
          await this.l2Cache.flushdb();
          logger.info('L2 Redis Cache 플래시 완료');
        } catch (error) {
          logger.warn('L2 Cache 플래시 에러:', (error as Error).message);
          span.recordException(error as Error);
        }
      }

      // L1 캐시 플래시
      this.l1Cache.flushAll();
      logger.info('L1 Memory Cache 플래시 완료');

      span.setAttributes({
        'tft.cache.flush_success': true,
      });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 연결 해제 (텔레메트리 추적 포함)
   */
  disconnect(): void {
    const span = tracer.startSpan('cache_disconnect');
    
    try {
      if (this.l2Cache) {
        this.l2Cache.disconnect();
      }
      this.l1Cache.close();
      
      span.setAttributes({
        'tft.cache.disconnect_success': true,
      });
      
      logger.info('🔍 캐시 연결 해제 완료');
    } catch (error) {
      span.recordException(error as Error);
      logger.error('캐시 연결 해제 실패:', error);
    } finally {
      span.end();
    }
  }
}

// 싱글톤 인스턴스
export const telemetryEnhancedCacheManager = new TelemetryEnhancedCacheManager();

// 프로세스 종료 시 정리
process.on('SIGTERM', () => telemetryEnhancedCacheManager.disconnect());
process.on('SIGINT', () => telemetryEnhancedCacheManager.disconnect());

export default telemetryEnhancedCacheManager;