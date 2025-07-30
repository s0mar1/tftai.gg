/**
 * GraphQL 에러 분류 및 강화된 로깅 플러그인
 * 기존 에러 처리 로직을 변경하지 않으면서 에러 분류와 상세 로깅만 추가
 */

import type { ApolloServerPlugin, GraphQLRequestContext } from '@apollo/server';
import { GraphQLError } from 'graphql';
import logger from '../config/logger';
import type { GraphQLContext } from './types';

/**
 * GraphQL 에러 유형 분류
 */
export enum GraphQLErrorType {
  // 클라이언트 에러 (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', 
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  BAD_USER_INPUT = 'BAD_USER_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  
  // 서버 에러 (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // 비즈니스 로직 에러
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  
  // 기타
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 에러 심각도 레벨
 */
export enum ErrorSeverity {
  LOW = 'LOW',        // 사용자 입력 오류 등
  MEDIUM = 'MEDIUM',  // 비즈니스 로직 오류
  HIGH = 'HIGH',      // 외부 API 오류
  CRITICAL = 'CRITICAL' // 내부 서버 오류
}

/**
 * 구조화된 에러 정보
 */
interface ClassifiedError {
  type: GraphQLErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: Record<string, any>;
  stackTrace?: string;
  timestamp: number;
  requestId: string;
  operationName?: string;
  userId?: string;
  fieldPath?: string[];
  isRetryable: boolean;
  suggestedAction?: string;
}

/**
 * 에러 메시지와 타입으로부터 에러 분류
 */
function classifyError(error: any, requestContext: GraphQLRequestContext<GraphQLContext>): ClassifiedError {
  const message = error.message || error.toString();
  const extensions = error.extensions || {};
  const code = extensions.code;
  
  let type = GraphQLErrorType.UNKNOWN_ERROR;
  let severity = ErrorSeverity.MEDIUM;
  let isRetryable = false;
  let suggestedAction = 'Contact support if the problem persists';
  
  // 에러 코드 기반 분류
  if (code) {
    switch (code) {
      case 'GRAPHQL_VALIDATION_FAILED':
        type = GraphQLErrorType.VALIDATION_ERROR;
        severity = ErrorSeverity.LOW;
        suggestedAction = 'Check your query syntax and structure';
        break;
      case 'UNAUTHENTICATED':
        type = GraphQLErrorType.AUTHENTICATION_ERROR;
        severity = ErrorSeverity.LOW;
        suggestedAction = 'Please login or refresh your authentication token';
        break;
      case 'FORBIDDEN':
        type = GraphQLErrorType.AUTHORIZATION_ERROR;
        severity = ErrorSeverity.LOW;
        suggestedAction = 'You do not have permission to access this resource';
        break;
      case 'BAD_USER_INPUT':
        type = GraphQLErrorType.BAD_USER_INPUT;
        severity = ErrorSeverity.LOW;
        suggestedAction = 'Please check your input parameters';
        break;
      case 'INTERNAL_SERVER_ERROR':
        type = GraphQLErrorType.INTERNAL_SERVER_ERROR;
        severity = ErrorSeverity.CRITICAL;
        isRetryable = true;
        suggestedAction = 'Please try again later';
        break;
    }
  }
  
  // 에러 메시지 기반 분류 (추가적으로)
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    type = GraphQLErrorType.NOT_FOUND;
    severity = ErrorSeverity.LOW;
    suggestedAction = 'Check if the requested resource exists';
  } else if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    type = GraphQLErrorType.TIMEOUT_ERROR;
    severity = ErrorSeverity.HIGH;
    isRetryable = true;
    suggestedAction = 'Please try again, the request timed out';
  } else if (lowerMessage.includes('database') || lowerMessage.includes('mongodb') || lowerMessage.includes('connection')) {
    type = GraphQLErrorType.DATABASE_ERROR;
    severity = ErrorSeverity.CRITICAL;
    isRetryable = true;
    suggestedAction = 'Database temporarily unavailable, please try again';
  } else if (lowerMessage.includes('cache') || lowerMessage.includes('redis')) {
    type = GraphQLErrorType.CACHE_ERROR;
    severity = ErrorSeverity.MEDIUM;
    isRetryable = true;
    suggestedAction = 'Cache temporarily unavailable, functionality may be slower';
  } else if (lowerMessage.includes('riot api') || lowerMessage.includes('external api') || lowerMessage.includes('fetch')) {
    type = GraphQLErrorType.EXTERNAL_API_ERROR;
    severity = ErrorSeverity.HIGH;
    isRetryable = true;
    suggestedAction = 'External service temporarily unavailable, please try again';
  } else if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    type = GraphQLErrorType.RATE_LIMIT_ERROR;
    severity = ErrorSeverity.MEDIUM;
    isRetryable = false;
    suggestedAction = 'Please wait before making more requests';
  }
  
  // TFT 특화 에러 패턴
  if (lowerMessage.includes('summoner') && lowerMessage.includes('not found')) {
    type = GraphQLErrorType.NOT_FOUND;
    severity = ErrorSeverity.LOW;
    suggestedAction = 'Check the summoner name and region';
  } else if (lowerMessage.includes('name is not defined')) {
    type = GraphQLErrorType.INTERNAL_SERVER_ERROR;
    severity = ErrorSeverity.CRITICAL;
    isRetryable = false;
    suggestedAction = 'Server error detected, developers have been notified';
  }
  
  return {
    type,
    severity,
    message,
    code,
    details: {
      originalError: error.name || 'Unknown',
      extensions,
      locations: error.locations,
      path: error.path
    },
    stackTrace: error.stack,
    timestamp: Date.now(),
    requestId: requestContext.contextValue?.requestId || 'unknown',
    operationName: requestContext.operationName || undefined,
    userId: requestContext.contextValue?.user?.id || undefined,
    fieldPath: error.path,
    isRetryable,
    suggestedAction
  };
}

