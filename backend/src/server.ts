// backend/src/server.ts - TFT Meta Analyzer

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import logger from './config/logger';
import { initializeCoreModules } from './initialization/coreModules';
import { setupRoutes } from './initialization/routeSetup';
import { loadAndValidateEnv } from './initialization/envLoader';
import errorHandler from './middlewares/errorHandler';

dotenv.config();

const app = express();

async function setupExpressServer(): Promise<void> {
  // 1. 환경변수 로드 및 검증
  const envResult = loadAndValidateEnv();
  if (!envResult.isValid) {
    throw new Error(`환경변수 검증 실패: ${envResult.errors.join(', ')}`);
  }
  
  // 2. 라우터와 미들웨어 설정
  const routeSetupResult = setupRoutes(app);
  
  if (!routeSetupResult.success) {
    throw new Error(`라우터 설정 실패: ${routeSetupResult.message}`);
  }
  
  logger.info(`라우터 설정 완료 - 등록된 라우트: ${routeSetupResult.registeredRoutes.length}개`);
}

function setupGracefulShutdown(): void {
  const shutdown = () => process.exit(0);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function startServer() {
  try {
    logger.info('🚀 TFT Meta Analyzer Backend Server is starting...');

    await setupExpressServer();
    await initializeCoreModules();
    setupGracefulShutdown();

    const port = parseInt(process.env.PORT || '4001', 10);
    const server = app.listen(port, '0.0.0.0', () => {
      logger.info(`🎉 SERVER IS RUNNING ON PORT ${port}`);
    });

    server.on('error', (_error: any) => {
      logger.error('Server failed to start:', _error);
      process.exit(1);
    });

  } catch (_error) {
    logger.error('Server startup failed:', _error);
    process.exit(1);
  }
}

// 전역 에러 핸들러
process.on('uncaughtException', (_error) => {
  logger.error('UNCAUGHT EXCEPTION:', _error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
});

// 서버 시작
startServer();

export default app;