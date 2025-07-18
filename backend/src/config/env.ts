/**
 * 중앙화된 환경 변수 접근 모듈
 * 모든 서비스에서 이 모듈을 통해 환경 변수에 접근해야 합니다.
 */

import { getEnvConfig, getEnvAccessors } from '../initialization/envLoader';

/**
 * 환경 변수 설정 객체
 * 타입 안전한 환경 변수 접근을 위한 프록시 객체
 */
export const env = {
  /**
   * 원시 환경 변수 설정 객체를 반환합니다.
   * 직접 접근보다는 아래의 전용 함수들을 사용하는 것을 권장합니다.
   */
  get raw() {
    return getEnvConfig();
  },

  /**
   * 서버 설정
   */
  get server() {
    return getEnvAccessors().getServerConfig();
  },

  /**
   * 외부 서비스 설정
   */
  get externalServices() {
    return getEnvAccessors().getExternalServicesConfig();
  },

  /**
   * AI 서비스 설정
   */
  get ai() {
    return getEnvAccessors().getAIServicesConfig();
  },

  /**
   * 정적 데이터 설정
   */
  get staticData() {
    return getEnvAccessors().getStaticDataConfig();
  },

  /**
   * 초기화 설정
   */
  get initialization() {
    return getEnvAccessors().getInitializationConfig();
  },

  /**
   * 기능 토글 설정
   */
  get features() {
    return getEnvAccessors().getFeatureToggles();
  }
};

/**
 * 환경 변수 접근자 함수들을 개별적으로 export
 * 트리 셰이킹 최적화를 위해 필요한 함수만 import 가능
 */
// 환경 변수 로드 순서 문제를 해결하기 위해 lazy loading 방식으로 변경
function getEnvAccessorsLazy() {
  try {
    return getEnvAccessors();
  } catch (error) {
    console.warn('환경 변수가 아직 로드되지 않았습니다. 일부 기능이 제한될 수 있습니다.');
    return null;
  }
}

export const getServerConfig = () => getEnvAccessorsLazy()?.getServerConfig();
export const getExternalServicesConfig = () => getEnvAccessorsLazy()?.getExternalServicesConfig();
export const getAIServicesConfig = () => getEnvAccessorsLazy()?.getAIServicesConfig();
export const getStaticDataConfig = () => getEnvAccessorsLazy()?.getStaticDataConfig();
export const getInitializationConfig = () => getEnvAccessorsLazy()?.getInitializationConfig();
export const getFeatureToggles = () => getEnvAccessorsLazy()?.getFeatureToggles();

/**
 * 주요 환경 변수들의 빠른 접근을 위한 상수들
 */
export const SERVER_CONFIG = {
  get PORT() { return getEnvAccessorsLazy()?.getServerConfig()?.port; },
  get NODE_ENV() { return getEnvAccessorsLazy()?.getServerConfig()?.nodeEnv; },
  get IS_PRODUCTION() { return getEnvAccessorsLazy()?.getServerConfig()?.isProduction; },
  get IS_DEVELOPMENT() { return getEnvAccessorsLazy()?.getServerConfig()?.isDevelopment; },
  get CORS_ORIGINS() { return getEnvAccessorsLazy()?.getServerConfig()?.corsOrigins; }
};

export const DATABASE_CONFIG = {
  get MONGODB_URI() { return getEnvAccessorsLazy()?.getExternalServicesConfig()?.mongodb.uri; },
  get MONGODB_TIMEOUT() { return getEnvAccessorsLazy()?.getExternalServicesConfig()?.mongodb.connectionTimeout; },
  get REDIS_URL() { return getEnvAccessorsLazy()?.getExternalServicesConfig()?.redis.url; },
  get REDIS_CLUSTER_URL() { return getEnvAccessorsLazy()?.getExternalServicesConfig()?.redis.clusterUrl; }
};

export const API_CONFIG = {
  get RIOT_API_KEY() { return getEnvAccessorsLazy()?.getExternalServicesConfig()?.riotApi.key; },
  get DEFAULT_REGION() { return getEnvAccessorsLazy()?.getExternalServicesConfig()?.riotApi.region; }
};

