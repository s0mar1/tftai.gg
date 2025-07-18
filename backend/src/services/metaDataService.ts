// 메타 데이터 관리 서비스 - 중복 제거 및 캐싱 통합
import DeckTier from '../models/DeckTier';
import cacheManager from './cacheManager';
import logger from '../config/logger';
import { CACHE_TTL } from '../config/cacheTTL';
import { ActiveTrait } from '../types/index';

interface MetaDeck {
  _id?: string;
  deckKey: string;
  tierRank: string;
  carryChampionName: string;
  mainTraitName: string;
  coreUnits: CoreUnit[];
  synergies?: ActiveTrait[];
  totalGames: number;
  winCount: number;
  averagePlacement?: number;
  winRate?: number;
  pickRate?: number;
}

interface CoreUnit {
  name: string;
  apiName?: string;
  tier?: number;
  cost: number;
  recommendedItems?: RecommendedItem[];
}

interface RecommendedItem {
  name: string;
  id?: string;
}

interface FallbackDeck {
  deckKey: string;
  tierRank: string;
  carryChampionName: string;
  mainTraitName: string;
  coreUnits: CoreUnit[];
  totalGames: number;
  winCount: number;
  averagePlacement: number;
  winRate: number;
  pickRate: number;
}

interface CacheKeys {
  META_DECKS: string;
  META_DECKS_AI: string;
  META_DECKS_TOP: string;
}

interface CacheTTL {
  META_DECKS: number;
  AI_FORMAT: number;
  TOP_DECKS: number;
}

interface CacheStatus {
  exists: boolean;
  size: number;
  type: string;
}

interface CacheStatusResponse {
  status: { [key: string]: CacheStatus };
  lastRefreshTime: number;
  isRefreshing: boolean;
}

interface CacheStats {
  totalCaches: number;
  totalSize: number;
  cachesActive: number;
  lastRefreshTime: number;
  isRefreshing: boolean;
}

/**
 * 메타 덱 데이터 로드 (캐싱 포함)
 * @param {number} minGames - 최소 게임 수 (기본값: 3)
 * @param {number} limit - 최대 덱 수 (기본값: 50)
 * @returns {Array} 메타 덱 배열 (승률 포함)
 */
export async function getMetaDecks(minGames: number = 3, limit: number = 50): Promise<MetaDeck[]> {
    const cacheKey = `metaDecks_${minGames}_${limit}`;
    
    // 캐시에서 확인
    let metaDecks = await cacheManager.get<MetaDeck[]>(cacheKey);
    if (metaDecks) {
        return metaDecks as MetaDeck[];
    }
    
    try {
        // DB에서 조회
        const rawDecks = await DeckTier.find({ totalGames: { $gte: minGames } })
                                        .sort({ winCount: -1, averagePlacement: 1 })
                                        .limit(limit)
                                        .lean();
        
        // 승률 계산 및 정규화
        metaDecks = rawDecks.map(deck => ({
            ...deck,
            winRate: deck.totalGames > 0 ? (deck.winCount / deck.totalGames * 100) : 0,
            pickRate: Math.log(deck.totalGames + 1) // 픽률을 로그 스케일로 계산
        })) as unknown as MetaDeck[];
        
        // 빈 데이터 처리
        if (metaDecks.length === 0) {
            logger.info('메타 덱 데이터가 없습니다. 기본 덱을 생성합니다.');
            metaDecks = createFallbackDecks();
        }
        
        // 캐시에 저장 (1시간)
        cacheManager.set(cacheKey, metaDecks, 60 * 60);
        logger.info(`메타 덱 ${metaDecks.length}개 로드됨 (캐시 키: ${cacheKey})`);
        
        return metaDecks as MetaDeck[];
        
    } catch (_error) {
        logger.error('메타 덱 로드 오류:', _error);
        return createFallbackDecks();
    }
}

/**
 * 상위 메타 덱만 가져오기 (AI 분석용)
 * @param {number} topCount - 상위 덱 수 (기본값: 10)
 * @returns {Array} 상위 메타 덱 배열
 */
export async function getTopMetaDecks(topCount: number = 10): Promise<MetaDeck[]> {
    const allDecks = await getMetaDecks();
    return Array.isArray(allDecks) ? allDecks.slice(0, topCount) : [];
}

/**
 * 메타 덱 데이터를 AI 프롬프트용으로 포맷팅
 * @param {Array} metaDecks - 메타 덱 배열
 * @returns {string} 포맷된 문자열
 */
export function formatMetaDecksForAI(metaDecks: MetaDeck[]): string {
    if (!Array.isArray(metaDecks) || metaDecks.length === 0) {
        return '현재 메타 덱 데이터를 로드 중입니다...';
    }
    
    return metaDecks.map((deck, index) => {
        const coreUnitsText = (deck.coreUnits || []).map(cu => {
            const items = cu.recommendedItems?.map(item => item.name).filter(Boolean).join(', ') || '없음';
            return `${cu.name} (${cu.tier || '?'}성, ${cu.cost}코) [${items}]`;
        }).join('; ');
        
        return `덱 ${index + 1}: ${deck.mainTraitName} ${deck.carryChampionName} (${deck.tierRank}티어, 평균등수: ${deck.averagePlacement?.toFixed(2)}, 승률: ${deck.winRate?.toFixed(1)}%)\n  - 주요 유닛 및 추천 아이템: ${coreUnitsText}`;
    }).join('\n');
}

