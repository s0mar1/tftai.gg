import mongoose, { ConnectOptions } from 'mongoose';
import logger from './logger';
import { getExternalServicesConfig } from '../initialization/envLoader';
import { DATABASE_CONFIG, ENV_INFO } from './env';

// MongoDB 연결 상태 추적
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

const connectDB = async (): Promise<void> => {
  // 이미 연결된 경우
  if (isConnected) {
    return;
  }

  // 연결 시도 중인 경우 기존 Promise 반환
  if (connectionPromise) {
    return connectionPromise;
  }

  const config = getExternalServicesConfig();
  const mongoUri = config.mongodb.uri;
  const mongoUriLocal = DATABASE_CONFIG.MONGODB_URI; // 로컬 URI 사용 시 환경 변수 추가 필요
  const developmentMode = ENV_INFO.developmentMode;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  // 개발 모드 설정 확인을 위한 로그
  logger.info(`MongoDB 연결 설정 확인: DEVELOPMENT_MODE=${process.env.DEVELOPMENT_MODE}, developmentMode=${developmentMode}`);

  logger.info('[MongoDB] 연결을 시도합니다...');
  logger.info(`[MongoDB] 연결 시도 URL: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // 패스워드 마스킹
  
  connectionPromise = (async () => {
    let lastError: Error | null = null;
    
    // 메인 URI 시도 (통합된 설정 사용)
    try {
      logger.info('[MongoDB] 메인 URI로 연결 시도...');
      
      const mongoOptions: ConnectOptions = {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: config.mongodb.connectionTimeout,
        socketTimeoutMS: config.mongodb.connectionTimeout + 5000, // 연결 타임아웃보다 5초 더
        connectTimeoutMS: config.mongodb.connectionTimeout,
        bufferCommands: false,
        maxIdleTimeMS: 30000,
        heartbeatFrequencyMS: 10000,
        readPreference: 'primary',
        retryWrites: true,
        retryReads: true
      };

      const conn = await mongoose.connect(mongoUri, mongoOptions);
      
      isConnected = true;
      logger.info(`[MongoDB] ✅ 연결 성공: ${conn.connection.host}`);
      
      // 연결 상태 이벤트 처리
      mongoose.connection.on('error', (_err: unknown) => {
        const errorMessage = _err instanceof Error ? _err.message : String(_err);
        logger.error('[MongoDB] 연결 오류:', errorMessage);
      });
      
      mongoose.connection.on('disconnected', () => {
        isConnected = false;
        logger.warn('[MongoDB] 연결이 끊어졌습니다.');
      });

      mongoose.connection.on('reconnected', () => {
        isConnected = true;
        logger.info('[MongoDB] 재연결되었습니다.');
      });

    } catch (_error: unknown) {
      lastError = _error instanceof Error ? _error : new Error(String(_error));
      logger.error(`[MongoDB] ❌ 메인 URI 연결 실패: ${lastError.message}`);
      
      
      // 로컬 MongoDB URI가 있는 경우 시도
      if (mongoUriLocal) {
        try {
          logger.info('[MongoDB] 로컬 URI로 연결 시도...');
          const localOptions: ConnectOptions = {
            maxPoolSize: 5,
            minPoolSize: 1,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000,
            connectTimeoutMS: 5000,
            bufferCommands: false
          };
          
          const conn = await mongoose.connect(mongoUriLocal, localOptions);
          
          isConnected = true;
          logger.info(`[MongoDB] ✅ 로컬 연결 성공: ${conn.connection.host}`);
          return; // 성공적으로 연결됨
        } catch (localError: unknown) {
          const errorMessage = localError instanceof Error ? localError.message : String(localError);
          logger.error(`[MongoDB] 로컬 연결도 실패: ${errorMessage}`);
        }
      }
      
      // 모든 연결 시도 실패
      isConnected = false;
      connectionPromise = null;
      logger.error(`[MongoDB] 모든 연결 시도 실패: ${lastError.message}`);
      throw lastError; // 연결 실패 시 에러 전파
    }
  })();

  return connectionPromise;
};

// MongoDB 연결 상태 확인 함수
export const isMongoConnected = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

// MongoDB 재연결 시도
export const reconnectMongoDB = async (): Promise<void> => {
  if (!isConnected) {
    connectionPromise = null;
    return connectDB();
  }
};

export default connectDB;