// 집계 쿼리 최적화 서비스
import DeckTier from '../models/DeckTier';
import Match from '../models/Match';
import logger from '../config/logger';
import { CACHE_TTL } from '../config/cacheTTL';
import cacheManager from './cacheManager';
import { monitorAggregateQuery } from '../utils/queryPerformanceMonitor';
interface AggregationResult {
  _id: string;
  count: number;
  averageWinRate: number;
  averagePlacement: number;
  totalGames: number;
}

interface MetaStatsResult {
  totalDecks: number;
  totalMatches: number;
  averageWinRate: number;
  mostPickedTrait: string;
  mostSuccessfulTrait: string;
}

export class AggregationService {
  
  /**
   * 최적화된 메타 덱 집계 (인덱스 활용)
   */
  async getOptimizedMetaDecks(limit: number = 50): Promise<any[]> {
    const cacheKey = `optimized_meta_decks_${limit}`;
    const cached = await cacheManager.get<any[]>(cacheKey);
    
    if (cached) {
      logger.debug('최적화된 메타 덱 집계 캐시 히트');
      return cached;
    }

    try {
      const pipeline = [
        // 1. 최소 게임 수 필터링 (인덱스 활용)
        { $match: { totalGames: { $gte: 3 } } },
        
        // 2. 승률 계산 및 정렬 기준 추가
        {
          $addFields: {
            winRate: {
              $cond: {
                if: { $gt: ['$totalGames', 0] },
                then: { $multiply: [{ $divide: ['$winCount', '$totalGames'] }, 100] },
                else: 0
              }
            },
            pickRate: { $ln: { $add: ['$totalGames', 1] } },
            score: {
              $add: [
                { $multiply: ['$winCount', 2] }, // 승수 가중치
                { $multiply: [{ $subtract: [8, '$averagePlacement'] }, 1] } // 평균 등수 가중치
              ]
            }
          }
        },
        
        // 3. 정렬 (복합 인덱스 활용)
        { $sort: { score: -1, winRate: -1, averagePlacement: 1 } },
        
        // 4. 제한
        { $limit: limit },
        
        // 5. 필요한 필드만 선택 (네트워크 대역폭 최적화)
        {
          $project: {
            deckKey: 1,
            tierRank: 1,
            carryChampionName: 1,
            mainTraitName: 1,
            coreUnits: 1,
            totalGames: 1,
            winCount: 1,
            averagePlacement: 1,
            winRate: 1,
            pickRate: 1,
            score: 1,
            updatedAt: 1
          }
        }
      ];

      const result = await monitorAggregateQuery(
        DeckTier,
        pipeline as any,
        {
          queryId: `meta_decks_${limit}`,
          collection: 'DeckTier',
          operation: 'getOptimizedMetaDecks',
          enableExplain: true
        }
      );
      
      // 캐시 저장
      await cacheManager.set(cacheKey, result, CACHE_TTL.META_STATS);
      logger.info(`최적화된 메타 덱 집계 완료: ${result.length}개`);
      
      return result;
    } catch (_error) {
      logger.error('최적화된 메타 덱 집계 실패:', _error);
      throw _error;
    }
  }

  /**
   * 특성별 통계 집계 (인덱스 최적화)
   */
  async getTraitStats(): Promise<AggregationResult[]> {
    const cacheKey = 'trait_stats_aggregation';
    const cached = await cacheManager.get<AggregationResult[]>(cacheKey);
    
    if (cached) {
      logger.debug('특성별 통계 집계 캐시 히트');
      return cached;
    }

    try {
      const matchStage = {
        $match: {
          totalGames: { $gte: 5 },
          mainTraitName: { 
            $exists: true, 
            $nin: [null, ""] 
          }
        }
      };
      
      const pipeline = [
        // 1. 유효한 데이터만 필터링
        matchStage,
        
        // 2. 특성별 그룹화
        {
          $group: {
            _id: '$mainTraitName',
            count: { $sum: 1 },
            totalGames: { $sum: '$totalGames' },
            totalWins: { $sum: '$winCount' },
            avgPlacement: { $avg: '$averagePlacement' },
            totalTop4: { $sum: '$top4Count' }
          }
        },
        
        // 3. 계산 필드 추가
        {
          $addFields: {
            averageWinRate: {
              $cond: {
                if: { $gt: ['$totalGames', 0] },
                then: { $multiply: [{ $divide: ['$totalWins', '$totalGames'] }, 100] },
                else: 0
              }
            },
            averagePlacement: { $round: ['$avgPlacement', 2] },
            top4Rate: {
              $cond: {
                if: { $gt: ['$totalGames', 0] },
                then: { $multiply: [{ $divide: ['$totalTop4', '$totalGames'] }, 100] },
                else: 0
              }
            }
          }
        },
        
        // 4. 정렬
        { $sort: { averageWinRate: -1, totalGames: -1 } },
        
        // 5. 상위 20개 특성만
        { $limit: 20 }
      ];

      const result = await monitorAggregateQuery(
        DeckTier,
        pipeline as any,
        {
          queryId: 'trait_stats_aggregation',
          collection: 'DeckTier',
          operation: 'getTraitStats',
          enableExplain: true
        }
      );
      
      // 캐시 저장
      await cacheManager.set(cacheKey, result, CACHE_TTL.META_STATS);
      logger.info(`특성별 통계 집계 완료: ${result.length}개`);
      
      return result;
    } catch (_error) {
      logger.error('특성별 통계 집계 실패:', _error);
      throw _error;
    }
  }

