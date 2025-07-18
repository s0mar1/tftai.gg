// 커스텀 에러 클래스들
import logger from '../config/logger';
import { AxiosError } from 'axios';

interface ErrorDetails {
  field?: string | undefined;
  value?: any;
  resource?: string | undefined;
  service?: string | undefined;
  operation?: string | undefined;
  endpoint?: string | undefined;
  originalStatusCode?: number | undefined;
  originalMessage?: string | undefined;
  retryAfter?: number | undefined;
  originalError?: string | undefined;
  state?: any;
}

interface RiotApiErrorResponse {
  status?: {
    message?: string;
    status_code?: number;
  };
}

/**
 * 기본 HTTP 에러 클래스
 */
export class HttpError extends Error {
  public statusCode: number;
  public userMessage: string;
  public details: ErrorDetails | null;
  public timestamp: string;
  public isOperational: boolean;

  constructor(
    message: string, 
    statusCode: number = 500, 
    userMessage: string | null = null, 
    details: ErrorDetails | null = null
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.userMessage = userMessage || this.getDefaultUserMessage(statusCode);
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // 운영상 예상 가능한 에러인지 표시
  }

  private getDefaultUserMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      400: '잘못된 요청입니다.',
      401: '인증이 필요합니다.',
      403: '권한이 없습니다.',
      404: '요청하신 정보를 찾을 수 없습니다.',
      429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      500: '서버에서 문제가 발생했습니다.',
      502: '외부 서비스 연결에 문제가 있습니다.',
      503: '서비스를 일시적으로 사용할 수 없습니다.'
    };
    return messages[statusCode] || '알 수 없는 오류가 발생했습니다.';
  }

  toJSON() {
    return {
      _error: {
        message: this.userMessage,
        details: this.details,
        timestamp: this.timestamp,
        statusCode: this.statusCode
      }
    };
  }
}

/**
 * 검증 에러 (400)
 */
export class ValidationError extends HttpError {
  constructor(message: string, field: string | null = null, value: any = null) {
    const userMessage = field 
      ? `입력값 오류: ${field} - ${message}`
      : `입력값 오류: ${message}`;
    
    super(message, 400, userMessage, { field: field ?? undefined, value });
    this.name = 'ValidationError';
  }
}

/**
 * 인증 에러 (401)
 */
export class AuthenticationError extends HttpError {
  constructor(message: string = '인증에 실패했습니다.') {
    super(message, 401, '로그인이 필요하거나 인증 정보가 올바르지 않습니다.');
    this.name = 'AuthenticationError';
  }
}

/**
 * 권한 에러 (403)
 */
export class AuthorizationError extends HttpError {
  constructor(message: string = '권한이 없습니다.', resource: string | null = null) {
    const userMessage = resource 
      ? `${resource}에 대한 접근 권한이 없습니다.`
      : '해당 작업에 대한 권한이 없습니다.';
    
    super(message, 403, userMessage, { resource: resource ?? undefined });
    this.name = 'AuthorizationError';
  }
}

/**
 * 리소스 없음 에러 (404)
 */
export class NotFoundError extends HttpError {
  constructor(message: string, resource: string | null = null) {
    const userMessage = resource 
      ? `요청하신 ${resource}을(를) 찾을 수 없습니다.`
      : '요청하신 정보를 찾을 수 없습니다.';
    
    super(message, 404, userMessage, { resource: resource ?? undefined });
    this.name = 'NotFoundError';
  }
}

/**
 * 외부 API 에러 (502)
 */
export class ExternalApiError extends HttpError {
  public originalError: any;

  constructor(message: string, service: string | null = null, originalError: any = null) {
    const userMessage = service 
      ? `${service} 서비스 연결에 문제가 있습니다.`
      : '외부 서비스 연결에 문제가 있습니다.';
    
    super(message, 502, userMessage, {
      service: service ?? undefined, 
      originalStatusCode: originalError?.response?.status ?? undefined,
      originalMessage: originalError?.message ?? undefined
    });
    this.name = 'ExternalApiError';
    this.originalError = originalError;
  }
}

