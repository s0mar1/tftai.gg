/**
 * GraphQL DataLoader 시스템
 * N+1 쿼리 문제 해결을 위한 배치 로딩 구현
 */

import DataLoader from 'dataloader';
import logger from '../config/logger';
import cacheManager from '../services/cacheManager';

// 모델 imports
import DeckTier, { IDeckTier } from '../models/DeckTier';

// 서비스 imports
import { getTFTDataWithLanguage } from '../services/tftData';
import { getSummonerByPuuid, getLeagueEntriesByPuuid, getMatchHistory } from '../services/riotApi';

// 타입 imports
import type { TFTData } from '../services/tftData';

/**
 * Champions 데이터 배치 로더
 */
class ChampionsDataLoader {
  private loader: DataLoader<string, TFTData | null>;

  constructor() {
    this.loader = new DataLoader<string, TFTData | null>(
      async (languages: readonly string[]) => {
        logger.debug(`🔄 DataLoader: 챔피언 데이터 배치 로딩 - 언어: ${languages.join(', ')}`);
        
        const results: (TFTData | null)[] = [];
        
        for (const language of languages) {
          try {
            // 캐시 우선 확인
            const cacheKey = `champions:${language}`;
            let championData = await cacheManager.get<TFTData>(cacheKey);
            
            if (!championData) {
              // 캐시에 없으면 서비스에서 조회
              championData = await getTFTDataWithLanguage(language);
              
              if (championData) {
                // 캐시에 저장 (1시간 TTL)
                await cacheManager.set(cacheKey, championData, 3600);
              }
            }
            
            results.push(championData);
          } catch (error) {
            logger.error(`❌ DataLoader 챔피언 데이터 로딩 실패 - 언어: ${language}`, error);
            results.push(null);
          }
        }
        
        return results;
      },
      {
        // 캐시 비활성화 (Redis/메모리 캐시를 대신 사용)
        cache: false,
        // 배치 사이즈 제한
        maxBatchSize: 5,
        // 배치 함수 호출 지연 (밀리초)
        batchScheduleFn: (callback) => setTimeout(callback, 16)
      }
    );
  }

  async load(language: string): Promise<TFTData | null> {
    return this.loader.load(language);
  }

  clear(language?: string): void {
    if (language) {
      this.loader.clear(language);
    } else {
      this.loader.clearAll();
    }
  }
}

/**
 * Tierlist 덱 배치 로더
 */
class TierlistDataLoader {
  private byTierLoader: DataLoader<string, any[]>;
  private byIdLoader: DataLoader<string, any | null>;

  constructor() {
    // 티어별 덱 리스트 로더
    this.byTierLoader = new DataLoader<string, IDeckTier[]>(
      async (tiers: readonly string[]) => {
        logger.debug(`🔄 DataLoader: 티어별 덱 배치 로딩 - 티어: ${tiers.join(', ')}`);
        
        const results: any[][] = [];
        
        for (const tier of tiers) {
          try {
            const cacheKey = `tierlist:tier:${tier}`;
            let decks = await cacheManager.get<any[]>(cacheKey);
            
            if (!decks) {
              decks = await DeckTier.find({ tierRank: tier })
                .sort({ averagePlacement: 1, winCount: -1 })
                .limit(20)
                .lean()
                .exec() as any[];
                
              if (decks.length > 0) {
                await cacheManager.set(cacheKey, decks, 1800); // 30분 캐시
              }
            }
            
            results.push(decks || []);
          } catch (error) {
            logger.error(`❌ DataLoader 티어별 덱 로딩 실패 - 티어: ${tier}`, error);
            results.push([]);
          }
        }
        
        return results;
      },
      { cache: false, maxBatchSize: 10 }
    );

    // 덱 ID별 개별 로더
    this.byIdLoader = new DataLoader<string, IDeckTier | null>(
      async (ids: readonly string[]) => {
        logger.debug(`🔄 DataLoader: 덱 ID 배치 로딩 - ID 수: ${ids.length}`);
        
        const results: (any | null)[] = [];
        
        try {
          // MongoDB에서 한 번에 여러 ID 조회
          const decks = await DeckTier.find({ 
            _id: { $in: ids } 
          })
          .lean()
          .exec() as any[];
          
          // ID 순서대로 결과 정렬
          const deckMap = new Map(decks.map(deck => [deck._id?.toString(), deck]));
          
          for (const id of ids) {
            results.push(deckMap.get(id) || null);
          }
          
        } catch (error) {
          logger.error('❌ DataLoader 덱 ID 배치 로딩 실패', error);
          // 에러 시 모든 결과를 null로 설정
          for (let i = 0; i < ids.length; i++) {
            results.push(null);
          }
        }
        
        return results;
      },
      { cache: false, maxBatchSize: 50 }
    );
  }

