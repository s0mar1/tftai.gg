/**
 * GraphQL Query 리졸버
 * 기존 REST API 서비스들을 재사용하여 GraphQL 쿼리를 처리합니다.
 */

import logger from '../../config/logger';
import { getTFTDataWithLanguage } from '../../services/tftData';
import DeckTier from '../../models/DeckTier';
import { getAccountByRiotId, getSummonerByPuuid, getLeagueEntriesByPuuid } from '../../services/riotApi';
import { sendSuccess } from '../../utils/responseHelper';
import graphqlResponseCache from '../responseCache';
import { safeStringifyForLogging } from '../../utils/safeStringify';
import { getTraitStyleInfo } from '../../utils/tft-helpers';

// 타입 import
import type { 
  QueryResolvers, 
  Language, 
  ChampionResponse, 
  TierlistResponse, 
  SummonerResponse,
  SummonerIntegratedResponse,
  SummonerIntegratedArgs,
  MatchInfo,
  UnitInfo,
  CompanionInfo,
  LeagueInfo,
  TraitInfo,
  GraphQLContext
} from '../types';
import type { TFTData } from '../../services/tftData';

/**
 * 언어 코드를 GraphQL enum에서 실제 언어 코드로 변환
 */
function convertLanguage(gqlLanguage: Language | undefined): string {
  const languageMap: Record<Language, string> = {
    KO: 'ko',
    EN: 'en', 
    JA: 'ja',
    ZH: 'zh'
  };
  
  return languageMap[gqlLanguage || 'KO'] || 'ko';
}

/**
 * 챔피언 ID를 이미지 URL로 매핑하는 헬퍼 함수
 */
function getChampionImageUrl(championId: string, tftData?: TFTData): string {
  if (!tftData || !championId) {
    logger.debug('getChampionImageUrl: tftData 또는 championId가 없음', { championId, hasTftData: !!tftData });
    return '';
  }
  
  // 디버깅을 위한 로그
  logger.debug('getChampionImageUrl 시작', { 
    championId, 
    championsCount: tftData.champions?.length || 0 
  });
  
  // TFT 정적 데이터에서 챔피언 찾기 - 다양한 매핑 방법 시도
  const champion = tftData.champions?.find(champ => {
    // 1. 정확한 apiName 매칭
    if (champ.apiName === championId) return true;
    
    // 2. 대소문자 무시 apiName 매칭
    if (champ.apiName?.toLowerCase() === championId.toLowerCase()) return true;
    
    // 3. character_id 형식 매칭 (예: TFT11_Ahri)
    if (champ.character_id === championId) return true;
    if (champ.character_id?.toLowerCase() === championId.toLowerCase()) return true;
    
    // 4. 이름으로 매칭
    if (champ.name === championId) return true;
    if (champ.name?.toLowerCase() === championId.toLowerCase()) return true;
    
    // 5. Set 번호 차이를 고려한 매칭 (예: TFT15_Ahri vs TFT11_Ahri)
    const championBase = championId.replace(/TFT\d+_/i, '');
    const champApiBase = champ.apiName?.replace(/TFT\d+_/i, '');
    if (champApiBase?.toLowerCase() === championBase.toLowerCase()) return true;
    
    // 6. 언더스코어 변형 매칭 (예: TFT_Ahri, TFT11Ahri 등)
    const normalizedChampionId = championId.replace(/[_\s]/g, '').toLowerCase();
    const normalizedApiName = champ.apiName?.replace(/[_\s]/g, '').toLowerCase();
    if (normalizedApiName === normalizedChampionId) return true;
    
    return false;
  });
  
  if (champion) {
    const imageUrl = champion.image_url || champion.tileIcon || champion.icon || '';
    logger.debug('챔피언 이미지 URL 찾음', { 
      championId, 
      foundChampion: champion.apiName || champion.name,
      imageUrl: imageUrl ? '설정됨' : '비어있음'
    });
    return imageUrl;
  } else {
    // 찾지 못한 경우 상세 로그
    logger.warn('챔피언을 찾을 수 없음', { 
      championId,
      availableChampions: tftData.champions?.slice(0, 5).map(c => c.apiName || c.name).join(', ') + '...'
    });
    return '';
  }
}

/**
 * 특성 데이터를 TFT 정적 데이터와 매핑하는 헬퍼 함수
 */
function mapTraitWithTFTData(traitName: string, level: number, tftData?: TFTData): any {
  if (!tftData || !traitName) {
    return {
      name: traitName,
      apiName: traitName,
      level: level,
      description: '',
      style: level > 0 ? 'active' : 'inactive',
      styleOrder: level
    };
  }
  
  // TFT 정적 데이터에서 특성 찾기 (다양한 매핑 방식 시도)
  const trait = tftData.traits?.find(t => 
    t.apiName === traitName || 
    t.name === traitName ||
    t.apiName?.toLowerCase() === traitName.toLowerCase() ||
    t.name?.toLowerCase() === traitName.toLowerCase()
  );
  
  return {
    name: trait?.name || traitName,
    apiName: trait?.apiName || traitName,
    level: level,
    description: trait?.desc || trait?.description || '',
    style: level > 0 ? (trait?.style || 'active') : 'inactive',
    styleOrder: level
  };
}

