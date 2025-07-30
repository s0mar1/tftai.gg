/**
 * GraphQL 캐시 무효화 시스템
 * 데이터 변경 시 자동으로 관련 캐시를 무효화합니다.
 */

import logger from '../config/logger';
import graphqlResponseCache from './responseCache';
import RealtimeEventService from '../services/realtimeEvents';

/**
 * 캐시 무효화 이벤트 타입
 */
export type InvalidationEventType = 
  | 'CHAMPIONS_UPDATED'
  | 'TIERLIST_UPDATED' 
  | 'SUMMONER_UPDATED'
  | 'PATCH_UPDATED'
  | 'MANUAL_INVALIDATION';

export interface InvalidationEvent {
  eventType: InvalidationEventType;
  triggeredBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * 캐시 무효화 관리자
 */
export class CacheInvalidationManager {
  private invalidationHistory: InvalidationEvent[] = [];
  private readonly MAX_HISTORY_SIZE = 100;

  /**
   * 챔피언 데이터 업데이트 시 캐시 무효화
   */
  async invalidateChampionsCache(language?: string, triggeredBy: string = 'system'): Promise<void> {
    try {
      logger.info(`🗑️ [Cache Invalidation] 챔피언 캐시 무효화 시작 - 언어: ${language || 'all'}`);
      
      let invalidatedCount = 0;
      
      if (language) {
        // 특정 언어만 무효화
        invalidatedCount = await graphqlResponseCache.invalidateByTag(`champions:${language}`);
        invalidatedCount += await graphqlResponseCache.invalidateByTag(language);
      } else {
        // 모든 챔피언 캐시 무효화
        invalidatedCount = await graphqlResponseCache.invalidateByTag('champions');
        
        // 각 언어별로도 무효화
        const languages = ['ko', 'en', 'ja', 'zh'];
        for (const lang of languages) {
          invalidatedCount += await graphqlResponseCache.invalidateByTag(lang);
        }
      }
      
      // 무효화 이벤트 기록
      const event: InvalidationEvent = {
        eventType: 'CHAMPIONS_UPDATED',
        triggeredBy,
        timestamp: new Date().toISOString(),
        metadata: { language, invalidatedCount }
      };
      
      this.recordInvalidationEvent(event);
      
      // 실시간 시스템 상태 업데이트
      RealtimeEventService.systemHealthy(
        `챔피언 캐시가 무효화되었습니다 (${invalidatedCount}개 키)`
      );
      
      logger.info(`✅ [Cache Invalidation] 챔피언 캐시 무효화 완료: ${invalidatedCount}개 키`);
      
    } catch (error: any) {
      logger.error(`❌ [Cache Invalidation] 챔피언 캐시 무효화 실패:`, error);
      
      RealtimeEventService.systemError(
        `챔피언 캐시 무효화 실패: ${error.message}`
      );
    }
  }

  /**
   * 티어리스트 업데이트 시 캐시 무효화
   */
  async invalidateTierlistCache(triggeredBy: string = 'system'): Promise<void> {
    try {
      logger.info(`🗑️ [Cache Invalidation] 티어리스트 캐시 무효화 시작`);
      
      const invalidatedCount = await graphqlResponseCache.invalidateByTag('tierlist');
      
      // 무효화 이벤트 기록
      const event: InvalidationEvent = {
        eventType: 'TIERLIST_UPDATED',
        triggeredBy,
        timestamp: new Date().toISOString(),
        metadata: { invalidatedCount }
      };
      
      this.recordInvalidationEvent(event);
      
      // 실시간 시스템 상태 업데이트
      RealtimeEventService.systemHealthy(
        `티어리스트 캐시가 무효화되었습니다 (${invalidatedCount}개 키)`
      );
      
      logger.info(`✅ [Cache Invalidation] 티어리스트 캐시 무효화 완료: ${invalidatedCount}개 키`);
      
    } catch (error: any) {
      logger.error(`❌ [Cache Invalidation] 티어리스트 캐시 무효화 실패:`, error);
      
      RealtimeEventService.systemError(
        `티어리스트 캐시 무효화 실패: ${error.message}`
      );
    }
  }

