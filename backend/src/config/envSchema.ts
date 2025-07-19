/**
 * Zod 기반 환경 변수 스키마 정의
 * 타입 안전한 환경 변수 검증을 위한 스키마
 * 
 * 역할: 환경 변수의 타입, 기본값, 검증 규칙을 정의
 * 사용: envLoader.ts에서 환경 변수 검증 시 사용
 */

import { z } from 'zod';

/**
 * 환경 변수 스키마
 * 모든 환경 변수의 타입, 기본값, 검증 규칙을 정의
 */
export const envSchema = z.object({
  // === 기본 서버 설정 ===
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(10000),
  
  // === 필수 외부 서비스 API 키 ===
  RIOT_API_KEY: z.string().min(1, 'Riot API 키는 필수입니다').optional(),
  MONGODB_URI: z.string().url('올바른 MongoDB URI를 입력하세요'),
  
  // === AI 서비스 키 (선택적이지만 해당 기능 사용 시 필수) ===
  GOOGLE_AI_MAIN_API_KEY: z.string().optional(),
  GOOGLE_AI_TRANSLATION_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  
  // === 외부 서비스 URL ===
  UPSTASH_REDIS_URL: z.string().url().optional().or(z.literal('')),
  REDIS_CLUSTER_URL: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000,http://localhost:5173'),
  
  // === MongoDB 설정 ===
  MONGODB_URI_LOCAL: z.string().url().optional(),
  MONGODB_TIMEOUT: z.coerce.number().int().positive().default(10000),
  MONGODB_RETRY_COUNT: z.coerce.number().int().min(0).default(3),
  MONGODB_RETRY_DELAY: z.coerce.number().int().positive().default(1000),
  MONGODB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  MONGODB_POOL_MAX: z.coerce.number().int().positive().default(10),
  
  // === Redis 설정 ===
  REDIS_TIMEOUT: z.coerce.number().int().positive().default(10000),
  REDIS_RETRY_COUNT: z.coerce.number().int().min(0).default(3),
  REDIS_RETRY_DELAY: z.coerce.number().int().positive().default(1000),
  
  // === 정적 데이터 설정 ===
  TFT_DATA_TIMEOUT: z.coerce.number().int().positive().default(30000),
  TFT_DATA_RETRY_COUNT: z.coerce.number().int().min(0).default(2),
  TFT_DATA_RETRY_DELAY: z.coerce.number().int().positive().default(2000),
  STATIC_DATA_LANGUAGES: z.string().default('ko,en,ja,fr'),
  
  // === 초기화 설정 ===
  INITIALIZATION_TIMEOUT: z.coerce.number().int().positive().default(120000),
  ENABLE_INITIAL_DATA_COLLECTION: z.coerce.boolean().default(false),
  INITIAL_DATA_COLLECTION_DELAY: z.coerce.number().int().min(0).default(30000),
  DATA_COLLECTION_TIMEOUT: z.coerce.number().int().positive().default(300000),
  
  // === 기능 토글 ===
  DEVELOPMENT_MODE: z.coerce.boolean().default(false),
  HTTPS: z.coerce.boolean().default(false),
  ENABLE_MONGODB_RETRY: z.coerce.boolean().default(true),
  ENABLE_AI_QUEUE_CLEANUP: z.coerce.boolean().default(true),
  ENABLE_CLUSTERING: z.coerce.boolean().default(false),
  ENABLE_METRICS_CLEANUP: z.coerce.boolean().default(true),
  ENABLE_RESOURCE_MONITORING: z.coerce.boolean().default(true),
  ENABLE_PERFORMANCE_MONITORING: z.coerce.boolean().default(true),
  ENABLE_MEMORY_MONITORING: z.coerce.boolean().default(true),
  
  // === 지역 설정 ===
  DEFAULT_REGION: z.string().default('kr'),
});

/**
 * 환경 변수 타입 정의
 * Zod 스키마에서 TypeScript 타입 추론
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * 환경 변수 검증 및 파싱
 * @param env - process.env 객체
 * @returns 검증된 환경 변수 객체
 */
export function validateEnv(env: NodeJS.ProcessEnv): EnvConfig {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: z.ZodIssue) => 
        `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`환경 변수 검증 실패:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * 환경 변수 안전 검증 (서버 시작 시 사용)
 * @param env - process.env 객체
 * @returns 검증 결과와 파싱된 환경 변수
 */
