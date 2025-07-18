// DeckTier 모델 최적화된 인덱스 설계
import { Schema } from 'mongoose';

export function addOptimizedDeckTierIndexes(schema: Schema): void {
  // 🚀 기존 인덱스 (유지)
  schema.index({ deckKey: 1 });
  schema.index({ tierOrder: 1, averagePlacement: 1 });
  schema.index({ 'carryChampionName.ko': 1 });
  schema.index({ 'carryChampionName.en': 1 });
  schema.index({ totalGames: -1 });
  schema.index({ averagePlacement: 1 });
  
  // 🆕 최적화된 복합 인덱스들
  
  // 1. 메타 덱 순위 조회 최적화 (tierlist.ts)
  schema.index({
    totalGames: -1,
    averagePlacement: 1,
    tierOrder: 1
  }, {
    name: 'meta_deck_ranking',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 3 }
    }
  });
  
  // 2. 승률 기반 정렬 최적화 (aggregationService.ts)
  schema.index({
    totalGames: -1,
    winCount: -1,
    averagePlacement: 1
  }, {
    name: 'winrate_performance_sort',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 5 }
    }
  });
  
  // 3. 특성별 덱 분석 최적화
  schema.index({
    'mainTraitName.ko': 1,
    totalGames: -1,
    averagePlacement: 1
  }, {
    name: 'trait_deck_analysis_ko',
    background: true,
    partialFilterExpression: {
      'mainTraitName.ko': { $exists: true, $ne: null }
    }
  });
  
  schema.index({
    'mainTraitName.en': 1,
    totalGames: -1,
    averagePlacement: 1
  }, {
    name: 'trait_deck_analysis_en',
    background: true,
    partialFilterExpression: {
      'mainTraitName.en': { $exists: true, $ne: null }
    }
  });
  
  // 4. 캐리 챔피언별 분석 최적화
  schema.index({
    'carryChampionName.ko': 1,
    totalGames: -1,
    winCount: -1
  }, {
    name: 'carry_champion_analysis_ko',
    background: true,
    partialFilterExpression: {
      'carryChampionName.ko': { $exists: true, $ne: null }
    }
  });
  
  schema.index({
    'carryChampionName.en': 1,
    totalGames: -1,
    winCount: -1
  }, {
    name: 'carry_champion_analysis_en',
    background: true,
    partialFilterExpression: {
      'carryChampionName.en': { $exists: true, $ne: null }
    }
  });
  
  // 5. 티어별 필터링 최적화
  schema.index({
    tierRank: 1,
    tierOrder: 1,
    averagePlacement: 1
  }, {
    name: 'tier_filtering',
    background: true,
    partialFilterExpression: {
      tierRank: { $in: ['S', 'A', 'B', 'C'] }
    }
  });
  
  // 6. 최신 업데이트 기준 조회 최적화
  schema.index({
    updatedAt: -1,
    totalGames: -1,
    averagePlacement: 1
  }, {
    name: 'recent_updates_performance',
    background: true,
    partialFilterExpression: {
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  });
  
  // 7. 다국어 통합 검색 최적화 (텍스트 인덱스 개선)
  schema.index({
    'deckKey': 'text',
    'carryChampionName.ko': 'text',
    'carryChampionName.en': 'text',
    'mainTraitName.ko': 'text',
    'mainTraitName.en': 'text'
  }, {
    name: 'multilingual_search_optimized',
    weights: {
      'deckKey': 10,
      'carryChampionName.ko': 8,
      'carryChampionName.en': 8,
      'mainTraitName.ko': 5,
      'mainTraitName.en': 5
    },
    default_language: 'none',
    background: true
  });
}

// 예상 성능 개선 효과
export const DECKTIER_INDEX_PERFORMANCE_ESTIMATES = {
  meta_deck_ranking: {
    queryType: 'getMetaDeckRanking',
    currentPerformance: 'COLLSCAN (80ms+)',
    optimizedPerformance: 'IXSCAN (3-8ms)',
    improvementFactor: '10-25x',
    memoryUsage: '~15MB (active decks only)'
  },
  winrate_performance_sort: {
    queryType: 'getTopPerformingDecks',
    currentPerformance: 'IXSCAN + SORT (50ms+)',
    optimizedPerformance: 'IXSCAN (5-12ms)',
    improvementFactor: '4-10x',
    memoryUsage: '~20MB (with partial filter)'
  },
  trait_deck_analysis: {
    queryType: 'getDecksByTrait',
    currentPerformance: 'COLLSCAN (100ms+)',
    optimizedPerformance: 'IXSCAN (5-15ms)',
    improvementFactor: '7-20x',
    memoryUsage: '~25MB (per language)'
  },
  multilingual_search: {
    queryType: 'searchDecksMultiLang',
    currentPerformance: 'TEXT_SEARCH (150ms+)',
    optimizedPerformance: 'TEXT_SEARCH (20-40ms)',
    improvementFactor: '4-8x',
    memoryUsage: '~30MB (weighted index)'
  }
};