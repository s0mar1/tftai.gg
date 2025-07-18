/**
 * 공통 환경 변수 베이스 스키마
 * 백엔드와 프론트엔드에서 공통으로 사용되는 환경 변수들을 정의
 */

import { z } from 'zod';

/**
 * 공통 환경 변수 스키마
 */
export const commonEnvSchema = z.object({
  // 기본 환경 설정
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // 서비스 URL 설정
  FRONTEND_URL: z.string().default('http://localhost:3000,http://localhost:5173'),
  BACKEND_URL: z.string().default('http://localhost:4001'),
  
  // API 기본 설정
  API_VERSION: z.string().default('v1'),
  API_TIMEOUT: z.coerce.number().int().positive().default(30000),
  
  // 로깅 설정
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // 개발 모드 설정
  DEVELOPMENT_MODE: z.coerce.boolean().default(false),
});

/**
 * 환경 변수 유틸리티 함수들
 */
export const envUtils = {
  /**
   * URL 배열로 파싱
   */
  parseUrls: (urlString: string): string[] => {
    return urlString.split(',').map(url => url.trim()).filter(url => url.length > 0);
  },
  
  /**
   * 프로덕션 환경 여부 확인
   */
  isProduction: (nodeEnv: string): boolean => nodeEnv === 'production',
  
  /**
   * 개발 환경 여부 확인
   */
  isDevelopment: (nodeEnv: string): boolean => nodeEnv === 'development',
  
  /**
   * 테스트 환경 여부 확인
   */
  isTest: (nodeEnv: string): boolean => nodeEnv === 'test',
  
  /**
   * 민감한 데이터 마스킹
   */
  maskSensitiveData: (data?: string): string => {
    if (!data || data.length === 0) return '미설정';
    if (data.length <= 8) return '****';
    return `${data.substring(0, 4)}...${data.substring(data.length - 4)}`;
  },
  
  /**
   * 환경 변수 존재 여부 확인
   */
  hasValue: (value?: string): boolean => {
    return Boolean(value && value.trim().length > 0);
  }
};

/**
 * 공통 환경 변수 타입
 */
export type CommonEnvConfig = z.infer<typeof commonEnvSchema>;

/**
 * 환경 변수 검증 결과 타입
 */
export interface EnvValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings: string[];
}

/**
 * 환경 변수 안전 검증 베이스 함수
 */
export function createSafeValidator<T>(schema: z.ZodSchema<T>) {
  return (env: NodeJS.ProcessEnv): EnvValidationResult<T> => {
    const warnings: string[] = [];
    
    try {
      const result = schema.safeParse(env);
      
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
      
      return {
        success: true,
        data: result.data,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        warnings
      };
    }
  };
}

/**
 * 환경 변수 정보 출력 유틸리티
 */
export function logEnvInfo(config: CommonEnvConfig): void {
  console.log('🔧 환경 변수 정보:');
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   DEVELOPMENT_MODE: ${config.DEVELOPMENT_MODE}`);
  console.log(`   LOG_LEVEL: ${config.LOG_LEVEL}`);
  console.log(`   API_VERSION: ${config.API_VERSION}`);
  console.log(`   API_TIMEOUT: ${config.API_TIMEOUT}ms`);
  console.log(`   FRONTEND_URLs: ${envUtils.parseUrls(config.FRONTEND_URL).join(', ')}`);
  console.log(`   BACKEND_URL: ${config.BACKEND_URL}`);
}

export default {
  commonEnvSchema,
  envUtils,
  createSafeValidator,
  logEnvInfo
};