/**
 * 챔피언 데이터 변환 헬퍼
 */
function transformChampionData(rawData: any): any {
  if (!rawData || !rawData.data || !rawData.data.TFTChampions) {
    return {
      TFTChampions: []
    };
  }

  // 원본 객체 형태를 GraphQL 스키마에 맞게 변환
  const transformedChampions = Object.entries(rawData.data.TFTChampions).map(([key, champion]: [string, any]) => ({
    key,
    champion: {
      name: champion.name || '',
      cost: champion.cost || 0,
      traits: champion.traits || [],
      ability: champion.ability ? {
        name: champion.ability.name || '',
        description: champion.ability.description || ''
      } : undefined,
      stats: champion.stats ? {
        health: champion.stats.health || 0,
        mana: champion.stats.mana || 0,
        damage: champion.stats.damage || 0,
        armor: champion.stats.armor || 0,
        magicResist: champion.stats.magicResist || 0,
        attackSpeed: champion.stats.attackSpeed || 0,
        critChance: champion.stats.critChance || 0
      } : undefined
    }
  }));

  return {
    TFTChampions: transformedChampions
  };
}

/**
 * 티어리스트 데이터 변환 헬퍼
 * DeckTier MongoDB 모델과 GraphQL 스키마 간 매핑
 */
async function transformTierlistData(decks: any[], language: string = 'ko', tftData?: TFTData): Promise<any> {
  if (!Array.isArray(decks)) {
    return {
      decks: [],
      lastUpdated: new Date().toISOString(),
      totalDecks: 0
    };
  }

  const langKey = language === 'en' ? 'en' : language === 'ja' ? 'ja' : language === 'zh' ? 'zh' : 'ko';

  // TFT 정적 데이터가 없으면 가져오기
  if (!tftData) {
    try {
      tftData = await getTFTDataWithLanguage(language);
    } catch (error) {
      logger.warn('TFT 정적 데이터를 가져올 수 없음, 기본값 사용');
    }
  }

  const transformedDecks = decks.map(deck => {
    // DeckTier 모델의 다국어 필드에서 언어별 데이터 추출
    const deckName = deck.carryChampionName?.[langKey] || deck.carryChampionName?.ko || 'Unknown Deck';
    const mainTrait = deck.mainTraitName?.[langKey] || deck.mainTraitName?.ko || '';
    
    // 승률과 평균 순위 계산
    const winRate = deck.totalGames > 0 ? (deck.winCount / deck.totalGames) * 100 : 0;
    const playRate = 10; // 기본값 (실제로는 전체 게임 대비 비율 계산 필요)
    
    return {
      id: deck._id?.toString() || deck.deckKey || '',
      name: deckName,
      tier: deck.tierRank || 'C',
      // 챔피언 전체 정보 추출 (coreUnits에서)
      champions: (deck.coreUnits || []).map((unit: any) => {
        // TFT 정적 데이터에서 챔피언 찾기
        const champion = tftData?.champions?.find(champ => 
          champ.apiName === unit.apiName || 
          champ.character_id === unit.apiName ||
          champ.apiName?.toLowerCase() === unit.apiName?.toLowerCase()
        );
        
        // Community Dragon CDN URL 수정: /cdragon/tft/assets/ -> /game/assets/
        let imageUrl = unit.image_url || champion?.tileIcon || champion?.icon || '';
        if (imageUrl.includes('/cdragon/tft/assets/')) {
          imageUrl = imageUrl.replace('/cdragon/tft/assets/', '/game/assets/');
        }
        // 추가 CDN 경로 수정
        if (imageUrl.includes('/cdragon/')) {
          imageUrl = imageUrl.replace('/cdragon/', '/game/');
        }
        
        return {
          name: unit.name?.[langKey] || unit.name?.ko || champion?.name || unit.apiName || '',
          apiName: unit.apiName || '',
          image_url: imageUrl,
          cost: unit.cost || champion?.cost || 1,
          tier: unit.tier || 1,
          traits: unit.traits || champion?.traits || [],
          recommendedItems: (unit.recommendedItems || []).map((item: any) => {
            // 아이템 이미지 URL도 CDN 경로 수정
            let itemImageUrl = item.image_url || '';
            if (itemImageUrl.includes('/cdragon/tft/assets/')) {
              itemImageUrl = itemImageUrl.replace('/cdragon/tft/assets/', '/game/assets/');
            }
            if (itemImageUrl.includes('/cdragon/')) {
              itemImageUrl = itemImageUrl.replace('/cdragon/', '/game/');
            }
            
            return {
              name: item.name?.[langKey] || item.name?.ko || '',
              image_url: itemImageUrl
            };
          })
        };
      }),
      // 특성 정보 (coreUnits에서 traits 추출 및 집계)
      traits: (() => {
        const traitMap = new Map<string, number>();
        
        // coreUnits에서 모든 특성 수집 및 카운트
        (deck.coreUnits || []).forEach((unit: any) => {
          (unit.traits || []).forEach((trait: string) => {
            traitMap.set(trait, (traitMap.get(trait) || 0) + 1);
          });
        });
        
        // 수량이 많은 특성 순으로 정렬하여 상위 6개만 반환 (화면에 표시할 만큼)
        return Array.from(traitMap.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([traitName, count]) => {
            // TFT 정적 데이터에서 특성 정보 찾기
            const trait = tftData?.traits?.find(t => 
              t.apiName === traitName || 
              t.name === traitName ||
              t.apiName?.toLowerCase() === traitName.toLowerCase()
            );
            
            // 실제 특성 레벨 계산 (TFT 게임 로직에 따라)
            // 특성별로 활성화 임계값이 다르지만, 일반적인 패턴을 사용
            let actualLevel = count;
            
            // 일반적인 특성 임계값 매핑
            if (count >= 7) actualLevel = 6; // 최고 레벨
            else if (count >= 5) actualLevel = 5;
            else if (count >= 4) actualLevel = 4;
            else if (count >= 3) actualLevel = 3;
            else if (count >= 2) actualLevel = 2;
            else if (count >= 1) actualLevel = 1;
            else actualLevel = 0;
            
            return {
              name: trait?.name || traitName,
              apiName: traitName, // 원본 API명 유지
              level: actualLevel,
              description: trait?.desc || trait?.description || ''
            };
          })
          .filter(trait => trait.level > 0); // 활성화된 특성만 반환
      })(),
      winRate: Math.round(winRate * 100) / 100,
      playRate: playRate,
      avgPlacement: deck.averagePlacement || 4.0,
      // 핵심 유닛들 (carryChampionName과 주요 coreUnits 포함)
      keyUnits: [
        deck.carryChampionName?.[langKey] || deck.carryChampionName?.ko || '',
        ...(deck.coreUnits || [])
          .filter((unit: any) => unit.isCarry || unit.tier >= 2)
          .slice(0, 2) // 최대 3개까지 (carry + 2개)
          .map((unit: any) => unit.name?.[langKey] || unit.name?.ko || unit.apiName || '')
      ].filter(name => name && name.trim()), // 빈 값 제거
      // 아이템 정보 (coreUnits의 recommendedItems에서 추출)
      items: (deck.coreUnits || []).flatMap((unit: any) => 
        (unit.recommendedItems || []).map((item: any) => ({
          name: item.name?.[langKey] || item.name?.ko || '',
          champion: unit.name?.[langKey] || unit.name?.ko || unit.apiName || '',
          priority: 'HIGH'
        }))
      )
    };
  });

  return {
    decks: transformedDecks,
    lastUpdated: new Date().toISOString(),
    totalDecks: transformedDecks.length
  };
}

