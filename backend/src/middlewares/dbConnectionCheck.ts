import { Request, Response, NextFunction } from 'express';
import { isMongoConnected, reconnectMongoDB } from '../config/db';
import logger from '../config/logger';
import mongoose from 'mongoose';

/**
 * DB 연결 상태 및 재연결 통계
 */
interface ConnectionStats {
  totalChecks: number;
  reconnectAttempts: number;
  reconnectSuccesses: number;
  reconnectFailures: number;
  lastReconnectTime: Date | null;
  lastFailureTime: Date | null;
  consecutiveFailures: number;
}

const connectionStats: ConnectionStats = {
  totalChecks: 0,
  reconnectAttempts: 0,
  reconnectSuccesses: 0,
  reconnectFailures: 0,
  lastReconnectTime: null,
  lastFailureTime: null,
  consecutiveFailures: 0
};

/**
 * 백오프 전략 계산
 */
function calculateBackoffDelay(consecutiveFailures: number): number {
  // 지수 백오프: 최소 1초, 최대 30초
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, consecutiveFailures), maxDelay);
  return delay;
}

/**
 * 향상된 연결 상태 확인 (단순한 isConnected 체크를 넘어서)
 */
async function checkConnectionHealth(): Promise<boolean> {
  try {
    // 1. 기본 연결 상태 확인
    if (!isMongoConnected()) {
      return false;
    }

    // 2. 연결 상태 세부 확인
    const readyState = mongoose.connection.readyState;
    if (readyState !== 1) { // 1 = connected
      logger.warn(`MongoDB 연결 상태가 비정상입니다. readyState: ${readyState}`);
      return false;
    }

    // 3. 실제 ping 테스트 (간단한 쿼리)
    const db = mongoose.connection.db;
    if (!db) {
      logger.warn('MongoDB 데이터베이스 객체가 없습니다');
      return false;
    }
    const pingResult = await db.admin().ping();
    if (!pingResult.ok) {
      logger.warn('MongoDB ping 테스트 실패');
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('MongoDB 연결 헬스체크 실패:', error);
    return false;
  }
}

/**
 * 향상된 재연결 로직
 */
async function attemptReconnection(retryCount: number = 0): Promise<void> {
  const maxRetries = 3;
  const baseTimeout = 5000;
  
  if (retryCount >= maxRetries) {
    throw new Error(`재연결 최대 시도 횟수 초과 (${maxRetries}번)`);
  }

  const timeout = baseTimeout + (retryCount * 2000); // 타임아웃 점진적 증가
  
  try {
    logger.info(`MongoDB 재연결 시도 ${retryCount + 1}/${maxRetries}, 타임아웃: ${timeout}ms`);
    
    // 타임아웃과 함께 재연결 시도
    await Promise.race([
      reconnectMongoDB(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`재연결 타임아웃 (${timeout}ms)`)), timeout)
      )
    ]);

    // 연결 후 헬스체크
    const isHealthy = await checkConnectionHealth();
    if (!isHealthy) {
      throw new Error('재연결 후 헬스체크 실패');
    }

    // 성공 통계 업데이트
    connectionStats.reconnectSuccesses++;
    connectionStats.lastReconnectTime = new Date();
    connectionStats.consecutiveFailures = 0;
    
    logger.info(`MongoDB 재연결 성공 (시도 ${retryCount + 1}/${maxRetries})`);
  } catch (error) {
    connectionStats.reconnectFailures++;
    connectionStats.lastFailureTime = new Date();
    connectionStats.consecutiveFailures++;
    
    logger.error(`MongoDB 재연결 실패 (시도 ${retryCount + 1}/${maxRetries}):`, error);
    
    if (retryCount < maxRetries - 1) {
      const backoffDelay = calculateBackoffDelay(connectionStats.consecutiveFailures);
      logger.info(`${backoffDelay}ms 후 재연결 재시도`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return attemptReconnection(retryCount + 1);
    } else {
      throw error;
    }
  }
}

/**
 * MongoDB 연결 상태를 확인하고 필요시 재연결을 시도하는 미들웨어 (향상됨)
 */
