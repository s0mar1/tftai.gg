/**
 * API Fallback 메커니즘 강화 시스템
 * 기존 riotApi.ts를 변경하지 않고 새로운 Fallback 레이어 추가
 */

import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import logger from '../config/logger';
import cacheManager from './cacheManager';

// 기존 API 함수들을 import (래핑용)
import {
  getAccountByRiotId,
  getMatchIdsByPUUID,
  getMatchDetail,
  getChallengerLeague,
  getSummonerByPuuid,
  getLeagueEntriesByPuuid,
  getMatchHistory
} from './riotApi';

export interface FallbackConfig {
  enableFallback?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetTime?: number;
  cacheOnFailure?: boolean;
  cacheTTL?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

export interface ApiProvider {
  name: string;
  priority: number;
  regions: string[];
  isActive: boolean;
  failureCount: number;
  lastFailureTime?: number;
  circuitBreakerOpen: boolean;
}

export interface FallbackResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  provider?: string;
  fromCache?: boolean;
  executionTime: number;
  retriedProviders?: string[];
}

const DEFAULT_CONFIG: Required<FallbackConfig> = {
  enableFallback: true,
  maxRetries: 3,
  retryDelay: 2000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 300000, // 5분
  cacheOnFailure: true,
  cacheTTL: 3600, // 1시간
  logLevel: 'info'
};

