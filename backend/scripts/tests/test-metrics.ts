// 백분위수 메트릭 테스트 코드
import metricsCollector from './metrics';

// 테스트 데이터 생성
function generateTestData() {
  console.log('=== 메트릭 시스템 백분위수 테스트 시작 ===');
  
  // 응답 시간 데이터 생성 (0-1000ms 범위)
  const testResponseTimes = [
    50, 75, 100, 125, 150, 200, 250, 300, 400, 500,
    600, 700, 800, 900, 1000, 1200, 1500, 2000, 3000, 5000
  ];
  
  // 테스트 응답 메트릭 기록
  testResponseTimes.forEach((time, index) => {
    metricsCollector.recordResponse(
      'GET', 
      '/api/test', 
      200, 
      time, 
      1024 * (index + 1) // 사이즈는 1KB씩 증가
    );
  });
  
  // 성능 메트릭 테스트
  const performanceTimes = [10, 25, 50, 100, 200, 400, 800, 1600, 3200, 6400];
  performanceTimes.forEach(time => {
    metricsCollector.recordPerformance('db_query', time, {
      table: 'matches',
      operation: 'select'
    });
  });
  
  // API 호출 메트릭 테스트
  const apiTimes = [100, 150, 200, 250, 300, 400, 500, 750, 1000, 2000];
  apiTimes.forEach(time => {
    metricsCollector.recordAPICall('riot', 'getSummoner', time, true, 200);
  });
  
  // 메트릭 결과 확인
  const metrics = metricsCollector.getMetrics();
  
  console.log('=== 응답 시간 백분위수 ===');
  const responseMetric = metrics.responses['GET:/api/test'];
  if (responseMetric) {
    console.log(`평균: ${responseMetric.avgResponseTime.toFixed(2)}ms`);
    console.log(`최소: ${responseMetric.minResponseTime}ms`);
    console.log(`최대: ${responseMetric.maxResponseTime}ms`);
    console.log(`P50: ${responseMetric.p50ResponseTime}ms`);
    console.log(`P75: ${responseMetric.p75ResponseTime}ms`);
    console.log(`P90: ${responseMetric.p90ResponseTime}ms`);
    console.log(`P95: ${responseMetric.p95ResponseTime}ms`);
    console.log(`P99: ${responseMetric.p99ResponseTime}ms`);
  }
  
  console.log('\n=== 성능 메트릭 백분위수 ===');
  const performanceMetric = metrics.performance['db_query'];
  if (performanceMetric) {
    console.log(`평균: ${performanceMetric.avgDuration.toFixed(2)}ms`);
    console.log(`최소: ${performanceMetric.minDuration}ms`);
    console.log(`최대: ${performanceMetric.maxDuration}ms`);
    console.log(`P50: ${performanceMetric.p50Duration}ms`);
    console.log(`P75: ${performanceMetric.p75Duration}ms`);
    console.log(`P90: ${performanceMetric.p90Duration}ms`);
    console.log(`P95: ${performanceMetric.p95Duration}ms`);
    console.log(`P99: ${performanceMetric.p99Duration}ms`);
  }
  
  console.log('\n=== API 호출 백분위수 ===');
  const apiMetric = metrics.api['riot:getSummoner'];
  if (apiMetric) {
    console.log(`평균: ${apiMetric.avgDuration.toFixed(2)}ms`);
    console.log(`성공률: ${(apiMetric.successRate * 100).toFixed(1)}%`);
    console.log(`P50: ${apiMetric.p50Duration}ms`);
    console.log(`P75: ${apiMetric.p75Duration}ms`);
    console.log(`P90: ${apiMetric.p90Duration}ms`);
    console.log(`P95: ${apiMetric.p95Duration}ms`);
    console.log(`P99: ${apiMetric.p99Duration}ms`);
  }
  
  console.log('\n=== 전체 요약 ===');
  const summary = metricsCollector.getSummary();
  console.log(`총 요청 수: ${summary.totalRequests}`);
  console.log(`총 에러 수: ${summary.totalErrors}`);
  console.log(`에러율: ${(summary.errorRate * 100).toFixed(2)}%`);
  console.log(`평균 응답 시간: ${summary.avgResponseTime}ms`);
  
  console.log('=== 메트릭 시스템 백분위수 테스트 완료 ===');
}

// 테스트 실행
generateTestData();