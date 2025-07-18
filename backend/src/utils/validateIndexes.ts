// backend/src/utils/validateIndexes.ts

import { IndexAnalyzer, validatePhase2Optimization } from './indexAnalyzer';
import logger from '../config/logger';

/**
 * Phase 2 인덱스 성능 검증 실행
 */
export async function runIndexValidation(): Promise<void> {
  logger.info('🚀 Phase 2 인덱스 성능 검증 시작');
  
  try {
    // 1. 전체 인덱스 리포트 생성
    logger.info('📊 전체 인덱스 리포트 생성 중...');
    const report = await IndexAnalyzer.generateIndexReport();
    
    logger.info('📋 인덱스 리포트 요약:', {
      totalIndexes: report.summary.totalIndexes,
      totalIndexSize: `${(report.summary.totalIndexSize / 1024 / 1024).toFixed(2)}MB`,
      avgQueryTime: `${report.summary.avgQueryTime.toFixed(2)}ms`,
      indexUsageRate: `${report.summary.indexUsageRate.toFixed(1)}%`
    });
    
    // 2. 컬렉션별 인덱스 정보 출력
    logger.info('📦 컬렉션별 인덱스 정보:');
    report.collections.forEach(collection => {
      logger.info(`  ${collection.collection}: ${collection.indexes.length}개 인덱스`);
      collection.indexes.forEach(index => {
        logger.info(`    - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    });
    
    // 3. 쿼리 성능 분석
    logger.info('🔍 쿼리 성능 분석 결과:');
    report.queryAnalysis.forEach(query => {
      const status = query.executionStats.needsOptimization ? '❌ 최적화 필요' : '✅ 최적화됨';
      logger.info(`  ${query.collection}: ${status}`);
      logger.info(`    - 실행시간: ${query.executionStats.executionTimeMillis}ms`);
      logger.info(`    - 검사문서: ${query.executionStats.totalDocsExamined}개`);
      logger.info(`    - 반환문서: ${query.executionStats.totalDocsReturned}개`);
      logger.info(`    - 인덱스 사용: ${query.executionStats.stage}`);
      
      if (query.recommendation) {
        logger.info(`    - 권장사항: ${query.recommendation}`);
      }
    });
    
    // 4. 사용되지 않는 인덱스 검출
    logger.info('🗑️ 사용되지 않는 인덱스:');
    if (report.unusedIndexes.length > 0) {
      report.unusedIndexes.forEach(unused => {
        logger.info(`  ${unused.collection}.${unused.indexName}: ${unused.recommendation}`);
      });
    } else {
      logger.info('  모든 인덱스가 효율적으로 사용되고 있습니다.');
    }
    
    // 5. 권장사항 출력
    logger.info('💡 권장사항:');
    if (report.recommendations.length > 0) {
      report.recommendations.forEach(rec => {
        logger.info(`  - ${rec}`);
      });
    } else {
      logger.info('  현재 인덱스 설정이 최적화되어 있습니다.');
    }
    
    // 6. 벤치마크 실행
    logger.info('⚡ 성능 벤치마크 실행 중...');
    const benchmark = await IndexAnalyzer.benchmarkIndexPerformance();
    
    logger.info('📈 성능 벤치마크 결과:', {
      avgExecutionTime: `${benchmark.improvement.avgExecutionTime.toFixed(2)}ms`,
      avgDocsExamined: `${benchmark.improvement.avgDocsExamined.toFixed(0)}개`,
      indexUsageRate: `${benchmark.improvement.indexUsageRate.toFixed(1)}%`
    });
    
    // 7. 최적화 검증
    await validatePhase2Optimization();
    
    logger.info('✅ Phase 2 인덱스 성능 검증 완료');
    
  } catch (error) {
    logger.error('❌ 인덱스 성능 검증 실패:', error);
    throw error;
  }
}

// 스크립트로 실행할 때
if (require.main === module) {
  runIndexValidation()
    .then(() => {
      console.log('인덱스 검증 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('인덱스 검증 실패:', error);
      process.exit(1);
    });
}