/**
 * 분류된 에러를 적절한 로그 레벨로 기록
 */
function logClassifiedError(classifiedError: ClassifiedError): void {
  const logData = {
    errorType: classifiedError.type,
    severity: classifiedError.severity,
    message: classifiedError.message,
    code: classifiedError.code,
    requestId: classifiedError.requestId,
    operationName: classifiedError.operationName,
    userId: classifiedError.userId,
    fieldPath: classifiedError.fieldPath,
    isRetryable: classifiedError.isRetryable,
    suggestedAction: classifiedError.suggestedAction,
    timestamp: new Date(classifiedError.timestamp).toISOString(),
    details: classifiedError.details
  };
  
  // 심각도에 따른 로그 레벨 결정
  switch (classifiedError.severity) {
    case ErrorSeverity.LOW:
      logger.info(`🔵 [GraphQL Error - ${classifiedError.type}]`, logData);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(`🟡 [GraphQL Error - ${classifiedError.type}]`, logData);
      break;
    case ErrorSeverity.HIGH:
      logger.error(`🟠 [GraphQL Error - ${classifiedError.type}]`, logData);
      break;
    case ErrorSeverity.CRITICAL:
      logger.error(`🔴 [GraphQL Critical Error - ${classifiedError.type}]`, {
        ...logData,
        stackTrace: classifiedError.stackTrace
      });
      break;
  }
  
  // 특정 에러 타입에 대한 추가 로직 (알림, 메트릭스 등)
  if (classifiedError.severity === ErrorSeverity.CRITICAL) {
    // 심각한 에러에 대한 추가 처리 (예: Slack 알림, 메트릭스 전송)
    logger.error('🚨 [GraphQL Alert] Critical error detected - consider immediate attention', {
      type: classifiedError.type,
      message: classifiedError.message,
      requestId: classifiedError.requestId,
      operationName: classifiedError.operationName
    });
  }
}

/**
 * GraphQL 에러 분류 및 강화된 로깅 플러그인
 */
export const errorClassificationPlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async didEncounterErrors(requestContext) {
        // 기존 에러 처리 로직을 전혀 변경하지 않고, 추가 정보만 수집
        if (requestContext.errors && requestContext.errors.length > 0) {
          try {
            for (const error of requestContext.errors) {
              // 각 에러를 분류하고 상세 로깅
              const classifiedError = classifyError(error, requestContext);
              logClassifiedError(classifiedError);
            }
            
            // 에러 요약 로깅
            const errorSummary = {
              totalErrors: requestContext.errors.length,
              requestId: requestContext.contextValue?.requestId || 'unknown',
              operationName: requestContext.operationName || 'Unknown',
              userId: requestContext.contextValue?.user?.id || 'anonymous',
              timestamp: new Date().toISOString(),
              errorTypes: requestContext.errors.map(error => {
                const classified = classifyError(error, requestContext);
                return {
                  type: classified.type,
                  severity: classified.severity,
                  retryable: classified.isRetryable
                };
              })
            };
            
            logger.info('📊 [GraphQL Error Summary]', errorSummary);
            
          } catch (classificationError: any) {
            // 에러 분류 과정에서 오류가 발생해도 원본 에러 처리에 영향 없음
            logger.debug('에러 분류 과정에서 오류 발생 (무시됨):', classificationError.message);
          }
        }
      }
    };
  }
};

/**
 * 에러 유형별 통계를 위한 헬퍼 함수
 */
export function getErrorTypeDescription(type: GraphQLErrorType): string {
  const descriptions: Record<GraphQLErrorType, string> = {
    [GraphQLErrorType.VALIDATION_ERROR]: 'GraphQL query validation failed',
    [GraphQLErrorType.AUTHENTICATION_ERROR]: 'User authentication required',
    [GraphQLErrorType.AUTHORIZATION_ERROR]: 'User lacks necessary permissions',
    [GraphQLErrorType.BAD_USER_INPUT]: 'Invalid input parameters provided',
    [GraphQLErrorType.NOT_FOUND]: 'Requested resource not found',
    [GraphQLErrorType.INTERNAL_SERVER_ERROR]: 'Internal server error occurred',
    [GraphQLErrorType.DATABASE_ERROR]: 'Database operation failed',
    [GraphQLErrorType.EXTERNAL_API_ERROR]: 'External API call failed',
    [GraphQLErrorType.CACHE_ERROR]: 'Cache operation failed',
    [GraphQLErrorType.TIMEOUT_ERROR]: 'Request timed out',
    [GraphQLErrorType.BUSINESS_LOGIC_ERROR]: 'Business rule validation failed',
    [GraphQLErrorType.RATE_LIMIT_ERROR]: 'Rate limit exceeded',
    [GraphQLErrorType.UNKNOWN_ERROR]: 'Unknown error occurred'
  };
  
  return descriptions[type] || 'Unknown error type';
}

/**
 * GraphQL 에러에 구조화된 extensions 추가 (기존 에러 객체 수정 없이)
 */
export function enhanceGraphQLError(
  originalError: Error, 
  type: GraphQLErrorType,
  details?: Record<string, any>
): GraphQLError {
  return new GraphQLError(
    originalError.message,
    {
      extensions: {
        code: type,
        details,
        timestamp: Date.now(),
        retryable: [
          GraphQLErrorType.DATABASE_ERROR,
          GraphQLErrorType.EXTERNAL_API_ERROR,
          GraphQLErrorType.CACHE_ERROR,
          GraphQLErrorType.TIMEOUT_ERROR,
          GraphQLErrorType.INTERNAL_SERVER_ERROR
        ].includes(type)
      }
    }
  );
}