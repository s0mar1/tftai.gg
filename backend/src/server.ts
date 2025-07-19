// backend/src/server.ts - TFT Meta Analyzer

console.log('=== 서버 시작 ===');
console.log('Node.js 버전:', process.version);
console.log('환경변수 PORT:', process.env.PORT);
console.log('환경변수 NODE_ENV:', process.env.NODE_ENV);
console.log('환경변수 MONGODB_URI 존재:', !!process.env.MONGODB_URI);

import 'express-async-errors';
import express from 'express';
import dotenv from 'dotenv';
import logger from './config/logger';
import { initializeCoreModules } from './initialization/coreModules';
import { setupRoutes } from './initialization/routeSetup';
import { loadAndValidateEnv } from './initialization/envLoader';

console.log('모든 import 완료');

dotenv.config();
console.log('dotenv.config() 실행 완료');

const app = express();
console.log('Express 앱 생성 완료');

async function setupExpressServer(): Promise<void> {
  console.log('setupExpressServer 시작');
  
  // 1. 환경변수 로드 및 검증
  console.log('환경변수 로드 및 검증 시작');
  const envResult = loadAndValidateEnv();
  console.log('환경변수 검증 결과:', envResult.isValid);
  
  if (!envResult.isValid) {
    console.error('환경변수 검증 실패:', envResult.errors);
    throw new Error(`환경변수 검증 실패: ${envResult.errors.join(', ')}`);
  }
  
  // 2. 라우터와 미들웨어 설정
  console.log('라우터 설정 시작');
  const routeSetupResult = setupRoutes(app);
  console.log('라우터 설정 결과:', routeSetupResult.success);
  
  if (!routeSetupResult.success) {
    console.error('라우터 설정 실패:', routeSetupResult.message);
    throw new Error(`라우터 설정 실패: ${routeSetupResult.message}`);
  }
  
  logger.info(`라우터 설정 완료 - 등록된 라우트: ${routeSetupResult.registeredRoutes.length}개`);
  console.log('setupExpressServer 완료');
}

function setupGracefulShutdown(): void {
  const shutdown = () => process.exit(0);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function startServer() {
  try {
    console.log('startServer 함수 시작');
    logger.info('🚀 TFT Meta Analyzer Backend Server is starting...');

    console.log('setupExpressServer 호출 전');
    await setupExpressServer();
    console.log('setupExpressServer 완료');

    console.log('initializeCoreModules 호출 전');
    await initializeCoreModules();
    console.log('initializeCoreModules 완료');

    console.log('setupGracefulShutdown 호출 전');
    setupGracefulShutdown();
    console.log('setupGracefulShutdown 완료');

    const port = parseInt(process.env.PORT || '4001', 10);
    console.log('서버 리스닝 시작, 포트:', port);
    
    const server = app.listen(port, '0.0.0.0', () => {
      console.log('서버 리스닝 콜백 실행됨');
      logger.info(`🎉 SERVER IS RUNNING ON PORT ${port}`);
    });

    server.on('error', (_error: any) => {
      console.error('서버 에러 이벤트:', _error);
      logger.error('Server failed to start:', _error);
      process.exit(1);
    });

    console.log('startServer 함수 완료');

  } catch (_error) {
    console.error('startServer catch 블록:', _error);
    logger.error('Server startup failed:', _error);
    process.exit(1);
  }
}

// 전역 에러 핸들러
process.on('uncaughtException', (_error) => {
  console.error('UNCAUGHT EXCEPTION:', _error);
  logger.error('UNCAUGHT EXCEPTION:', _error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  logger.error('UNHANDLED REJECTION:', reason);
});

// 서버 시작
console.log('startServer 호출 직전');
startServer();
console.log('startServer 호출 완료');

export default app;