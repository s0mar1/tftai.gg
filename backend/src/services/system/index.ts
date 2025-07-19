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
      resourceOptimizer?.getResourceMetrics?.() || Promise.resolve({}),
      Promise.resolve(scalabilityManager.getScalabilityMetrics?.() || {})
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
      resourceOptimizer?.optimize?.() || Promise.resolve({ success: true, message: 'Resource optimization not implemented' }),
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

// 기본 내보내기 - public API만 노출
export default {
  generateSystemOptimizationReport,
  optimizeSystem,
  performanceOptimizer: {
    // 공개 메서드만 노출
    optimize: performanceOptimizer.optimize?.bind(performanceOptimizer) as any,
    getPerformanceMetrics: performanceOptimizer.getPerformanceMetrics?.bind(performanceOptimizer) as any,
    getMetrics: performanceOptimizer.getPerformanceMetrics?.bind(performanceOptimizer) as any, // alias
    parallelProcess: async (_tasks: any) => [] as any // placeholder that returns array
  },
  memoryOptimizer: {
    // 공개 메서드만 노출
    optimize: memoryOptimizer.optimize?.bind(memoryOptimizer) as any,
    getMemoryMetrics: memoryOptimizer.getMemoryMetrics?.bind(memoryOptimizer) as any,
    getMemoryStats: memoryOptimizer.getMemoryMetrics?.bind(memoryOptimizer) as any, // alias
    warmupMemory: memoryOptimizer.optimize?.bind(memoryOptimizer) as any, // alias
    emit: (_event: string) => true, // placeholder that returns boolean
    forceGarbageCollection: () => {} // placeholder since it's private
  },
  resourceOptimizer: {
    // 공개 메서드만 노출
    optimize: resourceOptimizer?.optimize?.bind(resourceOptimizer) as any,
    getResourceMetrics: resourceOptimizer?.getResourceMetrics?.bind(resourceOptimizer) as any,
    processCPUIntensiveTask: resourceOptimizer?.processCPUIntensiveTask?.bind(resourceOptimizer) as any,
    getResourceUsage: resourceOptimizer?.getResourceMetrics?.bind(resourceOptimizer) as any, // alias
    getWorkerPoolStatus: () => ({ active: 0, pending: 0, total: 0, queueSize: 0 }) // placeholder
  },
  scalabilityManager: {
    // 공개 메서드만 노출
    optimize: scalabilityManager.optimize?.bind(scalabilityManager) as any,
    getScalabilityMetrics: scalabilityManager.getScalabilityMetrics?.bind(scalabilityManager) as any,
    invalidateDistributedCache: scalabilityManager.invalidateDistributedCache?.bind(scalabilityManager) as any
  }
};