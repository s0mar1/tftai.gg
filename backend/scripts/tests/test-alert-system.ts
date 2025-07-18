// 알림 시스템 및 대시보드 테스트 코드
import metricsCollector from './metrics';
import { alertService } from '../services/alertService';
import { dashboardService } from '../services/dashboardService';

// 알림 시스템 테스트
function testAlertSystem() {
  console.log('=== 알림 시스템 및 대시보드 테스트 시작 ===');
  
  // 1. 에러율 급증 시뮬레이션
  console.log('\n--- 에러율 급증 시뮬레이션 ---');
  for (let i = 0; i < 100; i++) {
    const isError = i < 10; // 10% 에러율
    const statusCode = isError ? 500 : 200;
    const responseTime = Math.random() * 200 + 100;
    
    metricsCollector.recordRequest('GET', '/api/test', 'test-agent', '127.0.0.1');
    metricsCollector.recordResponse('GET', '/api/test', statusCode, responseTime);
    
    if (isError) {
      metricsCollector.recordError('GET', '/api/test', new Error('Test error'), statusCode);
    }
  }
  
  // 2. 성능 저하 시뮬레이션
  console.log('\n--- 성능 저하 시뮬레이션 ---');
  for (let i = 0; i < 50; i++) {
    const responseTime = Math.random() * 2000 + 1000; // 1-3초 응답 시간
    
    metricsCollector.recordRequest('GET', '/api/slow', 'test-agent', '127.0.0.1');
    metricsCollector.recordResponse('GET', '/api/slow', 200, responseTime);
  }
  
  // 3. 캐시 효율 저하 시뮬레이션
  console.log('\n--- 캐시 효율 저하 시뮬레이션 ---');
  for (let i = 0; i < 30; i++) {
    const isHit = Math.random() < 0.6; // 60% 히트율
    metricsCollector.recordCache('test_cache', isHit, `key_${i}`, 300, 1024);
  }
  
  // 4. API Circuit Breaker 시뮬레이션
  console.log('\n--- API Circuit Breaker 시뮬레이션 ---');
  for (let i = 0; i < 10; i++) {
    const success = i < 4; // 연속 6회 실패
    const latency = Math.random() * 500 + 200;
    const errorType = success ? null : 'CONNECTION_TIMEOUT';
    
    metricsCollector.recordAPICall(
      'test_service',
      'test_endpoint',
      latency,
      success,
      success ? 200 : 503,
      errorType,
      !success,
      false
    );
  }
  
  // 5. 활성 알림 확인
  console.log('\n--- 활성 알림 확인 ---');
  const activeAlerts = alertService.getActiveAlerts();
  console.log(`활성 알림 수: ${activeAlerts.length}`);
  
  activeAlerts.forEach(alert => {
    console.log(`- ${alert.severity.toUpperCase()}: ${alert.title}`);
    console.log(`  메시지: ${alert.message}`);
    console.log(`  시간: ${alert.timestamp.toISOString()}`);
    console.log(`  메타데이터:`, alert.metadata);
  });
  
  // 6. 알림 히스토리 확인
  console.log('\n--- 알림 히스토리 ---');
  const alertHistory = alertService.getAlertHistory();
  console.log(`총 알림 수: ${alertHistory.total}`);
  console.log('타입별 알림 수:', alertHistory.byType);
  console.log('심각도별 알림 수:', alertHistory.bySeverity);
  
  // 7. 대시보드 데이터 확인
  console.log('\n--- 대시보드 데이터 ---');
  const dashboardData = dashboardService.getDashboardData();
  
  console.log('시스템 상태:', dashboardData.system);
  console.log('성능 메트릭:', dashboardData.performance);
  console.log('캐시 메트릭:', dashboardData.cache);
  console.log('API 메트릭:', dashboardData.api);
  console.log('알림 상태:', {
    active: dashboardData.alerts.active.length,
    recent: dashboardData.alerts.recentCount,
    critical: dashboardData.alerts.criticalCount
  });
  
  // 8. 시스템 요약
  console.log('\n--- 시스템 요약 ---');
  const systemSummary = dashboardService.getSystemSummary();
  console.log('시스템 요약:', systemSummary);
  
  // 9. 건강 상태 체크
  console.log('\n--- 건강 상태 체크 ---');
  const healthCheck = dashboardService.getHealthCheck();
  console.log('건강 상태:', healthCheck);
  
  // 10. 알림 설정 확인
  console.log('\n--- 알림 설정 ---');
  const alertConfigs = alertService.getAlertConfigs();
  console.log(`설정된 알림 수: ${alertConfigs.length}`);
  alertConfigs.forEach(config => {
    console.log(`- ${config.name}: ${config.enabled ? '활성' : '비활성'} (임계값: ${config.threshold})`);
  });
  
  console.log('\n=== 알림 시스템 및 대시보드 테스트 완료 ===');
}

// 테스트 실행
testAlertSystem();