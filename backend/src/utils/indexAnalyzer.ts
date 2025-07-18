// backend/src/utils/indexAnalyzer.ts

import logger from '../config/logger';
import mongoose from 'mongoose';
import Match from '../models/Match';
import DeckTier from '../models/DeckTier';
import ItemStats from '../models/ItemStats';
import TraitStats from '../models/TraitStats';

/**
 * 인덱스 성능 분석 도구
 * Phase 2 복합 인덱스 최적화의 효과를 검증하기 위한 유틸리티
 */

export interface IndexAnalysisResult {
  collection: string;
  indexName: string;
  query: any;
  executionStats: {
    executionTimeMillis: number;
    totalDocsExamined: number;
    totalDocsReturned: number;
    stage: string;
    indexesUsed: string[];
    needsOptimization: boolean;
  };
  recommendation?: string;
}

export interface CollectionIndexInfo {
  collection: string;
  indexes: Array<{
    name: string;
    key: Record<string, number>;
    size: number;
    usageStats?: {
      ops: number;
      since: Date;
    };
  }>;
  totalSize: number;
}

/**
 * 인덱스 분석 클래스
 */
export class IndexAnalyzer {
  
  /**
   * 모든 컬렉션의 인덱스 정보 조회
   */
  static async getCollectionIndexes(): Promise<CollectionIndexInfo[]> {
    const collections = [
      { model: Match, name: 'matches' },
      { model: DeckTier, name: 'decktiers' },
      { model: ItemStats, name: 'itemstats' },
      { model: TraitStats, name: 'traitstats' }
    ];

    const results: CollectionIndexInfo[] = [];

    for (const { model, name } of collections) {
      try {
        const db = mongoose.connection.db;
        const collection = db.collection(name);
        
        // 인덱스 정보 조회
        const indexes = await collection.indexes();
        
        // 인덱스 통계 조회
        const stats = await collection.stats();
        
        const indexInfo: CollectionIndexInfo = {
          collection: name,
          indexes: indexes.map(index => ({
            name: index.name,
            key: index.key,
            size: index.size || 0,
            usageStats: index.accesses ? {
              ops: index.accesses.ops,
              since: index.accesses.since
            } : undefined
          })),
          totalSize: stats.totalIndexSize || 0
        };

        results.push(indexInfo);
      } catch (error) {
        logger.error(`인덱스 정보 조회 실패 (${name}):`, error);
      }
    }

    return results;
  }

  /**
   * 특정 쿼리의 실행 계획 분석
   */
  static async analyzeQuery(
    collection: string,
    query: any,
    sort?: any,
    limit?: number
  ): Promise<IndexAnalysisResult> {
    try {
      const db = mongoose.connection.db;
      const coll = db.collection(collection);
      
      // 쿼리 실행 계획 조회
      let cursor = coll.find(query);
      
      if (sort) {
        cursor = cursor.sort(sort);
      }
      
      if (limit) {
        cursor = cursor.limit(limit);
      }
      
      const explainResult = await cursor.explain('executionStats');
      const executionStats = explainResult.executionStats;
      
      // 인덱스 사용 여부 분석
      const stage = executionStats.stage || 'UNKNOWN';
      const isIndexScan = stage === 'IXSCAN';
      const isCollectionScan = stage === 'COLLSCAN';
      
      const indexesUsed: string[] = [];
      if (executionStats.indexName) {
        indexesUsed.push(executionStats.indexName);
      }
      
      // 최적화 필요 여부 판단
      const needsOptimization = 
        isCollectionScan || 
        (executionStats.totalDocsExamined > executionStats.totalDocsReturned * 10) ||
        executionStats.executionTimeMillis > 100;
      
      // 권장사항 생성
      let recommendation = '';
      if (isCollectionScan) {
        recommendation = '컬렉션 스캔이 발생했습니다. 적절한 인덱스를 생성하세요.';
      } else if (executionStats.totalDocsExamined > executionStats.totalDocsReturned * 10) {
        recommendation = '검사된 문서 수가 너무 많습니다. 쿼리 필터나 인덱스를 최적화하세요.';
      } else if (executionStats.executionTimeMillis > 100) {
        recommendation = '실행 시간이 길어 성능 최적화가 필요합니다.';
      }

      return {
        collection,
        indexName: executionStats.indexName || 'none',
        query,
        executionStats: {
          executionTimeMillis: executionStats.executionTimeMillis,
          totalDocsExamined: executionStats.totalDocsExamined,
          totalDocsReturned: executionStats.totalDocsReturned,
          stage,
          indexesUsed,
          needsOptimization
        },
        recommendation
      };
    } catch (error) {
      logger.error('쿼리 분석 실패:', error);
      throw error;
    }
  }

