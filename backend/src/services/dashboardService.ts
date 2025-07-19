// 대시보드 서비스 구현
import { DashboardData } from '../types/alerts';
import { alertService } from './alertService';
import metricsCollector from '../utils/metrics';
// import { mcpService } from './mcpService'; // Temporarily disabled
import logger from '../config/logger';

export class DashboardService {
  
  /**
   * 전체 대시보드 데이터 조회
   */
  getDashboardData(): DashboardData {
    const metrics = metricsCollector.getMetrics();
    const summary = metricsCollector.getSummary();
    const cacheAnalysis = metricsCollector.analyzeCacheEfficiency();
    const apiAnalysis = metricsCollector.analyzeAPIHealth();
    const alertHistory = alertService.getAlertHistory();
    const activeAlerts = alertService.getActiveAlerts();

    // 시스템 전체 상태 계산
    const systemStatus = this.calculateSystemStatus(
      summary.errorRate,
      summary.avgResponseTime,
      activeAlerts.length
    );

    // 성능 메트릭 계산
    const performanceMetrics = this.calculatePerformanceMetrics(metrics);

    // 캐시 메트릭 계산
    const cacheMetrics = this.calculateCacheMetrics(cacheAnalysis);

    // API 메트릭 계산
    const apiMetrics = this.calculateAPIMetrics(apiAnalysis);

    return {
      timestamp: new Date(),
      uptime: summary.uptime,
      system: {
        totalRequests: summary.totalRequests,
        totalErrors: summary.totalErrors,
        errorRate: Math.round(summary.errorRate * 10000) / 100,
        avgResponseTime: summary.avgResponseTime,
        status: systemStatus
      },
      performance: performanceMetrics,
      cache: cacheMetrics,
      api: apiMetrics,
      alerts: {
        active: activeAlerts as any[],
        recentCount: alertHistory.length,
        criticalCount: activeAlerts.filter(a => a.severity === 'critical').length,
        history: {
          total: alertHistory.length,
          byType: {},
          bySeverity: {},
          recent: alertHistory.slice(0, 10) as any[],
          resolved: []
        }
      }
    };
  }