/**
 * 폴백 덱 생성 (데이터가 없을 때)
 * @returns {Array} 기본 덱 배열
 */
function createFallbackDecks(): FallbackDeck[] {
    return [
        {
            deckKey: 'fallback_deck_1',
            tierRank: 'S',
            carryChampionName: '기본덱',
            mainTraitName: '분석중',
            coreUnits: [],
            totalGames: 100,
            winCount: 60,
            averagePlacement: 3.5,
            winRate: 60,
            pickRate: 1
        },
        {
            deckKey: 'fallback_deck_2', 
            tierRank: 'A',
            carryChampionName: '대안덱',
            mainTraitName: '테스트',
            coreUnits: [],
            totalGames: 80,
            winCount: 40,
            averagePlacement: 4.2,
            winRate: 50,
            pickRate: 0.8
        }
    ];
}

/**
 * 메타 덱 캐시 초기화
 */
export function clearMetaDecksCache(): void {
    const keys = ['metaDecks_3_50', 'metaDecks_5_30', 'metaDecks_1_100'];
    keys.forEach(key => cacheManager.del(key));
    logger.info('메타 덱 캐시가 초기화되었습니다.');
}

/**
 * 메타 캐시 서비스 클래스
 */
class MetaCacheService {
  private CACHE_KEYS: CacheKeys;
  private CACHE_TTL: CacheTTL;
  private isRefreshing: boolean;
  private lastRefreshTime: number;
  private MIN_REFRESH_INTERVAL: number;

  constructor() {
    this.CACHE_KEYS = {
      META_DECKS: 'meta_decks_full',
      META_DECKS_AI: 'meta_decks_ai_format',
      META_DECKS_TOP: 'meta_decks_top_10'
    };
    
    this.CACHE_TTL = {
      META_DECKS: CACHE_TTL.META_STATS,
      AI_FORMAT: CACHE_TTL.META_STATS,
      TOP_DECKS: CACHE_TTL.RANKING
    };
    
    this.isRefreshing = false;
    this.lastRefreshTime = 0;
    this.MIN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10분 최소 간격
  }

  /**
   * 전체 메타 덱 데이터 가져오기 (캐시 우선)
   */
  async getMetaDecks(): Promise<MetaDeck[]> {
    try {
      // 캐시에서 먼저 확인
      const cached = await cacheManager.get<MetaDeck[]>(this.CACHE_KEYS.META_DECKS);
      if (cached) {
        logger.debug('메타 덱 데이터 캐시 히트');
        return cached;
      }

      // 캐시 미스 시 새로 로드
      logger.info('메타 덱 데이터 캐시 미스 - 새로 로드');
      const metaDecks = await getMetaDecks();
      
      if (metaDecks && Array.isArray(metaDecks)) {
        await cacheManager.set(this.CACHE_KEYS.META_DECKS, metaDecks, this.CACHE_TTL.META_DECKS);
        logger.info(`메타 덱 데이터 캐시 저장 완료: ${metaDecks.length}개`);
      }
      
      return metaDecks;
    } catch (_error) {
      logger.error('메타 덱 데이터 로드 실패:', _error);
      return [];
    }
  }

  /**
   * AI 분석용 포맷된 메타 덱 데이터 가져오기
   */
  async getMetaDecksForAI(topCount: number = 10): Promise<string> {
    try {
      const cacheKey = `${this.CACHE_KEYS.META_DECKS_AI}_${topCount}`;
      
      // 캐시에서 먼저 확인
      const cached = await cacheManager.get<string>(cacheKey);
      if (cached) {
        logger.debug(`AI용 메타 덱 데이터 캐시 히트 (top ${topCount})`);
        return cached;
      }

      // 캐시 미스 시 새로 생성
      logger.info(`AI용 메타 덱 데이터 캐시 미스 - 새로 생성 (top ${topCount})`);
      const allMetaDecks = await this.getMetaDecks();
      
      if (!Array.isArray(allMetaDecks) || allMetaDecks.length === 0) {
        const fallbackText = '현재 메타 덱 데이터를 로드 중입니다...';
        await cacheManager.set(cacheKey, fallbackText, 60); // 1분 후 재시도
        return fallbackText;
      }

      const topDecks = allMetaDecks.slice(0, topCount);
      const formattedText = `[현재 챌린저 메타 주요 덱 정보 (TFTai.gg 분석 데이터)]\n${formatMetaDecksForAI(topDecks)}`;
      
      // 캐시 저장
      await cacheManager.set(cacheKey, formattedText, this.CACHE_TTL.AI_FORMAT);
      logger.info(`AI용 메타 덱 데이터 캐시 저장 완료 (top ${topCount})`);
      
      return formattedText;
    } catch (_error) {
      logger.error('AI용 메타 덱 데이터 생성 실패:', _error);
      return '현재 메타 덱 데이터를 로드할 수 없습니다.';
    }
  }

