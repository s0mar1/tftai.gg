// backend/src/routes/cache-monitor.ts
// 캐시 모니터링 API 라우터 (기존 cache.ts와 별도)

import express from 'express';
import { cacheMonitor } from '../utils/cacheMonitor';
import asyncHandler from '../utils/asyncHandler';
import logger from '../config/logger';

const router = express.Router();

/**
 * 캐시 성능 요약 조회
 * GET /api/cache-monitor/summary
 */
router.get('/summary', asyncHandler(async (_req, res) => {
  const stats = cacheMonitor.getSummary();
  
  res.json({
    success: true,
    data: stats,
    message: 'Cache performance summary retrieved successfully'
  });
}));

/**
 * 특정 캐시 키 통계 조회
 * GET /api/cache-monitor/key/:keyName
 */
router.get('/key/:keyName', asyncHandler(async (req, res) => {
  const { keyName } = req.params;
  const stats = cacheMonitor.getStats(keyName);
  
  res.json({
    success: true,
    data: stats,
    message: `Cache stats for key '${keyName}' retrieved successfully`
  });
}));

/**
 * 모든 캐시 키 통계 조회
 * GET /api/cache-monitor/all
 */
router.get('/all', asyncHandler(async (req, res) => {
  const allStats = cacheMonitor.getStats();
  
  // Map을 일반 객체로 변환
  const statsObject = Object.fromEntries(allStats as Map<string, any>);
  
  res.json({
    success: true,
    data: statsObject,
    message: 'All cache stats retrieved successfully'
  });
}));

/**
 * 성능 리포트 조회
 * GET /api/cache-monitor/performance
 */
router.get('/performance', asyncHandler(async (req, res) => {
  const report = cacheMonitor.getPerformanceReport();
  
  res.json({
    success: true,
    data: report,
    message: 'Cache performance report retrieved successfully'
  });
}));

/**
 * 캐시 통계 초기화
 * DELETE /api/cache-monitor/stats
 */
router.delete('/stats', asyncHandler(async (req, res) => {
  const { key } = req.query;
  
  if (key && typeof key === 'string') {
    cacheMonitor.resetStats(key);
    logger.info(`Cache stats reset for key: ${key}`);
    res.json({
      success: true,
      message: `Cache stats reset for key '${key}'`
    });
  } else {
    cacheMonitor.resetStats();
    logger.info('All cache stats reset');
    res.json({
      success: true,
      message: 'All cache stats reset successfully'
    });
  }
}));

/**
 * 캐시 모니터링 활성화/비활성화
 * PUT /api/cache-monitor/toggle
 */
router.put('/toggle', asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'enabled field must be a boolean'
    });
  }
  
  cacheMonitor.setEnabled(enabled);
  
  return res.json({
    success: true,
    data: { enabled },
    message: `Cache monitoring ${enabled ? 'enabled' : 'disabled'}`
  });
}));

/**
 * 캐시 상태 대시보드 정보
 * GET /api/cache-monitor/dashboard
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const summary = cacheMonitor.getSummary();
  const performance = cacheMonitor.getPerformanceReport();
  
  // 상위 5개 캐시 키 (요청 수 기준)
  const allStats = cacheMonitor.getStats() as Map<string, any>;
  const topKeys = Array.from(allStats.entries())
    .sort(([, a], [, b]) => b.totalRequests - a.totalRequests)
    .slice(0, 5)
    .map(([key, stats]) => ({
      key,
      requests: stats.totalRequests,
      hitRate: stats.hitRate,
      lastUpdated: stats.lastUpdated
    }));
  
  res.json({
    success: true,
    data: {
      summary,
      performance,
      topKeys,
      timestamp: new Date().toISOString()
    },
    message: 'Cache dashboard data retrieved successfully'
  });
}));

export default router;