  /**
   * Phase 2 핵심 쿼리 패턴 분석
   */
  static async analyzePhase2Queries(): Promise<IndexAnalysisResult[]> {
    const results: IndexAnalysisResult[] = [];

    // 1. 소환사 매치 조회 (Match 모델)
    try {
      const matchQuery = await this.analyzeQuery(
        'matches',
        { 'info.participants.puuid': 'test-puuid' },
        { 'info.game_datetime': -1 },
        20
      );
      results.push(matchQuery);
    } catch (error) {
      logger.error('매치 쿼리 분석 실패:', error);
    }

    // 2. 티어리스트 조회 (DeckTier 모델)
    try {
      const tierlistQuery = await this.analyzeQuery(
        'decktiers',
        {},
        { tierOrder: 1, averagePlacement: 1 },
        50
      );
      results.push(tierlistQuery);
    } catch (error) {
      logger.error('티어리스트 쿼리 분석 실패:', error);
    }

    // 3. 아이템 통계 조회 (ItemStats 모델)
    try {
      const itemStatsQuery = await this.analyzeQuery(
        'itemstats',
        { itemType: 'completed' },
        { winRate: -1 },
        20
      );
      results.push(itemStatsQuery);
    } catch (error) {
      logger.error('아이템 통계 쿼리 분석 실패:', error);
    }

    // 4. 특성 통계 조회 (TraitStats 모델)
    try {
      const traitStatsQuery = await this.analyzeQuery(
        'traitstats',
        { traitType: 'origin' },
        { winRate: -1 },
        20
      );
      results.push(traitStatsQuery);
    } catch (error) {
      logger.error('특성 통계 쿼리 분석 실패:', error);
    }

    // 5. 집계 쿼리 분석 (DeckTier 모델)
    try {
      const aggregationQuery = await this.analyzeQuery(
        'decktiers',
        { totalGames: { $gte: 3 } },
        { totalGames: -1, winCount: -1 },
        50
      );
      results.push(aggregationQuery);
    } catch (error) {
      logger.error('집계 쿼리 분석 실패:', error);
    }

    return results;
  }

  /**
   * 인덱스 성능 벤치마크
   */
  static async benchmarkIndexPerformance(): Promise<{
    before: IndexAnalysisResult[];
    after: IndexAnalysisResult[];
    improvement: {
      avgExecutionTime: number;
      avgDocsExamined: number;
      indexUsageRate: number;
    };
  }> {
    logger.info('인덱스 성능 벤치마크 시작');
    
    const queries = await this.analyzePhase2Queries();
    
    // 성능 지표 계산
    const avgExecutionTime = queries.reduce((sum, q) => sum + q.executionStats.executionTimeMillis, 0) / queries.length;
    const avgDocsExamined = queries.reduce((sum, q) => sum + q.executionStats.totalDocsExamined, 0) / queries.length;
    const indexUsageRate = queries.filter(q => q.executionStats.stage === 'IXSCAN').length / queries.length * 100;
    
    logger.info('인덱스 성능 벤치마크 완료', {
      avgExecutionTime: `${avgExecutionTime.toFixed(2)}ms`,
      avgDocsExamined: `${avgDocsExamined.toFixed(0)}개`,
      indexUsageRate: `${indexUsageRate.toFixed(1)}%`
    });

    return {
      before: [], // 이전 결과 (구현 필요시 추가)
      after: queries,
      improvement: {
        avgExecutionTime,
        avgDocsExamined,
        indexUsageRate
      }
    };
  }

