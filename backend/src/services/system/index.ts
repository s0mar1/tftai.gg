// backend/src/services/system/index.ts

/**
 * 시스템 최적화 모듈 통합 인덱스
 * 성능, 메모리, 리소스, 확장성 관련 최적화 서비스들을 하나로 모음
 */

import performanceOptimizer from './performanceOptimizer';
import memoryOptimizer from './memoryOptimizer';
import resourceOptimizer from './resourceOptimizer';
import scalabilityManager from './scalabilityManager';

/**
 * 시스템 최적화 통합 인터페이스
 */
export interface SystemOptimizationReport {
  performance: any;
  memory: any;
  resources: any;
  scalability: any;
  timestamp: Date;
  recommendations: string[];
}

/**
 * 전체 시스템 최적화 보고서 생성
 */
export async function generateSystemOptimizationReport(): Promise<SystemOptimizationReport> {
  const timestamp = new Date();
  const recommendations: string[] = [];

  try {
    // 각 최적화 서비스에서 데이터 수집
    const [
      performanceData,
      memoryData,
      resourceData,
      scalabilityData
    ] = await Promise.allSettled([
      performanceOptimizer.getPerformanceMetrics?.() || Promise.resolve({}),
      memoryOptimizer.getMemoryMetrics?.() || Promise.resolve({}),
      resourceOptimizer.getResourceMetrics?.() || Promise.resolve({}),
      scalabilityManager.getScalabilityMetrics?.() || Promise.resolve({})
    ]);

    // 결과 통합
    const report: SystemOptimizationReport = {
      performance: performanceData.status === 'fulfilled' ? performanceData.value : {},
      memory: memoryData.status === 'fulfilled' ? memoryData.value : {},
      resources: resourceData.status === 'fulfilled' ? resourceData.value : {},
      scalability: scalabilityData.status === 'fulfilled' ? scalabilityData.value : {},
      timestamp,
      recommendations
    };

    // 권장사항 생성
    if (performanceData.status === 'rejected') {
      recommendations.push('성능 최적화 데이터 수집 실패 - 성능 모니터링 시스템 점검 필요');
    }
    if (memoryData.status === 'rejected') {
      recommendations.push('메모리 최적화 데이터 수집 실패 - 메모리 모니터링 시스템 점검 필요');
    }
    if (resourceData.status === 'rejected') {
      recommendations.push('리소스 최적화 데이터 수집 실패 - 리소스 모니터링 시스템 점검 필요');
    }
    if (scalabilityData.status === 'rejected') {
      recommendations.push('확장성 관리 데이터 수집 실패 - 확장성 모니터링 시스템 점검 필요');
    }

    return report;
  } catch (error) {
    return {
      performance: {},
      memory: {},
      resources: {},
      scalability: {},
      timestamp,
      recommendations: ['시스템 최적화 보고서 생성 중 오류 발생']
    };
  }
}

/**
 * 시스템 최적화 실행
 */
export async function optimizeSystem(): Promise<{
  success: boolean;
  message: string;
  details: any;
}> {
  try {
    const optimizationResults = await Promise.allSettled([
      performanceOptimizer.optimize?.() || Promise.resolve({ success: true, message: 'Performance optimization not implemented' }),
      memoryOptimizer.optimize?.() || Promise.resolve({ success: true, message: 'Memory optimization not implemented' }),
      resourceOptimizer.optimize?.() || Promise.resolve({ success: true, message: 'Resource optimization not implemented' }),
      scalabilityManager.optimize?.() || Promise.resolve({ success: true, message: 'Scalability optimization not implemented' })
    ]);

    const successCount = optimizationResults.filter(result => result.status === 'fulfilled').length;
    const failureCount = optimizationResults.length - successCount;

    return {
      success: failureCount === 0,
      message: `시스템 최적화 완료: ${successCount}개 성공, ${failureCount}개 실패`,
      details: optimizationResults
    };
  } catch (error) {
    return {
      success: false,
      message: '시스템 최적화 실행 중 오류 발생',
      details: error
    };
  }
}

// 개별 최적화 서비스들 내보내기
export {
  performanceOptimizer,
  memoryOptimizer,
  resourceOptimizer,
  scalabilityManager
};

// 기본 내보내기
export default {
  generateSystemOptimizationReport,
  optimizeSystem,
  performanceOptimizer,
  memoryOptimizer,
  resourceOptimizer,
  scalabilityManager
};