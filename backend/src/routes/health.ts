// backend/src/routes/health.ts
import express from 'express';
import mongoose from 'mongoose';
import logger from '../config/logger';
import cacheManager from '../services/cacheManager';
// import aiQueue from '../middlewares/rateLimiter';
import metaCacheService from '../services/metaCacheService';
import metricsCollector from '../utils/metrics';
import { getTFTDataWithLanguage } from '../services/tftData';
import { ENV_INFO, AI_CONFIG, DATABASE_CONFIG, API_CONFIG } from '../config/env';

const router = express.Router();

interface HealthCheckResult {
  status: string;
  responseTime?: number | string;
  error?: string;
  redisConnected?: boolean;
  memorySize?: string;
  memoryMaxSize?: string;
  keyLength?: number;
}

interface ExternalApisResult {
  riotApi: HealthCheckResult;
  googleAI: HealthCheckResult;
  redis: HealthCheckResult;
}

interface ServerHealth {
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  nodeVersion: string;
  environment: string;
}

// 데이터베이스 연결 상태 확인
async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    if (mongoose.connection.readyState === 1) {
      // 간단한 쿼리로 실제 연결 테스트
      await mongoose.connection.db.admin().ping();
      return { status: 'connected', responseTime: Date.now() };
    }
    return { status: 'disconnected', error: 'MongoDB not connected' };
  } catch (error: any) {
    return { status: 'error', error: error.message };
  }
}

// Redis 캐시 상태 확인 (개선된 버전)
async function checkCache(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now();
    await cacheManager.set('health_check', 'ok', 10); // 10초 TTL
    const value = await cacheManager.get('health_check');
    const responseTime = Date.now() - startTime;
    
    const stats = cacheManager.getStats();
    
    return value === 'ok' 
      ? { 
          status: 'connected', 
          responseTime: `${responseTime}ms`,
          redisConnected: stats.l2CacheConnected,
          memorySize: `${stats.l1CacheStats.keys}`,
          memoryMaxSize: 'N/A' // node-cache는 max size를 직접 제공하지 않음
        }
      : { status: 'error', error: 'Cache test failed' };
  } catch (error: any) {
    return { status: 'error', error: error.message };
  }
}

// 외부 API 상태 확인 (보안 강화된 버전)
async function checkExternalApis(): Promise<ExternalApisResult> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const results: ExternalApisResult = {
    riotApi: API_CONFIG.RIOT_API_KEY 
      ? { 
          status: 'configured',
          // 프로덕션 환경에서는 키 길이 정보를 숨김
          ...(ENV_INFO.isProduction ? {} : { keyLength: API_CONFIG.RIOT_API_KEY.length })
        }
      : { status: 'not_configured', error: 'RIOT_API_KEY missing' },
    
    googleAI: AI_CONFIG.GOOGLE_AI_MAIN_KEY 
      ? { 
          status: 'configured',
          // 프로덕션 환경에서는 키 길이 정보를 숨김
          ...(ENV_INFO.isProduction ? {} : { keyLength: AI_CONFIG.GOOGLE_AI_MAIN_KEY.length })
        }
      : { status: 'not_configured', error: 'GOOGLE_AI_MAIN_API_KEY missing' },
    
    redis: DATABASE_CONFIG.REDIS_URL 
      ? { status: 'configured' }
      : { status: 'not_configured', error: 'UPSTASH_REDIS_URL missing' }
  };
  
  return results;
}