/**
 * 소환사 데이터 변환 헬퍼
 */
function transformSummonerData(summonerData: any, region: string): any {
  if (!summonerData || !summonerData.data) {
    throw new Error('소환사 데이터를 찾을 수 없습니다');
  }

  const data = summonerData.data;
  
  return {
    summoner: {
      puuid: data.puuid || '',
      summonerId: data.summonerId || data.id || '',
      name: data.name || '',
      profileIconId: data.profileIconId || 0,
      summonerLevel: data.summonerLevel || 0,
      tier: data.tier,
      rank: data.rank,
      leaguePoints: data.leaguePoints,
      wins: data.wins,
      losses: data.losses
    },
    region: region
  };
}

export const queryResolvers: QueryResolvers = {
  /**
   * 챔피언 정보 조회 (DataLoader + Response Cache로 완전 최적화)
   */
  async champions(_parent, args, context: GraphQLContext): Promise<ChampionResponse> {
    try {
      const language = convertLanguage(args.language);
      const operation = 'champions';
      
      // 1. Response Cache에서 먼저 확인
      const cachedResponse = await graphqlResponseCache.get<ChampionResponse>(operation, { language });
      if (cachedResponse) {
        logger.info(`🎯 GraphQL Champions 캐시 HIT: language=${language}, requestId=${context.requestId}`);
        return cachedResponse.data;
      }
      
      logger.info(`🔍 GraphQL Champions 쿼리 (DataLoader): language=${language}, requestId=${context.requestId}`);
      
      const startTime = Date.now();
      
      // DataLoader를 통한 배치 로딩 (안전한 에러 핸들링)
      let staticData;
      try {
        staticData = await context.dataLoaders.getChampionsData(language);
        logger.info(`🔍 DataLoader 응답 구조:`, {
          hasStaticData: !!staticData,
          staticDataType: typeof staticData,
          hasChampions: !!(staticData && staticData.champions),
          championsType: staticData && typeof staticData.champions,
          championsIsArray: staticData && Array.isArray(staticData.champions),
          championsLength: staticData && staticData.champions ? staticData.champions.length : 'N/A'
        });
      } catch (dataLoaderError) {
        logger.error(`❌ DataLoader 에러:`, dataLoaderError);
        const processingTime = Date.now() - startTime;
        return {
          success: false,
          data: null,
          message: 'DataLoader에서 데이터 로딩 실패',
          error: {
            code: 'DATALOADER_ERROR',
            message: `DataLoader 에러: ${dataLoaderError instanceof Error ? dataLoaderError.message : 'Unknown error'}`
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime
          }
        };
      }
      
      const processingTime = Date.now() - startTime;
      
      // 데이터 유효성 검사 강화
      if (!staticData) {
        logger.warn(`⚠️ GraphQL Champions: staticData가 null/undefined (language=${language})`);
        return {
          success: false,
          data: null,
          message: '챔피언 데이터를 찾을 수 없습니다',
          error: {
            code: 'DATA_NOT_FOUND',
            message: 'staticData가 null 또는 undefined입니다'
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime
          }
        };
      }
      
      if (!staticData.champions) {
        logger.warn(`⚠️ GraphQL Champions: champions 필드가 없음 (language=${language})`, {
          staticDataKeys: Object.keys(staticData || {})
        });
        return {
          success: false,
          data: null,
          message: '챔피언 데이터를 찾을 수 없습니다',
          error: {
            code: 'DATA_NOT_FOUND',
            message: 'champions 필드가 존재하지 않습니다'
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime
          }
        };
      }
      
      if (!Array.isArray(staticData.champions)) {
        logger.warn(`⚠️ GraphQL Champions: champions가 배열이 아님 (language=${language})`, {
          championsType: typeof staticData.champions,
          championsValue: staticData.champions
        });
        return {
          success: false,
          data: null,
          message: '챔피언 데이터 형식이 올바르지 않습니다',
          error: {
            code: 'INVALID_DATA_FORMAT',
            message: 'champions가 배열 형태가 아닙니다'
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime
          }
        };
      }
      
      // 데이터 구조를 GraphQL 응답 형태로 변환 (배열 형태 유지, null 값 방지)
      let validChampions;
      try {
        validChampions = staticData.champions.filter((champion: any) => {
          // 필수 필드가 있는 챔피언만 포함
          const hasValidName = champion.display_name || champion.name || champion.character_id;
          const hasValidKey = champion.apiName || champion.name || champion.character_id;
          return hasValidName && hasValidKey && champion.cost !== undefined;
        });
        
        logger.info(`🔍 챔피언 필터링 결과: 전체 ${staticData.champions.length}개 -> 유효 ${validChampions.length}개`);
      } catch (filterError) {
        logger.error(`❌ 챔피언 필터링 에러:`, filterError);
        return {
          success: false,
          data: null,
          message: '챔피언 데이터 처리 중 오류 발생',
          error: {
            code: 'DATA_PROCESSING_ERROR',
            message: `필터링 에러: ${filterError instanceof Error ? filterError.message : 'Unknown error'}`
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime
          }
        };
      }

      // 안전한 데이터 변환
      let wrappedData;
      try {
        wrappedData = {
          success: true,
          data: {
            TFTChampions: validChampions.map((champion: any) => {
              if (!champion) {
                logger.warn('⚠️ null 챔피언 발견, 건너뛰기');
                return null;
              }
              
              return {
                key: champion.apiName || champion.name || champion.character_id || 'unknown',
                champion: {
                  name: champion.display_name || champion.name || champion.character_id || 'Unknown Champion',
                  cost: typeof champion.cost === 'number' ? champion.cost : 0,
                  traits: Array.isArray(champion.traits) ? champion.traits : [],
                  ability: champion.ability ? {
                    name: champion.ability.name || 'Unknown Ability',
                    description: champion.ability.description || 'No description available'
                  } : {
                    name: 'Unknown Ability',
                    description: 'No description available'
                  },
                  stats: champion.stats ? {
                    health: champion.stats.health || 0,
                    mana: champion.stats.mana || 0,
                    damage: champion.stats.damage || 0,
                    armor: champion.stats.armor || 0,
                    magicResist: champion.stats.magicResist || 0,
                    attackSpeed: champion.stats.attackSpeed || 0.0,
                    critChance: champion.stats.critChance || 0.0
                  } : {
                    health: 0,
                    mana: 0,
                    damage: 0,
                    armor: 0,
                    magicResist: 0,
                    attackSpeed: 0.0,
                    critChance: 0.0
                  }
                }
              };
            }).filter(item => item !== null) // null 항목 제거
          }
        };
        
        logger.info(`🔍 데이터 변환 완료: ${wrappedData.data.TFTChampions.length}개 챔피언 변환됨`);
      } catch (transformError) {
        logger.error(`❌ 데이터 변환 에러:`, transformError);
        return {
          success: false,
          data: null,
          message: '챔피언 데이터 변환 중 오류 발생',
          error: {
            code: 'DATA_TRANSFORM_ERROR',
            message: `변환 에러: ${transformError instanceof Error ? transformError.message : 'Unknown error'}`
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime
          }
        };
      }
      
      const transformedData = wrappedData.data;
      
      logger.info(`✅ GraphQL Champions 쿼리 완료: ${transformedData.TFTChampions.length}개 챔피언`);
      
      const response: ChampionResponse = {
        success: true,
        data: transformedData,
        message: '챔피언 데이터를 성공적으로 조회했습니다',
        meta: {
          timestamp: new Date().toISOString(),
          processingTime,
          version: '1.0.0'
        }
      };
      
      // 2. 성공적인 응답을 캐시에 저장 (복잡도 3, 태그: champions) - 임시 비활성화
      try {
        await graphqlResponseCache.set(
          operation,
          { language },
          response,
          { 
            complexity: 3,
            tags: ['champions', language],
            ttl: 3600 // 1시간 캐시
          },
          context.requestId,
          processingTime
        );
      } catch (cacheError) {
        logger.warn('⚠️ GraphQL Response Cache 저장 실패:', cacheError);
        // 캐시 에러는 무시하고 계속 진행
      }
      
      return response;
      
    } catch (error: any) {
      // 안전한 에러 로깅 - 순환 참조 방지
      const safeError = {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack?.split('\n').slice(0, 10).join('\n'),
        code: error?.code,
        status: error?.status || error?.statusCode
      };
      
      logger.error('❌ GraphQL Champions 쿼리 오류:', {
        error: safeError,
        query: 'champions',
        args: { language },
        requestId: context.requestId
      });
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '서버 내부 오류가 발생했습니다'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }
  },

  /**
   * 티어리스트 조회 (DataLoader + Response Cache로 완전 최적화)
   */
  async tierlist(_parent, args, context: GraphQLContext): Promise<TierlistResponse> {
    try {
      const language = convertLanguage(args.language);
      const operation = 'tierlist';
      
      console.log(`🔍 Tierlist query started - Language: ${language}`);
      
      // 1. Response Cache에서 먼저 확인
      const cachedResponse = await graphqlResponseCache.get<TierlistResponse>(operation, { language });
      if (cachedResponse) {
        logger.info(`🎯 GraphQL Tierlist 캐시 HIT: language=${language}, requestId=${context.requestId}`);
        return cachedResponse.data;
      }
      
      logger.info(`🔍 GraphQL Tierlist 쿼리 (DataLoader): language=${language}, requestId=${context.requestId}`);
      
      const startTime = Date.now();
      
      // 모든 티어의 덱을 병렬로 조회 (DataLoader 배치 처리)
      const [sDecks, aDecks, bDecks, cDecks, dDecks] = await Promise.all([
        context.dataLoaders.getTierlistByTier('S'),
        context.dataLoaders.getTierlistByTier('A'),
        context.dataLoaders.getTierlistByTier('B'),
        context.dataLoaders.getTierlistByTier('C'),
        context.dataLoaders.getTierlistByTier('D')
      ]);
      
      // 모든 덱을 합치고 정렬
      const allDecks = [...sDecks, ...aDecks, ...bDecks, ...cDecks, ...dDecks]
        .sort((a, b) => {
          // 티어 우선순위로 먼저 정렬
          const tierOrder = { 'S': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
          const tierDiff = (tierOrder[a.tierRank as keyof typeof tierOrder] || 5) - (tierOrder[b.tierRank as keyof typeof tierOrder] || 5);
          if (tierDiff !== 0) return tierDiff;
          
          // 같은 티어 내에서는 평균 순위와 승률로 정렬
          const avgPlacementDiff = (a.averagePlacement || 8) - (b.averagePlacement || 8);
          if (Math.abs(avgPlacementDiff) > 0.001) return avgPlacementDiff;
          
          const winRateDiff = ((b.winCount || 0) / (b.totalGames || 1)) - ((a.winCount || 0) / (a.totalGames || 1));
          return winRateDiff;
        })
        .slice(0, 50); // 최대 50개로 제한
        
      const processingTime = Date.now() - startTime;
      
      // TFT 정적 데이터 가져오기
      const tftData = await getTFTDataWithLanguage(language);
      const transformedData = await transformTierlistData(allDecks, language, tftData);
      console.log(`✅ Tierlist data transformed - Total decks: ${transformedData.decks.length}`);
      
      logger.info(`✅ GraphQL Tierlist 쿼리 완료 (DataLoader): ${transformedData.totalDecks}개 덱`);
      
      const response: TierlistResponse = {
        success: true,
        data: transformedData,
        message: '티어리스트를 성공적으로 조회했습니다',
        meta: {
          timestamp: new Date().toISOString(),
          processingTime,
          version: '1.0.0'
        }
      };
      
      // 2. 성공적인 응답을 캐시에 저장 (복잡도 5, 태그: tierlist)
      await graphqlResponseCache.set(
        operation,
        { language },
        response,
        { 
          complexity: 5, // 더 복잡한 쿼리
          tags: ['tierlist', language],
          ttl: 1800 // 30분 캐시 (더 자주 변경됨)
        },
        context.requestId,
        processingTime
      );
      
      return response;
      
    } catch (error: any) {
      // 안전한 에러 로깅 - 순환 참조 방지
      const safeError = {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack?.split('\n').slice(0, 10).join('\n'),
        code: error?.code,
        status: error?.status || error?.statusCode
      };
      
      logger.error('❌ GraphQL Tierlist 쿼리 오류:', {
        error: safeError,
        query: 'tierlist',
        args: { language },
        requestId: context.requestId
      });
      
      return {
        success: false,
        error: {
          code: 'TIERLIST_FETCH_ERROR',
          message: error.message || '티어리스트 데이터를 가져올 수 없습니다'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }
  },

  /**
   * 소환사 정보 조회 (DataLoader + 단시간 Response Cache로 최적화)
   */
  async summoner(_parent, args, context: GraphQLContext): Promise<SummonerResponse> {
    try {
      const { name, region = 'kr' } = args;
      const operation = 'summoner';
      
      // 1. Response Cache에서 확인 (소환사는 5분간만 캐시)
      const cachedResponse = await graphqlResponseCache.get<SummonerResponse>(operation, { name, region });
      if (cachedResponse) {
        logger.info(`🎯 GraphQL Summoner 캐시 HIT: name=${name}, region=${region}, requestId=${context.requestId}`);
        return cachedResponse.data;
      }
      
      logger.info(`🔍 GraphQL Summoner 쿼리 (DataLoader): name=${name}, region=${region}, requestId=${context.requestId}`);
      
      const startTime = Date.now();
      
      // gameName과 tagLine을 분리 (기본값은 KR)
      const [gameName, tagLine = 'KR'] = name.includes('#') ? name.split('#') : [name, 'KR'];
      
      // 1. Account 정보 조회 (RIOT ID 기반) - 이 부분은 DataLoader로 최적화하기 어려움 (unique한 요청)
      const accountResult = await getAccountByRiotId(gameName, tagLine, 'asia');
      if (!accountResult) {
        return {
          success: false,
          error: {
            code: 'SUMMONER_NOT_FOUND',
            message: '소환사를 찾을 수 없습니다'
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }
      
      // 2. Summoner 정보와 리그 정보를 DataLoader로 병렬 조회
      const [summonerResult, leagueInfo] = await Promise.all([
        context.dataLoaders.getSummonerData(accountResult.puuid, region),
        context.dataLoaders.getLeagueData(accountResult.puuid, region)
      ]);
      
      if (!summonerResult) {
        return {
          success: false,
          error: {
            code: 'SUMMONER_NOT_FOUND',
            message: '소환사 정보를 찾을 수 없습니다'
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }
      
      const processingTime = Date.now() - startTime;
      
      // 데이터 결합
      const combinedData = {
        success: true,
        data: {
          summoner: {
            puuid: accountResult.puuid,
            summonerId: summonerResult.id || '',
            name: accountResult.gameName + '#' + accountResult.tagLine,
            profileIconId: summonerResult.profileIconId || 0,
            summonerLevel: summonerResult.summonerLevel || 1,
            tier: leagueInfo?.tier,
            rank: leagueInfo?.rank,
            leaguePoints: leagueInfo?.leaguePoints,
            wins: leagueInfo?.wins,
            losses: leagueInfo?.losses
          },
          region
        }
      };
      
      const transformedData = transformSummonerData(combinedData, region);
      
      logger.info(`✅ GraphQL Summoner 쿼리 완료 (DataLoader): ${transformedData.summoner.name}`);
      
      const response: SummonerResponse = {
        success: true,
        data: transformedData,
        message: '소환사 정보를 성공적으로 조회했습니다',
        meta: {
          timestamp: new Date().toISOString(),
          processingTime,
          version: '1.0.0'
        }
      };
      
      // 2. 성공적인 응답을 짧은 시간만 캐시 (복잡도 2, 5분 캐시)
      await graphqlResponseCache.set(
        operation,
        { name, region },
        response,
        { 
          complexity: 2,
          tags: ['summoner', region],
          ttl: 300 // 5분만 캐시 (실시간성이 중요)
        },
        context.requestId,
        processingTime
      );
      
      return response;
      
    } catch (error: any) {
      // 안전한 에러 로깅 - 순환 참조 방지
      const safeError = {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack?.split('\n').slice(0, 10).join('\n'),
        code: error?.code,
        status: error?.status || error?.statusCode
      };
      
      logger.error('❌ GraphQL Summoner 쿼리 오류:', {
        error: safeError,
        query: 'summoner',
        args: { name, region },
        requestId: context.requestId
      });
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '서버 내부 오류가 발생했습니다'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }
  },

  /**
   * 소환사 통합 정보 조회 (Summoner + Matches + League - 3개 REST 호출을 1개 GraphQL 쿼리로 통합)
   */
  async summonerIntegrated(_parent, args: SummonerIntegratedArgs, context: GraphQLContext): Promise<SummonerIntegratedResponse> {
    const { name, region = 'kr', matchCount = 10 } = args;
    const operation = 'summonerIntegrated';
    
    try {
      
      // 1. Response Cache에서 확인 (3분간만 캐시 - 매우 실시간성이 중요)
      const cachedResponse = await graphqlResponseCache.get<SummonerIntegratedResponse>(operation, { name, region, matchCount });
      if (cachedResponse) {
        logger.info(`🎯 GraphQL SummonerIntegrated 캐시 HIT: name=${name}, region=${region}, requestId=${context.requestId}`);
        return cachedResponse.data;
      }
      
      logger.info(`🔍 GraphQL SummonerIntegrated 쿼리 (통합): name=${name}, region=${region}, matchCount=${matchCount}, requestId=${context.requestId}`);
      
      const startTime = Date.now();
      
      // gameName과 tagLine을 분리 (기본값은 KR)
      const [gameName, tagLine = 'KR'] = name.includes('#') ? name.split('#') : [name, 'KR'];
      
      // 1. Account 정보 조회 (RIOT ID 기반)
      const accountResult = await getAccountByRiotId(gameName, tagLine, 'asia');
      if (!accountResult) {
        return {
          success: false,
          error: {
            code: 'SUMMONER_NOT_FOUND',
            message: '소환사를 찾을 수 없습니다'
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }
      
      // 2. 소환사 정보, 리그 정보, 매치 히스토리를 DataLoader로 병렬 조회 (핵심 최적화)
      const [summonerResult, leagueInfo, matchHistory] = await Promise.all([
        context.dataLoaders.getSummonerData(accountResult.puuid, region),
        context.dataLoaders.getLeagueData(accountResult.puuid, region),
        context.dataLoaders.getMatchHistoryData(accountResult.puuid, region)
      ]);
      
      if (!summonerResult) {
        return {
          success: false,
          error: {
            code: 'SUMMONER_NOT_FOUND',
            message: '소환사 정보를 찾을 수 없습니다'
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }
      
      const processingTime = Date.now() - startTime;
      
      // 3. TFT 정적 데이터 조회 (챔피언 이미지 URL과 특성 정보 매핑용)
      const tftData = await getTFTDataWithLanguage('ko');
      
      // 4. 매치 데이터 변환 (최신 matchCount 개만) - MatchCard 컴포넌트와 호환되도록 수정
      const transformedMatches: MatchInfo[] = matchHistory
        .slice(0, matchCount)
        .map((match: any) => {
          // 해당 유저의 참가자 정보 찾기
          const participant = match.info?.participants?.find((p: any) => p.puuid === accountResult.puuid);
          
          return {
            gameId: match.metadata?.match_id || '',
            gameDateTime: new Date(match.info?.game_datetime || Date.now()).toISOString(),
            queueType: match.info?.queue_id?.toString() || '',
            placement: participant?.placement || 0,
            level: participant?.level || 1,
            totalDamageToPlayers: participant?.total_damage_to_players || 0,
            // REST API와 동일한 로직으로 특성 구조 변환
            traits: (participant?.traits || [])
              .map((riotTrait: any) => {
                const currentCount = riotTrait.num_units || riotTrait.tier_current || 0;
                const styleInfo = getTraitStyleInfo(riotTrait.name, currentCount, tftData);

                if (!styleInfo || styleInfo.style === 'inactive') {
                  return null;
                }

                return {
                  name: styleInfo.name,
                  apiName: styleInfo.apiName,
                  level: styleInfo.tier_current || 0, // GraphQL 스키마에서 요구하는 level 필드 (null 방지)
                  description: '', // GraphQL 스키마에서 요구하는 description 필드
                  style: styleInfo.style,
                  styleOrder: styleInfo.styleOrder,
                  // 프론트엔드 호환성을 위해 추가
                  tier_current: styleInfo.tier_current || 0,
                  image_url: styleInfo.image_url
                };
              })
              .filter(trait => trait !== null),
            // REST API와 동일한 로직으로 유닛 구조 변환
            units: (participant?.units || []).map((unit: any) => {
              // REST API와 동일한 챔피언 찾기 로직
              const champion = tftData?.champions?.find(champ => 
                champ.apiName?.toLowerCase() === unit.character_id?.toLowerCase()
              );
              
              // 아이템을 완전한 객체 구조로 변환 (REST API와 동일)
              const processedItems = (unit.itemNames || []).map((itemName: string) => {
                let foundItem: any = null;
                // TFT 정적 데이터에서 아이템 찾기
                for (const category in tftData.items) {
                  if (Array.isArray((tftData.items as any)[category])) {
                    foundItem = (tftData.items as any)[category].find((i: any) => 
                      i.apiName?.toLowerCase() === itemName?.toLowerCase()
                    );
                    if (foundItem) break;
                  }
                }
                
                return {
                  name: foundItem?.name || itemName,
                  image_url: foundItem?.icon || ''
                };
              });
              
              return {
                championId: unit.character_id || '',
                name: champion?.name || unit.character_id || 'Unknown',
                image_url: champion?.tileIcon || '',
                tier: unit.tier || 1,
                cost: champion?.cost || 1, // cost 필드 추가
                items: processedItems // ItemDetail 객체 배열로 반환
              };
            }),
            companionData: participant?.companion ? {
              skinId: participant.companion.skin_ID?.toString() || '',
              speciesId: participant.companion.species || ''
            } : undefined
          };
        });
      
      // 5. 리그 데이터 변환
      const transformedLeagueEntries: LeagueInfo[] = leagueInfo ? [{
        leagueId: leagueInfo.leagueId || '',
        queueType: leagueInfo.queueType || '',
        tier: leagueInfo.tier || '',
        rank: leagueInfo.rank || '',
        summonerId: leagueInfo.summonerId || '',
        leaguePoints: leagueInfo.leaguePoints || 0,
        wins: leagueInfo.wins || 0,
        losses: leagueInfo.losses || 0,
        hotStreak: leagueInfo.hotStreak || false,
        veteran: leagueInfo.veteran || false,
        freshBlood: leagueInfo.freshBlood || false,
        inactive: leagueInfo.inactive || false
      }] : [];
      
      // 5. 통합 데이터 구성
      const integratedData = {
        summoner: {
          puuid: accountResult.puuid,
          summonerId: summonerResult.id || '',
          name: accountResult.gameName + '#' + accountResult.tagLine,
          profileIconId: summonerResult.profileIconId || 0,
          summonerLevel: summonerResult.summonerLevel || 1,
          tier: leagueInfo?.tier,
          rank: leagueInfo?.rank,
          leaguePoints: leagueInfo?.leaguePoints,
          wins: leagueInfo?.wins,
          losses: leagueInfo?.losses
        },
        region,
        recentMatches: transformedMatches,
        leagueEntries: transformedLeagueEntries,
        lastUpdated: new Date().toISOString()
      };
      
      logger.info(`✅ GraphQL SummonerIntegrated 쿼리 완료: ${integratedData.summoner.name}, 매치 ${transformedMatches.length}개`);
      
      const response: SummonerIntegratedResponse = {
        success: true,
        data: integratedData,
        message: '소환사 통합 정보를 성공적으로 조회했습니다',
        meta: {
          timestamp: new Date().toISOString(),
          processingTime,
          version: '1.0.0'
        }
      };
      
      // 6. 성공적인 응답을 짧은 시간만 캐시 (복잡도 8, 3분 캐시)
      await graphqlResponseCache.set(
        operation,
        { name, region, matchCount },
        response,
        { 
          complexity: 8, // 높은 복잡도 (3개 API 호출 통합)
          tags: ['summoner', 'matches', 'league', region],
          ttl: 180 // 3분만 캐시 (매치 데이터의 실시간성 고려)
        },
        context.requestId,
        processingTime
      );
      
      return response;
      
    } catch (error: any) {
      // 안전한 에러 로깅 - 순환 참조 방지
      const safeError = {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack?.split('\n').slice(0, 10).join('\n'), // 스택 트레이스 축약
        code: error?.code,
        status: error?.status || error?.statusCode,
        // HTTP 요청/응답 객체는 제외하고 필요한 정보만 포함
        ...(error?.config && {
          requestUrl: error.config.url,
          requestMethod: error.config.method
        })
      };
      
      logger.error('❌ GraphQL SummonerIntegrated 쿼리 오류:', {
        error: safeError,
        query: 'summonerIntegrated',
        args: { name, region, matchCount },
        requestId: context.requestId
      });
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '서버 내부 오류가 발생했습니다'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }
  },

  /**
   * 서비스 정보 조회
   */
  async serviceInfo(_parent, _args, _context: GraphQLContext) {
    return {
      name: 'TFT Meta Analyzer GraphQL API',
      version: '1.0.0',
      description: 'TFT 메타 분석을 위한 GraphQL API 서비스',
      features: [
        'Champions data query',
        'Tierlist query',
        'Summoner information query',
        'AI match analysis',
        'Multi-language support'
      ],
      supportedLanguages: ['KO', 'EN', 'JA', 'ZH'],
      lastUpdated: new Date().toISOString()
    };
  }
};