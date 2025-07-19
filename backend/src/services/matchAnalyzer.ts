// 매치 분석 서비스 - 플레이어 덱과 메타 덱 비교 분석
import DeckTier from '../models/DeckTier';
import { ActiveTrait, Unit } from '../types/index';

interface PlayerDeck {
  units: Unit[];
  synergies: ActiveTrait[];
  placement: number;
  eliminated: number;
}

interface MetaDeck {
  _id?: string;
  coreUnits: CoreUnit[];
  synergies: ActiveTrait[];
  items?: Item[];
  totalGames: number;
  winCount: number;
  winRate?: number;
  pickRate?: number;
  mainTraitName?: string;
  carryChampionName?: string;
  tierRank?: string;
  averagePlacement?: number;
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

interface Item {
  name: string;
  id?: string;
}

interface SimilarityResult {
  metaDeck: MetaDeck;
  similarity: number;
  synergyStrength: number;
  compositeScore: number;
}

interface PlayerPerformance {
  placementScore: number;
  survivalScore: number;
  overallPerformance: number;
}

interface AnalysisTargets {
  primaryMatchDeck: SimilarityResult | null;
  alternativeDeck: SimilarityResult | null;
  similarities: SimilarityResult[];
  playerPerformance?: PlayerPerformance;
}

interface DeckDifferences {
  missingUnits: string[];
  extraUnits: string[];
  synergyDifferences: SynergyDifference[];
  itemSuggestions: ItemSuggestion[];
}

interface SynergyDifference {
  name: string;
  playerTier: number;
  targetTier: number;
  difference: number;
}

interface ItemSuggestion {
  itemName: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 두 덱의 유사도 계산 (0-100 점수)
 */
function calculateDeckSimilarity(playerDeck: PlayerDeck, metaDeck: MetaDeck): number {
    if (!playerDeck?.units || !metaDeck?.coreUnits) return 0;
    
    const playerUnits = new Set(playerDeck.units.map(u => u.character_id.toLowerCase()));
    const metaUnits = new Set(metaDeck.coreUnits.map(u => (u.apiName || u.name).toLowerCase()));
    
    // 교집합 / 합집합으로 자카드 유사도 계산
    const intersection = new Set([...playerUnits].filter(x => metaUnits.has(x)));
    const union = new Set([...playerUnits, ...metaUnits]);
    
    return Math.round((intersection.size / union.size) * 100);
}

/**
 * 덱의 시너지 강도 계산
 */
function calculateDeckSynergyStrength(deck: PlayerDeck | MetaDeck): number {
    if (!deck?.synergies || deck.synergies.length === 0) return 0;
    
    // 활성화된 시너지들의 강도 합계
    const activeSynergies = deck.synergies.filter(s => s.tier_current > 0);
    const synergyStrength = activeSynergies.reduce((sum, synergy) => {
        // 티어별 가중치: 1티어(1점), 2티어(3점), 3티어(6점), 4티어(10점)
        const weights = [0, 1, 3, 6, 10];
        return sum + (weights[synergy.tier_current] || synergy.tier_current);
    }, 0);
    
    return synergyStrength;
}

/**
 * 플레이어 덱 성능 평가
 */
function evaluatePlayerDeckPerformance(deck: PlayerDeck): PlayerPerformance {
    const placement = deck.placement || 8;
    const eliminated = deck.eliminated || 0;
    
    // 순위 점수 (1등=100점, 8등=0점)
    const placementScore = Math.max(0, Math.round(((9 - placement) / 8) * 100));
    
    // 생존 라운드 점수 (더 오래 살아남을수록 높은 점수)
    const survivalScore = Math.min(100, Math.round((eliminated / 30) * 100));
    
    return {
        placementScore,
        survivalScore,
        overallPerformance: Math.round((placementScore + survivalScore) / 2)
    };
}

/**
 * 분석할 타겟 덱들을 찾는 메인 함수
 */
export async function findAnalysisTargets(
    playerDeck: PlayerDeck, 
    allMetaDecks: MetaDeck[] | null = null
): Promise<AnalysisTargets> {
    try {
        // 메타 덱 데이터가 없으면 DB에서 조회
        if (!allMetaDecks) {
            allMetaDecks = (await DeckTier.find({})
                .sort({ winRate: -1, pickRate: -1 })
                .limit(50)
                .lean()) as unknown as MetaDeck[];
        }
        
        if (!allMetaDecks || allMetaDecks.length === 0) {
            return {
                primaryMatchDeck: null,
                alternativeDeck: null,
                similarities: []
            };
        }
        
        // 1. 모든 메타 덱과의 유사도 계산
        const similarities: SimilarityResult[] = (allMetaDecks || []).map(metaDeck => {
            const similarity = calculateDeckSimilarity(playerDeck, metaDeck);
            const metaSynergyStrength = calculateDeckSynergyStrength(metaDeck);
            
            // 승률 계산 (winCount / totalGames * 100)
            const winRate = metaDeck.totalGames > 0 ? (metaDeck.winCount / metaDeck.totalGames * 100) : 0;
            
            return {
                metaDeck: {
                    ...metaDeck,
                    winRate: winRate // 계산된 승률 추가
                },
                similarity,
                synergyStrength: metaSynergyStrength,
                // 종합 점수 (유사도 70% + 승률 20% + 시너지 강도 10%)
                compositeScore: Math.round(
                    similarity * 0.7 + 
                    winRate * 0.2 + 
                    metaSynergyStrength * 0.1
                )
            };
        }).sort((a, b) => b.compositeScore - a.compositeScore);
        
        // 2. 가장 유사한 덱 (Primary Match)
        const primaryMatchDeck = similarities[0];
        
        // 3. 플레이어 덱 성능 평가
        const playerPerformance = evaluatePlayerDeckPerformance(playerDeck);
        
        // 4. 성장 추천 덱 찾기 (Alternative Deck)
        let alternativeDeck: SimilarityResult | null = null;
        
        // 플레이어 성적이 좋지 않은 경우 (4등 이하)에만 추천 덱 제시
        if (playerDeck.placement > 4) {
            // 현재 덱과 어느 정도 유사하면서도 더 나은 성능의 덱 찾기
            const potentialAlternatives = similarities.filter(item => 
                item.similarity >= 30 && // 최소 30% 유사도
                item.similarity <= 70 && // 하지만 너무 비슷하지는 않음
                item.metaDeck.winRate! > (primaryMatchDeck?.metaDeck?.winRate || 0) + 5 // 더 높은 승률
            );
            
            if (potentialAlternatives.length > 0) {
                // 승률이 가장 높은 덱을 추천
                alternativeDeck = potentialAlternatives.sort((a, b) => 
                    (b.metaDeck.winRate || 0) - (a.metaDeck.winRate || 0)
                )[0] || null;
            }
        }
        
        return {
            primaryMatchDeck: primaryMatchDeck || null,
            alternativeDeck: alternativeDeck || null,
            similarities: similarities.slice(0, 5), // 상위 5개 유사한 덱
            playerPerformance
        };
        
    } catch (_error) {
        return {
            primaryMatchDeck: null,
            alternativeDeck: null,
            similarities: [],
            playerPerformance: undefined
        } as unknown as AnalysisTargets;
    }
}

/**
 * 덱 차이점 분석 (어떤 유닛이 다른지, 어떤 시너지가 다른지)
 */
export function analyzeDeckDifferences(playerDeck: PlayerDeck, targetDeck: MetaDeck): DeckDifferences {
    if (!playerDeck?.units || !targetDeck?.coreUnits) {
        return {
            missingUnits: [],
            extraUnits: [],
            synergyDifferences: [],
            itemSuggestions: []
        };
    }
    
    const playerUnits = new Set(playerDeck.units.map(u => u.character_id.toLowerCase()));
    const targetUnits = new Set(targetDeck.coreUnits.map(u => (u.apiName || u.name).toLowerCase()));
    
    // 빠진 유닛들 (메타덱에는 있지만 플레이어덱에는 없는)
    const missingUnits = [...targetUnits].filter(unit => !playerUnits.has(unit));
    
    // 추가 유닛들 (플레이어덱에는 있지만 메타덱에는 없는)
    const extraUnits = [...playerUnits].filter(unit => !targetUnits.has(unit));
    
    // 시너지 차이점 분석
    const synergyDifferences = analyzeSynergyDifferences(playerDeck, targetDeck);
    
    // 아이템 추천 분석
    const itemSuggestions = analyzeItemSuggestions(playerDeck, targetDeck);
    
    return {
        missingUnits,
        extraUnits,
        synergyDifferences,
        itemSuggestions
    };
}

/**
 * 시너지 차이점 분석
 */
function analyzeSynergyDifferences(playerDeck: PlayerDeck, targetDeck: MetaDeck): SynergyDifference[] {
    const playerSynergies = new Map<string, number>();
    const targetSynergies = new Map<string, number>();
    
    // 플레이어 시너지 맵 생성
    if (playerDeck.synergies) {
        playerDeck.synergies.forEach(s => {
            playerSynergies.set(s.name.toLowerCase(), s.tier_current);
        });
    }
    
    // 타겟 시너지 맵 생성
    if (targetDeck.synergies) {
        targetDeck.synergies.forEach(s => {
            targetSynergies.set(s.name.toLowerCase(), s.tier_current);
        });
    }
    
    const differences: SynergyDifference[] = [];
    
    // 모든 시너지 비교
    const allSynergies = new Set([...playerSynergies.keys(), ...targetSynergies.keys()]);
    
    allSynergies.forEach(synergyName => {
        const playerTier = playerSynergies.get(synergyName) || 0;
        const targetTier = targetSynergies.get(synergyName) || 0;
        
        if (playerTier !== targetTier) {
            differences.push({
                name: synergyName,
                playerTier,
                targetTier,
                difference: targetTier - playerTier
            });
        }
    });
    
    return differences;
}

/**
 * 아이템 추천 분석
 */
function analyzeItemSuggestions(_playerDeck: PlayerDeck, targetDeck: MetaDeck): ItemSuggestion[] {
    // 현재는 기본적인 아이템 분석만 구현
    // 향후 더 정교한 아이템 매칭 로직 구현 가능
    
    const suggestions: ItemSuggestion[] = [];
    
    if (targetDeck.items && targetDeck.items.length > 0) {
        // 메타덱의 핵심 아이템들을 추천으로 제시
        const coreItems = targetDeck.items.slice(0, 3); // 상위 3개 아이템
        
        coreItems.forEach(item => {
            suggestions.push({
                itemName: item.name || item.id || '',
                reason: '메타덱 핵심 아이템',
                priority: 'high'
            });
        });
    }
    
    return suggestions;
}

export default {
    findAnalysisTargets,
    analyzeDeckDifferences,
    calculateDeckSimilarity,
    evaluatePlayerDeckPerformance
};