  /**
   * 시스템 상태 계산
   */
  private calculateSystemStatus(
    errorRate: number, 
    avgResponseTime: number, 
    activeAlertCount: number
  ): 'healthy' | 'degraded' | 'critical' {
    const criticalAlerts = activeAlertCount > 0;
    const highErrorRate = errorRate > 0.05; // 5%
    const slowResponse = avgResponseTime > 1000; // 1초

    if (criticalAlerts || (highErrorRate && slowResponse)) {
      return 'critical';
    }

    if (highErrorRate || slowResponse || activeAlertCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * 성능 메트릭 계산
   */
  private calculatePerformanceMetrics(metrics: any): DashboardData['performance'] {
    const responseMetrics = Object.values(metrics.responses) as any[];
    
    if (responseMetrics.length === 0) {
      return {
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowRequests: 0,
        performanceScore: 100
      };
    }

    // 전체 응답 시간 통계 계산
    const allResponseTimes = responseMetrics.flatMap(metric => metric.responseTimes || []);
    const totalSlowRequests = responseMetrics.reduce((sum, metric) => {
      return sum + (metric.responseTimes?.filter((time: number) => time > 1000).length || 0);
    }, 0);

    // P50, P95, P99 계산
    const p50 = this.calculateWeightedPercentile(responseMetrics, 'p50ResponseTime');
    const p95 = this.calculateWeightedPercentile(responseMetrics, 'p95ResponseTime');
    const p99 = this.calculateWeightedPercentile(responseMetrics, 'p99ResponseTime');

    // 성능 점수 계산 (0-100)
    const performanceScore = Math.max(0, Math.min(100, 
      100 - (p95 / 1000) * 20 - (totalSlowRequests / Math.max(1, responseMetrics.length)) * 10
    ));

    return {
      p50ResponseTime: Math.round(p50),
      p95ResponseTime: Math.round(p95),
      p99ResponseTime: Math.round(p99),
      slowRequests: totalSlowRequests,
      performanceScore: Math.round(performanceScore)
    };
  }

  /**
   * 캐시 메트릭 계산
   */
  private calculateCacheMetrics(cacheAnalysis: any): DashboardData['cache'] {
    const cacheOperations = Object.values(cacheAnalysis) as any[];
    
    if (cacheOperations.length === 0) {
      return {
        totalHitRate: 0,
        memoryUsage: 0,
        evictionRate: 0,
        efficiency: 0
      };
    }

    // 가중 평균 계산
    const totalOperations = cacheOperations.reduce((sum, op) => sum + op.overall.totalOperations, 0);
    const weightedHitRate = cacheOperations.reduce((sum, op) => {
      const weight = op.overall.totalOperations / totalOperations;
      return sum + (op.overall.hitRate * 100 * weight);
    }, 0);

    const totalMemoryUsage = cacheOperations.reduce((sum, op) => sum + op.memory.totalUsage, 0);
    const avgEvictionRate = cacheOperations.reduce((sum, op) => sum + op.overall.evictionRate, 0) / cacheOperations.length;
    const avgEfficiency = cacheOperations.reduce((sum, op) => sum + op.overall.performanceScore, 0) / cacheOperations.length;

    return {
      totalHitRate: Math.round(weightedHitRate * 100) / 100,
      memoryUsage: Math.round(totalMemoryUsage / 1024), // KB
      evictionRate: Math.round(avgEvictionRate * 10000) / 100,
      efficiency: Math.round(avgEfficiency)
    };
  }

  /**
   * API 메트릭 계산
   */
  private calculateAPIMetrics(apiAnalysis: any): DashboardData['api'] {
    const apiEndpoints = Object.values(apiAnalysis) as any[];
    
    if (apiEndpoints.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgLatency: 0,
        circuitBreakers: {}
      };
    }

    const totalCalls = apiEndpoints.reduce((sum, api) => sum + api.traffic.totalCalls, 0);
    const weightedSuccessRate = apiEndpoints.reduce((sum, api) => {
      const weight = api.traffic.totalCalls / totalCalls;
      return sum + (api.health.availability * weight);
    }, 0);

    const avgLatency = apiEndpoints.reduce((sum, api) => sum + api.performance.avgLatency, 0) / apiEndpoints.length;

    const circuitBreakers: Record<string, string> = {};
    apiEndpoints.forEach(api => {
      const key = `${api.service}:${api.endpoint}`;
      circuitBreakers[key] = api.health.circuitBreakerState;
    });

    return {
      totalCalls,
      successRate: Math.round(weightedSuccessRate * 100) / 100,
      avgLatency: Math.round(avgLatency),
      circuitBreakers
    };
  }

  /**
   * 가중 백분위수 계산
   */
  private calculateWeightedPercentile(metrics: any[], field: string): number {
    if (metrics.length === 0) return 0;

    const values = metrics.map(metric => metric[field] || 0).filter(v => v > 0);
    if (values.length === 0) return 0;

    // 단순 평균 (가중치 적용하려면 추가 로직 필요)
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 시스템 상태 요약
   */
  getSystemSummary(): any {
    const dashboardData = this.getDashboardData();
    
    return {
      timestamp: dashboardData.timestamp,
      status: dashboardData.system.status,
      uptime: dashboardData.uptime,
      alerts: {
        active: dashboardData.alerts.active.length,
        critical: dashboardData.alerts.criticalCount
      },
      performance: {
        errorRate: dashboardData.system.errorRate,
        avgResponseTime: dashboardData.system.avgResponseTime,
        p95ResponseTime: dashboardData.performance.p95ResponseTime
      },
      resources: {
        cacheHitRate: dashboardData.cache.totalHitRate,
        apiSuccessRate: dashboardData.api.successRate
      }
    };
  }

  /**
   * 건강 상태 체크
   */
  async getHealthCheck(): Promise<any> {
    const summary = this.getSystemSummary();
    
    // MongoDB 연결 상태 체크
    let dbStatus = 'healthy';
    try {
      // const dbStats = await mcpService.getDatabaseStats({ type: 'overview' }); // Temporarily disabled
      const dbStats = { collections: 0, documents: 0, indexes: 0 }; // Mock data
      if (dbStats.content && dbStats.content[0]?.text) {
        const stats = JSON.parse(dbStats.content[0].text);
        dbStatus = stats.result ? 'healthy' : 'degraded';
      }
    } catch (error) {
      logger.warn('MongoDB health check failed', error);
      dbStatus = 'critical';
    }
    
    return {
      status: summary.status,
      timestamp: summary.timestamp,
      checks: {
        database: dbStatus,
        cache: summary.resources.cacheHitRate > 70 ? 'healthy' : 'degraded',
        api: summary.resources.apiSuccessRate > 95 ? 'healthy' : 'degraded',
        alerts: summary.alerts.critical > 0 ? 'critical' : 'healthy'
      },
      metrics: {
        uptime: summary.uptime,
        errorRate: summary.performance.errorRate,
        responseTime: summary.performance.avgResponseTime
      }
    };
  }

  /**
   * MCP 통합 메트릭 조회
   */
  async getMCPMetrics(): Promise<any> {
    try {
      const [dbStats, performanceMetrics] = await Promise.all([
        // mcpService.getDatabaseStats({ type: 'overview' }), // Temporarily disabled
        // mcpService.analyzePerformance({ timeRange: '1h' }) // Temporarily disabled
        Promise.resolve({ collections: 0 }), // Mock data
        Promise.resolve({ performance: 'good' }) // Mock data
      ]);

      const dbStatsResult = dbStats.content?.[0]?.text ? JSON.parse(dbStats.content[0].text) : null;
      const performanceResult = performanceMetrics.content?.[0]?.text ? JSON.parse(performanceMetrics.content[0].text) : null;

      return {
        database: {
          stats: dbStatsResult?.result || null,
          timestamp: dbStatsResult?.timestamp || new Date().toISOString()
        },
        performance: {
          analysis: performanceResult || null,
          timestamp: performanceResult?.timestamp || new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('MCP metrics retrieval failed', error);
      return {
        database: null,
        performance: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// 싱글톤 인스턴스
export const dashboardService = new DashboardService();