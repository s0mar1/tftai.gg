/**
 * 환경 변수 로더 모듈
 * 서버 시작 시 가장 먼저 실행되어 모든 환경 변수를 로드하고 검증합니다.
 */

import dotenv from 'dotenv';
import path from 'path';
import logger from '../config/logger';
import { safeValidateEnv, createEnvAccessors, maskSensitiveData, type EnvConfig } from '../config/envSchema';


interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: EnvConfig | undefined;
}

// 전역 환경 변수 설정 객체
let globalEnvConfig: EnvConfig | null = null;
let globalEnvAccessors: ReturnType<typeof createEnvAccessors> | null = null;

/**
 * 환경 변수를 로드하고 검증합니다.
 * @returns 환경 변수 검증 결과
 */
export const loadAndValidateEnv = (): EnvValidationResult => {
  logger.info('[ENV LOADER] 환경 변수 로드를 시작합니다...');
  
  // .env 파일 로드
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    logger.warn(`[ENV LOADER] .env 파일을 찾을 수 없습니다. 시스템 환경 변수를 사용합니다. (경로: ${envPath})`);
  } else {
    logger.info('[ENV LOADER] .env 파일을 성공적으로 로드했습니다.');
  }
  
  // Zod 스키마를 사용한 환경 변수 검증
  const validationResult = safeValidateEnv(process.env);
  
  const envResult: EnvValidationResult = {
    isValid: validationResult.success,
    errors: validationResult.success ? [] : [validationResult.error!],
    warnings: validationResult.warnings,
    config: validationResult.data
  };
  
  if (validationResult.success && validationResult.data) {
    // 전역 환경 변수 설정 저장
    globalEnvConfig = validationResult.data;
    globalEnvAccessors = createEnvAccessors(validationResult.data);
    
    // 환경 변수 정보 로깅 (민감한 정보는 마스킹)
    logger.info('[ENV LOADER] 환경 변수 상태:');
    logger.info(`  - NODE_ENV: ${validationResult.data.NODE_ENV}`);
    logger.info(`  - PORT: ${validationResult.data.PORT}`);
    logger.info(`  - MONGODB_URI: ${maskSensitiveData(validationResult.data.MONGODB_URI)}`);
    logger.info(`  - RIOT_API_KEY: ${maskSensitiveData(validationResult.data.RIOT_API_KEY)}`);
    logger.info(`  - UPSTASH_REDIS_URL: ${validationResult.data.UPSTASH_REDIS_URL ? '설정됨' : '미설정'}`);
    logger.info(`  - REDIS_CLUSTER_URL: ${validationResult.data.REDIS_CLUSTER_URL ? '설정됨' : '미설정'}`);
    logger.info(`  - GOOGLE_AI_MAIN_API_KEY: ${validationResult.data.GOOGLE_AI_MAIN_API_KEY ? '설정됨' : '미설정'}`);
    logger.info(`  - GOOGLE_AI_TRANSLATION_API_KEY: ${validationResult.data.GOOGLE_AI_TRANSLATION_API_KEY ? '설정됨' : '미설정'}`);
    logger.info(`  - GEMINI_API_KEY: ${validationResult.data.GEMINI_API_KEY ? '설정됨' : '미설정'}`);
  }
  
  // 검증 결과 로깅
  if (envResult.errors.length > 0) {
    logger.error('[ENV LOADER] 환경 변수 검증 실패:');
    envResult.errors.forEach(error => logger.error(`  - ${error}`));
  }
  
  if (envResult.warnings.length > 0) {
    logger.warn('[ENV LOADER] 환경 변수 경고:');
    envResult.warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }
  
  if (envResult.isValid) {
    logger.info('[ENV LOADER] ✅ 환경 변수 검증 완료');
  } else {
    logger.error('[ENV LOADER] ❌ 환경 변수 검증 실패');
  }
  
  return envResult;
};

/**
 * 타입 안전한 환경 변수 접근 함수들
 */

/**
 * 환경 변수 설정 객체를 반환합니다.
 * @throws {Error} 환경 변수가 로드되지 않은 경우
 */
export const getEnvConfig = (): EnvConfig => {
  if (!globalEnvConfig) {
    throw new Error('환경 변수가 아직 로드되지 않았습니다. loadAndValidateEnv()를 먼저 호출하세요.');
  }
  return globalEnvConfig;
};

/**
 * 환경 변수 접근자 함수들을 반환합니다.
 * @throws {Error} 환경 변수가 로드되지 않은 경우
 */
export const getEnvAccessors = (): ReturnType<typeof createEnvAccessors> => {
  if (!globalEnvAccessors) {
    throw new Error('환경 변수가 아직 로드되지 않았습니다. loadAndValidateEnv()를 먼저 호출하세요.');
  }
  return globalEnvAccessors;
};

/**
 * 초기 데이터 수집 관련 환경 변수를 확인합니다.
 * @deprecated getEnvAccessors().getInitializationConfig() 사용 권장
 */
export const getInitialDataCollectionConfig = () => {
  const config = getEnvConfig();
  return {
    enableInitialDataCollection: config.ENABLE_INITIAL_DATA_COLLECTION,
    initialDataCollectionDelay: config.INITIAL_DATA_COLLECTION_DELAY,
    dataCollectionTimeout: config.DATA_COLLECTION_TIMEOUT
  };
};

/**
 * 서버 설정 관련 환경 변수를 반환합니다.
 * @deprecated getEnvAccessors().getServerConfig() 사용 권장
 */
export const getServerConfig = () => {
  return getEnvAccessors().getServerConfig();
};

/**
 * 외부 서비스 관련 환경 변수를 반환합니다.
 * @deprecated getEnvAccessors().getExternalServicesConfig() 사용 권장
 */
export const getExternalServicesConfig = () => {
  const accessors = getEnvAccessors();
  const externalServices = accessors.getExternalServicesConfig();
  const staticData = accessors.getStaticDataConfig();
  
  return {
    ...externalServices,
    staticData: {
      loadTimeout: staticData.loadTimeout,
      retryAttempts: staticData.retryAttempts,
      retryDelay: staticData.retryDelay
    }
  };
};

/**
 * 환경 변수 접근자 함수들을 lazy loading 방식으로 반환
 * @deprecated 이 함수는 더 이상 사용되지 않습니다. getEnvAccessors() 사용을 권장합니다.
 */
export const getEnvAccessorsLazy = () => {
  try {
    return getEnvAccessors();
  } catch (error) {
    console.warn('환경 변수가 아직 로드되지 않았습니다. 일부 기능이 제한될 수 있습니다.');
    return null;
  }
};