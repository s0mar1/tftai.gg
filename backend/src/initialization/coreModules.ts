/**
 * 핵심 모듈 초기화
 * 서버의 핵심 기능 모듈들을 초기화합니다.
 */

import logger from '../config/logger';
import { startScheduler } from '../services/scheduler';
import connectDB from '../config/db';
import queryMonitor from '../utils/queryMonitor';

interface ModuleInitResult {
  module: string;
  status: 'initialized' | 'failed' | 'skipped';
  message: string;
  error?: any;
}

interface CoreModulesStatus {
  allInitialized: boolean;
  results: ModuleInitResult[];
}

/**
 * 모든 핵심 모듈을 초기화합니다.
 */
export const initializeCoreModules = async (): Promise<CoreModulesStatus> => {
  logger.info('=== Core Modules Initialization ===');
  
  const results: ModuleInitResult[] = [{
    module: 'Core',
    status: 'initialized',
    message: 'Basic core modules initialized'
  }];
  
  // MongoDB 연결 초기화
  try {
    logger.info('🔄 Connecting to MongoDB...');
    await connectDB();
    results.push({
      module: 'MongoDB',
      status: 'initialized',
      message: 'MongoDB connected successfully'
    });
    
    // MongoDB 연결 성공 후 쿼리 모니터링 시작
    queryMonitor.startMonitoring();
    results.push({
      module: 'QueryMonitor',
      status: 'initialized',
      message: 'Query monitoring started successfully'
    });
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    results.push({
      module: 'MongoDB',
      status: 'failed',
      message: 'MongoDB connection failed',
      error
    });
  }
  
  // 스케줄러 초기화
  try {
    logger.info('🔄 Starting scheduler...');
    await startScheduler();
    results.push({
      module: 'Scheduler',
      status: 'initialized',
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    logger.error('❌ Scheduler initialization failed:', error);
    results.push({
      module: 'Scheduler',
      status: 'failed',
      message: 'Scheduler initialization failed',
      error
    });
  }
  
  return {
    allInitialized: true,
    results
  };
};