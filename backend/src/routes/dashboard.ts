// 대시보드 라우트 구현
import express, { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';
import { alertService } from '../services/alertService';
import logger from '../config/logger';

const router = express.Router();

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: 전체 대시보드 데이터 조회
 *     description: 시스템 상태, 성능, 캐시, API, 알림 등 모든 메트릭을 포함한 대시보드 데이터
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: 대시보드 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                     system:
 *                       type: object
 *                       properties:
 *                         totalRequests:
 *                           type: number
 *                         totalErrors:
 *                           type: number
 *                         errorRate:
 *                           type: number
 *                         avgResponseTime:
 *                           type: number
 *                         status:
 *                           type: string
 *                           enum: [healthy, degraded, critical]
 *                     performance:
 *                       type: object
 *                       properties:
 *                         p50ResponseTime:
 *                           type: number
 *                         p95ResponseTime:
 *                           type: number
 *                         p99ResponseTime:
 *                           type: number
 *                         slowRequests:
 *                           type: number
 *                         performanceScore:
 *                           type: number
 *                     cache:
 *                       type: object
 *                       properties:
 *                         totalHitRate:
 *                           type: number
 *                         memoryUsage:
 *                           type: number
 *                         evictionRate:
 *                           type: number
 *                         efficiency:
 *                           type: number
 *                     api:
 *                       type: object
 *                       properties:
 *                         totalCalls:
 *                           type: number
 *                         successRate:
 *                           type: number
 *                         avgLatency:
 *                           type: number
 *                         circuitBreakers:
 *                           type: object
 *                     alerts:
 *                       type: object
 *                       properties:
 *                         active:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recentCount:
 *                           type: number
 *                         criticalCount:
 *                           type: number
 */
router.get('/', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    logger.info('대시보드 데이터 조회 요청');
    
    const dashboardData = dashboardService.getDashboardData();
    
    _res.json({
      success: true,
      data: dashboardData,
      message: '대시보드 데이터 조회 성공'
    });
    
  } catch (error) {
    logger.error('대시보드 데이터 조회 실패', error);
    _next(error);
  }
});

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: 시스템 상태 요약 조회
 *     description: 핵심 메트릭만 포함한 시스템 상태 요약
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: 시스템 상태 요약 조회 성공
 */
router.get('/summary', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    logger.info('시스템 상태 요약 조회 요청');
    
    const summary = dashboardService.getSystemSummary();
    
    _res.json({
      success: true,
      data: summary,
      message: '시스템 상태 요약 조회 성공'
    });
    
  } catch (error) {
    logger.error('시스템 상태 요약 조회 실패', error);
    _next(error);
  }
});

/**
 * @swagger
 * /dashboard/health:
 *   get:
 *     summary: 건강 상태 체크
 *     description: 시스템 컴포넌트별 건강 상태 체크
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: 건강 상태 체크 성공
 */
router.get('/health', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    logger.info('건강 상태 체크 요청');
    
    const healthCheck = await dashboardService.getHealthCheck();
    
    _res.json({
      success: true,
      data: healthCheck,
      message: '건강 상태 체크 성공'
    });
    
  } catch (error) {
    logger.error('건강 상태 체크 실패', error);
    _next(error);
  }
});

/**
 * @swagger
 * /dashboard/alerts:
 *   get:
 *     summary: 알림 목록 조회
 *     description: 활성 알림 목록과 알림 히스토리 조회
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: 알림 목록 조회 성공
 */
router.get('/alerts', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    logger.info('알림 목록 조회 요청');
    
    const activeAlerts = alertService.getActiveAlerts();
    const alertHistory = alertService.getAlertHistory();
    
    _res.json({
      success: true,
      data: {
        active: activeAlerts,
        history: alertHistory
      },
      message: '알림 목록 조회 성공'
    });
    
  } catch (error) {
    logger.error('알림 목록 조회 실패', error);
    _next(error);
  }
});

/**
 * @swagger
 * /dashboard/alerts/{alertId}/resolve:
 *   post:
 *     summary: 알림 해결
 *     description: 특정 알림을 해결 상태로 변경
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 알림 해결 성공
 *       404:
 *         description: 알림을 찾을 수 없음
 */
