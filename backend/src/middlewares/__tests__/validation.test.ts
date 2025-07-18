import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  validateString,
  validateNumber,
  validateSummonerName,
  validateMatchId,
  validateAIRequest,
  validatePagination,
  validateRegion,
  validateQnARequest
} from '../validation';
import { ValidationError } from '../../utils/errors';

interface MockRequest extends Partial<Request> {
  params: any;
  body: any;
  query: any;
  ip: string;
}

interface MockResponse extends Partial<Response> {}

describe('Validation Middleware', () => {
  describe('validateString', () => {
    it('should validate valid string', () => {
      const result = validateString('hello', 'testField');
      expect(result).toBe('hello');
    });

    it('should throw error for empty string when required', () => {
      expect(() => validateString('', 'testField')).toThrow(ValidationError);
      expect(() => validateString(null as any, 'testField')).toThrow(ValidationError);
      expect(() => validateString(undefined as any, 'testField')).toThrow(ValidationError);
    });

    it('should allow empty string when not required', () => {
      const result = validateString('', 'testField', { required: false });
      expect(result).toBe('');
    });

    it('should validate string length', () => {
      expect(() => validateString('a', 'testField', { minLength: 2 })).toThrow(ValidationError);
      expect(() => validateString('toolong', 'testField', { maxLength: 5 })).toThrow(ValidationError);
    });

    it('should validate pattern', () => {
      const pattern = /^[a-zA-Z]+$/;
      expect(() => validateString('hello123', 'testField', { pattern })).toThrow(ValidationError);
      
      const result = validateString('hello', 'testField', { pattern });
      expect(result).toBe('hello');
    });

    it('should throw error for non-string input', () => {
      expect(() => validateString(123 as any, 'testField')).toThrow(ValidationError);
      expect(() => validateString([] as any, 'testField')).toThrow(ValidationError);
      expect(() => validateString({} as any, 'testField')).toThrow(ValidationError);
    });
  });

  describe('validateNumber', () => {
    it('should validate valid number', () => {
      const result = validateNumber(42, 'testField');
      expect(result).toBe(42);
    });

    it('should validate string number', () => {
      const result = validateNumber('42', 'testField');
      expect(result).toBe('42');
    });

    it('should throw error for invalid number', () => {
      expect(() => validateNumber('abc', 'testField')).toThrow(ValidationError);
      expect(() => validateNumber(null as any, 'testField')).toThrow(ValidationError);
      expect(() => validateNumber(undefined as any, 'testField')).toThrow(ValidationError);
    });

    it('should allow undefined when not required', () => {
      const result = validateNumber(undefined, 'testField', { required: false });
      expect(result).toBe(undefined);
    });

    it('should validate number range', () => {
      expect(() => validateNumber(5, 'testField', { min: 10 })).toThrow(ValidationError);
      expect(() => validateNumber(15, 'testField', { max: 10 })).toThrow(ValidationError);
      
      const result = validateNumber(10, 'testField', { min: 5, max: 15 });
      expect(result).toBe(10);
    });
  });

  describe('validateSummonerName', () => {
    let _req: MockRequest;
    let _res: MockResponse;
    let _next: NextFunction;

    beforeEach(() => {
      req = {
        params: { summonerName: 'TestUser' },
        body: {},
        query: {},
        ip: '127.0.0.1'
      };
      res = {};
      next = jest.fn();
    });

    it('should validate valid summoner name', () => {
      validateSummonerName(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should validate Korean summoner name', () => {
      req.params.summonerName = '테스트유저';
      validateSummonerName(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should validate mixed summoner name', () => {
      req.params.summonerName = 'Test유저123';
      validateSummonerName(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should reject too long summoner name', () => {
      req.params.summonerName = 'VeryLongSummonerName';
      validateSummonerName(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject invalid characters', () => {
      req.params.summonerName = 'Test@User';
      validateSummonerName(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject empty summoner name', () => {
      req.params.summonerName = '';
      validateSummonerName(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateMatchId', () => {
    let _req: MockRequest;
    let _res: MockResponse;
    let _next: NextFunction;

    beforeEach(() => {
      req = {
        params: { matchId: 'KR_1234567890' },
        body: {},
        query: {},
        ip: '127.0.0.1'
      };
      res = {};
      next = jest.fn();
    });

    it('should validate valid match ID', () => {
      validateMatchId(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should validate different region match ID', () => {
      req.params.matchId = 'NA_9876543210';
      validateMatchId(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should reject too short match ID', () => {
      req.params.matchId = 'KR_123';
      validateMatchId(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject invalid characters', () => {
      req.params.matchId = 'KR_123456789@';
      validateMatchId(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject empty match ID', () => {
      req.params.matchId = '';
      validateMatchId(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateAIRequest', () => {
    let _req: MockRequest;
    let _res: MockResponse;
    let _next: NextFunction;

    beforeEach(() => {
      req = {
        body: {
          matchId: 'KR_1234567890',
          userPuuid: 'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890'
        },
        params: {},
        query: {},
        ip: '127.0.0.1'
      };
      res = {};
      next = jest.fn();
    });

    it('should validate valid AI request', () => {
      validateAIRequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should reject invalid match ID', () => {
      req.body.matchId = 'invalid';
      validateAIRequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject invalid user PUUID', () => {
      req.body.userPuuid = 'short';
      validateAIRequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject missing fields', () => {
      delete req.body.matchId;
      validateAIRequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validatePagination', () => {
    let _req: MockRequest;
    let _res: MockResponse;
    let _next: NextFunction;

    beforeEach(() => {
      req = {
        query: { page: '1', limit: '10' },
        params: {},
        body: {},
        ip: '127.0.0.1'
      };
      res = {};
      next = jest.fn();
    });

    it('should validate valid pagination', () => {
      validatePagination(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
    });

    it('should use default values when not provided', () => {
      req.query = {};
      validatePagination(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
    });

    it('should reject invalid page number', () => {
      req.query.page = '0';
      validatePagination(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject invalid limit', () => {
      req.query.limit = '200';
      validatePagination(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject non-numeric values', () => {
      req.query.page = 'abc';
      validatePagination(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateRegion', () => {
    let _req: MockRequest;
    let _res: MockResponse;
    let _next: NextFunction;

    beforeEach(() => {
      req = {
        params: { region: 'kr' },
        body: {},
        query: {},
        ip: '127.0.0.1'
      };
      res = {};
      next = jest.fn();
    });

    it('should validate valid region', () => {
      validateRegion(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
      expect(req.params.region).toBe('kr');
    });

    it('should validate and normalize region case', () => {
      req.params.region = 'KR';
      validateRegion(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
      expect(req.params.region).toBe('kr');
    });

    it('should use default region when not provided', () => {
      req.params = {};
      validateRegion(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
      expect(req.params.region).toBe('kr');
    });

    it('should reject invalid region', () => {
      req.params.region = 'invalid';
      validateRegion(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate all supported regions', () => {
      const validRegions = ['kr', 'na', 'euw', 'eune', 'jp', 'br', 'la1', 'la2', 'tr', 'ru'];
      
      validRegions.forEach(region => {
        req.params.region = region;
        (next as jest.Mock).mockClear();
        validateRegion(req as Request, res as Response, _next);
        expect(_next).toHaveBeenCalledWith();
        expect(req.params.region).toBe(region);
      });
    });
  });

  describe('validateQnARequest', () => {
    let _req: MockRequest;
    let _res: MockResponse;
    let _next: NextFunction;

    beforeEach(() => {
      req = {
        body: {
          question: 'What is the best team comp?',
          chatHistory: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' }
          ]
        },
        params: {},
        query: {},
        ip: '127.0.0.1'
      };
      res = {};
      next = jest.fn();
    });

    it('should validate valid QnA request', () => {
      validateQnARequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should validate request without chat history', () => {
      delete req.body.chatHistory;
      validateQnARequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should validate request with empty chat history', () => {
      req.body.chatHistory = [];
      validateQnARequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith();
    });

    it('should reject empty question', () => {
      req.body.question = '';
      validateQnARequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject missing question', () => {
      delete req.body.question;
      validateQnARequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject too long question', () => {
      req.body.question = 'a'.repeat(1001);
      validateQnARequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject non-array chat history', () => {
      req.body.chatHistory = 'not an array';
      validateQnARequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject too long chat history', () => {
      req.body.chatHistory = new Array(51).fill({ role: 'user', content: 'test' });
      validateQnARequest(req as Request, res as Response, _next);
      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('Error Handling', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Test error', 'testField', 'testValue');
      
      expect(error.name).toBe('ValidationError');
      expect(error.statusCode).toBe(400);
      expect(error.details.field).toBe('testField');
      expect(error.details.value).toBe('testValue');
      expect(error.userMessage).toContain('testField');
    });

    it('should handle middleware errors properly', () => {
      const _req: MockRequest = { 
        params: { summonerName: '' }, 
        body: {}, 
        query: {},
        ip: '127.0.0.1' 
      };
      const _res: MockResponse = {};
      const next = jest.fn();

      validateSummonerName(req as Request, res as Response, _next);

      expect(_next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.userMessage).toContain('소환사 이름');
    });
  });
});