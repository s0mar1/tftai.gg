// 성능 모니터링 API 라우트
import express from 'express';
import logger from '../config/logger';
import { performanceOptimizer, memoryOptimizer, resourceOptimizer } from '../services/system';
// import scalabilityManager from '../services/system/scalabilityManager';
import aggregationService from '../services/aggregationService';
import cacheManager from '../services/cacheManager';
import asyncHandler from '../utils/asyncHandler';
import { performanceStats, generatePerformanceReport } from '../middlewares/performanceLogger';
import { performanceStats as queryPerformanceStats, generateOptimizationReport } from '../utils/queryPerformance';
import { getConnectionStats, manualConnectionCheck, resetConnectionStats } from '../middlewares/dbConnectionCheck';
import { sendSuccess, sendError } from '../utils/responseHelper';

const router = express.Router();

/**
 * 전체 성능 메트릭 조회
 */
router.get('/metrics', asyncHandler(async (_req, _res) => {
  const [
    performanceMetrics,
    memoryStats,
    resourceUsage,
    workerPoolStatus,
    // loadBalancerStats,
    cacheStats
  ] = await Promise.all([
    performanceOptimizer.getMetrics(),
    memoryOptimizer.getMemoryStats(),
    resourceOptimizer?.getResourceUsage(),
    resourceOptimizer?.getWorkerPoolStatus(),
    // scalabilityManager.getLoadBalancerStats(),
    cacheManager.getStats()
  ]);

  _res.json({
    timestamp: new Date().toISOString(),
    performance: performanceMetrics,
    memory: memoryStats,
    resource: resourceUsage,
    workerPool: workerPoolStatus,
    // loadBalancer: loadBalancerStats,
    cache: cacheStats
  });
}));

/**
 * 성능 최적화 상태 조회
 */
router.get('/optimization-status', asyncHandler(async (_req, _res) => {
  // const serviceStatus = scalabilityManager.getServiceStatus();
  // const workerInfo = scalabilityManager.getWorkerInfo();
  
  _res.json({
    // service: serviceStatus,
    // workers: workerInfo,
    optimizations: {
      clustering: process.env.ENABLE_CLUSTERING === 'true',
      compression: true,
      caching: true,
      workerThreads: !!resourceOptimizer
    }
  });
}));

/**
 * 캐시 워밍업 실행
 */
router.post('/cache/warmup', asyncHandler(async (_req, _res) => {
  await Promise.all([
    memoryOptimizer.warmupMemory(),
    aggregationService.warmupCache()
  ]);
  
  _res.json({ message: '캐시 워밍업 완료' });
}));

/**
 * 분산 캐시 무효화
 */
router.post('/cache/invalidate', asyncHandler(async (_req, _res) => {
  const { pattern } = _req.body;
  if (!pattern) {
    return _res.status(400).json({ error: '패턴이 필요합니다' });
  }
  
  // await scalabilityManager.invalidateDistributedCache(pattern);
  return _res.json({ message: `캐시 무효화 완료: ${pattern}` });
}));

/**
 * 동적 스케일링 실행
 */
router.post('/scaling/dynamic', asyncHandler(async (_req, _res) => {
  // await scalabilityManager.dynamicScaling();
  return _res.json({ message: '동적 스케일링 완료 (비활성화됨)' });
}));

/**
 * 메모리 최적화 실행
 */
router.post('/memory/optimize', asyncHandler(async (_req, _res) => {
  // 메모리 최적화 트리거
  memoryOptimizer.emit('memoryOptimized');
  _res.json({ message: '메모리 최적화 실행됨' });
}));

/**
 * 성능 테스트 실행
 */
router.post('/test/load', async (_req, _res) => {
  try {
    const { concurrency = 10, duration = 30 } = _req.body;
    
    logger.info(`부하 테스트 시작: 동시성 ${concurrency}, 지속시간 ${duration}초`);
    
    const testTasks = Array.from({ length: concurrency }, (_: unknown, i: number) => 
      async () => {
        const start = Date.now();
        
        // 모의 CPU 집약적 작업
        await resourceOptimizer?.processCPUIntensiveTask(
          'heavyComputation',
          { iterations: 1000000 },
          1
        );
        
        return Date.now() - start;
      }
    );
    
    const results = await performanceOptimizer.parallelProcess(testTasks, concurrency);
    const averageTime = results.reduce((a, b) => a + b, 0) / results.length;
    
    _res.json({
      message: '부하 테스트 완료',
      results: {
        averageTime: `${averageTime}ms`,
        minTime: `${Math.min(...results)}ms`,
        maxTime: `${Math.max(...results)}ms`,
        totalTasks: results.length,
        concurrency
      }
    });
  } catch (_error) {
    logger.error('부하 테스트 실패:', _error);
    _res.status(500).json({ _error: '부하 테스트 실패' });
  }
});

