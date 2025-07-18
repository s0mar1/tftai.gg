// backend/src/middlewares/security.ts - Helmet 보안 미들웨어 설정
import helmet from 'helmet';
import { Express } from 'express';
import logger from '../config/logger';

/**
 * TFT Meta Analyzer를 위한 Helmet 보안 설정
 * API 서버 특성에 맞게 최적화된 보안 헤더 적용
 */
export const createSecurityMiddleware = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  logger.info(`보안 미들웨어 초기화 중... (환경: ${process.env.NODE_ENV})`);

  return helmet({
    // Content Security Policy - API 서버에 맞게 설정
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Swagger UI 지원을 위한 스크립트 허용
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", // Swagger UI 인라인 스크립트
          "'unsafe-eval'",   // Swagger UI 동적 스크립트
          "https://cdnjs.cloudflare.com" // CDN 스크립트
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", // Swagger UI 인라인 스타일
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "https:", // 외부 이미지 허용 (TFT 아이템/챔피언 이미지)
          "blob:"
        ],
        connectSrc: [
          "'self'",
          isDevelopment ? "ws://localhost:*" : "'self'" // 개발 환경 hot reload 지원
        ],
        // API 서버이므로 객체/임베드 비활성화
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      },
      // 개발 환경에서는 CSP 완화
      reportOnly: isDevelopment
    },

    // Cross-Origin Embedder Policy - API 서버이므로 비활성화
    crossOriginEmbedderPolicy: false,
    
    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: "same-origin-allow-popups"
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: "cross-origin" // API 서버이므로 cross-origin 허용
    },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

    // Expect-CT는 helmet v8에서 제거됨

    // X-Frame-Options - 클릭재킹 방지
    frameguard: {
      action: 'deny'
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1년
      includeSubDomains: true,
      preload: true
    },

    // IE No Open
    ieNoOpen: true,

    // X-Content-Type-Options
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Permissions Policy (기존 Feature-Policy)
    permittedCrossDomainPolicies: false,

    // Referrer Policy
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin"
    },

    // X-XSS-Protection
    xssFilter: true
  });
};

/**
 * 보안 헤더 검증 미들웨어
 */
export const securityHeadersValidator = (app: Express) => {
  if (process.env.NODE_ENV === 'development') {
    // 개발 환경에서만 보안 헤더 검증 로그
    app.use((_req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        // 응답 헤더 검증
        const securityHeaders = {
          'X-Content-Type-Options': res.get('X-Content-Type-Options'),
          'X-Frame-Options': res.get('X-Frame-Options'),
          'X-XSS-Protection': res.get('X-XSS-Protection'),
          'Strict-Transport-Security': res.get('Strict-Transport-Security'),
          'Content-Security-Policy': res.get('Content-Security-Policy'),
          'Referrer-Policy': res.get('Referrer-Policy')
        };

        // 누락된 보안 헤더 체크
        const missingHeaders = Object.entries(securityHeaders)
          .filter(([_key, value]) => !value)
          .map(([key]) => key);

        if (missingHeaders.length > 0) {
          logger.warn('누락된 보안 헤더 감지', {
            url: _req.originalUrl,
            missingHeaders,
            userAgent: _req.get('User-Agent')
          });
        }

        return originalSend.call(this, data);
      };

      next();
    });
  }
};

/**
 * 보안 메트릭스 수집
 */
export const securityMetrics = {
  blockedRequests: 0,
  cspViolations: 0,
  xssAttempts: 0,

  incrementBlocked() {
    this.blockedRequests++;
  },

  incrementCSPViolation() {
    this.cspViolations++;
  },

  incrementXSSAttempt() {
    this.xssAttempts++;
  },

  getMetrics() {
    return {
      blockedRequests: this.blockedRequests,
      cspViolations: this.cspViolations,
      xssAttempts: this.xssAttempts
    };
  },

  reset() {
    this.blockedRequests = 0;
    this.cspViolations = 0;
    this.xssAttempts = 0;
  }
};

logger.info('✅ 보안 미들웨어 모듈이 로드되었습니다.');