  async loadByTier(tier: string): Promise<any[]> {
    return this.byTierLoader.load(tier);
  }

  async loadById(id: string): Promise<any | null> {
    return this.byIdLoader.load(id);
  }

  clear(): void {
    this.byTierLoader.clearAll();
    this.byIdLoader.clearAll();
  }
}

/**
 * Summoner 데이터 배치 로더
 */
class SummonerDataLoader {
  private byPuuidLoader: DataLoader<{puuid: string, region: string}, any | null>;
  private leagueEntriesLoader: DataLoader<{puuid: string, region: string}, any | null>;
  private matchHistoryLoader: DataLoader<{puuid: string, region: string}, any[]>;

  constructor() {
    // PUUID로 소환사 정보 로더
    this.byPuuidLoader = new DataLoader<{puuid: string, region: string}, any | null>(
      async (requests: readonly {puuid: string, region: string}[]) => {
        logger.debug(`🔄 DataLoader: 소환사 정보 배치 로딩 - 요청 수: ${requests.length}`);
        
        const results: (any | null)[] = [];
        
        for (const { puuid, region } of requests) {
          try {
            const cacheKey = `summoner:${puuid}:${region}`;
            let summoner = await cacheManager.get<any>(cacheKey);
            
            if (!summoner) {
              summoner = await getSummonerByPuuid(puuid, region as any);
              
              if (summoner) {
                await cacheManager.set(cacheKey, summoner, 600); // 10분 캐시
              }
            }
            
            results.push(summoner);
          } catch (error) {
            logger.error(`❌ DataLoader 소환사 정보 로딩 실패 - PUUID: ${puuid}`, error);
            results.push(null);
          }
        }
        
        return results;
      },
      {
        cache: false,
        maxBatchSize: 20,
        cacheKeyFn: (key) => key
      }
    );

    // 리그 정보 로더
    this.leagueEntriesLoader = new DataLoader<{puuid: string, region: string}, any | null>(
      async (requests: readonly {puuid: string, region: string}[]) => {
        logger.debug(`🔄 DataLoader: 리그 정보 배치 로딩 - 요청 수: ${requests.length}`);
        
        const results: (any | null)[] = [];
        
        for (const { puuid, region } of requests) {
          try {
            const cacheKey = `league:${puuid}:${region}`;
            let leagueEntry = await cacheManager.get<any>(cacheKey);
            
            if (!leagueEntry) {
              leagueEntry = await getLeagueEntriesByPuuid(puuid, region as any);
              
              if (leagueEntry) {
                await cacheManager.set(cacheKey, leagueEntry, 900); // 15분 캐시
              }
            }
            
            results.push(leagueEntry);
          } catch (error) {
            logger.error(`❌ DataLoader 리그 정보 로딩 실패 - PUUID: ${puuid}`, error);
            results.push(null);
          }
        }
        
        return results;
      },
      {
        cache: false,
        maxBatchSize: 15,
        cacheKeyFn: (key) => key
      }
    );

    // 매치 히스토리 로더
    this.matchHistoryLoader = new DataLoader<{puuid: string, region: string}, any[]>(
      async (requests: readonly {puuid: string, region: string}[]) => {
        logger.debug(`🔄 DataLoader: 매치 히스토리 배치 로딩 - 요청 수: ${requests.length}`);
        
        const results: any[][] = [];
        
        for (const { puuid, region } of requests) {
          try {
            const cacheKey = `matches:${puuid}:${region}`;
            let matches = await cacheManager.get<any[]>(cacheKey);
            
            if (!matches) {
              matches = await getMatchHistory(region as any, puuid);
              
              if (matches && matches.length > 0) {
                await cacheManager.set(cacheKey, matches, 300); // 5분 캐시 (매치는 자주 바뀜)
              }
            }
            
            results.push(matches || []);
          } catch (error) {
            logger.error(`❌ DataLoader 매치 히스토리 로딩 실패 - PUUID: ${puuid}`, error);
            results.push([]);
          }
        }
        
        return results;
      },
      {
        cache: false,
        maxBatchSize: 10, // 매치 히스토리는 비용이 크므로 배치 크기를 작게
        cacheKeyFn: (key) => key
      }
    );
  }

