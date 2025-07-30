import { Response } from 'express';
import { ApiResponse } from '../types';
import logger from '../config/logger';
import { safeStringifyForAPI } from './safeStringify';

// 확장된 응답 타입 정의
interface ExtendedApiResponse<T = any> extends ApiResponse<T> {
  message?: string | undefined;
  timestamp?: string | undefined;
  statusCode?: number | undefined;
}

interface ApiErrorResponse {
  success: false;
  _error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: any;
}

/**
 * 성공 응답을 일관된 형태로 반환하는 유틸리티
 */
export const sendSuccess = <T>(
  _res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ExtendedApiResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message !== undefined && { message }),
    timestamp: new Date().toISOString(),
    statusCode
  };

  return _res.status(statusCode).json(response);
};

/**
 * 에러 응답을 일관된 형태로 반환하는 유틸리티
 */
export const sendError = (
  _res: Response,
  _error: string,
  message?: string,
  statusCode: number = 500,
  details?: any
): Response => {
  const response: ApiErrorResponse = {
    success: false,
    _error,
    message: message || _error,
    statusCode,
    timestamp: new Date().toISOString(),
    details
  };

  // 에러 로깅
  logger.error('API Error Response', {
    statusCode,
    _error,
    message,
    details
  });

  return _res.status(statusCode).json(response);
};

/**
 * 페이지네이션된 데이터 응답
 */
export const sendPaginatedSuccess = <T>(
  _res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  },
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ExtendedApiResponse<{
    items: T[];
    pagination: typeof pagination;
  }> = {
    success: true,
    data: {
      items: data,
      pagination
    },
    message,
    timestamp: new Date().toISOString(),
    statusCode
  };

  return _res.status(statusCode).json(response);
};

/**
 * 캐시된 데이터 응답 (캐시 메타데이터 포함)
 */
export const sendCachedSuccess = <T>(
  _res: Response,
  data: T,
  cacheInfo: {
    cached: boolean;
    cacheKey?: string;
    ttl?: number;
  },
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ExtendedApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    statusCode
  };

  // 캐시 헤더 설정
  if (cacheInfo.cached) {
    _res.setHeader('X-Cache-Hit', 'true');
    if (cacheInfo.cacheKey) {
      // HTTP 헤더에 안전한 ASCII 문자열로 인코딩
      const safeKey = Buffer.from(cacheInfo.cacheKey).toString('base64');
      _res.setHeader('X-Cache-Key', safeKey);
    }
    if (cacheInfo.ttl) {
      _res.setHeader('X-Cache-TTL', cacheInfo.ttl.toString());
    }
  } else {
    _res.setHeader('X-Cache-Hit', 'false');
  }

  return _res.status(statusCode).json(response);
};

/**
 * 표준화된 검증 오류 응답
 */
export const sendValidationError = (
  _res: Response,
  errors: Array<{ field: string; message: string }>,
  message: string = '입력값 검증에 실패했습니다'
): Response => {
  return sendError(_res, 'VALIDATION_ERROR', message, 400, { errors });
};

/**
 * 표준화된 인증 오류 응답
 */
export const sendUnauthorized = (
  _res: Response,
  message: string = '인증이 필요합니다'
): Response => {
  return sendError(_res, 'UNAUTHORIZED', message, 401);
};

/**
 * 표준화된 권한 오류 응답
 */
export const sendForbidden = (
  _res: Response,
  message: string = '접근 권한이 없습니다'
): Response => {
  return sendError(_res, 'FORBIDDEN', message, 403);
};

/**
 * 표준화된 Not Found 응답
 */
export const sendNotFound = (
  _res: Response,
  resource: string = '리소스',
  message?: string
): Response => {
  const defaultMessage = `${resource}를 찾을 수 없습니다`;
  return sendError(_res, 'NOT_FOUND', message || defaultMessage, 404);
};

/**
 * 표준화된 Rate Limit 응답
 */
export const sendRateLimit = (
  _res: Response,
  retryAfter: number,
  message: string = '요청 한도를 초과했습니다'
): Response => {
  _res.setHeader('Retry-After', retryAfter.toString());
  return sendError(_res, 'RATE_LIMIT_EXCEEDED', message, 429, { retryAfter });
};

/**
 * 배치 작업 응답
 */
export const sendBatchSuccess = <T>(
  _res: Response,
  results: Array<{ id: string; success: boolean; data?: T; error?: string }>,
  message?: string,
  statusCode: number = 207
): Response => {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  const response: ExtendedApiResponse<{
    results: typeof results;
    summary: {
      total: number;
      success: number;
      failure: number;
    };
  }> = {
    success: failureCount === 0,
    data: {
      results,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount
      }
    },
    message: message || `배치 작업 완료: 성공 ${successCount}개, 실패 ${failureCount}개`,
    timestamp: new Date().toISOString(),
    statusCode
  };

  return _res.status(statusCode).json(response);
};

/**
 * 스트리밍 응답 시작
 */
export const startStreamResponse = (
  _res: Response,
  headers?: Record<string, string>
): void => {
  _res.setHeader('Content-Type', 'text/event-stream');
  _res.setHeader('Cache-Control', 'no-cache');
  _res.setHeader('Connection', 'keep-alive');
  
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      _res.setHeader(key, value);
    });
  }
};

/**
 * 스트리밍 데이터 전송
 */
export const sendStreamData = (
  _res: Response,
  event: string,
  data: any
): void => {
  try {
    _res.write(`event: ${event}\n`);
    // 안전한 JSON 직렬화 사용 - 순환 참조 방지
    _res.write(`data: ${safeStringifyForAPI(data)}\n\n`);
  } catch (error) {
    // 스트리밍 실패 시 에러 이벤트 전송
    const errorMessage = error instanceof Error ? error.message : 'Serialization failed';
    _res.write(`event: error\n`);
    _res.write(`data: ${JSON.stringify({ error: errorMessage, originalEvent: event })}\n\n`);
    
    // 로그에도 기록
    logger.error('스트리밍 데이터 전송 실패:', {
      event,
      error: errorMessage,
      dataType: typeof data,
      dataKeys: typeof data === 'object' && data !== null ? Object.keys(data) : []
    });
  }
};