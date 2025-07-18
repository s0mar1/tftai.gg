// TraitStats & ItemStats 모델 최적화된 인덱스 설계
import { Schema } from 'mongoose';

export function addOptimizedTraitStatsIndexes(schema: Schema): void {
  // 🚀 기존 인덱스 (유지)
  schema.index({ traitId: 1 });
  schema.index({ traitName: 1 });
  schema.index({ traitType: 1 });
  schema.index({ winRate: -1, traitType: 1 });
  schema.index({ lastUpdated: -1 });
  
  // 🆕 최적화된 복합 인덱스들
  
  // 1. 통계 필터링 + 정렬 최적화 (stats.ts)
  schema.index({
    totalGames: -1,
    traitType: 1,
    winRate: -1
  }, {
    name: 'stats_filter_sort',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 5 }
    }
  });
  
  // 2. TOP4 성능 분석 최적화
  schema.index({
    totalGames: -1,
    top4Rate: -1,
    averagePlacement: 1
  }, {
    name: 'top4_performance_analysis',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 10 }
    }
  });
  
  // 3. 특성 타입별 성능 비교 최적화
  schema.index({
    traitType: 1,
    winRate: -1,
    totalGames: -1
  }, {
    name: 'trait_type_performance',
    background: true,
    partialFilterExpression: {
      traitType: { $in: ['origin', 'class'] }
    }
  });
  
  // 4. 최신 업데이트 + 성능 조회 최적화
  schema.index({
    lastUpdated: -1,
    totalGames: -1,
    winRate: -1
  }, {
    name: 'recent_performance_updates',
    background: true,
    partialFilterExpression: {
      lastUpdated: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  
  // 5. 특성 활성화 레벨 분석 최적화
  schema.index({
    traitId: 1,
    'activationLevels.level': 1,
    'activationLevels.games': -1
  }, {
    name: 'activation_level_analysis',
    background: true,
    sparse: true
  });
  
  // 6. 범용 성능 순위 인덱스
  schema.index({
    totalGames: -1,
    winRate: -1,
    top4Rate: -1,
    averagePlacement: 1
  }, {
    name: 'comprehensive_performance_ranking',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 20 }
    }
  });
}

export function addOptimizedItemStatsIndexes(schema: Schema): void {
  // 🚀 기존 인덱스 (유지)
  schema.index({ itemId: 1 });
  schema.index({ itemName: 1 });
  schema.index({ itemType: 1 });
  schema.index({ winRate: -1, itemType: 1 });
  schema.index({ lastUpdated: -1 });
  
  // 🆕 최적화된 복합 인덱스들
  
  // 1. 아이템 타입별 성능 분석 최적화
  schema.index({
    itemType: 1,
    totalGames: -1,
    winRate: -1
  }, {
    name: 'item_type_performance',
    background: true,
    partialFilterExpression: {
      itemType: { $in: ['basic', 'completed', 'ornn', 'radiant'] }
    }
  });
  
  // 2. 완성 아이템 vs 기본 아이템 비교 최적화
  schema.index({
    itemType: 1,
    averagePlacement: 1,
    totalGames: -1
  }, {
    name: 'item_category_comparison',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 15 }
    }
  });
  
  // 3. 최고 성능 아이템 조회 최적화
  schema.index({
    totalGames: -1,
    winRate: -1,
    top4Rate: -1
  }, {
    name: 'top_performing_items',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 50 }
    }
  });
  
  // 4. 아이템 사용률 + 성능 분석
  schema.index({
    totalGames: -1,
    itemType: 1,
    averagePlacement: 1
  }, {
    name: 'usage_performance_analysis',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 10 }
    }
  });
  
  // 5. 최신 메타 아이템 트렌드 분석
  schema.index({
    lastUpdated: -1,
    itemType: 1,
    winRate: -1
  }, {
    name: 'recent_meta_trends',
    background: true,
    partialFilterExpression: {
      lastUpdated: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  });
  
  // 6. 범용 아이템 순위 인덱스
  schema.index({
    totalGames: -1,
    winRate: -1,
    top4Rate: -1,
    averagePlacement: 1
  }, {
    name: 'comprehensive_item_ranking',
    background: true,
    partialFilterExpression: {
      totalGames: { $gte: 25 }
    }
  });
}

// 예상 성능 개선 효과
export const STATS_INDEX_PERFORMANCE_ESTIMATES = {
  stats_filter_sort: {
    queryType: 'getFilteredStats',
    currentPerformance: 'COLLSCAN + SORT (120ms+)',
    optimizedPerformance: 'IXSCAN (8-15ms)',
    improvementFactor: '8-15x',
    memoryUsage: '~10MB (active stats only)'
  },
  top4_performance_analysis: {
    queryType: 'getTop4PerformanceStats',
    currentPerformance: 'IXSCAN + SORT (60ms+)',
    optimizedPerformance: 'IXSCAN (5-10ms)',
    improvementFactor: '6-12x',
    memoryUsage: '~8MB (high-game stats only)'
  },
  trait_type_performance: {
    queryType: 'getTraitTypeComparison',
    currentPerformance: 'COLLSCAN (100ms+)',
    optimizedPerformance: 'IXSCAN (5-12ms)',
    improvementFactor: '8-20x',
    memoryUsage: '~12MB (origin/class only)'
  },
  comprehensive_ranking: {
    queryType: 'getComprehensiveRanking',
    currentPerformance: 'COLLSCAN + SORT (200ms+)',
    optimizedPerformance: 'IXSCAN (10-20ms)',
    improvementFactor: '10-20x',
    memoryUsage: '~15MB (reliable stats only)'
  }
};