/**
 * Riot API 전용 에러
 */
export class RiotApiError extends ExternalApiError {
  public endpoint: string | null;

  constructor(originalError: AxiosError<RiotApiErrorResponse>, endpoint: string | null = null) {
    const status = originalError?.response?.status;
    const data = originalError?.response?.data;
    
    let userMessage = 'Riot Games 서비스 연결에 문제가 있습니다.';
    
    // Riot API 에러 코드별 사용자 친화적 메시지
    switch (status) {
      case 400:
        userMessage = '검색 조건을 확인해주세요.';
        break;
      case 401:
        userMessage = 'API 인증에 문제가 있습니다.';
        break;
      case 403:
        userMessage = 'API 사용 권한에 문제가 있습니다.';
        break;
      case 404:
        userMessage = '요청하신 소환사 정보를 찾을 수 없습니다.';
        break;
      case 429:
        userMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
        break;
      case 500:
        userMessage = 'Riot Games 서버에 일시적인 문제가 있습니다.';
        break;
      case 502:
      case 503:
        userMessage = 'Riot Games 서비스가 일시적으로 중단되었습니다.';
        break;
    }

    const message = `Riot API Error (${status}): ${data?.status?.message || originalError.message}`;
    
    super(message, 'Riot API', originalError);
    this.statusCode = status && status >= 500 ? 502 : (status || 500); // 5xx는 502로, 나머지는 원본 상태코드
    this.userMessage = userMessage;
    this.name = 'RiotApiError';
    this.endpoint = endpoint;
  }
}

/**
 * 데이터베이스 에러
 */
export class DatabaseError extends HttpError {
  public originalError: any;

  constructor(message: string, operation: string | null = null, originalError: any = null) {
    const userMessage = '데이터 처리 중 문제가 발생했습니다.';
    
    super(message, 500, userMessage, { operation: operation ?? undefined });
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * 레이트 리미팅 에러 (429)
 */
export class RateLimitError extends HttpError {
  constructor(message: string = '요청 한도 초과', retryAfter: number | null = null) {
    const userMessage = retryAfter 
      ? `요청이 너무 많습니다. ${retryAfter}초 후에 다시 시도해주세요.`
      : '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
    
    super(message, 429, userMessage, { retryAfter: retryAfter ?? undefined });
    this.name = 'RateLimitError';
  }
}

interface ErrorContext {
  service?: string;
  endpoint?: string;
  operation?: string;
  url?: string;
  method?: string;
}

// 에러 유니온 타입 정의
type ErrorLike = 
  | Error 
  | HttpError 
  | AxiosError 
  | { response?: { status?: number; data?: any }; config?: { url?: string }; message?: string; name?: string; code?: string }
  | { name?: string; message?: string; code?: string }
  | unknown;

/**
 * 에러를 적절한 커스텀 에러로 변환
 */
export function normalizeError(_error: ErrorLike, context: ErrorContext = {}): HttpError {
  // 이미 커스텀 에러인 경우 그대로 반환
  if (_error instanceof HttpError) {
    return _error;
  }

  // Axios 에러 처리
  if (typeof _error === 'object' && _error !== null && 'response' in _error) {
    // Riot API 에러로 추정되는 경우
    const errorObj = _error as any;
    if (errorObj.config?.url?.includes('riot') || context.service === 'riot') {
      return new RiotApiError(errorObj as AxiosError<RiotApiErrorResponse>, context.endpoint);
    }
    
    // 기타 외부 API 에러
    return new ExternalApiError(
      `External API Error: ${errorObj.message || 'Unknown error'}`,
      context.service,
      errorObj
    );
  }

  // MongoDB/Mongoose 에러
  if (typeof _error === 'object' && _error !== null && 'name' in _error) {
    const errorObj = _error as any;
    if (errorObj.name === 'MongoError' || errorObj.name === 'MongooseError') {
      return new DatabaseError(
        `Database Error: ${errorObj.message || 'Database error'}`,
        context.operation,
        errorObj
      );
    }
  }

  // 네트워크 연결 에러
  if (typeof _error === 'object' && _error !== null && 'code' in _error) {
    const errorObj = _error as any;
    if (errorObj.code === 'ECONNREFUSED' || errorObj.code === 'ENOTFOUND') {
      return new ExternalApiError(
        `Connection Error: ${errorObj.message || 'Connection error'}`,
        context.service,
        errorObj
      );
    }
  }

  // 기본 서버 에러로 변환
  const errorMessage = typeof _error === 'object' && _error !== null && 'message' in _error 
    ? String(_error.message) 
    : '알 수 없는 오류가 발생했습니다.';
  
  const errorName = typeof _error === 'object' && _error !== null && 'name' in _error 
    ? String(_error.name) 
    : 'UnknownError';
  
  return new HttpError(
    errorMessage,
    500,
    '서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    { originalError: errorName }
  );
}

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (_error: ErrorLike) => boolean;
  context?: ErrorContext;
}

/**
 * 범용 재시도 로직 (지수 백오프 적용)
 */
export async function withRetry<T>(
  asyncFn: () => Promise<T>, 
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (_error: ErrorLike) => {
      const errorObj = _error as any;
      return errorObj?.response?.status >= 500 || errorObj?.code === 'ECONNREFUSED';
    },
    context = {}
  } = options;