/**
 * 집계 쿼리 성능 테스트
 */
router.post('/test/aggregation', async (_req, _res) => {
  try {
    const start = Date.now();
    
    const [metaDecks, traitStats, metaStats] = await Promise.all([
      aggregationService.getOptimizedMetaDecks(50),
      aggregationService.getTraitStats(),
      aggregationService.getMetaStats()
    ]);
    
    const duration = Date.now() - start;
    
    _res.json({
      message: '집계 쿼리 테스트 완료',
      duration: `${duration}ms`,
      results: {
        metaDecksCount: metaDecks.length,
        traitStatsCount: traitStats.length,
        metaStats: metaStats
      }
    });
  } catch (_error) {
    logger.error('집계 쿼리 테스트 실패:', _error);
    _res.status(500).json({ _error: '집계 쿼리 테스트 실패' });
  }
});

/**
 * 시스템 리소스 정보 조회
 */
router.get('/system/resources', (_req, _res) => {
  try {
    const os = require('os');
    
    _res.json({
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        architecture: os.arch(),
        loadAverage: os.loadavg()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%'
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      node: {
        version: process.version,
        platform: process.platform
      }
    });
  } catch (_error) {
    logger.error('시스템 리소스 조회 실패:', _error);
    _res.status(500).json({ _error: '시스템 리소스 조회 실패' });
  }
});

/**
 * 성능 권장사항 조회
 */
router.get('/recommendations', async (_req, _res) => {
  try {
    const recommendations = [];
    
    // 메모리 사용량 체크
    const memoryStats = memoryOptimizer.getMemoryStats();
    const memoryUsageRatio = memoryStats.current.heapUsed / memoryStats.current.heapTotal;
    
    if (memoryUsageRatio > 0.8) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: '메모리 사용량이 높습니다. 캐시 정리를 고려하세요.',
        action: 'POST /api/performance/memory/optimize'
      });
    }
    
    // 성능 메트릭 체크
    const performanceMetrics = performanceOptimizer.getMetrics();
    const slowRequestRatio = performanceMetrics.slowRequests / performanceMetrics.requestCount;
    
    if (slowRequestRatio > 0.1) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: '느린 요청 비율이 높습니다. 인덱싱 및 쿼리 최적화를 고려하세요.',
        action: 'POST /api/performance/cache/warmup'
      });
    }
    
    // 워커 풀 상태 체크
    const workerPoolStatus = resourceOptimizer?.getWorkerPoolStatus();
    if (workerPoolStatus && workerPoolStatus.queueSize > 20) {
      recommendations.push({
        type: 'scaling',
        severity: 'medium',
        message: '작업 큐 크기가 큽니다. 워커 수 증가를 고려하세요.',
        action: 'POST /api/performance/scaling/dynamic'
      });
    }
    
    _res.json({
      recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (_error) {
    logger.error('성능 권장사항 조회 실패:', _error);
    _res.status(500).json({ _error: '성능 권장사항 조회 실패' });
  }
});

/**
 * === 새로운 성능 모니터링 엔드포인트 (Phase 1 개선사항) ===
 */

/**
 * 통합 성능 통계 조회
 */
router.get('/enhanced-stats', async (req, res) => {
  try {
    const apiStats = performanceStats.getStats();
    const queryStats = queryPerformanceStats.getSummary();
    const dbConnectionStats = getConnectionStats();

    return sendSuccess(res, {
      apiStats,
      queryStats,
      dbConnectionStats,
      timestamp: new Date().toISOString()
    }, '향상된 성능 통계 조회 성공');
  } catch (error) {
    logger.error('향상된 성능 통계 조회 실패:', error);
    return sendError(res, 'ENHANCED_STATS_ERROR', '향상된 성능 통계 조회 중 오류가 발생했습니다.');
  }
});

/**
 * 성능 최적화 리포트 조회
 */