  /**
   * 사용되지 않는 인덱스 찾기
   */
  static async findUnusedIndexes(): Promise<Array<{
    collection: string;
    indexName: string;
    size: number;
    recommendation: string;
  }>> {
    const collections = await this.getCollectionIndexes();
    const unusedIndexes: Array<{
      collection: string;
      indexName: string;
      size: number;
      recommendation: string;
    }> = [];

    for (const collection of collections) {
      for (const index of collection.indexes) {
        // 기본 _id 인덱스는 제외
        if (index.name === '_id_') continue;
        
        // 사용 통계가 없거나 사용량이 매우 적은 인덱스
        if (!index.usageStats || index.usageStats.ops < 10) {
          unusedIndexes.push({
            collection: collection.collection,
            indexName: index.name,
            size: index.size,
            recommendation: '사용량이 적은 인덱스입니다. 제거를 고려하세요.'
          });
        }
      }
    }

    return unusedIndexes;
  }

  /**
   * 인덱스 효율성 리포트 생성
   */
  static async generateIndexReport(): Promise<{
    summary: {
      totalIndexes: number;
      totalIndexSize: number;
      avgQueryTime: number;
      indexUsageRate: number;
    };
    collections: CollectionIndexInfo[];
    queryAnalysis: IndexAnalysisResult[];
    unusedIndexes: Array<{
      collection: string;
      indexName: string;
      size: number;
      recommendation: string;
    }>;
    recommendations: string[];
  }> {
    const collections = await this.getCollectionIndexes();
    const queryAnalysis = await this.analyzePhase2Queries();
    const unusedIndexes = await this.findUnusedIndexes();

    const totalIndexes = collections.reduce((sum, c) => sum + c.indexes.length, 0);
    const totalIndexSize = collections.reduce((sum, c) => sum + c.totalSize, 0);
    const avgQueryTime = queryAnalysis.reduce((sum, q) => sum + q.executionStats.executionTimeMillis, 0) / queryAnalysis.length;
    const indexUsageRate = queryAnalysis.filter(q => q.executionStats.stage === 'IXSCAN').length / queryAnalysis.length * 100;

    // 권장사항 생성
    const recommendations: string[] = [];
    
    if (avgQueryTime > 50) {
      recommendations.push('평균 쿼리 실행 시간이 50ms를 초과합니다. 인덱스 최적화를 고려하세요.');
    }
    
    if (indexUsageRate < 80) {
      recommendations.push(`인덱스 사용률이 ${indexUsageRate.toFixed(1)}%로 낮습니다. 쿼리 패턴을 검토하세요.`);
    }
    
    if (unusedIndexes.length > 0) {
      recommendations.push(`${unusedIndexes.length}개의 사용되지 않는 인덱스가 발견되었습니다.`);
    }

    return {
      summary: {
        totalIndexes,
        totalIndexSize,
        avgQueryTime,
        indexUsageRate
      },
      collections,
      queryAnalysis,
      unusedIndexes,
      recommendations
    };
  }
}

/**
 * Phase 2 인덱스 최적화 검증
 */
export async function validatePhase2Optimization(): Promise<void> {
  logger.info('Phase 2 인덱스 최적화 검증 시작');
  
  try {
    const report = await IndexAnalyzer.generateIndexReport();
    
    logger.info('Phase 2 인덱스 최적화 검증 완료', {
      totalIndexes: report.summary.totalIndexes,
      avgQueryTime: `${report.summary.avgQueryTime.toFixed(2)}ms`,
      indexUsageRate: `${report.summary.indexUsageRate.toFixed(1)}%`,
      recommendations: report.recommendations
    });

    // 성능 개선 확인
    const performanceIssues = report.queryAnalysis.filter(q => q.executionStats.needsOptimization);
    
    if (performanceIssues.length > 0) {
      logger.warn('성능 개선이 필요한 쿼리 발견:', {
        issueCount: performanceIssues.length,
        issues: performanceIssues.map(issue => ({
          collection: issue.collection,
          executionTime: issue.executionStats.executionTimeMillis,
          recommendation: issue.recommendation
        }))
      });
    } else {
      logger.info('모든 핵심 쿼리가 최적화되었습니다!');
    }
  } catch (error) {
    logger.error('Phase 2 인덱스 최적화 검증 실패:', error);
  }
}

export default IndexAnalyzer;