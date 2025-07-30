/**
 * GraphQL Response 전용 캐싱 시스템
 * 쿼리 복잡도 기반 캐싱 및 스마트 무효화 구현
 */

import logger from '../config/logger';
import cacheManager from '../services/cacheManager';
import crypto from 'crypto';

// 타입 정의
interface CacheKeyConfig {
  operation: string;
  args: Record<string, any>;
  complexity?: number;
  userId?: string;
}

interface CacheOptions {
  ttl?: number;
  complexity?: number;
  tags?: string[];
  invalidatePatterns?: string[];
}

interface CachedResponse<T = any> {
  data: T;
  timestamp: string;
  complexity: number;
  requestId: string;
  processingTime: number;
  hitCount: number;
  tags: string[];
}

/**
 * GraphQL Response 캐시 관리자
 */
export class GraphQLResponseCache {
  private readonly PREFIX = 'gql:response:';
  private readonly ANALYTICS_PREFIX = 'gql:analytics:';
  private readonly hitStats = new Map<string, number>();

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(config: CacheKeyConfig): string {
    const { operation, args, userId } = config;
    
    // args를 정규화하여 일관된 키 생성
    const normalizedArgs = this.normalizeArgs(args);
    const argsString = JSON.stringify(normalizedArgs);
    
    // 사용자별 캐시가 필요한 경우 userId 포함
    const keyData = userId ? `${operation}:${argsString}:${userId}` : `${operation}:${argsString}`;
    
    // SHA256 해시로 키 길이 제한
    const hash = crypto.createHash('sha256').update(keyData).digest('hex').substring(0, 16);
    
    return `${this.PREFIX}${operation}:${hash}`;
  }

  /**
   * Arguments 정규화 (순서 및 undefined 값 처리)
   */
  private normalizeArgs(args: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};
    
    // 키를 알파벳순으로 정렬하고 undefined 값 제거
    Object.keys(args)
      .sort()
      .forEach(key => {
        if (args[key] !== undefined && args[key] !== null) {
          if (typeof args[key] === 'object') {
            normalized[key] = this.normalizeArgs(args[key]);
          } else {
            normalized[key] = args[key];
          }
        }
      });
      