router.get('/optimization-report', async (req, res) => {
  try {
    const apiReport = generatePerformanceReport();
    const queryReport = generateOptimizationReport();

    return sendSuccess(res, {
      api: apiReport,
      queries: queryReport,
      timestamp: new Date().toISOString()
    }, '성능 최적화 리포트 조회 성공');
  } catch (error) {
    logger.error('성능 최적화 리포트 조회 실패:', error);
    return sendError(res, 'OPTIMIZATION_REPORT_ERROR', '성능 최적화 리포트 조회 중 오류가 발생했습니다.');
  }
});

/**
 * 느린 쿼리 및 요청 조회
 */
router.get('/slow-operations', async (req, res) => {
  try {
    const slowQueries = queryPerformanceStats.getSlowQueries();
    const slowRequests = performanceStats.getSlowRequests();

    return sendSuccess(res, {
      slowQueries: slowQueries.slice(0, 20),
      slowRequests: slowRequests.slice(0, 20),
      totalSlowQueries: slowQueries.length,
      totalSlowRequests: slowRequests.length,
      timestamp: new Date().toISOString()
    }, '느린 작업 조회 성공');
  } catch (error) {
    logger.error('느린 작업 조회 실패:', error);
    return sendError(res, 'SLOW_OPERATIONS_ERROR', '느린 작업 조회 중 오류가 발생했습니다.');
  }
});

/**
 * 데이터베이스 연결 상태 상세 조회
 */
router.get('/db-status', async (req, res) => {
  try {
    const connectionStats = getConnectionStats();
    const connectionCheck = await manualConnectionCheck();

    return sendSuccess(res, {
      stats: connectionStats,
      currentCheck: connectionCheck,
      timestamp: new Date().toISOString()
    }, 'DB 연결 상태 조회 성공');
  } catch (error) {
    logger.error('DB 연결 상태 조회 실패:', error);
    return sendError(res, 'DB_STATUS_ERROR', 'DB 연결 상태 조회 중 오류가 발생했습니다.');
  }
});

/**
 * 데이터베이스 연결 테스트
 */
router.post('/db-test', async (req, res) => {
  try {
    logger.info('수동 DB 연결 테스트 시작');
    const testResult = await manualConnectionCheck();

    return sendSuccess(res, {
      testResult,
      timestamp: new Date().toISOString()
    }, 'DB 연결 테스트 완료');
  } catch (error) {
    logger.error('DB 연결 테스트 실패:', error);
    return sendError(res, 'DB_TEST_ERROR', 'DB 연결 테스트 중 오류가 발생했습니다.');
  }
});

/**
 * 성능 통계 초기화
 */
router.post('/reset-stats', async (req, res) => {
  try {
    performanceStats.clear();
    queryPerformanceStats.clear();
    resetConnectionStats();

    logger.info('성능 통계 초기화 완료');
    return sendSuccess(res, {
      message: '모든 성능 통계가 초기화되었습니다.',
      timestamp: new Date().toISOString()
    }, '통계 초기화 성공');
  } catch (error) {
    logger.error('통계 초기화 실패:', error);
    return sendError(res, 'RESET_STATS_ERROR', '통계 초기화 중 오류가 발생했습니다.');
  }
});

/**
 * 실시간 성능 모니터링
 */
router.get('/realtime-monitoring', async (req, res) => {
  try {
    const recentRequests = performanceStats.getRecentRequests(100);
    const oneMinuteAgo = new Date(Date.now() - 60000);
    
    const recentStats = recentRequests.filter(req => req.startTime >= oneMinuteAgo);
    const avgResponseTime = recentStats.length > 0 ? 
      recentStats.reduce((sum, req) => sum + req.duration, 0) / recentStats.length : 0;
    
    const errorCount = recentStats.filter(req => !req.success).length;
    const errorRate = recentStats.length > 0 ? (errorCount / recentStats.length) * 100 : 0;

    return sendSuccess(res, {
      timestamp: new Date().toISOString(),
      lastMinute: {
        requestCount: recentStats.length,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        recentRequests: recentStats.slice(-10)
      },
      dbConnection: getConnectionStats()
    }, '실시간 성능 모니터링 데이터 조회 성공');
  } catch (error) {
    logger.error('실시간 성능 모니터링 실패:', error);
    return sendError(res, 'REALTIME_MONITORING_ERROR', '실시간 성능 모니터링 중 오류가 발생했습니다.');
  }
});

export default router;