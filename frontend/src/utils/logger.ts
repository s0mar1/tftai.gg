/**
 * 개발 환경 로깅 유틸리티
 * 프로덕션 환경에서는 로깅을 자동으로 제거하고,
 * 개발 환경에서는 구조화된 로깅을 제공합니다.
 */

export interface LogContext {
  component?: string;
  action?: string;
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * 안전한 로깅 클래스
 * 민감정보 자동 필터링 및 환경별 로깅 제어
 */
class Logger {
  private isDev: boolean;
  private sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'puuid', 'email', 'phone'];

  constructor() {
    this.isDev = import.meta.env.DEV;
  }

  /**
   * 민감정보 필터링
   */
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * 포맷된 로그 메시지 생성
   */
  private formatMessage(level: keyof LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `[${context.action}]` : '';
    
    return `${timestamp} ${level.toUpperCase()} ${component}${action} ${message}`;
  }

  /**
   * 개발 환경에서만 디버그 로깅
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDev) return;
    
    const formattedMessage = this.formatMessage('DEBUG', message, context);
    console.log(formattedMessage);
    
    if (context?.data) {
      console.log('Data:', this.sanitizeData(context.data));
    }
  }

  /**
   * 정보성 로깅
   */
  info(message: string, context?: LogContext): void {
    if (!this.isDev) return;
    
    const formattedMessage = this.formatMessage('INFO', message, context);
    console.log(formattedMessage);
    
    if (context?.data) {
      console.log('Data:', this.sanitizeData(context.data));
    }
  }

  /**
   * 경고 로깅 (프로덕션에서도 출력)
   */
  warn(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage('WARN', message, context);
    console.warn(formattedMessage);
    
    if (context?.data && this.isDev) {
      console.warn('Data:', this.sanitizeData(context.data));
    }
  }

  /**
   * 에러 로깅 (프로덕션에서도 출력)
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const formattedMessage = this.formatMessage('ERROR', message, context);
    console.error(formattedMessage);
    
    if (error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: this.isDev ? error.stack : undefined
      });
    }
    
    if (context?.data && this.isDev) {
      console.error('Context data:', this.sanitizeData(context.data));
    }
  }

  /**
   * API 호출 로깅
   */
  apiCall(method: string, url: string, context?: LogContext): void {
    this.debug(`API ${method.toUpperCase()} ${url}`, {
      ...context,
      component: context?.component || 'API',
      action: 'request'
    });
  }

  /**
   * API 응답 로깅
   */
  apiResponse(method: string, url: string, status: number, responseTime?: number, context?: LogContext): void {
    const message = `API ${method.toUpperCase()} ${url} - ${status} ${responseTime ? `(${responseTime}ms)` : ''}`;
    
    if (status >= 400) {
      this.error(message, undefined, context);
    } else {
      this.debug(message, {
        ...context,
        component: context?.component || 'API',
        action: 'response'
      });
    }
  }

  /**
   * 컴포넌트 렌더링 로깅
   */
  render(componentName: string, props?: Record<string, any>, context?: LogContext): void {
    this.debug(`Rendering ${componentName}`, {
      ...context,
      component: componentName,
      action: 'render',
      data: props
    });
  }

  /**
   * 사용자 액션 로깅
   */
  userAction(action: string, details?: Record<string, any>, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      ...context,
      action,
      data: details
    });
  }

  /**
   * 성능 메트릭 로깅
   */
  performance(metric: string, value: number, unit: string = 'ms', context?: LogContext): void {
    this.debug(`Performance: ${metric} = ${value}${unit}`, {
      ...context,
      component: context?.component || 'Performance',
      action: 'metric',
      data: { metric, value, unit }
    });
  }
}

// 싱글톤 인스턴스 내보내기
export const logger = new Logger();

// 편의 함수들
export const log = logger;
export const apiLog = {
  request: (method: string, url: string, context?: LogContext) => logger.apiCall(method, url, context),
  response: (method: string, url: string, status: number, responseTime?: number, context?: LogContext) => 
    logger.apiResponse(method, url, status, responseTime, context)
};

// 컴포넌트별 로거 생성 헬퍼
export function createComponentLogger(componentName: string) {
  return {
    debug: (message: string, data?: Record<string, any>) => 
      logger.debug(message, { component: componentName, data }),
    info: (message: string, data?: Record<string, any>) => 
      logger.info(message, { component: componentName, data }),
    warn: (message: string, data?: Record<string, any>) => 
      logger.warn(message, { component: componentName, data }),
    error: (message: string, error?: Error, data?: Record<string, any>) => 
      logger.error(message, error, { component: componentName, data }),
    render: (props?: Record<string, any>) => 
      logger.render(componentName, props),
    userAction: (action: string, details?: Record<string, any>) => 
      logger.userAction(action, details, { component: componentName })
  };
}

export default logger;