import React, { ErrorInfo, ReactNode } from 'react';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { ErrorBoundaryProps } from '../../types';
import { handleComponentError, showErrorNotification } from '../../utils/errorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorReport {
  id: string;
  message: string;
  stack: string;
  componentStack: string;
  url: string;
  userAgent: string;
  timestamp: string;
  props: Record<string, unknown>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 ID 생성
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // 중앙화된 에러 처리 시스템 사용
    const processedError = handleComponentError(error, errorInfo, 'ErrorBoundary');
    
    // 에러 알림 표시
    showErrorNotification(processedError);
    
    // 프로덕션에서 에러 리포팅 서비스에 전송
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, errorId);
    }
  }

  reportError = async (error: Error, errorInfo: ErrorInfo, errorId: string): Promise<void> => {
    try {
      // 에러 정보 수집
      const errorReport: ErrorReport = {
        id: errorId,
        message: error.message,
        stack: error.stack || '',
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        props: this.props.errorMetadata || {}
      };

      // 에러 리포팅 서비스에 전송 (예: Sentry, LogRocket 등)
      await fetch('/api/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = (): void => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent, level = 'component' } = this.props;
      
      // 커스텀 폴백 컴포넌트가 있는 경우
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            errorId={this.state.errorId}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
          />
        );
      }

      // 기본 폴백 UI
      return <ErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        level={level}
        onRetry={this.handleRetry}
        onReload={this.handleReload}
      />;
    }

    return this.props.children;
  }
}

// 기본 에러 폴백 컴포넌트
const ErrorFallback = ({ 
  error, 
  errorInfo, 
  errorId, 
  level, 
  onRetry, 
  onReload 
}) => {
  const { performanceData } = usePerformanceMonitor('ErrorFallback');
  
  const isPageLevel = level === 'page';
  const isAppLevel = level === 'app';

  return (
    <div className={`
      flex flex-col items-center justify-center p-8 
      ${isPageLevel ? 'min-h-screen' : 'min-h-[400px]'}
      bg-gray-50 dark:bg-gray-900
    `}>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {/* 에러 아이콘 */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* 에러 메시지 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {isAppLevel ? '애플리케이션 오류' : '문제가 발생했습니다'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {isAppLevel 
              ? '애플리케이션을 로드하는 중에 오류가 발생했습니다.'
              : '이 섹션을 표시하는 중에 오류가 발생했습니다.'
            }
          </p>
          
          {/* 개발 환경에서만 에러 상세 정보 표시 */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 mb-2">
                에러 상세 정보
              </summary>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">에러 ID:</span> {errorId}
                </div>
                <div>
                  <span className="font-medium">메시지:</span> {error?.message}
                </div>
                {error?.stack && (
                  <div>
                    <span className="font-medium">스택 트레이스:</span>
                    <pre className="mt-1 text-xs bg-gray-800 text-gray-100 p-2 rounded overflow-x-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            다시 시도
          </button>
          
          {isPageLevel && (
            <button
              onClick={onReload}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              페이지 새로고침
            </button>
          )}
        </div>

        {/* 도움말 링크 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            문제가 지속되면{' '}
            <a 
              href="https://github.com/your-repo/issues"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              문제 신고
            </a>
            해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;