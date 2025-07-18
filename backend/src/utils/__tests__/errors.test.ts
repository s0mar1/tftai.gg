import { describe, test, expect } from '@jest/globals';
import {
  HttpError,
  ValidationError,
  NotFoundError,
  RiotApiError,
  normalizeError
} from '../errors';

describe('커스텀 에러 클래스', () => {
  describe('HttpError', () => {
    test('기본 HttpError를 생성할 수 있어야 함', () => {
      const error = new HttpError('테스트 에러', 500);
      
      expect(error.name).toBe('HttpError');
      expect(error.message).toBe('테스트 에러');
      expect(error.statusCode).toBe(500);
      expect(error.userMessage).toBe('서버에서 문제가 발생했습니다.');
      expect(error.isOperational).toBe(true);
    });

    test('커스텀 사용자 메시지를 설정할 수 있어야 함', () => {
      const error = new HttpError('내부 에러', 500, '사용자 친화적 메시지');
      
      expect(error.userMessage).toBe('사용자 친화적 메시지');
    });

    test('toJSON 메서드가 올바른 형태를 반환해야 함', () => {
      const error = new HttpError('테스트 에러', 404, '찾을 수 없음', { id: 123 });
      const json = error.toJSON();
      
      expect(json).toEqual({
        _error: {
          message: '찾을 수 없음',
          details: { id: 123 },
          timestamp: expect.any(String),
          statusCode: 404
        }
      });
    });
  });

  describe('ValidationError', () => {
    test('필드 정보와 함께 검증 에러를 생성할 수 있어야 함', () => {
      const error = new ValidationError('잘못된 이메일', 'email', 'invalid-email');
      
      expect(error.name).toBe('ValidationError');
      expect(error.statusCode).toBe(400);
      expect(error.userMessage).toBe('입력값 오류: email - 잘못된 이메일');
      expect(error.details).toEqual({ field: 'email', value: 'invalid-email' });
    });

    test('필드 정보 없이도 검증 에러를 생성할 수 있어야 함', () => {
      const error = new ValidationError('검증 실패');
      
      expect(error.userMessage).toBe('입력값 오류: 검증 실패');
      expect(error.details).toEqual({ field: null, value: null });
    });
  });

  describe('NotFoundError', () => {
    test('리소스 이름과 함께 404 에러를 생성할 수 있어야 함', () => {
      const error = new NotFoundError('사용자를 찾을 수 없음', '사용자');
      
      expect(error.name).toBe('NotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.userMessage).toBe('요청하신 사용자을(를) 찾을 수 없습니다.');
    });
  });

  describe('RiotApiError', () => {
    test('Riot API 404 에러를 올바르게 처리해야 함', () => {
      const axiosError = {
        response: {
          status: 404,
          data: { status: { message: 'Summoner not found' } }
        },
        message: 'Request failed'
      };

      const error = new RiotApiError(axiosError as any, '/summoner/v1/summoners');
      
      expect(error.name).toBe('RiotApiError');
      expect(error.statusCode).toBe(404);
      expect(error.userMessage).toBe('요청하신 소환사 정보를 찾을 수 없습니다.');
      expect(error.endpoint).toBe('/summoner/v1/summoners');
    });

    test('Riot API 429 에러를 올바르게 처리해야 함', () => {
      const axiosError = {
        response: {
          status: 429,
          data: { status: { message: 'Rate limit exceeded' } }
        },
        message: 'Request failed'
      };

      const error = new RiotApiError(axiosError as any);
      
      expect(error.statusCode).toBe(429);
      expect(error.userMessage).toBe('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    });

    test('Riot API 500 에러는 502로 변환해야 함', () => {
      const axiosError = {
        response: {
          status: 500,
          data: { status: { message: 'Internal server error' } }
        },
        message: 'Request failed'
      };

      const error = new RiotApiError(axiosError as any);
      
      expect(error.statusCode).toBe(502);
      expect(error.userMessage).toBe('Riot Games 서버에 일시적인 문제가 있습니다.');
    });
  });

  describe('normalizeError', () => {
    test('이미 HttpError인 경우 그대로 반환해야 함', () => {
      const originalError = new ValidationError('테스트 에러');
      const normalized = normalizeError(originalError);
      
      expect(normalized).toBe(originalError);
    });

    test('Axios 에러를 RiotApiError로 변환해야 함', () => {
      const axiosError = {
        response: {
          status: 404,
          data: { status: { message: 'Not found' } }
        },
        config: { url: 'https://kr.api.riotgames.com/tft/summoner/v1/summoners' }
      };

      const normalized = normalizeError(axiosError as any, { service: 'riot' });
      
      expect(normalized).toBeInstanceOf(RiotApiError);
      expect(normalized.statusCode).toBe(404);
    });

    test('일반 에러를 HttpError로 변환해야 함', () => {
      const genericError = new Error('알 수 없는 에러');
      const normalized = normalizeError(genericError);
      
      expect(normalized).toBeInstanceOf(HttpError);
      expect(normalized.statusCode).toBe(500);
      expect(normalized.userMessage).toBe('서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });

    test('연결 에러를 ExternalApiError로 변환해야 함', () => {
      const connectionError = new Error('Connection refused') as any;
      connectionError.code = 'ECONNREFUSED';
      
      const normalized = normalizeError(connectionError, { service: 'test-api' });
      
      expect(normalized.statusCode).toBe(502);
      expect(normalized.userMessage).toBe('test-api 서비스 연결에 문제가 있습니다.');
    });
  });
});