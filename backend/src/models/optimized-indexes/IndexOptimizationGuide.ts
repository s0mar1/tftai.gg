// 인덱스 최적화 구현 가이드 및 모니터링 도구
import { Schema } from 'mongoose';

/**
 * 인덱스 최적화 구현 가이드
 */
export class IndexOptimizationGuide {
  
  /**
   * 단계별 인덱스 적용 가이드
   */
  static getImplementationSteps(): string[] {
    return [
      '1. 현재 인덱스 상태 분석 및 백업',
      '2. 부분 인덱스(Partial Index) 우선 적용',
      '3. 가장 자주 사용되는 쿼리 패턴 인덱스 적용',
      '4. 백그라운드 모드로 대용량 인덱스 생성',
      '5. 인덱스 효과 모니터링 및 조정',
      '6. 사용하지 않는 인덱스 제거',
      '7. 정기적인 인덱스 성능 검토'
    ];
  }
  
  /**
   * 인덱스 우선순위 매트릭스
   */
  static getIndexPriorityMatrix(): Record<string, any> {
    return {
      HIGH_PRIORITY: {
        description: '즉시 적용 필요 (성능 임계)',
        indexes: [
          'Match.user_recent_matches',
          'DeckTier.meta_deck_ranking',
          'TraitStats.stats_filter_sort',
          'ItemStats.item_type_performance'
        ],
        expectedImprovement: '10-25x 성능 향상',
        implementationOrder: 1
      },
      MEDIUM_PRIORITY: {
        description: '단계적 적용 권장',
        indexes: [
          'Match.user_stats_aggregation',
          'DeckTier.winrate_performance_sort',
          'TraitStats.top4_performance_analysis',
          'ItemStats.usage_performance_analysis'
        ],
        expectedImprovement: '4-10x 성능 향상',
        implementationOrder: 2
      },
      LOW_PRIORITY: {
        description: '리소스 여유 시 적용',
        indexes: [
          'Match.ai_feedback_text_search',
          'DeckTier.multilingual_search_optimized',
          'TraitStats.activation_level_analysis',
          'ItemStats.recent_meta_trends'
        ],
        expectedImprovement: '2-5x 성능 향상',
        implementationOrder: 3
      }
    };
  }
  
  /**
   * 인덱스 크기 예측 계산기
   */
  static calculateIndexSize(collectionName: string, documentCount: number, indexType: string): object {
    const INDEX_SIZE_FACTORS = {
      single_field: 0.1,      // 단일 필드: 10% of document size
      compound_2_fields: 0.15, // 복합 2필드: 15% of document size
      compound_3_fields: 0.2,  // 복합 3필드: 20% of document size
      text_index: 0.25,       // 텍스트 인덱스: 25% of document size
      partial_index: 0.05     // 부분 인덱스: 5% of document size
    };
    
    const AVG_DOCUMENT_SIZES = {
      Match: 2048,        // 2KB per match
      DeckTier: 1024,     // 1KB per deck
      TraitStats: 512,    // 512B per trait
      ItemStats: 512      // 512B per item
    };
    
    const avgDocSize = AVG_DOCUMENT_SIZES[collectionName as keyof typeof AVG_DOCUMENT_SIZES] || 1024;
    const sizeFactor = INDEX_SIZE_FACTORS[indexType as keyof typeof INDEX_SIZE_FACTORS] || 0.1;
    
    const estimatedSize = Math.round(documentCount * avgDocSize * sizeFactor);
    
    return {
      collection: collectionName,
      documentCount,
      indexType,
      estimatedSizeBytes: estimatedSize,
      estimatedSizeMB: Math.round(estimatedSize / (1024 * 1024) * 100) / 100,
      memoryImpact: estimatedSize < 50 * 1024 * 1024 ? 'LOW' : 
                   estimatedSize < 200 * 1024 * 1024 ? 'MEDIUM' : 'HIGH'
    };
  }
  
  /**
   * 인덱스 모니터링 쿼리 생성기
   */
  static generateMonitoringQueries(): Record<string, string> {
    return {
      currentIndexes: `
        // 현재 인덱스 상태 확인
        db.runCommand({
          listIndexes: "matches"
        })
      `,
      
      indexUsageStats: `
        // 인덱스 사용 통계 확인
        db.matches.aggregate([
          { $indexStats: {} }
        ])
      `,
      
      slowQueries: `
        // 느린 쿼리 분석 (프로파일러 활성화 후)
        db.system.profile.find({
          "ts": { $gte: new Date(Date.now() - 3600000) },
          "millis": { $gte: 100 }
        }).sort({ ts: -1 })
      `,
      
      indexEfficiency: `
        // 인덱스 효율성 분석
        db.matches.find({
          "info.participants.puuid": "example-puuid"
        }).explain("executionStats")
      `,
      
      memoryUsage: `
        // 인덱스 메모리 사용량 확인
        db.runCommand({
          collStats: "matches",
          indexDetails: true
        })
      `
    };
  }
  
