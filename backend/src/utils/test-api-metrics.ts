// 강화된 API 메트릭 테스트 코드
import metricsCollector from './metrics';

// API 메트릭 테스트
function testEnhancedAPIMetrics() {
  console.log('=== 강화된 API 메트릭 테스트 시작 ===');
  
  // 다양한 API 엔드포인트 시뮬레이션
  const apiScenarios = [
    {
      service: 'riot',
      endpoint: 'getSummoner',
      successRate: 0.98,
      avgLatency: 150,
      timeoutRate: 0.01,
      rateLimitRate: 0.02
    },
    {
      service: 'riot',
      endpoint: 'getMatches',
      successRate: 0.95,
      avgLatency: 300,
      timeoutRate: 0.02,
      rateLimitRate: 0.05
    },
    {
      service: 'community_dragon',
      endpoint: 'getChampions',
      successRate: 0.999,
      avgLatency: 50,
      timeoutRate: 0.001,
      rateLimitRate: 0.001
    }
  ];
  
  for (const scenario of apiScenarios) {
    console.log(`\n--- ${scenario.service}:${scenario.endpoint} API 시뮬레이션 ---`);
    
    // 200회 API 호출 시뮬레이션
    for (let i = 0; i < 200; i++) {
      const isSuccess = Math.random() < scenario.successRate;
      const latency = scenario.avgLatency + (Math.random() - 0.5) * 100;
      const isTimeout = Math.random() < scenario.timeoutRate;
      const isRateLimit = Math.random() < scenario.rateLimitRate;
      
      let statusCode = 200;
      let errorType = null;
      
      if (!isSuccess) {
        if (isTimeout) {
          statusCode = 408;
          errorType = 'TIMEOUT';
        } else if (isRateLimit) {
          statusCode = 429;
          errorType = 'RATE_LIMIT';
        } else {
          statusCode = 500;
          errorType = 'INTERNAL_SERVER_ERROR';
        }
      }
      
      metricsCollector.recordAPICall(
        scenario.service,
        scenario.endpoint,
        Math.max(0, latency),
        isSuccess,
        statusCode,
        errorType,
        isTimeout,
        isRateLimit
      );
      
      // 약간의 딜레이 시뮬레이션
      if (i % 50 === 0) {
        // 5회 연속 실패 시뮬레이션 (Circuit breaker 테스트)
        if (i === 100) {
          for (let j = 0; j < 6; j++) {
            metricsCollector.recordAPICall(
              scenario.service,
              scenario.endpoint,
              latency,
              false,
              503,
              'SERVICE_UNAVAILABLE',
              false,
              false
            );
          }
        }
      }
    }
  }
  
  // API 상태 분석 실행
  const apiAnalysis = metricsCollector.analyzeAPIHealth();
  
  console.log('\n=== API 상태 분석 결과 ===');
  for (const [key, analysis] of Object.entries(apiAnalysis)) {
    console.log(`\n--- ${key} ---`);
    console.log(`전체 상태: ${analysis.health.status}`);
    console.log(`가용성: ${analysis.health.availability}%`);
    console.log(`전체 점수: ${analysis.health.overallScore}/100`);
    console.log(`Circuit Breaker: ${analysis.health.circuitBreakerState}`);
    console.log(`연속 실패: ${analysis.health.consecutiveFailures}회`);
    
    console.log(`\n성능 메트릭:`);
    console.log(`  평균 지연시간: ${analysis.performance.avgLatency}ms`);
    console.log(`  P50: ${analysis.performance.p50Latency}ms`);
    console.log(`  P95: ${analysis.performance.p95Latency}ms`);
    console.log(`  P99: ${analysis.performance.p99Latency}ms`);
    console.log(`  느린 응답: ${analysis.performance.slowResponses}회`);
    
    console.log(`\n에러 메트릭:`);
    console.log(`  에러율: ${analysis.errors.errorRate}%`);
    console.log(`  타임아웃율: ${analysis.errors.timeoutRate}%`);
    console.log(`  레이트리밋율: ${analysis.errors.rateLimitRate}%`);
    
    if (analysis.errors.topErrors.length > 0) {
      console.log(`  주요 에러: ${analysis.errors.topErrors[0].type} (${analysis.errors.topErrors[0].count}회)`);
    }
    
    console.log(`\n트래픽 정보:`);
    console.log(`  총 호출 수: ${analysis.traffic.totalCalls}`);
    console.log(`  최근 호출: ${analysis.traffic.recentCalls}회`);
    console.log(`  가동시간: ${analysis.traffic.uptime}초`);
    console.log(`  SLA 준수율: ${analysis.traffic.slaCompliance}%`);
    
    if (analysis.recommendations.length > 0) {
      console.log(`\n권장사항:`);
      analysis.recommendations.forEach((rec: string, i: number) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
  }
  
  console.log('\n=== 강화된 API 메트릭 테스트 완료 ===');
}

// 테스트 실행
testEnhancedAPIMetrics();