  /**
   * 소환사 캐시 무효화 (특정 지역 또는 전체)
   */
  async invalidateSummonerCache(region?: string, triggeredBy: string = 'system'): Promise<void> {
    try {
      logger.info(`🗑️ [Cache Invalidation] 소환사 캐시 무효화 시작 - 지역: ${region || 'all'}`);
      
      let invalidatedCount = 0;
      
      if (region) {
        // 특정 지역만 무효화
        invalidatedCount = await graphqlResponseCache.invalidateByTag(`summoner:${region}`);
        invalidatedCount += await graphqlResponseCache.invalidateByTag(region);
      } else {
        // 모든 소환사 캐시 무효화
        invalidatedCount = await graphqlResponseCache.invalidateByTag('summoner');
      }
      
      // 무효화 이벤트 기록
      const event: InvalidationEvent = {
        eventType: 'SUMMONER_UPDATED',
        triggeredBy,
        timestamp: new Date().toISOString(),
        metadata: { region, invalidatedCount }
      };
      
      this.recordInvalidationEvent(event);
      
      logger.info(`✅ [Cache Invalidation] 소환사 캐시 무효화 완료: ${invalidatedCount}개 키`);
      
    } catch (error: any) {
      logger.error(`❌ [Cache Invalidation] 소환사 캐시 무효화 실패:`, error);
    }
  }

  /**
   * 패치 업데이트 시 전체 게임 관련 캐시 무효화
   */
  async invalidatePatchCache(patchVersion: string, triggeredBy: string = 'system'): Promise<void> {
    try {
      logger.info(`🗑️ [Cache Invalidation] 패치 ${patchVersion} 캐시 무효화 시작`);
      
      // 패치가 업데이트되면 챔피언과 티어리스트 데이터가 모두 영향받음
      await Promise.all([
        this.invalidateChampionsCache(undefined, `patch_${patchVersion}`),
        this.invalidateTierlistCache(`patch_${patchVersion}`)
      ]);
      
      // 패치 무효화 이벤트 기록
      const event: InvalidationEvent = {
        eventType: 'PATCH_UPDATED',
        triggeredBy,
        timestamp: new Date().toISOString(),
        metadata: { patchVersion }
      };
      
      this.recordInvalidationEvent(event);
      
      // 실시간 시스템 상태 업데이트
      RealtimeEventService.systemHealthy(
        `패치 ${patchVersion} 업데이트로 인한 캐시 무효화가 완료되었습니다`
      );
      
      logger.info(`✅ [Cache Invalidation] 패치 캐시 무효화 완료: ${patchVersion}`);
      
    } catch (error: any) {
      logger.error(`❌ [Cache Invalidation] 패치 캐시 무효화 실패:`, error);
      
      RealtimeEventService.systemError(
        `패치 캐시 무효화 실패: ${error.message}`
      );
    }
  }

  /**
   * 수동 캐시 무효화 (관리자 도구용)
   */
  async manualInvalidation(
    pattern: 'all' | 'champions' | 'tierlist' | 'summoner',
    triggeredBy: string
  ): Promise<number> {
    try {
      logger.info(`🗑️ [Cache Invalidation] 수동 캐시 무효화: ${pattern}`);
      
      let invalidatedCount = 0;
      
      switch (pattern) {
        case 'all':
          invalidatedCount = await graphqlResponseCache.invalidateAll();
          break;
        case 'champions':
          await this.invalidateChampionsCache(undefined, triggeredBy);
          break;
        case 'tierlist':
          await this.invalidateTierlistCache(triggeredBy);
          break;
        case 'summoner':
          await this.invalidateSummonerCache(undefined, triggeredBy);
          break;
      }
      
      // 수동 무효화 이벤트 기록
      const event: InvalidationEvent = {
        eventType: 'MANUAL_INVALIDATION',
        triggeredBy,
        timestamp: new Date().toISOString(),
        metadata: { pattern, invalidatedCount }
      };
      
      this.recordInvalidationEvent(event);
      
      logger.info(`✅ [Cache Invalidation] 수동 캐시 무효화 완료: ${pattern} (${invalidatedCount}개 키)`);
      
      return invalidatedCount;
      
    } catch (error: any) {
      logger.error(`❌ [Cache Invalidation] 수동 캐시 무효화 실패:`, error);
      return 0;
    }
  }