export function safeValidateEnv(env: NodeJS.ProcessEnv): {
  success: boolean;
  data?: EnvConfig;
  error?: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  try {
    const result = envSchema.safeParse(env);
    
    if (!result.success) {
      const errorMessages = result.error.issues.map((err: z.ZodIssue) => 
        `${err.path.join('.')}: ${err.message}`
      );
      return {
        success: false,
        error: `환경 변수 검증 실패:\n${errorMessages.join('\n')}`,
        warnings
      };
    }
    
    // 경고 메시지 생성
    const data = result.data;
    
    if (!data.GOOGLE_AI_MAIN_API_KEY) {
      warnings.push('GOOGLE_AI_MAIN_API_KEY가 설정되지 않아 AI 분석 기능을 사용할 수 없습니다.');
    }
    
    if (!data.GOOGLE_AI_TRANSLATION_API_KEY) {
      warnings.push('GOOGLE_AI_TRANSLATION_API_KEY가 설정되지 않아 번역 기능을 사용할 수 없습니다.');
    }
    
    // GEMINI_API_KEY는 선택사항이므로 경고하지 않음
    
    if (!data.UPSTASH_REDIS_URL && !data.REDIS_CLUSTER_URL) {
      warnings.push('Redis URL이 설정되지 않아 캐시 기능을 사용할 수 없습니다.');
    }
    
    if (data.NODE_ENV === 'production' && !data.HTTPS) {
      warnings.push('프로덕션 환경에서는 HTTPS 사용을 권장합니다.');
    }
    
    return {
      success: true,
      data,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      warnings
    };
  }
}

/**
 * 환경 변수 그룹별 접근 함수들
 */
export function createEnvAccessors(config: EnvConfig) {
  return {
    // 서버 설정
    getServerConfig: () => ({
      port: config.PORT,
      nodeEnv: config.NODE_ENV,
      isProduction: config.NODE_ENV === 'production',
      isDevelopment: config.NODE_ENV === 'development',
      isTest: config.NODE_ENV === 'test',
      corsOrigins: config.FRONTEND_URL.split(',').map(url => url.trim()),
      httpsEnabled: config.HTTPS,
      developmentMode: config.DEVELOPMENT_MODE
    }),
    
    // 외부 서비스 설정
    getExternalServicesConfig: () => ({
      mongodb: {
        uri: config.MONGODB_URI,
        localUri: config.MONGODB_URI_LOCAL,
        connectionTimeout: config.MONGODB_TIMEOUT,
        maxRetries: config.MONGODB_RETRY_COUNT,
        retryDelay: config.MONGODB_RETRY_DELAY,
        poolSize: {
          min: config.MONGODB_POOL_MIN,
          max: config.MONGODB_POOL_MAX
        },
        retryEnabled: config.ENABLE_MONGODB_RETRY
      },
      redis: {
        url: config.UPSTASH_REDIS_URL,
        clusterUrl: config.REDIS_CLUSTER_URL,
        connectionTimeout: config.REDIS_TIMEOUT,
        maxRetries: config.REDIS_RETRY_COUNT,
        retryDelay: config.REDIS_RETRY_DELAY
      },
      riotApi: {
        key: config.RIOT_API_KEY,
        region: config.DEFAULT_REGION
      }
    }),
    
    // AI 서비스 설정
    getAIServicesConfig: () => ({
      googleAI: {
        mainApiKey: config.GOOGLE_AI_MAIN_API_KEY,
        translationApiKey: config.GOOGLE_AI_TRANSLATION_API_KEY,
        isMainAvailable: !!config.GOOGLE_AI_MAIN_API_KEY,
        isTranslationAvailable: !!config.GOOGLE_AI_TRANSLATION_API_KEY
      },
      gemini: {
        apiKey: config.GEMINI_API_KEY,
        isAvailable: !!config.GEMINI_API_KEY
      }
    }),
    
    // 정적 데이터 설정
    getStaticDataConfig: () => ({
      loadTimeout: config.TFT_DATA_TIMEOUT,
      retryAttempts: config.TFT_DATA_RETRY_COUNT,
      retryDelay: config.TFT_DATA_RETRY_DELAY,
      languages: config.STATIC_DATA_LANGUAGES.split(',').map(lang => lang.trim())
    }),
    
    // 초기화 설정
    getInitializationConfig: () => ({
      timeout: config.INITIALIZATION_TIMEOUT,
      enableInitialDataCollection: config.ENABLE_INITIAL_DATA_COLLECTION,
      initialDataCollectionDelay: config.INITIAL_DATA_COLLECTION_DELAY,
      dataCollectionTimeout: config.DATA_COLLECTION_TIMEOUT
    }),
    
    // 기능 토글 설정
    getFeatureToggles: () => ({
      clustering: config.ENABLE_CLUSTERING,
      aiQueueCleanup: config.ENABLE_AI_QUEUE_CLEANUP,
      metricsCleanup: config.ENABLE_METRICS_CLEANUP,
      resourceMonitoring: config.ENABLE_RESOURCE_MONITORING,
      performanceMonitoring: config.ENABLE_PERFORMANCE_MONITORING,
      memoryMonitoring: config.ENABLE_MEMORY_MONITORING
    })
  };
}

/**
 * 환경 변수 마스킹 함수
 */
export function maskSensitiveData(data?: string): string {
  if (!data || data.length === 0) return '미설정';
  if (data.length <= 8) return '****';
  return `${data.substring(0, 4)}...${data.substring(data.length - 4)}`;
}