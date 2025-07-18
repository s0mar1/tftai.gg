// backend/src/middlewares/errorHandler.ts (보안 강화)
import logger from '../config/logger';
import { HttpError, normalizeError } from '../utils/errors';
import { ErrorHandler } from '../types/express';
import { ErrorResponse, ErrorContext } from '../types';

const errorHandler: ErrorHandler = (_err, _req, _res, _next) => {
  // 에러를 표준화된 형태로 변환
  const service = getServiceFromUrl(_req.originalUrl);
  const normalizedError = normalizeError(_err, {
    url: _req.originalUrl,
    method: _req.method,
    ...(service && { service })
  });

  // 에러 ID 생성
  const errorId = generateErrorId();

  // 간단한 에러 컨텍스트 생성
  const errorContext: ErrorContext = {
    userId: (_req as any).user?.id,
    sessionId: (_req as any).sessionId,
    requestId: (_req as any).requestId || errorId,
    endpoint: _req.originalUrl,
    method: _req.method,
    userAgent: _req.get('User-Agent') || 'Unknown',
    ip: _req.ip || 'Unknown',
    timestamp: new Date(),
    additionalData: {
      statusCode: normalizedError.statusCode,
      isOperational: normalizedError.isOperational,
      service
    }
  };

  // 로깅 (운영상 예상 가능한 에러는 info 레벨, 예상치 못한 에러는 error 레벨)
  const logLevel = normalizedError.isOperational ? 'warn' : 'error';
  
  // 보안 민감 정보 필터링
  const sanitizedDetails = sanitizeErrorDetails(normalizedError.details);
  
  logger[logLevel]('API Error', {
    message: normalizedError.message,
    statusCode: normalizedError.statusCode,
    userMessage: normalizedError.userMessage,
    url: _req.originalUrl,
    method: _req.method,
    userAgent: _req.get('User-Agent') || 'Unknown',
    ip: _req.ip || 'Unknown',
    stack: normalizedError.isOperational ? undefined : normalizedError.stack,
    details: sanitizedDetails,
    errorId,
    context: errorContext
  });

  // 표준화된 API 에러 응답 생성
  const clientResponse = createStandardizedErrorResponse(normalizedError, errorId);
  
  _res.status(normalizedError.statusCode).json(clientResponse);
};

/**
 * 에러 상세 정보에서 민감한 정보 제거
 */
function sanitizeErrorDetails(details: any): any {
  if (!details) return details;
  
  const sanitized = { ...details };
  
  // 민감한 필드 제거
  const sensitiveFields = [
    'password', 'token', 'key', 'secret', 'apiKey', 'privateKey',
    'authorization', 'cookie', 'session', 'jwt', 'credentials',
    'originalError', 'stack', 'config', 'request', 'response'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });
  
  // 중첩된 객체에서도 민감 정보 제거
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeErrorDetails(sanitized[key]);
    }
  });
  
  return sanitized;
}

/**
 * 표준화된 API 에러 응답 생성
 */
function createStandardizedErrorResponse(_error: HttpError, errorId: string): ErrorResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 프로덕션에서 5xx 에러는 일반적인 메시지로 대체
  let finalMessage = _error.userMessage;
  if (isProduction && _error.statusCode >= 500) {
    finalMessage = '서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
  
  const response: ErrorResponse = {
    message: finalMessage,
    statusCode: _error.statusCode,
    timestamp: new Date().toISOString(),
    userMessage: finalMessage,
    errorId: errorId // 에러 추적용 ID 추가
  };
  
  // 상세 정보 추가 (상황에 따라)
  if (!isProduction || _error.statusCode === 400 || _error.statusCode === 422) {
    response.details = sanitizeErrorDetails(_error.details);
  }
  
  return response;
}

/**
 * 에러 추적용 고유 ID 생성
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * URL에서 서비스 이름 추출
 */
function getServiceFromUrl(url: string): string | undefined {
  if (url.includes('/summoner') || url.includes('/match')) return 'riot';
  if (url.includes('/ai')) return 'google-ai';
  if (url.includes('/translate')) return 'google-translate';
  return undefined;
}

export default errorHandler;