export const AI_CONFIG = {
  get GOOGLE_AI_MAIN_KEY() { return getEnvAccessorsLazy()?.getAIServicesConfig()?.googleAI.mainApiKey; },
  get GOOGLE_AI_TRANSLATION_KEY() { return getEnvAccessorsLazy()?.getAIServicesConfig()?.googleAI.translationApiKey; },
  get GEMINI_API_KEY() { return getEnvAccessorsLazy()?.getAIServicesConfig()?.gemini.apiKey; },
  get IS_GOOGLE_AI_AVAILABLE() { return getEnvAccessorsLazy()?.getAIServicesConfig()?.googleAI.isMainAvailable; },
  get IS_TRANSLATION_AVAILABLE() { return getEnvAccessorsLazy()?.getAIServicesConfig()?.googleAI.isTranslationAvailable; },
  get IS_GEMINI_AVAILABLE() { return getEnvAccessorsLazy()?.getAIServicesConfig()?.gemini.isAvailable; }
};

/**
 * 개발 및 디버깅을 위한 환경 변수 정보
 */
export const ENV_INFO = {
  get isDevelopment() { return getEnvAccessorsLazy()?.getServerConfig()?.isDevelopment; },
  get isProduction() { return getEnvAccessorsLazy()?.getServerConfig()?.isProduction; },
  get isTest() { return getEnvAccessorsLazy()?.getServerConfig()?.isTest; },
  get nodeEnv() { return getEnvAccessorsLazy()?.getServerConfig()?.nodeEnv; },
  get developmentMode() { return getEnvAccessorsLazy()?.getServerConfig()?.developmentMode; },
  get httpsEnabled() { return getEnvAccessorsLazy()?.getServerConfig()?.httpsEnabled; }
};

/**
 * 안전한 환경 변수 접근을 위한 헬퍼 함수들
 */
export const envHelpers = {
  /**
   * 환경 변수가 설정되어 있는지 확인
   */
  hasGoogleAI: () => {
    const accessors = getEnvAccessorsLazy();
    if (!accessors) return false;
    return !!accessors.getAIServicesConfig().googleAI.mainApiKey;
  },
  hasTranslation: () => {
    const accessors = getEnvAccessorsLazy();
    if (!accessors) return false;
    return !!accessors.getAIServicesConfig().googleAI.translationApiKey;
  },
  hasGemini: () => {
    const accessors = getEnvAccessorsLazy();
    if (!accessors) return false;
    return !!accessors.getAIServicesConfig().gemini.apiKey;
  },
  hasRedis: () => {
    const accessors = getEnvAccessorsLazy();
    if (!accessors) return false;
    const externalServices = accessors.getExternalServicesConfig();
    return !!(externalServices.redis.url || externalServices.redis.clusterUrl);
  },
  
  /**
   * 기능 사용 가능 여부 확인
   */
  isFeatureEnabled: (feature: keyof ReturnType<typeof getFeatureToggles>) => {
    const accessors = getEnvAccessorsLazy();
    if (!accessors) return false;
    const features = accessors.getFeatureToggles();
    return features[feature];
  },
  
  /**
   * 환경별 설정 값 반환
   */
  getByEnv: <T>(dev: T, prod: T, test?: T): T => {
    const accessors = getEnvAccessorsLazy();
    if (!accessors) return dev;
    const serverConfig = accessors.getServerConfig();
    if (serverConfig.isTest && test !== undefined) return test;
    if (serverConfig.isProduction) return prod;
    return dev;
  }
};

/**
 * 타입 안전한 환경 변수 접근을 위한 타입 가드
 */
export const envGuards = {
  /**
   * Google AI 키가 설정되어 있는지 확인하고 타입 가드 제공
   */
  hasGoogleAIKey: (key?: string): key is string => {
    return typeof key === 'string' && key.length > 0;
  },
  
  /**
   * Redis URL이 설정되어 있는지 확인하고 타입 가드 제공
   */
  hasRedisUrl: (url?: string): url is string => {
    return typeof url === 'string' && url.length > 0;
  },
  
  /**
   * 필수 환경 변수들이 모두 설정되어 있는지 확인
   */
  hasRequiredEnvs: () => {
    const accessors = getEnvAccessorsLazy();
    if (!accessors) return false;
    // Check if required environment variables are set
    return !!(process.env.RIOT_API_KEY && process.env.MONGODB_URI);
  }
};