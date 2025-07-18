/**
 * 외부 서비스 연결 모듈
 * MongoDB와 Redis 등 외부 서비스 연결을 관리합니다.
 */

import mongoose, { ConnectOptions } from 'mongoose';
import logger from '../config/logger';
import cacheManager from '../services/cacheManager';
import { getExternalServicesConfig } from './envLoader';

interface ServiceConnectionResult {
  service: string;
  status: 'connected' | 'failed' | 'skipped';
  message: string;
  error?: any;
}

interface ExternalServicesStatus {
  allConnected: boolean;
  criticalServicesConnected: boolean;
  results: ServiceConnectionResult[];
}

/**
 * MongoDB 연결을 시도합니다.
 */
const connectMongoDB = async (): Promise<ServiceConnectionResult> => {
  const config = getExternalServicesConfig();
  
  // 재시도 로직 활성화 여부 (기본: 비활성화로 기존 동작 보존)
  const enableRetry = process.env.ENABLE_MONGODB_RETRY === 'true';
  const maxRetries = enableRetry ? config.mongodb.maxRetries : 1;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        logger.info(`[MongoDB] 재시도 중... (${attempt}/${maxRetries})`);
        // 재시도 지연
        await new Promise(resolve => setTimeout(resolve, config.mongodb.retryDelay));
      } else {
        logger.info('[MongoDB] 연결을 시도합니다...');
      }
      
      const mongoOptions: ConnectOptions = {
        maxPoolSize: config.mongodb.poolSize?.max || 10, // 기존 기본값 유지
        minPoolSize: config.mongodb.poolSize?.min || 2,  // 기존 기본값 유지
        serverSelectionTimeoutMS: config.mongodb.connectionTimeout,
        socketTimeoutMS: 10000,
        connectTimeoutMS: config.mongodb.connectionTimeout,
        bufferCommands: false,
        maxIdleTimeMS: 30000,
        heartbeatFrequencyMS: 10000,
        readPreference: 'primary'
      };
      
      // Promise.race를 사용하여 타임아웃 구현
      const conn = await Promise.race([
        mongoose.connect(config.mongodb.uri, mongoOptions),
        new Promise<never>((_, reject) => 
          setTimeout(
            () => reject(new Error(`MongoDB 연결 타임아웃 (${config.mongodb.connectionTimeout / 1000}초)`)), 
            config.mongodb.connectionTimeout
          )
        )
      ]);
      
      logger.info(`[MongoDB] ✅ 연결 성공: ${conn.connection.host}`);
      
      // 연결 상태 모니터링 설정 (첫 번째 성공 시에만)
      if (attempt === 1 || !mongoose.connection.listeners('error').length) {
        mongoose.connection.on('error', (_err) => {
          logger.error('[MongoDB] 연결 오류:', _err);
        });
        
        mongoose.connection.on('disconnected', () => {
          logger.warn('[MongoDB] 연결이 끊어졌습니다.');
        });
        
        mongoose.connection.on('reconnected', () => {
          logger.info('[MongoDB] 재연결되었습니다.');
        });
      }
      
      return {
        service: 'MongoDB',
        status: 'connected',
        message: `Connected to ${conn.connection.host}${attempt > 1 ? ` (${attempt}번째 시도에서 성공)` : ''}`
      };
      
    } catch (_error: any) {
      lastError = _error;
      
      if (attempt < maxRetries) {
        logger.warn(`[MongoDB] 연결 실패 (${attempt}/${maxRetries}): ${_error.message}. 재시도합니다...`);
        continue;
      } else {
        logger.error(`[MongoDB] ❌ 최종 연결 실패 (${attempt}/${maxRetries}): ${_error.message}`);
        break;
      }
    }
  }
  
  // 모든 재시도 실패
  return {
    service: 'MongoDB',
    status: 'failed',
    message: lastError?.message || 'Unknown error',
    error: lastError
  };
};

/**
 * Redis 캐시 연결을 시도합니다.
 */
