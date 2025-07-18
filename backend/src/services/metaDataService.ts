// 메타 데이터 관리 서비스 - 중복 제거 및 캐싱 통합
import DeckTier from '../models/DeckTier';
import cacheManager from './cacheManager';
import logger from '../config/logger';
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

export default {
    getMetaDecks,
    getTopMetaDecks,
    formatMetaDecksForAI,
    clearMetaDecksCache
};