  /**
   * 전체 메타 통계 집계 (최적화됨)
   */
  async getMetaStats(): Promise<MetaStatsResult> {
    const cacheKey = 'meta_stats_summary';
    const cached = await cacheManager.get<MetaStatsResult>(cacheKey);
    
    if (cached) {
      logger.debug('메타 통계 집계 캐시 히트');
      return cached;
    }

    try {
      // 단일 집계 쿼리로 모든 DeckTier 통계 한 번에 계산
      const [deckStatsResult, matchStatsResult] = await Promise.all([
        // 덱 통계 + 특성 통계를 한 번에 계산
        DeckTier.aggregate([
          {
            $facet: {
              // 전체 덱 통계
              overallStats: [
                {
                  $group: {
                    _id: null,
                    totalDecks: { $sum: 1 },
                    totalGames: { $sum: '$totalGames' },
                    totalWins: { $sum: '$winCount' },
                    avgPlacement: { $avg: '$averagePlacement' }
                  }
                }
              ],
              // 가장 많이 픽된 특성
              mostPickedTrait: [
                { $match: { totalGames: { $gte: 5 }, mainTraitName: { $exists: true, $ne: null } } },
                {
                  $group: {
                    _id: '$mainTraitName',
                    totalGames: { $sum: '$totalGames' }
                  }
                },
                { $sort: { totalGames: -1 } },
                { $limit: 1 }
              ],
              // 가장 성공적인 특성
              mostSuccessfulTrait: [
                { $match: { totalGames: { $gte: 10 }, mainTraitName: { $exists: true, $ne: null } } },
                {
                  $group: {
                    _id: '$mainTraitName',
                    totalGames: { $sum: '$totalGames' },
                    totalWins: { $sum: '$winCount' }
                  }
                },
                {
                  $addFields: {
                    winRate: { $divide: ['$totalWins', '$totalGames'] }
                  }
                },
                { $sort: { winRate: -1 } },
                { $limit: 1 }
              ]
            }
          }
        ]).exec(),
        
        // 매치 통계 (카운트만 필요하므로 estimatedDocumentCount 사용)
        Match.estimatedDocumentCount().exec()
      ]);

      const deckStats = deckStatsResult[0];
      const overallStats = deckStats.overallStats[0];
      const mostPickedTrait = deckStats.mostPickedTrait[0];
      const mostSuccessfulTrait = deckStats.mostSuccessfulTrait[0];

      const result: MetaStatsResult = {
        totalDecks: overallStats?.totalDecks || 0,
        totalMatches: matchStatsResult || 0,
        averageWinRate: overallStats?.totalGames > 0 ? 
          (overallStats.totalWins / overallStats.totalGames) * 100 : 0,
        mostPickedTrait: mostPickedTrait?._id || '분석중',
        mostSuccessfulTrait: mostSuccessfulTrait?._id || '분석중'
      };

      // 캐시 저장
      await cacheManager.set(cacheKey, result, CACHE_TTL.META_STATS);
      logger.info('메타 통계 집계 완료 (최적화됨)');
      
      return result;
    } catch (_error) {
      logger.error('메타 통계 집계 실패:', _error);
      throw _error;
    }
  }