router.post('/alerts/:alertId/resolve', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { alertId } = _req.params;
    
    if (!alertId) {
      return _res.status(400).json({
        success: false,
        message: 'alertId 매개변수가 필요합니다.'
      });
    }
    
    logger.info(`알림 해결 요청: ${alertId}`);
    
    const resolved = alertService.resolveAlert(alertId);
    
    if (!resolved) {
      return _res.status(404).json({
        success: false,
        message: '알림을 찾을 수 없거나 이미 해결된 알림입니다.'
      });
    }
    
    return _res.json({
      success: true,
      message: '알림이 성공적으로 해결되었습니다.'
    });
    
  } catch (error) {
    logger.error('알림 해결 실패', error);
    return _next(error);
  }
});

/**
 * @swagger
 * /dashboard/alerts/config:
 *   get:
 *     summary: 알림 설정 조회
 *     description: 모든 알림 설정 조회
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: 알림 설정 조회 성공
 */
router.get('/alerts/config', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    logger.info('알림 설정 조회 요청');
    
    const configs = alertService.getAlertConfigs();
    
    _res.json({
      success: true,
      data: configs,
      message: '알림 설정 조회 성공'
    });
    
  } catch (error) {
    logger.error('알림 설정 조회 실패', error);
    _next(error);
  }
});

/**
 * @swagger
 * /dashboard/alerts/config/{configId}:
 *   put:
 *     summary: 알림 설정 업데이트
 *     description: 특정 알림 설정 업데이트
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 설정 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               threshold:
 *                 type: number
 *               cooldownMinutes:
 *                 type: number
 *     responses:
 *       200:
 *         description: 알림 설정 업데이트 성공
 *       404:
 *         description: 알림 설정을 찾을 수 없음
 */
router.put('/alerts/config/:configId', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { configId } = _req.params;
    const updateData = _req.body;
    
    if (!configId) {
      return _res.status(400).json({
        success: false,
        message: 'configId 매개변수가 필요합니다.'
      });
    }
    
    logger.info(`알림 설정 업데이트 요청: ${configId}`, updateData);
    
    const updated = alertService.updateAlertConfig(configId, updateData);
    
    if (!updated) {
      return _res.status(404).json({
        success: false,
        message: '알림 설정을 찾을 수 없습니다.'
      });
    }
    
    return _res.json({
      success: true,
      message: '알림 설정이 성공적으로 업데이트되었습니다.'
    });
    
  } catch (error) {
    logger.error('알림 설정 업데이트 실패', error);
    return _next(error);
  }
});

/**
 * @swagger
 * /dashboard/mcp:
 *   get:
 *     summary: MCP 통합 메트릭 조회
 *     description: MongoDB MCP 서비스를 통한 데이터베이스 및 성능 메트릭 조회
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: MCP 메트릭 조회 성공
 */
router.get('/mcp', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    logger.info('MCP 통합 메트릭 조회 요청');
    
    const mcpMetrics = await dashboardService.getMCPMetrics();
    
    _res.json({
      success: true,
      data: mcpMetrics,
      message: 'MCP 통합 메트릭 조회 성공'
    });
    
  } catch (error) {
    logger.error('MCP 통합 메트릭 조회 실패', error);
    _next(error);
  }
});

/**
 * @swagger
 * /dashboard/mcp/collections:
 *   get:
 *     summary: MongoDB 컬렉션 목록 조회
 *     description: MCP 서비스를 통한 MongoDB 컬렉션 목록 조회
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: 컬렉션 목록 조회 성공
 */
router.get('/mcp/collections', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    logger.info('MongoDB 컬렉션 목록 조회 요청');
    
    const collections = await dashboardService.getMCPMetrics();
    
    _res.json({
      success: true,
      data: collections,
      message: 'MongoDB 컬렉션 목록 조회 성공'
    });
    
  } catch (error) {
    logger.error('MongoDB 컬렉션 목록 조회 실패', error);
    _next(error);
  }
});

export default router;