// backend/src/services/cacheManager.ts
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import logger from '../config/logger';
import { CACHE_TTL, validateTTL } from '../config/cacheTTL';

const REDIS_URL = process.env.UPSTASH_REDIS_URL;

class CacheManager {
  private l1Cache: NodeCache; // L1: In-memory cache
  private l2Cache: Redis | null = null; // L2: Redis cache
  private isL2CacheConnected: boolean = false;

  constructor() {
    // L1 Cache (In-Memory) 설정 - 즉시 사용 가능
    this.l1Cache = new NodeCache({
      stdTTL: CACHE_TTL.DEFAULT, // 기본 TTL
      checkperiod: 120,         // 만료된 캐시를 정리하는 주기 (초)
      useClones: false,         // 성능을 위해 객체 복제 비활성화
    });
    logger.info('L1 Memory Cache initialized.');
  }

  async connect(): Promise<void> {
    if (this.isL2CacheConnected) {
      logger.info('Redis is already connected.');
      return;
    }

    // L2 Cache (Redis) 설정
    if (REDIS_URL) {
      try {
        logger.info('Connecting to L2 Redis Cache...');
        this.l2Cache = new Redis(REDIS_URL, {
          tls: {
            rejectUnauthorized: false,
          },
          maxRetriesPerRequest: 3,
          connectTimeout: 10000, // 10초
          lazyConnect: false, // 즉시 연결
        });

        this.l2Cache.on('error', (_err: any) => {
          logger.error('L2 Redis Cache _error:', _err.message);
          this.isL2CacheConnected = false;
        });

        // PING으로 연결 상태 명시적 확인
        const pingResponse = await this.l2Cache.ping();
        if (pingResponse !== 'PONG') {
          throw new Error('Redis connection failed: PING command failed.');
        }
        
        this.isL2CacheConnected = true;
        logger.info('L2 Redis Cache connected successfully!');

      } catch (_err: any) {
        logger.error('Failed to connect to Redis.', _err);
        this.l2Cache = null;
        this.isL2CacheConnected = false;
        throw new Error(`Redis connection failed: ${_err.message}`);
      }
    } else {
      logger.warn('UPSTASH_REDIS_URL not configured. L2 Redis Cache is disabled.');
      this.isL2CacheConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // 1. L1 캐시에서 먼저 조회 (항상 사용 가능)
    const l1Value = this.l1Cache.get<T>(key);
    if (l1Value) {
      logger.debug(`Cache HIT (L1) for key: ${key}`);
      return l1Value;
    }

    // 2. L1에 없으면 L2 캐시에서 조회 (Redis 연결 상태에 따라 선택적)
    if (this.l2Cache && this.isL2CacheConnected) {
      try {
        const l2Value = await this.l2Cache.get(key);
        if (l2Value) {
          logger.debug(`Cache HIT (L2) for key: ${key}`);
          const parsedValue = JSON.parse(l2Value) as T;
          // L2에 있던 데이터를 L1에도 저장하여 다음 요청에 대비
          this.l1Cache.set(key, parsedValue);
          return parsedValue;
        }
      } catch (_error: any) {
        logger.warn(`L2 Cache GET error for key ${key}:`, _error.message);
        // L2 캐시 오류 시 L1만 사용하여 계속 진행
      }
    }

    // 3. 모든 캐시에 데이터가 없음 (Cache MISS) - 정상 동작
    logger.debug(`Cache MISS for key: ${key}`);
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = validateTTL(ttlSeconds);

    // 1. L1 캐시에 저장 (항상 수행)
    this.l1Cache.set(key, value, ttl);
    logger.debug(`Cache SET (L1) for key: ${key} with TTL: ${ttl}s`);

    // 2. L2 캐시에 저장 (Redis 연결 상태에 따라 선택적)
    if (this.l2Cache && this.isL2CacheConnected) {
      try {
        const stringValue = JSON.stringify(value);
        await this.l2Cache.setex(key, ttl, stringValue);
        logger.debug(`Cache SET (L2) for key: ${key} with TTL: ${ttl}s`);
      } catch (_error: any) {
        logger.warn(`L2 Cache SET error for key ${key}:`, _error.message);
        // L2 캐시 오류 시에도 L1 캐시는 정상 동작
      }
    }
  }

  async del(key: string): Promise<void> {
    // 1. L2 캐시에서 삭제
    if (this.l2Cache && this.isL2CacheConnected) {
      try {
        await this.l2Cache.del(key);
      } catch (_error: any) {
        logger.warn(`L2 Cache DEL error for key ${key}:`, _error.message);
      }
    }

    // 2. L1 캐시에서도 삭제
    this.l1Cache.del(key);
    logger.debug(`Cache DEL for key: ${key}`);
  }

  async flush(): Promise<void> {
    // 1. L2 캐시 비우기
    if (this.l2Cache && this.isL2CacheConnected) {
      try {
        await this.l2Cache.flushdb();
        logger.info('L2 Redis Cache flushed.');
      } catch (_error: any) {
        logger.warn('L2 Cache FLUSH _error:', _error.message);
      }
    }

    // 2. L1 캐시 비우기
    this.l1Cache.flushAll();
    logger.info('L1 Memory Cache flushed.');
  }

  getStats() {
    return {
      l1CacheStats: this.l1Cache.getStats(),
      l2CacheConnected: this.isL2CacheConnected,
    };
  }

  // 번역 캐시 관련 메서드들
  needsTranslation(targetLanguage: string): boolean {
    // 간단한 캐시 체크 로직 - 실제로는 더 복잡한 체크가 필요할 수 있음
    const cacheKey = `translation_${targetLanguage}`;
    const cached = this.l1Cache.get(cacheKey);
    return !cached;
  }

  updateCacheAfterTranslation(targetLanguage: string, translatedCount: number, totalCount: number): void {
    const cacheKey = `translation_${targetLanguage}`;
    const cacheData = {
      translatedCount,
      totalCount,
      timestamp: Date.now()
    };
    this.l1Cache.set(cacheKey, cacheData, CACHE_TTL.TRANSLATION || 3600);
  }

  getCacheStatus(): { [key: string]: any } {
    const stats = this.getStats();
    return {
      ...stats,
      translationCacheKeys: this.l1Cache.keys().filter(key => key.startsWith('translation_'))
    };
  }

  // 번역 캐시 무효화
  invalidateCache(targetLanguage?: string): void {
    if (targetLanguage) {
      const cacheKey = `translation_${targetLanguage}`;
      this.l1Cache.del(cacheKey);
      logger.info(`Translation cache invalidated for language: ${targetLanguage}`);
    } else {
      // 모든 번역 캐시 무효화
      const keys = this.l1Cache.keys().filter(key => key.startsWith('translation_'));
      keys.forEach(key => this.l1Cache.del(key));
      logger.info('All translation cache invalidated');
    }
  }
  
  // 애플리케이션 종료 시 연결 해제
  disconnect() {
    if (this.l2Cache) {
      this.l2Cache.disconnect();
    }
    this.l1Cache.close();
  }
  
  // 초기화 완료 대기 (현재는 동기적이므로 즉시 반환)
  async waitForInitialization(): Promise<void> {
    // L1 캐시는 즉시 사용 가능하므로 별도 대기 불필요
    // L2 캐시는 connect() 메서드에서 처리
    return Promise.resolve();
  }
}

// 싱글턴 인스턴스로 내보내기
const cacheManager = new CacheManager();

// 초기화 완료 대기 함수 내보내기
export const waitForCacheInitialization = () => cacheManager.waitForInitialization();

// 프로세스 종료 시 안전하게 연결을 해제하도록 설정
process.on('SIGTERM', () => cacheManager.disconnect());
process.on('SIGINT', () => cacheManager.disconnect());

export default cacheManager;
