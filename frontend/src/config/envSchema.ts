/**
 * 프론트엔드 환경 변수 스키마
 * Vite 환경 변수와 통합 관리
 */

import { z } from 'zod';
import { commonEnvSchema, envUtils, createSafeValidator, type EnvValidationResult } from '../shared/env/envBase';

/**
 * 프론트엔드 전용 환경 변수 스키마
 */
const frontendSpecificSchema = z.object({
  // Vite 환경 변수
  VITE_API_BASE_URL: z.string().url('올바른 API URL을 입력하세요').default('http://localhost:4001'),
  VITE_API_VERSION: z.string().default('v1'),
  
  // 프론트엔드 기능 토글
  VITE_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  VITE_ENABLE_DEBUG_MODE: z.coerce.boolean().default(false),
  VITE_ENABLE_MOCK_DATA: z.coerce.boolean().default(false),
  
  // 외부 서비스 설정
  VITE_GOOGLE_ANALYTICS_ID: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  
  // 성능 설정
  VITE_API_TIMEOUT: z.coerce.number().int().positive().default(30000),
  VITE_CACHE_TTL: z.coerce.number().int().positive().default(300000), // 5분
  
  // UI 설정
  VITE_DEFAULT_LANGUAGE: z.string().default('ko'),
  VITE_SUPPORTED_LANGUAGES: z.string().default('ko,en,ja,fr'),
  VITE_DEFAULT_REGION: z.string().default('kr'),
});

/**
 * 통합 프론트엔드 환경 변수 스키마
 */
export const frontendEnvSchema = commonEnvSchema.merge(frontendSpecificSchema);

/**
 * 프론트엔드 환경 변수 타입
 */
export type FrontendEnvConfig = z.infer<typeof frontendEnvSchema>;

/**
 * 프론트엔드 환경 변수 검증 함수
 */
export function validateFrontendEnv(env: NodeJS.ProcessEnv | Record<string, string>): FrontendEnvConfig {
  try {
    return frontendEnvSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: z.ZodIssue) => 
        `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`프론트엔드 환경 변수 검증 실패:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * 프론트엔드 환경 변수 안전 검증
 */
export const safeValidateFrontendEnv = createSafeValidator(frontendEnvSchema);

/**
 * 환경 변수 검증 결과에 프론트엔드 특화 경고 추가
 */
export function safeValidateFrontendEnvWithWarnings(env: NodeJS.ProcessEnv | Record<string, string>): EnvValidationResult<FrontendEnvConfig> {
  const result = safeValidateFrontendEnv(env);
  
  if (!result.success || !result.data) {
    return result;
  }
  
  const warnings: string[] = [...result.warnings];
  const data = result.data;
  
  // 프론트엔드 특화 경고 메시지
  if (!envUtils.hasValue(data.VITE_GOOGLE_ANALYTICS_ID)) {
    warnings.push('VITE_GOOGLE_ANALYTICS_ID가 설정되지 않아 분석 기능을 사용할 수 없습니다.');
  }
  
  if (!envUtils.hasValue(data.VITE_SENTRY_DSN)) {
    warnings.push('VITE_SENTRY_DSN이 설정되지 않아 오류 추적 기능을 사용할 수 없습니다.');
  }
  
  if (envUtils.isProduction(data.NODE_ENV) && data.VITE_ENABLE_DEBUG_MODE) {
    warnings.push('프로덕션 환경에서 디버그 모드가 활성화되어 있습니다.');
  }
  
  if (envUtils.isProduction(data.NODE_ENV) && data.VITE_ENABLE_MOCK_DATA) {
    warnings.push('프로덕션 환경에서 목 데이터가 활성화되어 있습니다.');
  }
  
  if (data.VITE_API_TIMEOUT < 5000) {
    warnings.push('API 타임아웃이 5초 미만으로 설정되어 있습니다. 네트워크 상황에 따라 요청이 실패할 수 있습니다.');
  }
  
  return {
    ...result,
    warnings
  };
}

/**
 * 프론트엔드 환경 변수 그룹별 접근 함수들
 */
export function createFrontendEnvAccessors(config: FrontendEnvConfig) {
  return {
    // API 설정
    getApiConfig: () => ({
      baseUrl: config.VITE_API_BASE_URL,
      version: config.VITE_API_VERSION,
      timeout: config.VITE_API_TIMEOUT,
      enableMockData: config.VITE_ENABLE_MOCK_DATA
    }),
    
    // 기능 토글
    getFeatureToggles: () => ({
      analytics: config.VITE_ENABLE_ANALYTICS,
      debugMode: config.VITE_ENABLE_DEBUG_MODE,
      mockData: config.VITE_ENABLE_MOCK_DATA
    }),
    
    // 외부 서비스 설정
    getExternalServices: () => ({
      googleAnalytics: {
        id: config.VITE_GOOGLE_ANALYTICS_ID,
        enabled: envUtils.hasValue(config.VITE_GOOGLE_ANALYTICS_ID) && config.VITE_ENABLE_ANALYTICS
      },
      sentry: {
        dsn: config.VITE_SENTRY_DSN,
        enabled: envUtils.hasValue(config.VITE_SENTRY_DSN) && envUtils.isProduction(config.NODE_ENV)
      }
    }),
    
    // 로케일 설정
    getLocaleConfig: () => ({
      defaultLanguage: config.VITE_DEFAULT_LANGUAGE,
      supportedLanguages: config.VITE_SUPPORTED_LANGUAGES.split(',').map(lang => lang.trim()),
      defaultRegion: config.VITE_DEFAULT_REGION
    }),
    
    // 캐시 설정
    getCacheConfig: () => ({
      ttl: config.VITE_CACHE_TTL,
      enabled: !config.VITE_ENABLE_DEBUG_MODE
    }),
    
    // 환경 정보
    getEnvironmentInfo: () => ({
      isProduction: envUtils.isProduction(config.NODE_ENV),
      isDevelopment: envUtils.isDevelopment(config.NODE_ENV),
      isTest: envUtils.isTest(config.NODE_ENV),
      developmentMode: config.DEVELOPMENT_MODE,
      logLevel: config.LOG_LEVEL
    })
  };
}

/**
 * Vite 환경 변수 타입 확장
 */
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_API_VERSION: string;
    readonly VITE_ENABLE_ANALYTICS: string;
    readonly VITE_ENABLE_DEBUG_MODE: string;
    readonly VITE_ENABLE_MOCK_DATA: string;
    readonly VITE_GOOGLE_ANALYTICS_ID?: string;
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_API_TIMEOUT: string;
    readonly VITE_CACHE_TTL: string;
    readonly VITE_DEFAULT_LANGUAGE: string;
    readonly VITE_SUPPORTED_LANGUAGES: string;
    readonly VITE_DEFAULT_REGION: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export default {
  frontendEnvSchema,
  validateFrontendEnv,
  safeValidateFrontendEnv,
  safeValidateFrontendEnvWithWarnings,
  createFrontendEnvAccessors
};