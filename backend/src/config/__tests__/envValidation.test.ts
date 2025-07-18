/**
 * 환경 변수 검증 테스트
 */
import { validateEnv, safeValidateEnv } from '../envSchema';

describe('Environment Variable Validation', () => {
  describe('validateEnv', () => {
    test('should validate valid environment variables', () => {
      const validEnv = {
        NODE_ENV: 'development',
        PORT: '4001',
        RIOT_API_KEY: 'test-api-key',
        MONGODB_URI: 'mongodb://localhost:27017/test',
      };

      const result = validateEnv(validEnv);
      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(4001);
      expect(result.RIOT_API_KEY).toBe('test-api-key');
      expect(result.MONGODB_URI).toBe('mongodb://localhost:27017/test');
    });

    test('should throw error for invalid environment variables', () => {
      const invalidEnv = {
        NODE_ENV: 'invalid-env',
        PORT: 'not-a-number',
        // Missing required RIOT_API_KEY and MONGODB_URI
      };

      expect(() => validateEnv(invalidEnv)).toThrow('환경 변수 검증 실패');
    });

    test('should apply default values', () => {
      const minimalEnv = {
        RIOT_API_KEY: 'test-key',
        MONGODB_URI: 'mongodb://localhost:27017/test',
      };

      const result = validateEnv(minimalEnv);
      expect(result.NODE_ENV).toBe('development'); // default
      expect(result.PORT).toBe(4001); // default
      expect(result.MONGODB_TIMEOUT).toBe(10000); // default
    });
  });

  describe('safeValidateEnv', () => {
    test('should return success for valid environment', () => {
      const validEnv = {
        NODE_ENV: 'production',
        PORT: '8080',
        RIOT_API_KEY: 'valid-key',
        MONGODB_URI: 'mongodb://localhost:27017/prod',
      };

      const result = safeValidateEnv(validEnv);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    test('should return error for invalid environment', () => {
      const invalidEnv = {
        NODE_ENV: 'invalid',
        PORT: 'not-a-number',
      };

      const result = safeValidateEnv(invalidEnv);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    test('should include warnings for missing optional keys', () => {
      const minimalEnv = {
        RIOT_API_KEY: 'test-key',
        MONGODB_URI: 'mongodb://localhost:27017/test',
      };

      const result = safeValidateEnv(minimalEnv);
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('GOOGLE_AI_MAIN_API_KEY가 설정되지 않아 AI 분석 기능을 사용할 수 없습니다.');
    });
  });
});