  /**
   * 상위 N개 메타 덱만 가져오기
   */
  async getTopMetaDecks(topCount: number = 10): Promise<MetaDeck[]> {
    try {
      const cacheKey = `${this.CACHE_KEYS.META_DECKS_TOP}_${topCount}`;
      
      // 캐시에서 먼저 확인
      const cached = await cacheManager.get<MetaDeck[]>(cacheKey);
      if (cached) {
        logger.debug(`상위 ${topCount}개 메타 덱 캐시 히트`);
        return cached;
      }

      // 전체 메타 덱에서 상위 N개 추출
      const allMetaDecks = await this.getMetaDecks();
      const topDecks = Array.isArray(allMetaDecks) ? allMetaDecks.slice(0, topCount) : [];
      
      // 캐시 저장
      await cacheManager.set(cacheKey, topDecks, this.CACHE_TTL.TOP_DECKS);
      logger.info(`상위 ${topCount}개 메타 덱 캐시 저장 완료`);
      
      return topDecks;
    } catch (_error) {
      logger.error(`상위 ${topCount}개 메타 덱 로드 실패:`, _error);
      return [];
    }
  }

  /**
   * 캐시 수동 새로고침
   */
  async refreshCache(): Promise<boolean> {
    const now = Date.now();
    
    // 최소 간격 체크
    if (now - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
      logger.warn('메타 덱 캐시 새로고침 간격 제한 (10분 미만)');
      return false;
    }

    // 동시 새로고침 방지
    if (this.isRefreshing) {
      logger.warn('메타 덱 캐시 새로고침 이미 진행 중');
      return false;
    }

    try {
      this.isRefreshing = true;
      logger.info('메타 덱 캐시 수동 새로고침 시작');

      // 모든 캐시 키 삭제
      const cacheKeys = Object.values(this.CACHE_KEYS);
      const additionalKeys = [
        `${this.CACHE_KEYS.META_DECKS_AI}_10`,
        `${this.CACHE_KEYS.META_DECKS_AI}_15`,
        `${this.CACHE_KEYS.META_DECKS_TOP}_10`,
        `${this.CACHE_KEYS.META_DECKS_TOP}_15`
      ];

      await Promise.all([
        ...cacheKeys.map(key => cacheManager.del(key)),
        ...additionalKeys.map(key => cacheManager.del(key))
      ]);

      // 새로운 데이터 미리 로드
      await this.getMetaDecks();
      await this.getMetaDecksForAI(10);
      await this.getTopMetaDecks(10);

      this.lastRefreshTime = now;
      logger.info('메타 덱 캐시 수동 새로고침 완료');
      
      return true;
    } catch (_error) {
      logger.error('메타 덱 캐시 새로고침 실패:', _error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 캐시 상태 조회
   */
  async getCacheStatus(): Promise<CacheStatusResponse | { _error: string }> {
    try {
      const status: { [key: string]: CacheStatus } = {};
      
      for (const [name, key] of Object.entries(this.CACHE_KEYS)) {
        const cached = await cacheManager.get(key);
        status[name] = {
          exists: !!cached,
          size: cached ? JSON.stringify(cached).length : 0,
          type: Array.isArray(cached) ? 'array' : typeof cached
        };
      }

      return {
        status,
        lastRefreshTime: this.lastRefreshTime,
        isRefreshing: this.isRefreshing
      };
    } catch (_error: any) {
      logger.error('캐시 상태 조회 실패:', _error);
      return { _error: _error.message };
    }
  }

  /**
   * 캐시 통계
   */
  async getCacheStats(): Promise<CacheStats | { _error: string }> {
    try {
      const stats = await this.getCacheStatus();
      
      if ('_error' in stats) {
        return stats;
      }
      
      const statusObj = (stats as any).status || {};
      const totalCacheSize = Object.values(statusObj)
        .reduce((sum: number, cache: any) => sum + (cache.size || 0), 0);

      return {
        totalCaches: Object.keys(this.CACHE_KEYS).length,
        totalSize: totalCacheSize,
        cachesActive: Object.values(statusObj)
          .filter((cache: any) => cache.exists).length,
        lastRefreshTime: this.lastRefreshTime,
        isRefreshing: this.isRefreshing
      };
    } catch (_error: any) {
      logger.error('캐시 통계 조회 실패:', _error);
      return { _error: _error.message };
    }
  }
}

// 싱글톤 인스턴스
const metaCacheService = new MetaCacheService();

// 기존 함수들과 새로운 캐시 서비스 내보내기
export default {
    getMetaDecks,
    getTopMetaDecks,
    formatMetaDecksForAI,
    clearMetaDecksCache,
    metaCacheService
};

// 캐시 서비스 인스턴스도 별도로 내보내기
export { metaCacheService };