export const checkDBConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  connectionStats.totalChecks++;
  
  try {
    // 개발 모드에서는 DB 연결 체크를 건너뛰고 바로 다음 미들웨어로 진행
    if (process.env.DEVELOPMENT_MODE === 'true') {
      logger.info(`[${req.method} ${req.originalUrl}] 개발 모드: DB 연결 체크를 건너뛰고 Mock 데이터를 사용합니다.`);
      next();
      return;
    }
    
    // 향상된 연결 상태 확인
    const isHealthy = await checkConnectionHealth();
    
    if (!isHealthy) {
      logger.warn(`[${req.method} ${req.originalUrl}] MongoDB 연결 상태가 비정상입니다. 재연결을 시도합니다.`);
      
      connectionStats.reconnectAttempts++;
      
      try {
        await attemptReconnection();
        
        logger.info(`[${req.method} ${req.originalUrl}] MongoDB 재연결 성공`);
        next();
      } catch (reconnectError) {
        logger.error(`[${req.method} ${req.originalUrl}] MongoDB 재연결 완전 실패:`, reconnectError);
        
        // 재연결 실패 시 상세한 에러 응답
        res.status(503).json({
          success: false,
          error: 'DATABASE_UNAVAILABLE',
          message: '데이터베이스 연결이 불가능합니다. 잠시 후 다시 시도해주세요.',
          details: {
            reconnectAttempts: connectionStats.reconnectAttempts,
            consecutiveFailures: connectionStats.consecutiveFailures,
            suggestedRetryAfter: calculateBackoffDelay(connectionStats.consecutiveFailures)
          },
          code: 503,
          timestamp: new Date().toISOString()
        });
        return;
      }
    } else {
      // 연결이 정상인 경우 다음 미들웨어로
      next();
    }
  } catch (error) {
    logger.error(`[${req.method} ${req.originalUrl}] DB 연결 확인 중 오류:`, error);
    
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      code: 500,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 특정 라우트에서 DB 연결이 필수인 경우 사용하는 미들웨어 (향상됨)
 */
export const requireDBConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isHealthy = await checkConnectionHealth();
    
    if (!isHealthy) {
      logger.warn(`[${req.method} ${req.originalUrl}] DB 연결 필수 API에 연결 없이 접근 시도`);
      
      res.status(503).json({
        success: false,
        error: 'DATABASE_REQUIRED',
        message: '이 기능을 사용하기 위해서는 데이터베이스 연결이 필요합니다.',
        details: {
          connectionStatus: 'unhealthy',
          suggestedAction: '잠시 후 다시 시도해주세요'
        },
        code: 503,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error(`[${req.method} ${req.originalUrl}] DB 연결 필수 확인 중 오류:`, error);
    
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      code: 500,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * DB 연결 통계 조회 함수
 */
export const getConnectionStats = (): ConnectionStats & { 
  averageReconnectSuccessRate: number;
  uptime: number;
  currentStatus: string;
} => {
  const successRate = connectionStats.reconnectAttempts > 0 ? 
    (connectionStats.reconnectSuccesses / connectionStats.reconnectAttempts) * 100 : 100;
  
  return {
    ...connectionStats,
    averageReconnectSuccessRate: Number(successRate.toFixed(2)),
    uptime: connectionStats.lastReconnectTime ? 
      Date.now() - connectionStats.lastReconnectTime.getTime() : 0,
    currentStatus: isMongoConnected() ? 'healthy' : 'unhealthy'
  };
};

/**
 * 연결 통계 초기화 함수
 */
export const resetConnectionStats = (): void => {
  connectionStats.totalChecks = 0;
  connectionStats.reconnectAttempts = 0;
  connectionStats.reconnectSuccesses = 0;
  connectionStats.reconnectFailures = 0;
  connectionStats.lastReconnectTime = null;
  connectionStats.lastFailureTime = null;
  connectionStats.consecutiveFailures = 0;
  
  logger.info('DB 연결 통계가 초기화되었습니다.');
};

/**
 * 수동으로 연결 상태 체크 및 재연결 시도 함수
 */
export const manualConnectionCheck = async (): Promise<{
  isHealthy: boolean;
  reconnected: boolean;
  error?: string;
}> => {
  try {
    let isHealthy = await checkConnectionHealth();
    let reconnected = false;
    
    if (!isHealthy) {
      logger.info('수동 연결 체크: 연결 상태가 비정상입니다. 재연결을 시도합니다.');
      
      try {
        await attemptReconnection();
        isHealthy = await checkConnectionHealth();
        reconnected = true;
        
        logger.info('수동 연결 체크: 재연결 성공');
      } catch (error) {
        logger.error('수동 연결 체크: 재연결 실패', error);
        return {
          isHealthy: false,
          reconnected: false,
          error: (error as Error).message
        };
      }
    }
    
    return {
      isHealthy,
      reconnected
    };
  } catch (error) {
    logger.error('수동 연결 체크 중 오류:', error);
    return {
      isHealthy: false,
      reconnected: false,
      error: (error as Error).message
    };
  }
};

/**
 * 연결 상태 모니터링을 위한 이벤트 리스너 설정
 */
export const setupConnectionMonitoring = (): void => {
  if (mongoose.connection) {
    // 연결 이벤트 리스너
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB 연결 이벤트: 연결됨');
      connectionStats.consecutiveFailures = 0;
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB 연결 이벤트: 연결 끊김');
      connectionStats.consecutiveFailures++;
    });
    
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB 연결 이벤트: 오류 발생', error);
      connectionStats.consecutiveFailures++;
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB 연결 이벤트: 재연결됨');
      connectionStats.reconnectSuccesses++;
      connectionStats.lastReconnectTime = new Date();
      connectionStats.consecutiveFailures = 0;
    });
    
    logger.info('MongoDB 연결 모니터링 이벤트 리스너 설정 완료');
  }
};

export default checkDBConnection;