    return normalized;
  }

  /**
   * 쿼리 복잡도 기반 TTL 계산
   */
  private calculateTTL(complexity: number = 1, baseTTL: number = 300): number {
    // 복잡도가 높을수록 더 오래 캐시 (최대 1시간)
    const complexityMultiplier = Math.min(complexity / 10, 6);
    return Math.min(baseTTL * complexityMultiplier, 3600);
  }

  /**
   * 캐시에서 응답 조회
   */
  async get<T>(
    operation: string, 
    args: Record<string, any>, 
    userId?: string
  ): Promise<CachedResponse<T> | null> {
    try {
      const cacheKey = this.generateCacheKey({ operation, args, userId });
      const cached = await cacheManager.get<CachedResponse<T>>(cacheKey);
      
      if (cached) {
        // 히트 카운트 증가
        cached.hitCount = (cached.hitCount || 0) + 1;
        this.hitStats.set(cacheKey, (this.hitStats.get(cacheKey) || 0) + 1);
        
        logger.debug(`🎯 GraphQL 캐시 HIT: ${operation}`, {
          cacheKey: cacheKey.substring(0, 32) + '...',
          hitCount: cached.hitCount,
          age: Date.now() - new Date(cached.timestamp).getTime()
        });
        
        return cached;
      }
      
      logger.debug(`🔍 GraphQL 캐시 MISS: ${operation}`, {
        cacheKey: cacheKey.substring(0, 32) + '...'
      });
      
      return null;
    } catch (error: any) {
      logger.warn(`❌ GraphQL 캐시 조회 실패: ${operation}`, error.message);
      return null;
    }
  }

  /**
   * 응답을 캐시에 저장
   */
  async set<T>(
    operation: string,
    args: Record<string, any>,
    data: T,
    options: CacheOptions = {},
    requestId: string,
    processingTime: number,
    userId?: string
  ): Promise<void> {
    try {
      const { complexity = 1, tags = [], ttl } = options;
      
      const cacheKey = this.generateCacheKey({ operation, args, complexity, userId });
      const calculatedTTL = ttl || this.calculateTTL(complexity);
      
      const cachedResponse: CachedResponse<T> = {
        data,
        timestamp: new Date().toISOString(),
        complexity,
        requestId,
        processingTime,
        hitCount: 0,
        tags: [...tags, operation] // operation을 기본 태그로 추가
      };
      
      await cacheManager.set(cacheKey, cachedResponse, calculatedTTL);
      
      // 태그별 키 매핑 저장 (무효화를 위함)
      await this.saveTagMappings(cacheKey, cachedResponse.tags);
      
      logger.debug(`💾 GraphQL 응답 캐시됨: ${operation}`, {
        cacheKey: cacheKey.substring(0, 32) + '...',
        ttl: calculatedTTL,
        complexity,
        tags: cachedResponse.tags
      });
      
    } catch (error: any) {
      logger.warn(`❌ GraphQL 캐시 저장 실패: ${operation}`, error.message);
    }
  }

  /**
   * 태그별 키 매핑 저장
   */
  private async saveTagMappings(cacheKey: string, tags: string[]): Promise<void> {
    const promises = tags.map(async (tag) => {
      const tagKey = `${this.PREFIX}tags:${tag}`;
      try {
        const existingKeys = await cacheManager.get<string[]>(tagKey) || [];
        if (!existingKeys.includes(cacheKey)) {
          existingKeys.push(cacheKey);
          await cacheManager.set(tagKey, existingKeys, 7200); // 태그 매핑은 2시간 유지
        }
      } catch (error) {
        logger.warn(`태그 매핑 저장 실패: ${tag}`, error);
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * 태그 기반 캐시 무효화
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const tagKey = `${this.PREFIX}tags:${tag}`;
      const keysToInvalidate = await cacheManager.get<string[]>(tagKey);
      
      if (!keysToInvalidate || keysToInvalidate.length === 0) {
        logger.debug(`🗑️ GraphQL 태그 무효화: ${tag} - 무효화할 키가 없음`);
        return 0;
      }
      
      // 병렬로 키들 삭제
      const deletePromises = keysToInvalidate.map(key => cacheManager.del(key));
      await Promise.all(deletePromises);
      
      // 태그 매핑도 삭제
      await cacheManager.del(tagKey);
      
      logger.info(`🗑️ GraphQL 태그 무효화 완료: ${tag} (${keysToInvalidate.length}개 키)`);
      return keysToInvalidate.length;
      
    } catch (error: any) {
      logger.error(`❌ GraphQL 태그 무효화 실패: ${tag}`, error);
      return 0;
    }
  }

  /**
   * 패턴 기반 캐시 무효화
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      logger.info(`🗑️ GraphQL 패턴 무효화 시작: ${pattern}`);
      
      // 패턴별로 다른 무효화 전략 사용
      switch (pattern) {
        case 'champions:*':
          return await this.invalidateByTag('champions');
          
        case 'tierlist:*':
          return await this.invalidateByTag('tierlist');
          
        case 'summoner:*':
          return await this.invalidateByTag('summoner');
          
        case 'all':
          return await this.invalidateAll();
          
        default:
          logger.warn(`지원하지 않는 무효화 패턴: ${pattern}`);
          return 0;
      }
    } catch (error: any) {
      logger.error(`❌ GraphQL 패턴 무효화 실패: ${pattern}`, error);
      return 0;
    }
  }

  /**
   * 전체 GraphQL 캐시 무효화
   */
  async invalidateAll(): Promise<number> {
    try {
      logger.info('🗑️ GraphQL 전체 캐시 무효화 시작');
      
      // 모든 GraphQL 캐시 키들을 삭제
      // 실제 구현에서는 Redis의 SCAN 명령을 사용하거나
      // 캐시 매니저의 패턴 삭제 기능을 사용해야 함
      
      // 현재는 주요 태그들만 무효화
      const invalidationResults = await Promise.all([
        this.invalidateByTag('champions'),
        this.invalidateByTag('tierlist'),
        this.invalidateByTag('summoner'),
        this.invalidateByTag('serviceInfo')
      ]);
      
      const totalInvalidated = invalidationResults.reduce((sum, count) => sum + count, 0);
      
      logger.info(`🗑️ GraphQL 전체 캐시 무효화 완료: ${totalInvalidated}개 키`);
      return totalInvalidated;
      
    } catch (error: any) {
      logger.error('❌ GraphQL 전체 캐시 무효화 실패', error);
      return 0;
    }
  }

  /**
   * 캐시 성능 통계 조회
   */
  getPerformanceStats(): any {
    return {
      hitStats: Object.fromEntries(this.hitStats),
      totalHits: Array.from(this.hitStats.values()).reduce((sum, hits) => sum + hits, 0),
      uniqueKeys: this.hitStats.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 캐시 상태 건강성 체크
   */
  async healthCheck(): Promise<any> {
    try {
      const testKey = `${this.PREFIX}healthcheck`;
      const testData = { timestamp: Date.now() };
      
      // 쓰기 테스트
      await cacheManager.set(testKey, testData, 60);
      
      // 읽기 테스트
      const retrieved = await cacheManager.get(testKey);
      
      // 정리
      await cacheManager.del(testKey);
      
      const isHealthy = retrieved && retrieved.timestamp === testData.timestamp;
      
      return {
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
        performance: this.getPerformanceStats()
      };
      
    } catch (error: any) {
      logger.error('GraphQL 캐시 건강성 체크 실패', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 싱글톤 인스턴스
const graphqlResponseCache = new GraphQLResponseCache();

export default graphqlResponseCache;

// 타입들도 내보내기
export type {
  CacheKeyConfig,
  CacheOptions,
  CachedResponse
};