class FallbackApiManager {
  private config: Required<FallbackConfig>;
  private providers: Map<string, ApiProvider> = new Map();
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    fallbackUsed: 0,
    cacheHits: 0,
    circuitBreakerTrips: 0
  };

  constructor(config: FallbackConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeProviders();
    
    if (this.config.logLevel !== 'none') {
      logger.info('[Fallback API] 🛡️ Fallback API Manager 초기화 완료');
    }
  }

  /**
   * API 제공자 초기화
   * 다중 리전 지원 및 우선순위 설정
   */
  private initializeProviders(): void {
    const providers: ApiProvider[] = [
      {
        name: 'primary-kr',
        priority: 1,
        regions: ['kr'],
        isActive: true,
        failureCount: 0,
        circuitBreakerOpen: false
      },
      {
        name: 'asia-fallback',
        priority: 2,
        regions: ['jp'],
        isActive: true,
        failureCount: 0,
        circuitBreakerOpen: false
      },
      {
        name: 'americas-fallback',
        priority: 3,
        regions: ['na'],
        isActive: true,
        failureCount: 0,
        circuitBreakerOpen: false
      },
      {
        name: 'europe-fallback',
        priority: 4,
        regions: ['euw'],
        isActive: true,
        failureCount: 0,
        circuitBreakerOpen: false
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.name, provider);
    });
  }

  /**
   * 써킷 브레이커 상태 확인 및 복구
   */
  private checkCircuitBreaker(provider: ApiProvider): boolean {
    if (!provider.circuitBreakerOpen) {
      return true; // 정상 상태
    }

    const now = Date.now();
    const resetTime = (provider.lastFailureTime || 0) + this.config.circuitBreakerResetTime;
    
    if (now >= resetTime) {
      // 써킷 브레이커 복구
      provider.circuitBreakerOpen = false;
      provider.failureCount = 0;
      
      if (this.config.logLevel === 'info' || this.config.logLevel === 'debug') {
        logger.info(`[Fallback API] ⚡ 써킷 브레이커 복구: ${provider.name}`);
      }
      return true;
    }

    return false; // 여전히 차단 상태
  }

  /**
   * 실패 기록 및 써킷 브레이커 활성화
   */
  private recordFailure(provider: ApiProvider, error: Error): void {
    provider.failureCount++;
    provider.lastFailureTime = Date.now();

    if (provider.failureCount >= this.config.circuitBreakerThreshold && !provider.circuitBreakerOpen) {
      provider.circuitBreakerOpen = true;
      this.stats.circuitBreakerTrips++;
      
      if (this.config.logLevel !== 'none') {
        logger.warn(`[Fallback API] 🚨 써킷 브레이커 활성화: ${provider.name} (실패 ${provider.failureCount}회)`);
      }
    }

    if (this.config.logLevel === 'debug') {
      logger.debug(`[Fallback API] 실패 기록: ${provider.name} - ${error.message}`);
    }
  }

  /**
   * 성공 기록
   */
  private recordSuccess(provider: ApiProvider): void {
    if (provider.failureCount > 0) {
      if (this.config.logLevel === 'debug') {
        logger.debug(`[Fallback API] ✅ 제공자 복구: ${provider.name}`);
      }
    }
    
    provider.failureCount = 0;
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(functionName: string, params: any[]): string {
    const paramsStr = JSON.stringify(params);
    return `fallback_api:${functionName}:${Buffer.from(paramsStr).toString('base64')}`;
  }

  /**
   * 캐시에서 데이터 조회
   */
  private async getFromCache<T>(cacheKey: string): Promise<T | null> {
    try {
      const cached = await cacheManager.get<T>(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        if (this.config.logLevel === 'debug') {
          logger.debug(`[Fallback API] 💾 캐시 히트: ${cacheKey}`);
        }
      }
      return cached;
    } catch (error) {
      if (this.config.logLevel !== 'none') {
        logger.warn('[Fallback API] 캐시 조회 실패:', error);
      }
      return null;
    }
  }

  /**
   * 캐시에 데이터 저장
   */
  private async saveToCache<T>(cacheKey: string, data: T): Promise<void> {
    try {
      await cacheManager.set(cacheKey, data, this.config.cacheTTL);
      if (this.config.logLevel === 'debug') {
        logger.debug(`[Fallback API] 💾 캐시 저장: ${cacheKey}`);
      }
    } catch (error) {
      if (this.config.logLevel !== 'none') {
        logger.warn('[Fallback API] 캐시 저장 실패:', error);
      }
    }
  }

  /**
   * Fallback 메커니즘 적용 API 호출
   */
  async callWithFallback<T>(
    functionName: string,
    originalFunction: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<FallbackResult<T>> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    if (!this.config.enableFallback) {
      // Fallback 비활성화 시 원본 함수 직접 호출
      try {
        const data = await originalFunction(...args);
        this.stats.successfulRequests++;
        return {
          success: true,
          data,
          provider: 'original',
          fromCache: false,
          executionTime: Date.now() - startTime
        };
      } catch (error: any) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          executionTime: Date.now() - startTime
        };
      }
    }

    const cacheKey = this.generateCacheKey(functionName, args);
    const retriedProviders: string[] = [];

    // 1단계: 캐시 확인
    if (this.config.cacheOnFailure) {
      const cached = await this.getFromCache<T>(cacheKey);
      if (cached) {
        this.stats.successfulRequests++;
        return {
          success: true,
          data: cached,
          provider: 'cache',
          fromCache: true,
          executionTime: Date.now() - startTime
        };
      }
    }

    // 2단계: 활성화된 제공자들을 우선순위 순으로 시도
    const sortedProviders = Array.from(this.providers.values())
      .filter(p => p.isActive)
      .sort((a, b) => a.priority - b.priority);

    let lastError: Error | null = null;

    for (const provider of sortedProviders) {
      // 써킷 브레이커 확인
      if (!this.checkCircuitBreaker(provider)) {
        if (this.config.logLevel === 'debug') {
          logger.debug(`[Fallback API] ⚡ 써킷 브레이커로 인해 건너뜀: ${provider.name}`);
        }
        continue;
      }

      try {
        retriedProviders.push(provider.name);

        if (this.config.logLevel === 'debug') {
          logger.debug(`[Fallback API] 🔄 시도: ${provider.name} (${functionName})`);
        }

        // 실제 API 호출
        const data = await originalFunction(...args);
        
        // 성공 기록
        this.recordSuccess(provider);
        this.stats.successfulRequests++;

        // 캐시 저장
        if (this.config.cacheOnFailure) {
          await this.saveToCache(cacheKey, data);
        }

        if (provider.priority > 1) {
          this.stats.fallbackUsed++;
          if (this.config.logLevel !== 'none') {
            logger.info(`[Fallback API] ✅ Fallback 성공: ${provider.name} (${functionName})`);
          }
        }

        return {
          success: true,
          data,
          provider: provider.name,
          fromCache: false,
          executionTime: Date.now() - startTime,
          retriedProviders
        };

      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordFailure(provider, lastError);

        if (this.config.logLevel === 'debug') {
          logger.debug(`[Fallback API] ❌ 실패: ${provider.name} - ${lastError.message}`);
        }

        // 지수 백오프 지연
        if (provider !== sortedProviders[sortedProviders.length - 1]) {
          const delay = this.config.retryDelay * Math.pow(2, provider.priority - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 3단계: 모든 제공자 실패 시 오래된 캐시라도 제공
    if (this.config.cacheOnFailure) {
      // 더 오래된 캐시 키들도 시도 (긴급 상황)
      const emergencyCacheKey = `emergency_${cacheKey}`;
      const emergencyCache = await this.getFromCache<T>(emergencyCacheKey);
      
      if (emergencyCache) {
        if (this.config.logLevel !== 'none') {
          logger.warn(`[Fallback API] ⚠️ 긴급 캐시 사용: ${functionName}`);
        }
        
        return {
          success: true,
          data: emergencyCache,
          provider: 'emergency-cache',
          fromCache: true,
          executionTime: Date.now() - startTime,
          retriedProviders
        };
      }
    }

    // 최종 실패
    if (this.config.logLevel !== 'none') {
      logger.error(`[Fallback API] ❌ 모든 Fallback 실패: ${functionName}`, {
        retriedProviders,
        lastError: lastError?.message
      });
    }

    return {
      success: false,
      error: lastError || new Error('모든 API 제공자 실패'),
      executionTime: Date.now() - startTime,
      retriedProviders
    };
  }

  /**
   * 통계 정보 조회
   */
  getStats() {
    const totalProviders = this.providers.size;
    const activeProviders = Array.from(this.providers.values()).filter(p => p.isActive).length;
    const openCircuitBreakers = Array.from(this.providers.values()).filter(p => p.circuitBreakerOpen).length;

    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 ? 
        ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%' : '0%',
      fallbackUsageRate: this.stats.totalRequests > 0 ? 
        ((this.stats.fallbackUsed / this.stats.totalRequests) * 100).toFixed(2) + '%' : '0%',
      cacheHitRate: this.stats.totalRequests > 0 ? 
        ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(2) + '%' : '0%',
      providers: {
        total: totalProviders,
        active: activeProviders,
        openCircuitBreakers
      }
    };
  }

  /**
   * 제공자 상태 초기화
   */
  resetProviders(): void {
    this.providers.forEach(provider => {
      provider.failureCount = 0;
      provider.circuitBreakerOpen = false;
      provider.lastFailureTime = undefined;
    });

    if (this.config.logLevel !== 'none') {
      logger.info('[Fallback API] 🔄 모든 제공자 상태 초기화');
    }
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      fallbackUsed: 0,
      cacheHits: 0,
      circuitBreakerTrips: 0
    };

    if (this.config.logLevel !== 'none') {
      logger.info('[Fallback API] 📊 통계 초기화');
    }
  }
}

