/**
 * 라우팅 설정 모듈
 * Express 애플리케이션의 미들웨어와 라우트를 설정합니다.
 */

import express, { Application } from 'express';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../config/logger';
import swaggerSpecs from '../config/swagger';
import { getServerConfig } from './envLoader';

// 라우트 imports
import summonerRoutes from '../routes/summoner';
import matchRoutes from '../routes/match';
import aiRoutes from '../routes/ai';
import tierlistRoutes from '../routes/tierlist';
import rankingRoutes from '../routes/ranking';
import guideRoutes from '../routes/guides';
import deckBuilderRoutes from '../routes/deckBuilder';
import staticDataRoutes from '../routes/staticData';
import statsRoutes from '../routes/stats';
import translationRoutes from '../routes/translation';
import healthRoutes from '../routes/health';
import cacheRoutes from '../routes/cache';
import performanceRoutes from '../routes/performance';

// 에러 핸들러
import errorHandler from '../middlewares/errorHandler';
import { errorMetricsMiddleware } from '../utils/metrics';

interface RouteSetupResult {
  success: boolean;
  message: string;
  registeredRoutes: string[];
}

/**
 * 기본 미들웨어를 설정합니다.
 */
const setupMiddlewares = (app: Application): void => {
  const config = getServerConfig();
  
  logger.info('[Route Setup] 미들웨어 설정 중...');
  
  // 압축 미들웨어
  app.use(compression());
  logger.info('  ✓ Compression 미들웨어 활성화');
  
  // CORS 설정
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  }));
  logger.info(`  ✓ CORS 설정 완료 (허용 오리진: ${config.corsOrigins.join(', ')})`);
  
  // Body 파싱 미들웨어
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  logger.info('  ✓ Body 파싱 미들웨어 설정 완료');
  
  // 요청 로깅 미들웨어 (개발 환경)
  if (config.isDevelopment) {
    app.use((_req, _res, _next) => {
      logger.debug(`${_req.method} ${_req.path}`);
      _next();
    });
    logger.info('  ✓ 요청 로깅 미들웨어 활성화 (개발 모드)');
  }
};

/**
 * API 라우트를 설정합니다.
 */
const setupApiRoutes = (app: Application): string[] => {
  logger.info('[Route Setup] API 라우트 등록 중...');
  
  const routes = [
    { path: '/api-docs', router: swaggerUi.serve, name: 'Swagger UI' },
    { path: '/health', router: healthRoutes, name: 'Health Check' },
    { path: '/api/static-data', router: staticDataRoutes, name: 'Static Data' },
    { path: '/api/summoner', router: summonerRoutes, name: 'Summoner' },
    { path: '/api/matches', router: matchRoutes, name: 'Matches' },
    { path: '/api/ai', router: aiRoutes, name: 'AI Analysis' },
    { path: '/api/tierlist', router: tierlistRoutes, name: 'Tier List' },
    { path: '/api/ranking', router: rankingRoutes, name: 'Ranking' },
    { path: '/api/guides', router: guideRoutes, name: 'Guides' },
    { path: '/api/deck-builder', router: deckBuilderRoutes, name: 'Deck Builder' },
    { path: '/api/stats', router: statsRoutes, name: 'Statistics' },
    { path: '/api/translation', router: translationRoutes, name: 'Translation' },
    { path: '/api/cache', router: cacheRoutes, name: 'Cache Management' },
    { path: '/api/performance', router: performanceRoutes, name: 'Performance' }
  ];
  
  const registeredRoutes: string[] = [];
  
  // Swagger UI 설정 (특별 처리)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  registeredRoutes.push('/api-docs');
  logger.info('  ✓ Swagger UI 등록: /api-docs');
  
  // 나머지 라우트 등록
  routes.slice(1).forEach(({ path, router, name }) => {
    try {
      app.use(path, router);
      registeredRoutes.push(path);
      logger.info(`  ✓ ${name} 라우트 등록: ${path}`);
    } catch (_error: any) {
      logger.error(`  ✗ ${name} 라우트 등록 실패: ${_error.message}`);
    }
  });
  
  // 루트 경로 핸들러
  app.get('/', (_req, _res) => {
    // package.json에서 직접 버전 정보 읽기
    let version = '1.0.0';
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      version = packageJson.version || '1.0.0';
    } catch (_error) {
      logger.warn('package.json에서 버전 정보를 읽을 수 없습니다. 기본값 사용: 1.0.0');
    }

    _res.json({ 
      message: 'TFT Meta Analyzer API is running.',
      version,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });
  logger.info('  ✓ 루트 경로 핸들러 등록: /');
  
  return registeredRoutes;
};

/**
 * 에러 핸들러를 설정합니다.
 */
const setupErrorHandlers = (app: Application): void => {
  logger.info('[Route Setup] 에러 핸들러 설정 중...');
  
  // 메트릭스 미들웨어
  app.use(errorMetricsMiddleware);
  logger.info('  ✓ 에러 메트릭스 미들웨어 등록');
  
  // 전역 에러 핸들러
  app.use(errorHandler);
  logger.info('  ✓ 전역 에러 핸들러 등록');
  
  // 404 핸들러
  app.use((_req, _res) => {
    _res.status(404).json({
      _error: 'Not Found',
      message: `Cannot ${_req.method} ${_req.path}`,
      timestamp: new Date().toISOString()
    });
  });
  logger.info('  ✓ 404 핸들러 등록');
};

/**
 * Express 애플리케이션의 모든 라우트와 미들웨어를 설정합니다.
 */
export const setupRoutes = (app: Application): RouteSetupResult => {
  try {
    logger.info('=== 라우팅 설정 시작 ===');
    
    // 1. 미들웨어 설정
    setupMiddlewares(app);
    
    // 2. API 라우트 설정
    const registeredRoutes = setupApiRoutes(app);
    
    // 3. 에러 핸들러 설정
    setupErrorHandlers(app);
    
    logger.info(`=== 라우팅 설정 완료 (${registeredRoutes.length}개 라우트 등록) ===`);
    
    return {
      success: true,
      message: '라우팅 설정이 성공적으로 완료되었습니다.',
      registeredRoutes
    };
    
  } catch (_error: any) {
    logger.error('라우팅 설정 중 오류 발생:', _error);
    
    return {
      success: false,
      message: `라우팅 설정 실패: ${_error.message}`,
      registeredRoutes: []
    };
  }
};

/**
 * 등록된 라우트 목록을 반환합니다.
 */
export const getRegisteredRoutes = (app: Application): string[] => {
  const routes: string[] = [];
  
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // 일반 라우트
      routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // 라우터 미들웨어
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const path = middleware.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\/g, '');
          routes.push(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${path}${handler.route.path}`);
        }
      });
    }
  });
  
  return routes;
};