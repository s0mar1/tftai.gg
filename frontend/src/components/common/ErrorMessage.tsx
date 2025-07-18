import React from 'react';

export type ErrorType = 
  | 'generic'
  | 'network'
  | 'notFound'
  | 'timeout'
  | 'validation'
  | 'unauthorized'
  | 'maintenance'
  | 'rateLimit';

interface ErrorMessageProps {
  type?: ErrorType;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  showDismiss?: boolean;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  type = 'generic',
  message,
  onRetry,
  onDismiss,
  showRetry = true,
  showDismiss = false,
  className = ''
}) => {
  const getErrorConfig = (errorType: ErrorType) => {
    const configs = {
      network: {
        title: '네트워크 오류',
        message: '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        textColor: 'text-red-800 dark:text-red-200',
        iconColor: 'text-red-600 dark:text-red-400'
      },
      notFound: {
        title: '데이터를 찾을 수 없음',
        message: '요청한 데이터를 찾을 수 없습니다. 다시 시도해주세요.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        iconColor: 'text-yellow-600 dark:text-yellow-400'
      },
      timeout: {
        title: '요청 시간 초과',
        message: '요청이 시간 초과되었습니다. 다시 시도해주세요.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        textColor: 'text-orange-800 dark:text-orange-200',
        iconColor: 'text-orange-600 dark:text-orange-400'
      },
      validation: {
        title: '입력 오류',
        message: '입력된 정보를 확인해주세요.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        textColor: 'text-red-800 dark:text-red-200',
        iconColor: 'text-red-600 dark:text-red-400'
      },
      unauthorized: {
        title: '권한 없음',
        message: '이 기능을 사용할 권한이 없습니다.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        textColor: 'text-purple-800 dark:text-purple-200',
        iconColor: 'text-purple-600 dark:text-purple-400'
      },
      maintenance: {
        title: '서비스 점검',
        message: '현재 서비스 점검 중입니다. 잠시 후 다시 시도해주세요.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        ),
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        textColor: 'text-blue-800 dark:text-blue-200',
        iconColor: 'text-blue-600 dark:text-blue-400'
      },
      rateLimit: {
        title: '요청 제한',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 15v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        iconColor: 'text-yellow-600 dark:text-yellow-400'
      },
      generic: {
        title: '오류 발생',
        message: '알 수 없는 오류가 발생했습니다.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        textColor: 'text-gray-800 dark:text-gray-200',
        iconColor: 'text-gray-600 dark:text-gray-400'
      }
    };

    return configs[errorType] || configs.generic;
  };

  const config = getErrorConfig(type);
  const displayMessage = message || config.message;

  return (
    <div className={`rounded-lg p-4 ${config.bgColor} ${className}`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.textColor}`}>
            {config.title}
          </h3>
          <div className={`mt-1 text-sm ${config.textColor}`}>
            <p>{displayMessage}</p>
          </div>
          
          {(showRetry || showDismiss) && (
            <div className="mt-4 flex space-x-2">
              {showRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className={`
                    text-sm px-3 py-1 rounded-md font-medium
                    ${config.textColor}
                    hover:bg-white/20 dark:hover:bg-black/20
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
                    ${config.iconColor.replace('text-', 'focus:ring-')}
                  `}
                >
                  다시 시도
                </button>
              )}
              
              {showDismiss && onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`
                    text-sm px-3 py-1 rounded-md font-medium
                    ${config.textColor}
                    hover:bg-white/20 dark:hover:bg-black/20
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
                    ${config.iconColor.replace('text-', 'focus:ring-')}
                  `}
                >
                  닫기
                </button>
              )}
            </div>
          )}
        </div>
        
        {showDismiss && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`
                inline-flex rounded-md p-1.5 
                ${config.iconColor}
                hover:bg-white/20 dark:hover:bg-black/20
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
                ${config.iconColor.replace('text-', 'focus:ring-')}
              `}
            >
              <span className="sr-only">닫기</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 에러 타입별 헬퍼 컴포넌트
export const NetworkError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => <ErrorMessage type="network" {...props} />;
export const NotFoundError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => <ErrorMessage type="notFound" {...props} />;
export const TimeoutError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => <ErrorMessage type="timeout" {...props} />;
export const ValidationError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => <ErrorMessage type="validation" {...props} />;
export const UnauthorizedError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => <ErrorMessage type="unauthorized" {...props} />;
export const MaintenanceError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => <ErrorMessage type="maintenance" {...props} />;
export const RateLimitError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => <ErrorMessage type="rateLimit" {...props} />;

export default ErrorMessage;