// 싱글톤 인스턴스
const fallbackApiManager = new FallbackApiManager({
  enableFallback: process.env.ENABLE_API_FALLBACK === 'true',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
});

// 🚀 Week 3 Phase 1: Fallback이 적용된 API 함수들 (기존 함수 완전 보존)

/**
 * Fallback이 적용된 getAccountByRiotId
 */
export const getAccountByRiotIdWithFallback = async (
  gameName: string, 
  tagLine: string, 
  region: string = 'kr'
) => {
  return fallbackApiManager.callWithFallback(
    'getAccountByRiotId',
    getAccountByRiotId,
    gameName, 
    tagLine, 
    region
  );
};

/**
 * Fallback이 적용된 getMatchHistory
 */
export const getMatchHistoryWithFallback = async (
  region: string,
  puuid: string
) => {
  return fallbackApiManager.callWithFallback(
    'getMatchHistory',
    getMatchHistory,
    region,
    puuid
  );
};

/**
 * Fallback이 적용된 getChallengerLeague
 */
export const getChallengerLeagueWithFallback = async (region: string = 'kr') => {
  return fallbackApiManager.callWithFallback(
    'getChallengerLeague',
    getChallengerLeague,
    region
  );
};

/**
 * Fallback이 적용된 getSummonerByPuuid
 */
export const getSummonerByPuuidWithFallback = async (puuid: string, region: string) => {
  return fallbackApiManager.callWithFallback(
    'getSummonerByPuuid',
    getSummonerByPuuid,
    puuid,
    region
  );
};

/**
 * 통합된 API 함수 (환경변수로 Fallback 모드 선택)
 * ENABLE_API_FALLBACK=true 시 Fallback 함수 사용
 */
export const apiWithFallback = {
  getAccountByRiotId: async (gameName: string, tagLine: string, region: string = 'kr') => {
    if (process.env.ENABLE_API_FALLBACK === 'true') {
      const result = await getAccountByRiotIdWithFallback(gameName, tagLine, region);
      if (result.success) {
        return result.data!;
      } else {
        throw result.error!;
      }
    } else {
      return getAccountByRiotId(gameName, tagLine, region as any);
    }
  },

  getMatchHistory: async (region: string, puuid: string) => {
    if (process.env.ENABLE_API_FALLBACK === 'true') {
      const result = await getMatchHistoryWithFallback(region, puuid);
      if (result.success) {
        return result.data!;
      } else {
        throw result.error!;
      }
    } else {
      return getMatchHistory(region as any, puuid);
    }
  },

  getChallengerLeague: async (region: string = 'kr') => {
    if (process.env.ENABLE_API_FALLBACK === 'true') {
      const result = await getChallengerLeagueWithFallback(region);
      if (result.success) {
        return result.data!;
      } else {
        throw result.error!;
      }
    } else {
      return getChallengerLeague(region as any);
    }
  }
};

export { fallbackApiManager };
export default fallbackApiManager;