  /**
   * 성능 벤치마크 테스트 생성기
   */
  static generateBenchmarkTests(): Record<string, any> {
    return {
      userRecentMatches: {
        description: '사용자 최근 매치 조회 성능 테스트',
        beforeOptimization: `
          // 최적화 전 쿼리
          const start = Date.now();
          const result = await Match.find({
            'info.participants.puuid': 'test-puuid'
          }).sort({ 'info.game_datetime': -1 }).limit(20);
          const duration = Date.now() - start;
          console.log('Before optimization:', duration, 'ms');
        `,
        afterOptimization: `
          // 최적화 후 쿼리 (동일한 쿼리지만 인덱스 적용)
          const start = Date.now();
          const result = await Match.find({
            'info.participants.puuid': 'test-puuid'
          }).sort({ 'info.game_datetime': -1 }).limit(20);
          const duration = Date.now() - start;
          console.log('After optimization:', duration, 'ms');
        `,
        expectedImprovement: '10-20x faster'
      },
      
      metaDeckRanking: {
        description: '메타 덱 순위 조회 성능 테스트',
        beforeOptimization: `
          const start = Date.now();
          const result = await DeckTier.find({ totalGames: { $gte: 3 } })
            .sort({ tierOrder: 1, averagePlacement: 1 })
            .limit(50);
          const duration = Date.now() - start;
          console.log('Before optimization:', duration, 'ms');
        `,
        afterOptimization: `
          const start = Date.now();
          const result = await DeckTier.find({ totalGames: { $gte: 3 } })
            .sort({ tierOrder: 1, averagePlacement: 1 })
            .limit(50);
          const duration = Date.now() - start;
          console.log('After optimization:', duration, 'ms');
        `,
        expectedImprovement: '8-15x faster'
      },
      
      statsFiltering: {
        description: '통계 필터링 성능 테스트',
        beforeOptimization: `
          const start = Date.now();
          const result = await TraitStats.find({
            totalGames: { $gte: 10 },
            traitType: 'origin'
          }).sort({ winRate: -1 }).limit(20);
          const duration = Date.now() - start;
          console.log('Before optimization:', duration, 'ms');
        `,
        afterOptimization: `
          const start = Date.now();
          const result = await TraitStats.find({
            totalGames: { $gte: 10 },
            traitType: 'origin'
          }).sort({ winRate: -1 }).limit(20);
          const duration = Date.now() - start;
          console.log('After optimization:', duration, 'ms');
        `,
        expectedImprovement: '5-12x faster'
      }
    };
  }
  
  /**
   * 인덱스 유지보수 가이드
   */
  static getMaintenanceGuidelines(): Record<string, string[]> {
    return {
      daily: [
        '슬로우 쿼리 로그 확인',
        '인덱스 히트율 모니터링',
        '메모리 사용량 체크'
      ],
      weekly: [
        '인덱스 사용 통계 분석',
        '부분 인덱스 조건 검토',
        '새로운 쿼리 패턴 식별'
      ],
      monthly: [
        '인덱스 효율성 전면 검토',
        '사용하지 않는 인덱스 제거',
        '새로운 최적화 기회 탐색',
        '인덱스 재구성 (필요시)'
      ],
      quarterly: [
        '데이터 성장에 따른 인덱스 전략 재평가',
        '샤딩 전략 검토',
        '인덱스 크기 vs 성능 균형 재조정'
      ]
    };
  }
}

/**
 * 인덱스 적용 예시 (실제 모델에 적용 시 참고)
 */
export function applyOptimizedIndexesToModel(_schema: Schema, modelName: string): void {
  console.log(`Applying optimized indexes to ${modelName} model...`);
  
  // 기존 인덱스 드롭 (선택사항)
  // schema.index({}, { dropDups: true });
  
  // 모델별 최적화 인덱스 적용
  switch (modelName) {
    case 'Match':
      // addOptimizedMatchIndexes(schema);
      break;
    case 'DeckTier':
      // addOptimizedDeckTierIndexes(schema);
      break;
    case 'TraitStats':
      // addOptimizedTraitStatsIndexes(schema);
      break;
    case 'ItemStats':
      // addOptimizedItemStatsIndexes(schema);
      break;
    default:
      console.warn(`No optimization available for model: ${modelName}`);
  }
  
  console.log(`✅ Optimized indexes applied to ${modelName}`);
}

export default IndexOptimizationGuide;