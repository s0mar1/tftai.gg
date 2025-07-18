// 강화된 캐시 메트릭 테스트 코드
import metricsCollector from './metrics';

// 캐시 메트릭 테스트
function testEnhancedCacheMetrics() {
  console.log('=== 강화된 캐시 메트릭 테스트 시작 ===');
  
  // 다양한 캐시 시나리오 시뮬레이션
  const cacheOperations = [
    { operation: 'L1_memory', keys: ['user:1', 'user:2', 'user:3'], hitRate: 0.8 },
    { operation: 'L2_redis', keys: ['match:1', 'match:2', 'match:3'], hitRate: 0.6 },
    { operation: 'static_data', keys: ['champions', 'items', 'traits'], hitRate: 0.95 }
  ];
  
  for (const { operation, keys, hitRate } of cacheOperations) {
    console.log(`\n--- ${operation} 캐시 시뮬레이션 ---`);
    
    // 100회 캐시 작업 시뮬레이션
    for (let i = 0; i < 100; i++) {
      const key = keys[i % keys.length];
      const isHit = Math.random() < hitRate;
      const ttl = Math.random() * 3600; // 0-3600초 TTL
      const keySize = Math.random() * 1024 * 10; // 0-10KB 키 크기
      const isEvicted = Math.random() < 0.05; // 5% 확률로 eviction
      
      metricsCollector.recordCache(
        operation,
        isHit,
        `${key}:${i}`,
        ttl,
        keySize,
        isEvicted
      );
    }
  }
  
  // 캐시 효율성 분석 실행
  const cacheAnalysis = metricsCollector.analyzeCacheEfficiency();
  
  console.log('\n=== 캐시 효율성 분석 결과 ===');
  for (const [operation, analysis] of Object.entries(cacheAnalysis)) {
    console.log(`\n--- ${operation} ---`);
    console.log(`전체 히트율: ${(analysis.overall.hitRate * 100).toFixed(1)}%`);
    console.log(`최근 히트율: ${(analysis.overall.recentHitRate * 100).toFixed(1)}%`);
    console.log(`히트율 트렌드: ${analysis.overall.hitRateTrend > 0 ? '증가' : '감소'}`);
    console.log(`총 작업 수: ${analysis.overall.totalOperations}`);
    console.log(`제거율: ${(analysis.overall.evictionRate * 100).toFixed(2)}%`);
    console.log(`성능 점수: ${analysis.overall.performanceScore}/100`);
    console.log(`메모리 사용량: ${(analysis.memory.totalUsage / 1024).toFixed(2)}KB`);
    console.log(`평균 키 크기: ${(analysis.memory.averageKeySize / 1024).toFixed(2)}KB`);
    console.log(`총 키 수: ${analysis.memory.totalKeys}`);
    console.log(`평균 TTL: ${analysis.patterns.averageTTL.toFixed(0)}초`);
    
    if (analysis.patterns.topAccessedKeys.length > 0) {
      console.log(`상위 접근 키: ${analysis.patterns.topAccessedKeys[0].key} (${analysis.patterns.topAccessedKeys[0].accessCount}회)`);
    }
    
    if (analysis.recommendations.length > 0) {
      console.log('권장사항:');
      analysis.recommendations.forEach((rec: string, i: number) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
  }
  
  // 전체 캐시 메트릭 요약
  const allMetrics = metricsCollector.getMetrics();
  console.log('\n=== 전체 캐시 메트릭 요약 ===');
  for (const [operation, metric] of Object.entries(allMetrics.cache)) {
    console.log(`${operation}: 히트율 ${(metric.hitRate * 100).toFixed(1)}%, 제거율 ${(metric.evictionRate * 100).toFixed(2)}%`);
  }
  
  console.log('\n=== 강화된 캐시 메트릭 테스트 완료 ===');
}

// 테스트 실행
testEnhancedCacheMetrics();