  async loadSummoner(puuid: string, region: string): Promise<any | null> {
    return this.byPuuidLoader.load({ puuid, region });
  }

  async loadLeagueEntries(puuid: string, region: string): Promise<any | null> {
    return this.leagueEntriesLoader.load({ puuid, region });
  }

  async loadMatchHistory(puuid: string, region: string): Promise<any[]> {
    return this.matchHistoryLoader.load({ puuid, region });
  }

  clear(): void {
    this.byPuuidLoader.clearAll();
    this.leagueEntriesLoader.clearAll();
    this.matchHistoryLoader.clearAll();
  }
}

/**
 * DataLoader 팩토리 및 관리자
 */
export class DataLoaderManager {
  private championsLoader: ChampionsDataLoader;
  private tierlistLoader: TierlistDataLoader;
  private summonerLoader: SummonerDataLoader;

  constructor() {
    this.championsLoader = new ChampionsDataLoader();
    this.tierlistLoader = new TierlistDataLoader();
    this.summonerLoader = new SummonerDataLoader();
  }

  // Champions 관련
  async getChampionsData(language: string): Promise<TFTData | null> {
    return this.championsLoader.load(language);
  }

  // Tierlist 관련
  async getTierlistByTier(tier: string): Promise<any[]> {
    return this.tierlistLoader.loadByTier(tier);
  }

  async getDeckById(id: string): Promise<any | null> {
    return this.tierlistLoader.loadById(id);
  }

  // Summoner 관련
  async getSummonerData(puuid: string, region: string): Promise<any | null> {
    return this.summonerLoader.loadSummoner(puuid, region);
  }

  async getLeagueData(puuid: string, region: string): Promise<any | null> {
    return this.summonerLoader.loadLeagueEntries(puuid, region);
  }

  async getMatchHistoryData(puuid: string, region: string): Promise<any[]> {
    return this.summonerLoader.loadMatchHistory(puuid, region);
  }

  // 캐시 관리
  clearAllLoaders(): void {
    this.championsLoader.clear();
    this.tierlistLoader.clear();
    this.summonerLoader.clear();
  }

  clearChampionsCache(language?: string): void {
    this.championsLoader.clear(language);
  }

  clearTierlistCache(): void {
    this.tierlistLoader.clear();
  }

  clearSummonerCache(): void {
    this.summonerLoader.clear();
  }

  // 성능 통계
  getPerformanceStats(): any {
    return {
      timestamp: new Date().toISOString(),
      loadersInitialized: true,
      cacheStatus: 'DataLoader 자체 캐싱은 비활성화됨 (Redis/메모리 캐시 사용)'
    };
  }
}

// 싱글톤 인스턴스
const dataLoaderManager = new DataLoaderManager();

export default dataLoaderManager;

// 개별 로더들도 내보내기 (필요시 직접 접근용)
export {
  ChampionsDataLoader,
  TierlistDataLoader,
  SummonerDataLoader
};