  /**
   * 매치 데이터 집계 최적화 (unwind 최소화)
   */
  async getUserMatchStats(userPuuid: string): Promise<any> {
    const cacheKey = `user_match_stats_${userPuuid}`;
    const cached = await cacheManager.get<any>(cacheKey);
    
    if (cached) {
      logger.debug('사용자 매치 통계 캐시 히트');
      return cached;
    }

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const pipeline = [
        // 1. 효율적인 매치 필터링 (인덱스 활용)
        {
          $match: {
            'info.participants.puuid': userPuuid,
            'info.game_datetime': { $gte: thirtyDaysAgo }
          }
        },
        
        // 2. 필요한 필드만 projection (메모리 최적화)
        {
          $project: {
            'metadata.match_id': 1,
            'info.game_datetime': 1,
            'info.participants': {
              $filter: {
                input: '$info.participants',
                cond: { $eq: ['$$this.puuid', userPuuid] }
              }
            }
          }
        },
        
        // 3. 유효한 참가자 정보가 있는 매치만 필터링
        {
          $match: {
            'info.participants.0': { $exists: true }
          }
        },
        
        // 4. 사용자 데이터 추출 (unwind 대신 arrayElemAt 사용)
        {
          $addFields: {
            participant: { $arrayElemAt: ['$info.participants', 0] }
          }
        },
        
        // 5. 통계 계산 및 최근 매치 정보 수집
        {
          $group: {
            _id: null,
            totalMatches: { $sum: 1 },
            totalWins: {
              $sum: { $cond: [{ $eq: ['$participant.placement', 1] }, 1, 0] }
            },
            totalTop4: {
              $sum: { $cond: [{ $lte: ['$participant.placement', 4] }, 1, 0] }
            },
            avgPlacement: { $avg: '$participant.placement' },
            totalDamage: { $sum: '$participant.total_damage_to_players' },
            recentMatches: {
              $push: {
                matchId: '$metadata.match_id',
                placement: '$participant.placement',
                gameDate: '$info.game_datetime',
                level: '$participant.level'
              }
            }
          }
        },
        
        // 6. 계산 필드 추가 및 최근 매치 정렬
        {
          $addFields: {
            winRate: {
              $cond: {
                if: { $gt: ['$totalMatches', 0] },
                then: { $multiply: [{ $divide: ['$totalWins', '$totalMatches'] }, 100] },
                else: 0
              }
            },
            top4Rate: {
              $cond: {
                if: { $gt: ['$totalMatches', 0] },
                then: { $multiply: [{ $divide: ['$totalTop4', '$totalMatches'] }, 100] },
                else: 0
              }
            },
            avgDamage: {
              $cond: {
                if: { $gt: ['$totalMatches', 0] },
                then: { $divide: ['$totalDamage', '$totalMatches'] },
                else: 0
              }
            },
            // 최근 매치를 날짜 기준으로 정렬하고 최대 10개만
            recentMatches: {
              $slice: [
                {
                  $sortArray: {
                    input: '$recentMatches',
                    sortBy: { gameDate: -1 }
                  }
                },
                10
              ]
            }
          }
        }
      ];

      const result = await Match.aggregate(pipeline).exec();
      const stats = result[0] || {
        totalMatches: 0,
        totalWins: 0,
        totalTop4: 0,
        avgPlacement: 0,
        winRate: 0,
        top4Rate: 0,
        avgDamage: 0,
        recentMatches: []
      };

      // 캐시 저장 (5분)
      await cacheManager.set(cacheKey, stats, CACHE_TTL.PLAYER_STATS);
      logger.info('사용자 매치 통계 집계 완료 (최적화됨)', {
        userPuuid: userPuuid.substring(0, 8),
        totalMatches: stats.totalMatches,
        processingOptimized: true
      });
      
      return stats;
    } catch (_error) {
      logger.error('사용자 매치 통계 집계 실패:', _error);
      throw _error;
    }
  }

  /**
   * 캐시 워밍업 - 자주 사용되는 집계 미리 실행
   */
  async warmupCache(): Promise<void> {
    try {
      logger.info('집계 캐시 워밍업 시작');
      
      // 병렬로 주요 집계 실행
      await Promise.all([
        this.getOptimizedMetaDecks(50),
        this.getTraitStats(),
        this.getMetaStats()
      ]);
      
      logger.info('집계 캐시 워밍업 완료');
    } catch (_error) {
      logger.error('집계 캐시 워밍업 실패:', _error);
    }
  }
  /**
   * 정적 메서드로 warmupCache 제공 (performance.ts에서 사용)
   */
  static async warmupCache(): Promise<void> {
    const instance = new AggregationService();
    return instance.warmupCache();
  }

  /**
   * 정적 메서드로 getOptimizedMetaDecks 제공
   */
  static async getOptimizedMetaDecks(limit: number = 50): Promise<any[]> {
    const instance = new AggregationService();
    return instance.getOptimizedMetaDecks(limit);
  }

  /**
   * 정적 메서드로 getTraitStats 제공
   */
  static async getTraitStats(): Promise<any[]> {
    const instance = new AggregationService();
    return instance.getTraitStats();
  }

  /**
   * 정적 메서드로 getMetaStats 제공
   */
  static async getMetaStats(): Promise<MetaStatsResult> {
    const instance = new AggregationService();
    return instance.getMetaStats();
  }
}

// 싱글톤 인스턴스 (임시 비활성화)
// const aggregationService = new AggregationService();
// export default aggregationService;

// 임시: 클래스만 export
export default AggregationService;