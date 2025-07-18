// 중앙화된 에러 처리 시스템
import { logger } from './logger';

// 에러 타입 정의
export interface BaseError {
  name: string;
  message: string;
  stack?: string;
  timestamp?: number;
  userId?: string;
  url?: string;
  userAgent?: string;
}

export interface APIError extends BaseError {
  status: number;
  response?: Response;
  endpoint?: string;
  method?: string;
}

export interface NetworkError extends BaseError {
  isOnline: boolean;
  timeout?: boolean;
}

export interface ValidationError extends BaseError {
  field?: string;
  value?: unknown;
  constraints?: string[];
}

export interface ComponentError extends BaseError {
  componentName: string;
  componentStack?: string;
  errorBoundary?: boolean;
}

// 에러 심각도 레벨
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 에러 카테고리
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  COMPONENT = 'component',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  DATA = 'data',
  UNKNOWN = 'unknown'
}

// 에러 정보 구조
export interface ErrorInfo {
  error: BaseError;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context?: Record<string, unknown>;
  userFriendlyMessage?: string;
  actionable?: boolean;
  retryable?: boolean;
}

// 에러 분류 함수
export function classifyError(error: Error | unknown): ErrorInfo {
  const timestamp = Date.now();
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  // 기본 에러 정보
  const baseError: BaseError = {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp,
    url,
    userAgent,
  };

  // FetchError (API 오류)
  if (error instanceof Error && error.name === 'FetchError') {
    const fetchError = error as any;
    return {
      error: {
        ...baseError,
        status: fetchError.status,
        response: fetchError.response,
      } as APIError,
      severity: fetchError.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      category: ErrorCategory.API,
      userFriendlyMessage: getAPIErrorMessage(fetchError.status),
      actionable: true,
      retryable: fetchError.status >= 500 || fetchError.status === 429,
    };
  }

  // Network 오류
  if (error instanceof Error && (
    error.message.includes('network') || 
    error.message.includes('timeout') || 
    error.message.includes('fetch')
  )) {
    return {
      error: {
        ...baseError,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        timeout: error.message.includes('timeout'),
      } as NetworkError,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.NETWORK,
      userFriendlyMessage: '네트워크 연결을 확인해주세요.',
      actionable: true,
      retryable: true,
    };
  }

  // Validation 오류
  if (error instanceof Error && error.name === 'ValidationError') {
    return {
      error: baseError as ValidationError,
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      userFriendlyMessage: '입력하신 정보를 다시 확인해주세요.',
      actionable: true,
      retryable: false,
    };
  }

  // Component 오류
  if (error instanceof Error && error.name === 'ChunkLoadError') {
    return {
      error: {
        ...baseError,
        componentName: 'ChunkLoader',
      } as ComponentError,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.COMPONENT,
      userFriendlyMessage: '페이지를 새로고침해주세요.',
      actionable: true,
      retryable: true,
    };
  }

  // 기본 에러
  return {
    error: baseError,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.UNKNOWN,
    userFriendlyMessage: '예상치 못한 오류가 발생했습니다.',
    actionable: false,
    retryable: false,
  };
}

// API 에러 메시지 생성
function getAPIErrorMessage(status?: number): string {
  if (!status) return '서버 연결에 실패했습니다.';
  
  switch (status) {
    case 400:
      return '잘못된 요청입니다. 입력 정보를 확인해주세요.';
    case 401:
      return '인증이 필요합니다. 다시 로그인해주세요.';
    case 403:
      return '접근 권한이 없습니다.';
    case 404:
      return '요청한 데이터를 찾을 수 없습니다.';
    case 429:
      return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 500:
      return '서버 내부 오류가 발생했습니다.';
    case 502:
      return '서버에 연결할 수 없습니다.';
    case 503:
      return '서비스를 일시적으로 이용할 수 없습니다.';
    default:
      if (status >= 500) {
        return '서버 오류가 발생했습니다.';
      }
      return '요청을 처리할 수 없습니다.';
  }
}