// AI 큐 상태 확인 (임시 비활성화)
function checkAIQueueHealth(): any {
  try {
    // const stats = aiQueue.getMemoryStats();
    return {
      status: 'disabled',
      message: 'AI Queue disabled in development'
    };
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// 메타 캐시 상태 확인
async function checkMetaCacheHealth(): Promise<any> {
  try {
    const stats = await metaCacheService.getCacheStats();
    return {
      status: 'healthy',
      ...stats
    };
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// TFT 데이터 상태 확인
async function checkTFTDataHealth(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now();
    const tftData = await getTFTDataWithLanguage('ko');
    const responseTime = Date.now() - startTime;
    
    if (tftData && tftData.champions.length > 0) {
      return {
        status: 'loaded',
        responseTime: `${responseTime}ms`
      };
    } else {
      return {
        status: 'error',
        error: 'TFT data not loaded or empty'
      };
    }
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// 서버 리소스 상태 확인
function checkServerHealth(): ServerHealth {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    uptime: Math.floor(uptime),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    },
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  };
}

// 헬스체크 엔드포인트
/**
 * @swagger
 * /health:
 *   get:
 *     summary: 서버와 모든 서비스의 상태를 종합적으로 확인합니다.
 *     description: 데이터베이스, 캐시, 외부 API, 메타 캐시, TFT 데이터 등 모든 서비스의 상태를 확인하고 종합적인 헬스체크 결과를 반환합니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 모든 서비스가 정상 상태
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded]
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2024-07-15T10:30:00.000Z
 *                 responseTime:
 *                   type: string
 *                   example: 45ms
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: connected
 *                         responseTime:
 *                           type: number
 *                           example: 1234567890
 *                     cache:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: connected
 *                         responseTime:
 *                           type: string
 *                           example: 5ms
 *                         redisConnected:
 *                           type: boolean
 *                           example: true
 *                     externalApis:
 *                       type: object
 *                       properties:
 *                         riotApi:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               example: configured
 *                         googleAI:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               example: configured
 *                         redis:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               example: configured
 *                     server:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                           example: 3600
 *                         memory:
 *                           type: object
 *                           properties:
 *                             rss:
 *                               type: number
 *                               example: 256
 *                             heapUsed:
 *                               type: number
 *                               example: 128
 *                             heapTotal:
 *                               type: number
 *                               example: 256
 *                         nodeVersion:
 *                           type: string
 *                           example: v20.0.0
 *                         environment:
 *                           type: string
 *                           example: development
 *                 version:
 *                   type: string
 *                   example: 2.0.0
 *       503:
 *         description: 일부 서비스가 비정상 상태
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: degraded
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2024-07-15T10:30:00.000Z
 *                 responseTime:
 *                   type: string
 *                   example: 120ms
 *                 services:
 *                   type: object
 *                   description: 각 서비스의 상태 정보
 *                 version:
 *                   type: string
 *                   example: 2.0.0
 */
router.get('/', async (_req, _res, _next) => {
  const startTime = Date.now();
  
  try {
    const [database, cache, externalApis, metaCache, tftData] = await Promise.all([
      checkDatabase(),
      checkCache(),
      checkExternalApis(),
      checkMetaCacheHealth(),
      checkTFTDataHealth()
    ]);
    
    const server = checkServerHealth();
    const aiQueue = checkAIQueueHealth();
    const responseTime = Date.now() - startTime;
    
    // 전체 상태 결정 (aiQueue는 개발환경에서 비활성화)
    // 개발 환경에서는 API 키 설정을 선택적으로 처리
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isHealthy = 
      database.status === 'connected' &&
      cache.status === 'connected' &&
      // 개발 환경에서는 API 키 설정 여부를 필수가 아니라 선택적으로 처리
      (isDevelopment || externalApis.riotApi.status === 'configured') &&
      (isDevelopment || externalApis.googleAI.status === 'configured') &&
      (aiQueue.status === 'healthy' || aiQueue.status === 'disabled') &&
      metaCache.status === 'healthy' &&
      tftData.status === 'loaded';
    
    const healthStatus = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database,
        cache,
        externalApis,
        server,
        aiQueue,
        metaCache,
        tftData
      },
      version: '2.0.0'
    };
    
    // 상태에 따른 HTTP 상태 코드
    const statusCode = isHealthy ? 200 : 503;
    
    logger.info('Health check performed', {
      status: healthStatus.status,
      responseTime: healthStatus.responseTime
    });
    
    _res.status(statusCode).json(healthStatus);
    
  } catch (_error) {
    _next(_error);
  }
});

// 간단한 ping 엔드포인트
/**
 * @swagger
 * /health/ping:
 *   get:
 *     summary: 서버의 생존 여부를 확인합니다.
 *     description: 서버가 요청에 응답할 수 있는 상태인지 간단하게 확인합니다. 'pong'을 반환하면 정상입니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 성공적인 응답
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: pong
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-10-27T08:30:00.000Z
 */
router.get('/ping', (_req, _res) => {
  _res.json({ 
    status: 'pong', 
    timestamp: new Date().toISOString() 
  });
});

// 메트릭 엔드포인트
/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: 서버 메트릭 정보를 조회합니다.
 *     description: 시스템 성능, 메모리 사용량, 요청 통계 등의 메트릭 정보를 반환합니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 메트릭 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     requests:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 1250
 *                         successful:
 *                           type: number
 *                           example: 1100
 *                         failed:
 *                           type: number
 *                           example: 150
 *                     performance:
 *                       type: object
 *                       properties:
 *                         averageResponseTime:
 *                           type: number
 *                           example: 125.5
 *                         maxResponseTime:
 *                           type: number
 *                           example: 2500
 *                         minResponseTime:
 *                           type: number
 *                           example: 15
 *                     memory:
 *                       type: object
 *                       properties:
 *                         heapUsed:
 *                           type: number
 *                           example: 128
 *                         heapTotal:
 *                           type: number
 *                           example: 256
 *                         rss:
 *                           type: number
 *                           example: 320
 *       500:
 *         description: 메트릭 정보 조회 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: 메트릭 정보 조회 중 오류가 발생했습니다.
 */
router.get('/metrics', (_req, _res, _next) => {
  try {
    const metrics = metricsCollector.getMetrics();
    _res.json({
      status: 'success',
      data: metrics
    });
  } catch (_error) {
    _next(_error);
  }
});

// 메트릭 요약 엔드포인트
/**
 * @swagger
 * /health/metrics/summary:
 *   get:
 *     summary: 서버 메트릭 요약 정보를 조회합니다.
 *     description: 주요 성능 지표와 시스템 상태를 요약한 정보를 반환합니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 메트릭 요약 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     uptime:
 *                       type: number
 *                       example: 3600
 *                     totalRequests:
 *                       type: number
 *                       example: 1250
 *                     successRate:
 *                       type: number
 *                       example: 0.88
 *                     averageResponseTime:
 *                       type: number
 *                       example: 125.5
 *                     memoryUsage:
 *                       type: object
 *                       properties:
 *                         percentage:
 *                           type: number
 *                           example: 0.5
 *                         used:
 *                           type: number
 *                           example: 128
 *                         total:
 *                           type: number
 *                           example: 256
 *                     healthStatus:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                       example: healthy
 *       500:
 *         description: 메트릭 요약 정보 조회 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: 메트릭 요약 정보 조회 중 오류가 발생했습니다.
 */
router.get('/metrics/summary', (_req, _res, _next) => {
  try {
    const summary = metricsCollector.getSummary();
    _res.json({
      status: 'success',
      data: summary
    });
  } catch (_error) {
    _next(_error);
  }
});

// 메트릭 리셋 엔드포인트 (개발/관리용) - 보안 강화
/**
 * @swagger
 * /health/metrics/reset:
 *   post:
 *     summary: 서버 메트릭 데이터를 초기화합니다.
 *     description: 수집된 메트릭 데이터를 모두 초기화합니다. 개발 환경에서만 사용 가능하며, 프로덕션 환경에서는 403 오류를 반환합니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 메트릭 데이터 초기화 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Metrics reset successfully
 *       403:
 *         description: 프로덕션 환경에서는 사용 불가
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Metrics reset is disabled in production environment
 *       500:
 *         description: 메트릭 초기화 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: 메트릭 초기화 중 오류가 발생했습니다.
 */
router.post('/metrics/reset', (_req, _res, _next) => {
  try {
    // 프로덕션 환경에서는 메트릭 리셋 비활성화
    if (process.env.NODE_ENV === 'production') {
      return _res.status(403).json({
        status: 'error',
        message: 'Metrics reset is disabled in production environment'
      });
    }
    
    metricsCollector.reset();
    logger.info('Metrics reset requested', { ip: _req.ip });
    return _res.json({
      status: 'success',
      message: 'Metrics reset successfully'
    });
  } catch (_error) {
    return _next(_error);
  }
});

export default router;