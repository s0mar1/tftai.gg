// backend/src/server.ts - TFT Meta Analyzer

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import logger from './config/logger';
import { initializeCoreModules } from './initialization/coreModules';
import healthRoutes from './routes/health';
import errorHandler from './middlewares/errorHandler';

dotenv.config();

const app = express();

async function setupExpressServer(): Promise<void> {
  app.use(compression());
  
  // CORS 설정 - 프로덕션 환경에 맞게 구성
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  app.use(cors({ 
    origin: allowedOrigins,
    credentials: true 
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  app.use('/health', healthRoutes);
  app.get('/', (_req, _res) => _res.json({ message: 'TFT Meta Analyzer API is running.' }));
  
  app.use(errorHandler);
}

function setupGracefulShutdown(): void {
  const shutdown = () => process.exit(0);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function startServer() {
  try {
    logger.info('🚀 TFT Meta Analyzer Backend Server is starting...');

    await initializeCoreModules();
    await setupExpressServer();
    setupGracefulShutdown();

    const port = process.env.PORT || 4001;
    const server = app.listen(port, () => {
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