const connectRedis = async (): Promise<ServiceConnectionResult> => {
  const config = getExternalServicesConfig();
  
  if (!config.redis.url) {
    logger.warn('[Redis] UPSTASH_REDIS_URL이 설정되지 않아 Redis 연결을 건너뜁니다.');
    return {
      service: 'Redis',
      status: 'skipped',
      message: 'No Redis URL configured, using in-memory cache only'
    };
  }
  
  try {
    logger.info('[Redis] 연결을 시도합니다...');
    
    // 타임아웃과 함께 연결 시도
    await Promise.race([
      cacheManager.connect(),
      new Promise<never>((_, reject) => 
        setTimeout(
          () => reject(new Error(`Redis 연결 타임아웃 (${config.redis.connectionTimeout / 1000}초)`)), 
          config.redis.connectionTimeout
        )
      )
    ]);
    
    logger.info('[Redis] ✅ 연결 성공');
    
    return {
      service: 'Redis',
      status: 'connected',
      message: 'Connected to Redis cache'
    };
    
  } catch (_error: any) {
    logger.error(`[Redis] ❌ 연결 실패: ${_error.message}`);
    
    return {
      service: 'Redis',
      status: 'failed',
      message: _error.message,
      error: _error
    };
  }
};

/**
 * 모든 외부 서비스에 연결합니다.
 * @param options 연결 옵션
 */
export const connectExternalServices = async (options?: {
  continueOnError?: boolean;
  requiredServices?: string[];
}): Promise<ExternalServicesStatus> => {
  const { 
    continueOnError = true, 
    requiredServices = ['MongoDB'] // 기본적으로 MongoDB만 필수
  } = options || {};
  
  logger.info('=== 외부 서비스 연결 시작 ===');
  
  const results: ServiceConnectionResult[] = [];
  
  // MongoDB 연결
  const mongoResult = await connectMongoDB();
  results.push(mongoResult);
  
  // MongoDB가 필수 서비스이고 연결 실패 시 처리
  if (requiredServices.includes('MongoDB') && mongoResult.status === 'failed' && !continueOnError) {
    return {
      allConnected: false,
      criticalServicesConnected: false,
      results
    };
  }
  
  // Redis 연결
  const redisResult = await connectRedis();
  results.push(redisResult);
  
  // Redis가 필수 서비스이고 연결 실패 시 처리
  if (requiredServices.includes('Redis') && redisResult.status === 'failed' && !continueOnError) {
    return {
      allConnected: false,
      criticalServicesConnected: false,
      results
    };
  }
  
  // 전체 연결 상태 확인
  const allConnected = results.every(r => r.status === 'connected' || r.status === 'skipped');
  const criticalServicesConnected = requiredServices.every(service => {
    const result = results.find(r => r.service === service);
    return result && (result.status === 'connected' || result.status === 'skipped');
  });
  
  // 결과 요약 로깅
  logger.info('=== 외부 서비스 연결 결과 ===');
  results.forEach(result => {
    const emoji = result.status === 'connected' ? '✅' : 
                  result.status === 'failed' ? '❌' : '⚠️';
    logger.info(`${emoji} ${result.service}: ${result.message}`);
  });
  
  if (criticalServicesConnected) {
    logger.info('✅ 필수 서비스 연결 완료');
  } else {
    logger.error('❌ 필수 서비스 연결 실패');
  }
  
  return {
    allConnected,
    criticalServicesConnected,
    results
  };
};

/**
 * 외부 서비스 연결을 해제합니다.
 */
export const disconnectExternalServices = async (): Promise<void> => {
  logger.info('외부 서비스 연결을 해제합니다...');
  
  try {
    // MongoDB 연결 해제
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('[MongoDB] 연결 해제 완료');
    }
    
    // Redis 연결 해제
    cacheManager.disconnect();
    logger.info('[Redis] 연결 해제 완료');
    
  } catch (_error: any) {
    logger.error('외부 서비스 연결 해제 중 오류:', _error);
  }
};

/**
 * 서비스 연결 상태를 확인합니다.
 */
export const checkServiceHealth = () => {
  return {
    mongodb: {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host
    },
    redis: {
      stats: cacheManager.getStats()
    }
  };
};