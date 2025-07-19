// 점수 계산 서비스 - 객관적인 수치 기반 덱 분석 및 채점
import { analyzeDeckDifferences } from './matchAnalyzer';
import { Unit, ActiveTrait } from '../types/index';

interface PlayerDeck {
  units: Unit[];
  synergies: ActiveTrait[];
  placement: number;
  eliminated: number;
}

interface MetaDeck {
  coreUnits: CoreUnit[];
  synergies: ActiveTrait[];
  winRate?: number;
  pickRate?: number;
}

interface CoreUnit {
  name: string;
  apiName?: string;
  recommendedItems?: RecommendedItem[];
}

interface RecommendedItem {
  name: string;
}

interface SimilarityResult {
  metaDeck: MetaDeck;
  similarity: number;
}

interface AnalysisTargets {
  primaryMatchDeck: SimilarityResult | null;
  alternativeDeck: SimilarityResult | null;
  similarities: SimilarityResult[];
}

interface ScoreResults {
  scores: {
    metaFit: number;
    deckCompletion: number;
    itemEfficiency: number;
    total: number;
  };
  analysis: {
    primaryMatch: SimilarityResult | null;
    similarities: SimilarityResult[];
    differences: any;
    growthGuide: any;
  };
  metadata: {
    calculatedAt: string;
    playerPlacement: number;
    playerEliminated: number;
  };
}

interface Grade {
  grade: string;
  color: string;
  description: string;
}

/**
 * 메타 적합도 점수 계산 (0-100점)
 */
function calculateMetaFitScore(_playerDeck: PlayerDeck, primaryMatchDeck: SimilarityResult | null, _similarities: SimilarityResult[]): number {
    if (!primaryMatchDeck) return 0;
    
    const baseScore = primaryMatchDeck.similarity || 0;
    const metaStrength = primaryMatchDeck.metaDeck?.winRate || 50;
    const pickRate = primaryMatchDeck.metaDeck?.pickRate || 1;
    
    // 기본 유사도 + 메타 강함 보너스 + 인기도 보너스
    let score = baseScore * 0.7;
    score += Math.min(20, (metaStrength - 50) * 0.4); // 승률 50% 이상일 때 보너스
    score += Math.min(10, Math.log(pickRate + 1) * 2); // 픽률 보너스 (로그 스케일)
    
    return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * 덱 완성도 점수 계산 (0-100점)
 */
function calculateDeckCompletionScore(playerDeck: PlayerDeck, primaryMatchDeck: SimilarityResult | null): number {
    if (!playerDeck || !primaryMatchDeck) return 0;
    
    let score = 0;
    const maxScore = 100;
    
    // 1. 유닛 완성도 (40점 만점)
    const unitCompletionScore = calculateUnitCompletionScore(playerDeck, primaryMatchDeck);
    score += Math.min(40, unitCompletionScore);
    
    // 2. 시너지 완성도 (35점 만점) 
    const synergyCompletionScore = calculateSynergyCompletionScore(playerDeck, primaryMatchDeck);
    score += Math.min(35, synergyCompletionScore);
    
    // 3. 덱 밸런스 (25점 만점)
    const balanceScore = calculateDeckBalanceScore(playerDeck);
    score += Math.min(25, balanceScore);
    
    return Math.min(maxScore, Math.max(0, Math.round(score)));
}

/**
 * 유닛 완성도 계산
 */
function calculateUnitCompletionScore(playerDeck: PlayerDeck, primaryMatchDeck: SimilarityResult): number {
    if (!playerDeck?.units || !primaryMatchDeck?.metaDeck?.coreUnits) return 0;
    
    const playerUnits = new Set(playerDeck.units.map(u => u.character_id.toLowerCase()));
    const metaUnits = new Set(primaryMatchDeck.metaDeck.coreUnits.map(u => (u.apiName || u.name).toLowerCase()));
    const targetUnitCount = primaryMatchDeck.metaDeck.coreUnits.length;
    
    // 코어 유닛 매칭률
    const coreMatches = [...metaUnits].filter(unit => playerUnits.has(unit)).length;
    const coreMatchRate = targetUnitCount > 0 ? (coreMatches / targetUnitCount) : 0;
    
    // 유닛 레벨/성급 평가
    const avgStarLevel = calculateAverageStarLevel(playerDeck.units);
    const starBonus = Math.min(10, (avgStarLevel - 1) * 5); // 1성 기준, 2성 이상시 보너스
    
    return Math.round(coreMatchRate * 30 + starBonus);
}

/**
 * 시너지 완성도 계산
 */
function calculateSynergyCompletionScore(playerDeck: PlayerDeck, primaryMatchDeck: SimilarityResult): number {
    if (!playerDeck?.synergies || !primaryMatchDeck?.metaDeck?.synergies) return 0;
    
    const playerSynergies = new Map<string, number>();
    const metaSynergies = new Map<string, number>();
    
    // 플레이어 시너지 맵 생성
    playerDeck.synergies.forEach(s => {
        if (s.tier_current > 0) {
            playerSynergies.set(s.name.toLowerCase(), s.tier_current);
        }
    });
    
    // 메타 시너지 맵 생성
    primaryMatchDeck.metaDeck.synergies.forEach(s => {
        if (s.tier_current > 0) {
            metaSynergies.set(s.name.toLowerCase(), s.tier_current);
        }
    });
    
    let score = 0;
    let maxPossibleScore = 0;
    
    // 각 메타 시너지에 대해 달성도 평가
    metaSynergies.forEach((targetTier, synergyName) => {
        const playerTier = playerSynergies.get(synergyName) || 0;
        const achievementRate = playerTier / targetTier;
        
        maxPossibleScore += targetTier * 3; // 각 티어당 3점
        score += achievementRate * targetTier * 3;
    });
    
    return maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 35) : 0;
}