  let lastError: ErrorLike;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await asyncFn();
    } catch (_error) {
      lastError = _error;
      
      // 재시도 불가능한 에러인 경우 즉시 종료
      if (!shouldRetry(_error)) {
        throw normalizeError(_error, context);
      }
      
      // 마지막 시도인 경우 에러 던지기
      if (attempt === maxAttempts) {
        break;
      }
      
      // 지수 백오프 계산
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt - 1),
        maxDelay
      );
      const jitter = Math.random() * 1000;
      const totalDelay = exponentialDelay + jitter;
      
      logger.warn(`재시도 ${attempt}/${maxAttempts} 실패`, {
        _error: (_error as Error).message,
        statusCode: (_error as AxiosError)?.response?.status,
        nextRetryIn: `${Math.round(totalDelay)}ms`,
        context
      });
      
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw normalizeError(lastError, context);
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
}

/**
 * 서킷 브레이커 패턴 구현
 */
export class CircuitBreaker {
  private failureThreshold: number;
  private recoveryTimeout: number;
  // private monitoringPeriod: number;
  private state: CircuitState;
  private failures: number;
  private nextAttempt: number;
  private successes: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000;
    // this.monitoringPeriod = options.monitoringPeriod || 60000;
    
    this.state = 'CLOSED';
    this.failures = 0;
    this.nextAttempt = 0;
    this.successes = 0;
  }
  
  async call<T>(asyncFn: () => Promise<T>, context: ErrorContext = {}): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new HttpError(
          'Circuit breaker is OPEN',
          503,
          '서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.',
          { state: this.state, ...context }
        );
      } else {
        this.state = 'HALF_OPEN';
        this.successes = 0;
      }
    }
    
    try {
      const result = await asyncFn();
      
      if (this.state === 'HALF_OPEN') {
        this.successes++;
        if (this.successes >= 3) {
          this.state = 'CLOSED';
          this.failures = 0;
        }
      } else {
        this.failures = 0;
      }
      
      return result;
    } catch (_error) {
      this.failures++;
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.recoveryTimeout;
        
        logger.error('Circuit breaker opened', {
          failures: this.failures,
          threshold: this.failureThreshold,
          nextAttempt: new Date(this.nextAttempt).toISOString(),
          context
        });
      }
      
      throw normalizeError(_error, context);
    }
  }
}