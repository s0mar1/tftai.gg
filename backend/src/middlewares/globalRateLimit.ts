// backend/src/middlewares/globalRateLimit.ts
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import logger from '../config/logger';
import { CACHE_TTL } from '../config/cacheTTL';
import { Request, Response } from 'express';

// 전역 기본 rate limiter
export const globalRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: CACHE_TTL.RATE_LIMIT * 1000, // 15분
  max: 100, // 요청 제한
  standardHeaders: true, // rate limit 정보를 `RateLimit-*` 헤더에 포함
  legacyHeaders: false, // `X-RateLimit-*` 헤더 비활성화
  message: {
    _error: '요청이 너무 많습니다. 15분 후에 다시 시도해주세요.',
    retryAfter: '15분'
  },
  handler: (_req: Request, _res: Response) => {
    logger.warn('Global rate limit exceeded', {
      ip: _req.ip,
      userAgent: _req.get('User-Agent'),
      url: _req.originalUrl,
      method: _req.method
    });
    
    _res.status(429).json({
      _error: {
        message: '요청이 너무 많습니다. 15분 후에 다시 시도해주세요.',
        retryAfter: '15분',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  },
  skip: (_req: Request) => {
    // 헬스체크 엔드포인트는 제외
    return _req.path.startsWith('/health');
  }
});

// API 전용 더 엄격한 rate limiter
export const apiRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: CACHE_TTL.RATE_LIMIT * 1000, // 15분
  max: 60, // API는 더 엄격하게
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    _error: 'API 요청 한도를 초과했습니다. 15분 후에 다시 시도해주세요.',
    retryAfter: '15분'
  },
  handler: (_req: Request, _res: Response) => {
    logger.warn('API rate limit exceeded', {
      ip: _req.ip,
      userAgent: _req.get('User-Agent'),
      url: _req.originalUrl,
      method: _req.method
    });
    
    _res.status(429).json({
      _error: {
        message: 'API 요청 한도를 초과했습니다. 15분 후에 다시 시도해주세요.',
        retryAfter: '15분',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// AI API 전용 매우 엄격한 rate limiter
export const aiRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5, // 1분에 5회만
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    _error: 'AI 분석 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.',
    retryAfter: '1분'
  },
  handler: (_req: Request, _res: Response) => {
    logger.warn('AI rate limit exceeded', {
      ip: _req.ip,
      userAgent: _req.get('User-Agent'),
      url: _req.originalUrl,
      method: _req.method
    });
    
    _res.status(429).json({
      _error: {
        message: 'AI 분석 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.',
        retryAfter: '1분',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 개발 환경에서는 더 관대한 설정
if (process.env.NODE_ENV === 'development') {
  // 개발 환경에서는 제한을 10배로 완화
  (globalRateLimit as any).max = 1000;
  (apiRateLimit as any).max = 600;
  (aiRateLimit as any).max = 50;
}