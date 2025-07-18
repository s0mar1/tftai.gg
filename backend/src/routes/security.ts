// backend/src/routes/security.ts - 보안 관련 엔드포인트
import { Router, Request, Response } from 'express';
import { securityMetrics } from '../middlewares/security';
import logger from '../config/logger';
import { sendSuccess, sendError } from '../utils/responseHelper';

const router = Router();

/**
 * 보안 상태 조회 엔드포인트
 * GET /api/security/status
 */
router.get('/status', (_req: Request, _res: Response) => {
  try {
    const metrics = securityMetrics.getMetrics();
    const securityStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      securityHeaders: {
        helmet: 'enabled',
        cors: 'enabled',
        rateLimit: 'enabled',
        compression: 'enabled'
      },
      metrics,
      recommendations: generateSecurityRecommendations()
    };

    sendSuccess(_res, securityStatus, '보안 상태가 조회되었습니다.', 200);
  } catch (error) {
    logger.error('보안 상태 조회 오류:', error);
    sendError(_res, '보안 상태 조회에 실패했습니다.', '500');
  }
});

/**
 * CSP 위반 보고 엔드포인트
 * POST /api/security/csp-report
 */
router.post('/csp-report', (req: Request, res: Response): void => {
  try {
    const report = req.body;
    
    logger.warn('CSP 위반 보고 수신', {
      report,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    securityMetrics.incrementCSPViolation();

    // 응답은 204 No Content로 처리 (CSP 표준)
    res.status(204).send();
  } catch (error) {
    logger.error('CSP 보고 처리 오류:', error);
    res.status(400).json({ error: 'Invalid CSP report' });
  }
});

/**
 * 보안 메트릭스 리셋 (개발 환경 전용)
 * POST /api/security/reset-metrics
 */
router.post('/reset-metrics', (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    return sendError(res, '이 기능은 개발 환경에서만 사용할 수 있습니다.', '403');
  }

  try {
    securityMetrics.reset();
    logger.info('보안 메트릭스가 리셋되었습니다.');
    return sendSuccess(res, null, '보안 메트릭스가 리셋되었습니다.', 200);
  } catch (error) {
    logger.error('메트릭스 리셋 오류:', error);
    return sendError(res, '메트릭스 리셋에 실패했습니다.', '500');
  }
});

/**
 * 보안 헤더 테스트 엔드포인트
 * GET /api/security/test-headers
 */
router.get('/test-headers', (req: Request, res: Response) => {
  try {
    const headers = {
      'X-Content-Type-Options': res.get('X-Content-Type-Options'),
      'X-Frame-Options': res.get('X-Frame-Options'),
      'X-XSS-Protection': res.get('X-XSS-Protection'),
      'Strict-Transport-Security': res.get('Strict-Transport-Security'),
      'Content-Security-Policy': res.get('Content-Security-Policy'),
      'Referrer-Policy': res.get('Referrer-Policy'),
      'X-DNS-Prefetch-Control': res.get('X-DNS-Prefetch-Control'),
      'X-Download-Options': res.get('X-Download-Options')
    };

    const activeHeaders = Object.entries(headers)
      .filter(([_key, value]) => value)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const missingHeaders = Object.entries(headers)
      .filter(([_key, value]) => !value)
      .map(([key]) => key);

    sendSuccess(res, {
      activeHeaders,
      missingHeaders,
      totalHeaders: Object.keys(headers).length,
      activeCount: Object.keys(activeHeaders).length,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    }, '보안 헤더 테스트가 완료되었습니다.', 200);

  } catch (error) {
    logger.error('보안 헤더 테스트 오류:', error);
    sendError(res, '보안 헤더 테스트에 실패했습니다.', '500');
  }
});

/**
 * 보안 권장사항 생성
 */
function generateSecurityRecommendations(): string[] {
  const recommendations: string[] = [];
  const metrics = securityMetrics.getMetrics();

  if (metrics.cspViolations > 10) {
    recommendations.push('CSP 위반이 많이 발생하고 있습니다. CSP 정책을 검토해주세요.');
  }

  if (metrics.blockedRequests > 50) {
    recommendations.push('차단된 요청이 많습니다. Rate Limiting 설정을 검토해주세요.');
  }

  if (metrics.xssAttempts > 0) {
    recommendations.push('XSS 공격 시도가 감지되었습니다. 입력 검증을 강화해주세요.');
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.HTTPS) {
      recommendations.push('프로덕션 환경에서는 HTTPS를 사용해주세요.');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('현재 보안 상태가 양호합니다.');
  }

  return recommendations;
}

export default router;