/**
 * 덱 밸런스 점수 계산
 */
function calculateDeckBalanceScore(playerDeck: PlayerDeck): number {
    if (!playerDeck?.units) return 0;
    
    let score = 0;
    
    // 1. 유닛 수 적정성 (8유닛에 가까울수록 좋음)
    const unitCount = playerDeck.units.length;
    const optimalUnitCount = 8;
    const unitCountScore = Math.max(0, 10 - Math.abs(unitCount - optimalUnitCount));
    score += unitCountScore;
    
    // 2. 코스트 분배 밸런스
    const costDistributionScore = calculateCostDistributionScore(playerDeck.units);
    score += costDistributionScore;
    
    // 3. 시너지 다양성 (너무 많지도 적지도 않게)
    const synergyDiversityScore = calculateSynergyDiversityScore(playerDeck);
    score += synergyDiversityScore;
    
    return Math.round(score);
}

/**
 * 아이템 효율성 점수 계산 (0-100점)
 */
function calculateItemEfficiencyScore(playerDeck: PlayerDeck, primaryMatchDeck: SimilarityResult | null): number {
    if (!playerDeck) return 0;
    
    let score = 50; // 기본 점수
    
    // 1. 아이템 장착률 평가
    const itemEquipmentScore = calculateItemEquipmentScore(playerDeck);
    score += itemEquipmentScore;
    
    // 2. 메타 아이템 매칭도 (메타덱과 비교)
    let metaItemMatchScore = 0;
    if (primaryMatchDeck?.metaDeck) {
        metaItemMatchScore = calculateMetaItemMatchScore(playerDeck, primaryMatchDeck.metaDeck);
    }
    score += metaItemMatchScore;
    
    // 3. 아이템 시너지 효율성
    const itemSynergyScore = calculateItemSynergyScore(playerDeck);
    score += itemSynergyScore;
    
    return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * 아이템 장착률 계산
 */
function calculateItemEquipmentScore(playerDeck: PlayerDeck): number {
    if (!playerDeck?.units) return 0;
    
    const totalUnits = playerDeck.units.length;
    const unitsWithItems = playerDeck.units.filter(unit => 
        (unit as any).items && (unit as any).items.length > 0
    ).length;
    
    const equipmentRate = totalUnits > 0 ? (unitsWithItems / totalUnits) : 0;
    return Math.round(equipmentRate * 20); // 최대 20점
}

/**
 * 평균 성급 계산
 */
function calculateAverageStarLevel(units: Unit[]): number {
    if (!units || units.length === 0) return 1;
    
    const totalStars = units.reduce((sum, unit) => sum + (unit.tier || 1), 0);
    return totalStars / units.length;
}

/**
 * 코스트 분배 점수 계산
 */
function calculateCostDistributionScore(units: Unit[]): number {
    if (!units || units.length === 0) return 0;
    
    const costCounts: { [key: number]: number } = {};
    units.forEach(_unit => {
        // Unit 타입에 cost 속성이 없으므로 임시로 1을 사용하거나 다른 방법 사용
        const cost = 1; // 실제로는 champion 데이터에서 가져와야 함
        costCounts[cost] = (costCounts[cost] || 0) + 1;
    });
    
    // 이상적인 분배: 1코 2-3개, 2코 2-3개, 3코 2개, 4코 1-2개, 5코 0-1개
    const idealDistribution: { [key: number]: number } = {
        1: 2.5, 2: 2.5, 3: 2, 4: 1.5, 5: 0.5
    };
    
    let score = 0;
    Object.keys(idealDistribution).forEach(costStr => {
        const cost = parseInt(costStr);
        const actual = costCounts[cost] || 0;
        const ideal = idealDistribution[cost]!;
        const deviation = Math.abs(actual - ideal);
        score += Math.max(0, 2 - deviation); // 각 코스트당 최대 2점
    });
    
    return Math.round(score);
}

/**
 * 시너지 다양성 점수 계산
 */
function calculateSynergyDiversityScore(playerDeck: PlayerDeck): number {
    if (!playerDeck?.synergies) return 0;
    
    const activeSynergies = playerDeck.synergies.filter(s => s.tier_current > 0);
    const synergyCount = activeSynergies.length;
    
    // 이상적인 시너지 수: 3-5개
    if (synergyCount >= 3 && synergyCount <= 5) {
        return 5;
    } else if (synergyCount >= 2 && synergyCount <= 6) {
        return 3;
    } else {
        return 1;
    }
}

/**
 * 메타 아이템 매칭 점수
 */
function calculateMetaItemMatchScore(playerDeck: PlayerDeck, metaDeck: MetaDeck): number {
    if (!playerDeck?.units || !metaDeck?.coreUnits) return 0;
    
    let matchScore = 0;
    let totalRecommendedItems = 0;
    
    // 메타 덱의 추천 아이템과 플레이어 아이템 비교
    metaDeck.coreUnits.forEach(coreUnit => {
        if (!coreUnit.recommendedItems) return;
        
        // 플레이어 덱에서 해당 유닛 찾기
        const playerUnit = playerDeck.units.find(unit => 
            unit.character_id.toLowerCase() === (coreUnit.apiName || coreUnit.name).toLowerCase()
        );
        
        if (playerUnit && (playerUnit as any).items) {
            const playerItemNames = (playerUnit as any).items.map((item: any) => String(item).toLowerCase());
            
            coreUnit.recommendedItems.forEach(recItem => {
                totalRecommendedItems++;
                const hasRecommendedItem = playerItemNames.some((playerItem: any) => 
                    playerItem.includes(recItem.name.toLowerCase()) || 
                    recItem.name.toLowerCase().includes(playerItem)
                );
                
                if (hasRecommendedItem) {
                    matchScore++;
                }
            });
        }
    });
    
    // 매칭률을 15점 만점으로 변환
    const matchRate = totalRecommendedItems > 0 ? (matchScore / totalRecommendedItems) : 0;
    return Math.round(matchRate * 15);
}

/**
 * 아이템 시너지 점수
 */
function calculateItemSynergyScore(playerDeck: PlayerDeck): number {
    if (!playerDeck?.units) return 0;
    
    let synergyScore = 0;
    const totalUnits = playerDeck.units.length;
    
    // 각 유닛의 아이템 적합성 평가
    playerDeck.units.forEach(unit => {
        const unitItems = (unit as any).items;
        if (!unitItems || unitItems.length === 0) return;
        
        // 기본 아이템 장착 보너스
        synergyScore += Math.min(unitItems.length, 3) * 1; // 최대 3개 아이템, 각 1점
        
        // 고비용 유닛에 아이템 집중도 보너스 (캐리 중심 덱)
        const unitCost = getUnitCost(unit.character_id);
        if (unitCost >= 4 && unitItems.length >= 2) {
            synergyScore += 2; // 고비용 유닛 2+ 아이템 보너스
        }
        
        // 아이템 조합 완성도 (3개 완성된 아이템)
        if (unitItems.length === 3) {
            synergyScore += 1; // 완성된 아이템 세트 보너스
        }
    });
    
    // 전체 덱 크기 대비 정규화 (15점 만점)
    const normalizedScore = totalUnits > 0 ? (synergyScore / totalUnits) * 3 : 0;
    return Math.min(15, Math.round(normalizedScore));
}

/**
 * 유닛 코스트 추정 (간단한 룩업)
 */
function getUnitCost(characterId: string): number {
    // 간단한 코스트 매핑 (실제로는 TFT 데이터에서 가져와야 함)
    const highCostUnits = ['azir', 'diana', 'nasus', 'sivir', 'veigar', 'xerath']; // 5코스트 예시
    const mediumHighCostUnits = ['ahri', 'akali', 'evelynn', 'garen', 'jinx', 'kayn']; // 4코스트 예시
    
    const unitName = characterId.toLowerCase();
    if (highCostUnits.some(name => unitName.includes(name))) return 5;
    if (mediumHighCostUnits.some(name => unitName.includes(name))) return 4;
    return 3; // 기본값
}

/**
 * 메인 점수 계산 함수
 */
export function calculateAllScores(playerDeck: PlayerDeck, analysisTargets: AnalysisTargets): ScoreResults {
    const { primaryMatchDeck, alternativeDeck, similarities } = analysisTargets;
    
    // 1. 기본 점수 계산
    const metaFitScore = calculateMetaFitScore(playerDeck, primaryMatchDeck, similarities);
    const deckCompletionScore = calculateDeckCompletionScore(playerDeck, primaryMatchDeck);
    const itemEfficiencyScore = calculateItemEfficiencyScore(playerDeck, primaryMatchDeck);
    
    // 2. 총점 계산 (가중평균)
    const totalScore = Math.round(
        metaFitScore * 0.4 +           // 메타 적합도 40%
        deckCompletionScore * 0.4 +    // 덱 완성도 40%  
        itemEfficiencyScore * 0.2      // 아이템 효율성 20%
    );
    
    // 3. 차이점 분석 데이터 생성
    let differenceAnalysis = null;
    if (primaryMatchDeck) {
        differenceAnalysis = analyzeDeckDifferences(playerDeck, primaryMatchDeck.metaDeck as any);
    }
    
    // 4. 성장 가이드 데이터 생성
    let growthGuide = null;
    if (alternativeDeck) {
        const alternativeDifferences = analyzeDeckDifferences(playerDeck, alternativeDeck.metaDeck as any);
        growthGuide = {
            recommendedDeck: alternativeDeck.metaDeck,
            similarity: alternativeDeck.similarity,
            winRateImprovement: (alternativeDeck.metaDeck.winRate || 0) - (primaryMatchDeck?.metaDeck?.winRate || 0),
            keyChanges: alternativeDifferences,
            reason: '더 높은 승률과 안정성을 위한 추천 덱'
        };
    }
    
    return {
        scores: {
            metaFit: metaFitScore,
            deckCompletion: deckCompletionScore, 
            itemEfficiency: itemEfficiencyScore,
            total: totalScore
        },
        analysis: {
            primaryMatch: primaryMatchDeck,
            similarities: similarities.slice(0, 3), // 상위 3개만
            differences: differenceAnalysis,
            growthGuide
        },
        metadata: {
            calculatedAt: new Date().toISOString(),
            playerPlacement: playerDeck.placement,
            playerEliminated: playerDeck.eliminated
        }
    };
}

/**
 * 점수별 등급 계산
 */
export function calculateGrade(score: number): Grade {
    if (score >= 90) return { grade: 'S', color: '#FFD700', description: '완벽한 덱 구성' };
    if (score >= 80) return { grade: 'A', color: '#32CD32', description: '매우 우수한 덱' };
    if (score >= 70) return { grade: 'B', color: '#1E90FF', description: '좋은 덱 구성' };
    if (score >= 60) return { grade: 'C', color: '#FFA500', description: '평균적인 덱' };
    if (score >= 50) return { grade: 'D', color: '#FF6347', description: '개선이 필요한 덱' };
    return { grade: 'F', color: '#DC143C', description: '덱 재구성 권장' };
}

export default {
    calculateAllScores,
    calculateGrade,
    calculateMetaFitScore,
    calculateDeckCompletionScore,
    calculateItemEfficiencyScore
};