  /**
   * 복잡도 기반 선택적 무효화
   */
  async complexityBasedInvalidation(
    minComplexity: number = 3,
    triggeredBy: string = 'system'
  ): Promise<void> {
    try {
      logger.info(`🗑️ [Cache Invalidation] 복잡도 기반 무효화 시작 (복잡도 >= ${minComplexity})`);
      
      // 현재는 간단한 구현으로 모든 캐시를 확인하여 무효화
      // 실제 구현에서는 복잡도 정보를 메타데이터에서 추출해야 함
      
      const tierlistInvalidated = await graphqlResponseCache.invalidateByTag('tierlist'); // 복잡도 5
      
      // 복잡도 기반 무효화 이벤트 기록
      const event: InvalidationEvent = {
        eventType: 'MANUAL_INVALIDATION',
        triggeredBy,
        timestamp: new Date().toISOString(),
        metadata: { 
          type: 'complexity_based',
          minComplexity, 
          invalidatedCount: tierlistInvalidated
        }
      };
      
      this.recordInvalidationEvent(event);
      
      logger.info(`✅ [Cache Invalidation] 복잡도 기반 무효화 완료: ${tierlistInvalidated}개 키`);
      
    } catch (error: any) {
      logger.error(`❌ [Cache Invalidation] 복잡도 기반 무효화 실패:`, error);
    }
  }

  /**
   * 무효화 이벤트 기록
   */
  private recordInvalidationEvent(event: InvalidationEvent): void {
    this.invalidationHistory.push(event);
    
    // 히스토리 크기 제한
    if (this.invalidationHistory.length > this.MAX_HISTORY_SIZE) {
      this.invalidationHistory.shift();
    }
    
    logger.debug(`📝 [Cache Invalidation] 무효화 이벤트 기록:`, event);
  }

  /**
   * 무효화 히스토리 조회
   */
  getInvalidationHistory(limit: number = 20): InvalidationEvent[] {
    return this.invalidationHistory
      .slice(-limit)
      .reverse(); // 최신 순으로 정렬
  }

  /**
   * 무효화 통계
   */
  getInvalidationStats(): any {
    const stats = {
      totalEvents: this.invalidationHistory.length,
      eventTypes: {} as Record<string, number>,
      triggeredBy: {} as Record<string, number>,
      recentEvents: this.getInvalidationHistory(5)
    };
    
    this.invalidationHistory.forEach(event => {
      // 이벤트 타입별 카운트
      stats.eventTypes[event.eventType] = (stats.eventTypes[event.eventType] || 0) + 1;
      
      // 트리거별 카운트
      stats.triggeredBy[event.triggeredBy] = (stats.triggeredBy[event.triggeredBy] || 0) + 1;
    });
    
    return stats;
  }
}

// 싱글톤 인스턴스
const cacheInvalidationManager = new CacheInvalidationManager();

export default cacheInvalidationManager;

// 편의 함수들
export const invalidateChampionsCache = (language?: string, triggeredBy?: string) =>
  cacheInvalidationManager.invalidateChampionsCache(language, triggeredBy);

export const invalidateTierlistCache = (triggeredBy?: string) =>
  cacheInvalidationManager.invalidateTierlistCache(triggeredBy);

export const invalidateSummonerCache = (region?: string, triggeredBy?: string) =>
  cacheInvalidationManager.invalidateSummonerCache(region, triggeredBy);

export const invalidatePatchCache = (patchVersion: string, triggeredBy?: string) =>
  cacheInvalidationManager.invalidatePatchCache(patchVersion, triggeredBy);