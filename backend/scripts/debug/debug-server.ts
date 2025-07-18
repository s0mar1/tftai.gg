/**
 * 서버 디버그 스크립트
 * TypeScript로 변환하여 타입 안전성 확보
 */

import { Express, Request, Response } from 'express';
import { Server } from 'http';

console.log('🔧 === 서버 디버그 시작 ===');

console.log('1️⃣ dotenv 로딩...');
import { config } from 'dotenv';
config();
console.log('✅ dotenv 완료');

console.log('2️⃣ express 로딩...');
import express from 'express';
console.log('✅ express 완료');

console.log('3️⃣ cors 로딩...');
import cors from 'cors';
console.log('✅ cors 완료');

console.log('4️⃣ 환경 변수 검증...');
import { validateEnv } from '../src/config/envSchema.js';

let env: ReturnType<typeof validateEnv>;
try {
  env = validateEnv(process.env);
  console.log('✅ 환경 변수 검증 완료');
} catch (error) {
  console.error('❌ 환경 변수 검증 실패:', error);
  process.exit(1);
}

console.log('5️⃣ 기본 Express 앱 생성...');
const app: Express = express();
console.log('✅ Express 앱 생성 완료');

console.log('6️⃣ 기본 미들웨어 설정...');
app.use(cors({
  origin: env.FRONTEND_URL.split(',').map(url => url.trim()),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('✅ 미들웨어 설정 완료');

console.log('7️⃣ 기본 라우트 설정...');

// 헬스 체크 엔드포인트
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Debug server running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 환경 변수 확인 엔드포인트 (민감 정보 마스킹)
app.get('/debug/env', (req: Request, res: Response) => {
  const safeEnvInfo = {
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    HAS_MONGODB_URI: !!env.MONGODB_URI,
    HAS_RIOT_API_KEY: !!env.RIOT_API_KEY,
    HAS_GOOGLE_AI_KEY: !!env.GOOGLE_AI_MAIN_API_KEY,
    DEFAULT_REGION: env.DEFAULT_REGION,
    FRONTEND_URLS: env.FRONTEND_URL.split(',').map(url => url.trim()),
    DEVELOPMENT_MODE: env.DEVELOPMENT_MODE
  };
  
  res.json({
    message: 'Environment variables (sensitive data masked)',
    data: safeEnvInfo
  });
});

// 서버 상태 체크 엔드포인트
app.get('/debug/status', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    status: 'running',
    uptime: `${Math.floor(uptime / 60)}분 ${Math.floor(uptime % 60)}초`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  });
});

console.log('✅ 기본 라우트 설정 완료');

console.log('8️⃣ 서버 시작...');
const PORT = env.PORT;

const server: Server = app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`🌐 접속 URL: http://localhost:${PORT}`);
  console.log(`🔍 디버그 엔드포인트:`);
  console.log(`   - http://localhost:${PORT}/debug/env`);
  console.log(`   - http://localhost:${PORT}/debug/status`);
});

// 우아한 종료 처리
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 ${signal} 신호 수신. 서버를 종료합니다...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ 서버 종료 중 오류:', err);
      process.exit(1);
    }
    
    console.log('✅ 서버가 정상적으로 종료되었습니다');
    process.exit(0);
  });
  
  // 강제 종료 타이머 (10초)
  setTimeout(() => {
    console.error('❌ 서버 종료 시간 초과. 강제 종료합니다.');
    process.exit(1);
  }, 10000);
};

// 종료 시그널 핸들러 등록
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 예외 처리
process.on('uncaughtException', (error) => {
  console.error('❌ 처리되지 않은 예외:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 처리되지 않은 Promise 거부:', reason);
  console.error('Promise:', promise);
  gracefulShutdown('unhandledRejection');
});

console.log('🔧 === 서버 디버그 완료 ===');

export { app, server };