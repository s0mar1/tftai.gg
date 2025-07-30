// backend/src/server.ts - TFT Meta Analyzer

// 🚀 Phase 1: 환경변수 최우선 로드 (모든 import 이전에 실행)
import dotenv from 'dotenv';
dotenv.config();
console.log('✅ 환경변수 최우선 로드 완료');

// 🚀 Phase 3: 필수 환경변수 즉시 검증 (서버 시작 전 조기 발견)
const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'RIOT_API_KEY',
  'NODE_ENV',
  'PORT'
];

console.log('🔍 필수 환경변수 즉시 검증 시작...');
const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ 필수 환경변수가 누락되었습니다:');
  missingVars.forEach(varName => {
    console.error(`  - ${varName}: 미설정`);
  });
  console.error('');
  console.error('💡 해결 방법:');
  console.error('  1. .env 파일이 존재하는지 확인하세요');
  console.error('  2. 위의 필수 환경변수들이 .env 파일에 설정되어 있는지 확인하세요');
  console.error('  3. .env 파일이 프로젝트 루트 디렉토리에 있는지 확인하세요');
  console.error('');
  console.error('🚨 서버를 시작할 수 없습니다. 프로세스를 종료합니다.');
  process.exit(1);
}

console.log('✅ 필수 환경변수 즉시 검증 완료');
REQUIRED_ENV_VARS.forEach(varName => {
  const value = process.env[varName];
  const displayValue = ['MONGODB_URI', 'RIOT_API_KEY'].includes(varName) 
    ? value!.substring(0, 4) + '...' + value!.slice(-4)
    : value;
  console.log(`  ✓ ${varName}: ${displayValue}`);
});

console.log('=== 서버 시작 ===');
console.log('Node.js 버전:', process.version);
console.log('환경변수 PORT:', process.env.PORT);
console.log('환경변수 NODE_ENV:', process.env.NODE_ENV);
console.log('환경변수 MONGODB_URI 존재:', !!process.env.MONGODB_URI);

import 'express-async-errors';
import express from 'express';
import http from 'http';
import logger from './config/logger';
import { initializeCoreModules } from './initialization/coreModules';
import { setupRoutes, setup404Handler } from './initialization/routeSetup';
import { loadAndValidateEnv } from './initialization/envLoader';
import { setupGraphQL, isGraphQLEnabled, logGraphQLInfo } from './initialization/graphqlSetup';
import RealtimeEventService from './services/realtimeEvents';

console.log('모든 import 완료');

// dotenv.config(); // 🚀 Phase 1: 최상단으로 이동됨 (기존 호출 보존)
console.log('환경변수 설정 확인 완료');

const app = express();
const httpServer = http.createServer(app);
console.log('Express 앱 및 HTTP 서버 생성 완료');

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
  
  // 3. GraphQL 설정 (Feature Flag로 제어)
  if (isGraphQLEnabled()) {
    console.log('GraphQL 설정 시작');
    logGraphQLInfo();
    
    const graphqlSetupResult = await setupGraphQL(app, httpServer);
    console.log('GraphQL 설정 결과:', graphqlSetupResult.success);
    
    if (graphqlSetupResult.success) {
      logger.info(`GraphQL 설정 완료 - 엔드포인트: ${graphqlSetupResult.endpoint}`);
    } else {
      logger.warn(`GraphQL 설정 실패: ${graphqlSetupResult.message}`);
      // GraphQL 실패는 전체 서버 시작을 중단하지 않음
    }
  } else {
    logger.info('GraphQL이 비활성화되어 있습니다 (ENABLE_GRAPHQL=false)');
  }
  
  // 4. 404 핸들러 설정 (모든 미들웨어와 라우트 등록 후 마지막에)
  console.log('404 핸들러 설정 시작');
  setup404Handler(app);
  console.log('404 핸들러 설정 완료');
  
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
    
    const server = httpServer.listen(port, '0.0.0.0', () => {
      console.log('서버 리스닝 콜백 실행됨');
      logger.info(`🎉 SERVER IS RUNNING ON PORT ${port}`);
      
      // GraphQL 정보 추가 로깅
      if (isGraphQLEnabled()) {
        logger.info(`🚀 GraphQL Endpoint: http://localhost:${port}/graphql`);
        logger.info(`📖 GraphiQL available at: http://localhost:${port}/graphql`);
      }
      logger.info(`📚 REST API Docs: http://localhost:${port}/api-docs`);

      // 서버 시작 이벤트 발행 (GraphQL Subscriptions 테스트용)
      setTimeout(() => {
        RealtimeEventService.notifyServerStarted();
        logger.info('📡 서버 시작 실시간 이벤트 발행 완료');
      }, 1000);
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