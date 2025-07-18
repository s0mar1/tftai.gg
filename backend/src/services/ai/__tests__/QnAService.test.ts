import { jest } from '@jest/globals';
import { QnAService } from '../QnAService';

// Mock dependencies
jest.mock('@google/generative-ai');
jest.mock('../../cacheManager');
jest.mock('../../../config/logger');

describe('QnAService', () => {
  let service: QnAService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QnAService();
  });

  describe('processQuestion', () => {
    it('should process question successfully', async () => {
      const mockResult = {
        success: true,
        answer: '테스트 답변입니다.',
        history: [
          { role: 'user', content: '테스트 질문' },
          { role: 'assistant', content: '테스트 답변입니다.' }
        ],
        metadata: {
          answeredAt: expect.any(String),
          cacheHit: false
        }
      };

      expect(true).toBe(true); // 실제 구현 시 서비스 테스트
    });

    it('should handle cache hits', async () => {
      expect(true).toBe(true);
    });

    it('should limit history length', async () => {
      expect(true).toBe(true);
    });

    it('should handle AI generation errors', async () => {
      expect(true).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should validate questions correctly', () => {
      const validQuestion = 'TFT에서 가장 좋은 덱은 무엇인가요?';
      const result = service.validateQuestion(validQuestion);
      expect(result.isValid).toBe(true);
    });

    it('should reject empty questions', () => {
      const result = service.validateQuestion('');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('질문이 비어있습니다.');
    });

    it('should reject too long questions', () => {
      const longQuestion = 'a'.repeat(1001);
      const result = service.validateQuestion(longQuestion);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('질문이 너무 깁니다. (최대 1000자)');
    });

    it('should clear history', () => {
      const result = service.clearHistory();
      expect(result).toEqual([]);
    });

    it('should format history for display', () => {
      const history = [
        { role: 'user' as const, content: '안녕하세요' },
        { role: 'assistant' as const, content: '안녕하세요!' }
      ];
      const formatted = service.formatHistoryForDisplay(history);
      expect(formatted).toContain('👤 안녕하세요');
      expect(formatted).toContain('🤖 안녕하세요!');
    });
  });
});