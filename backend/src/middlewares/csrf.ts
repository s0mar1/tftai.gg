/**
 * 보안 헤더 및 요청 검증 미들웨어
 * CSRF 공격 방지를 위한 현대적 접근법
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../config/logger';

/**
 * Origin 기반 CSRF 보호 미들웨어
 * SameSite 쿠키와 Origin 헤더 검증을 통한 CSRF 방어
 */
export const originBasedCsrfProtection = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  // GET, HEAD, OPTIONS 요청은 건너뛰기
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.get('Origin') || req.get('Referer');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://tftai.gg',
    'https://www.tftai.gg'
  ];

  // Origin 헤더가 없거나 허용되지 않은 origin인 경우
  if (!origin || !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    logger.warn('CSRF 공격 시도 감지', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      origin: origin || 'missing',
      userAgent: req.get('User-Agent')
    });

    res.status(403).json({
      success: false,
      error: 'CSRF_PROTECTION',
      message: '허용되지 않은 요청입니다.',
      errorId: Date.now().toString()
    });
    return;
  }

  next();
};

/**
 * 랜덤 토큰 생성 (추가 보안층)
 */
export const generateSecurityToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * 보안 토큰 제공 엔드포인트
 */
export const provideSecurityToken = (req: Request, res: Response): void => {
  const token = generateSecurityToken();
  
  logger.info('보안 토큰 제공', { 
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    tokenLength: token.length 
  });
  
  res.json({ 
    securityToken: token,
    message: '보안 토큰이 생성되었습니다.',
    timestamp: new Date().toISOString()
  });
};