// 에러 처리 함수
export function handleError(
  error: Error | unknown,
  context?: Record<string, unknown>
): ErrorInfo {
  const errorInfo = classifyError(error);
  
  // 컨텍스트 추가
  if (context) {
    errorInfo.context = { ...errorInfo.context, ...context };
  }

  // 로깅
  logger.error(
    `${errorInfo.category.toUpperCase()}: ${errorInfo.error.message}`,
    error as Error,
    {
      severity: errorInfo.severity,
      category: errorInfo.category,
      actionable: errorInfo.actionable,
      retryable: errorInfo.retryable,
      context: errorInfo.context,
    }
  );

  // 중요한 에러는 콘솔에도 출력
  if (errorInfo.severity === ErrorSeverity.HIGH || errorInfo.severity === ErrorSeverity.CRITICAL) {
    console.error('Critical Error:', errorInfo);
  }

  return errorInfo;
}

// 에러 알림 표시
export function showErrorNotification(errorInfo: ErrorInfo): void {
  // 사용자 친화적인 메시지 표시
  if (errorInfo.userFriendlyMessage) {
    // 여기서 토스트 알림이나 모달을 표시할 수 있습니다.
    // 현재는 alert을 사용하지만, 실제 프로덕션에서는 더 나은 UI를 사용해야 합니다.
    
    // 개발 환경에서만 상세 정보 표시
    if (import.meta.env.DEV) {
      console.warn(`Error Notification: ${errorInfo.userFriendlyMessage}`, errorInfo);
    }
    
    // 실제 알림 시스템이 있다면 여기서 호출
    // notificationService.error(errorInfo.userFriendlyMessage);
  }
}

// 에러 재시도 함수
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      const errorInfo = classifyError(error);
      
      // 재시도 불가능한 에러면 즉시 중단
      if (!errorInfo.retryable) {
        throw error;
      }
      
      // 마지막 시도면 에러 발생
      if (attempt === maxRetries) {
        break;
      }
      
      // 지연 후 재시도
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
      
      logger.warn(`Retrying operation (${attempt}/${maxRetries})`, error as Error, {
        operation: operation.name,
        attempt,
        maxRetries,
      });
    }
  }
  
  throw lastError;
}

// 전역 에러 핸들러 설정
export function setupGlobalErrorHandlers(): void {
  // 처리되지 않은 Promise 에러
  window.addEventListener('unhandledrejection', (event) => {
    const errorInfo = handleError(event.reason, {
      type: 'unhandledrejection',
      promise: event.promise,
    });
    
    showErrorNotification(errorInfo);
    
    // 에러 preventDefault하여 콘솔 출력 방지 (이미 로깅됨)
    if (errorInfo.severity !== ErrorSeverity.CRITICAL) {
      event.preventDefault();
    }
  });

  // 일반적인 JavaScript 에러
  window.addEventListener('error', (event) => {
    const errorInfo = handleError(event.error, {
      type: 'error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
    
    showErrorNotification(errorInfo);
  });
}

// React Error Boundary용 에러 핸들러
export function handleComponentError(
  error: Error,
  errorInfo: { componentStack: string },
  componentName: string
): ErrorInfo {
  const componentError: ComponentError = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    componentName,
    componentStack: errorInfo.componentStack,
    errorBoundary: true,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  return {
    error: componentError,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.COMPONENT,
    userFriendlyMessage: '페이지에 오류가 발생했습니다. 새로고침해주세요.',
    actionable: true,
    retryable: true,
    context: {
      componentName,
      errorBoundary: true,
    },
  };
}

// 에러 처리 래퍼 함수 (async 함수용)
export function withErrorHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorInfo = handleError(error, {
        function: fn.name,
        arguments: args,
      });
      
      showErrorNotification(errorInfo);
      
      // 에러 다시 발생 (필요에 따라)
      throw error;
    }
  };
}

// 폼 검증 에러 생성
export function createValidationError(
  field: string,
  value: unknown,
  constraints: string[]
): ValidationError {
  return {
    name: 'ValidationError',
    message: `Validation failed for field '${field}': ${constraints.join(', ')}`,
    field,
    value,
    constraints,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}