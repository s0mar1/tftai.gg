import React from 'react';

// 에러 화면 타입 정의
interface AppErrorScreenProps {
  title?: string;
  message?: string;
  errorDetails?: string;
  type?: 'tft-data' | 'network' | 'general' | 'critical';
  onRetry?: () => void;
  retryButtonText?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
}

// 에러 타입별 아이콘
const getErrorIcon = (type: AppErrorScreenProps['type']) => {
  switch (type) {
    case 'tft-data':
      return '⚠️';
    case 'network':
      return '🌐';
    case 'critical':
      return '💥';
    case 'general':
    default:
      return '❌';
  }
};

// 에러 타입별 기본 제목
const getDefaultTitle = (type: AppErrorScreenProps['type']): string => {
  switch (type) {
    case 'tft-data':
      return '데이터 로딩 오류';
    case 'network':
      return '네트워크 연결 오류';
    case 'critical':
      return '심각한 오류 발생';
    case 'general':
    default:
      return '오류 발생';
  }
};

// 에러 타입별 기본 메시지
const getDefaultMessage = (type: AppErrorScreenProps['type']): string => {
  switch (type) {
    case 'tft-data':
      return 'TFT 데이터를 불러오는 중 문제가 발생했습니다.';
    case 'network':
      return '네트워크 연결을 확인하고 다시 시도해주세요.';
    case 'critical':
      return '예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.';
    case 'general':
    default:
      return '문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
};

// 메인 에러 화면 컴포넌트
const AppErrorScreen: React.FC<AppErrorScreenProps> = ({ 
  title,
  message,
  errorDetails,
  type = 'general',
  onRetry,
  retryButtonText = '새로고침',
  showIcon = true,
  icon
}) => {
  const displayTitle = title || getDefaultTitle(type);
  const displayMessage = message || getDefaultMessage(type);
  const displayIcon = icon || getErrorIcon(type);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // 기본 동작: 페이지 새로고침
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-base dark:bg-dark-background-base">
      <div className="text-center p-8 bg-white dark:bg-dark-background-elevated rounded-lg shadow-lg max-w-md mx-4">
        {showIcon && (
          <div className="text-6xl mb-4">
            {typeof displayIcon === 'string' ? displayIcon : displayIcon}
          </div>
        )}
        
        <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-2">
          {displayTitle}
        </h1>
        
        <p className="text-text-secondary dark:text-dark-text-secondary mb-4">
          {displayMessage}
        </p>
        
        {errorDetails && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400 font-mono break-words">
              {errorDetails}
            </p>
          </div>
        )}
        
        <button 
          onClick={handleRetry}
          className="bg-brand-mint hover:bg-brand-mint-hover text-white px-6 py-2 rounded transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 dark:focus:ring-offset-dark-background-elevated"
        >
          {retryButtonText}
        </button>
        
        {/* 추가 정보나 지원 링크를 위한 영역 */}
        <div className="mt-4 text-xs text-text-tertiary dark:text-dark-text-tertiary">
          문제가 계속 발생하면 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
        </div>
      </div>
    </div>
  );
};

// 특정 타입별 편의 컴포넌트들
export const TFTDataErrorScreen: React.FC<{ 
  errorDetails?: string; 
  onRetry?: () => void; 
}> = ({ errorDetails, onRetry }) => (
  <AppErrorScreen 
    type="tft-data" 
    errorDetails={errorDetails} 
    onRetry={onRetry}
  />
);

export const NetworkErrorScreen: React.FC<{ 
  errorDetails?: string; 
  onRetry?: () => void; 
}> = ({ errorDetails, onRetry }) => (
  <AppErrorScreen 
    type="network" 
    errorDetails={errorDetails} 
    onRetry={onRetry}
    retryButtonText="다시 연결"
  />
);

export const CriticalErrorScreen: React.FC<{ 
  errorDetails?: string; 
  onRetry?: () => void; 
}> = ({ errorDetails, onRetry }) => (
  <AppErrorScreen 
    type="critical" 
    errorDetails={errorDetails} 
    onRetry={onRetry}
    retryButtonText="페이지 새로고침"
  />
);

export const GeneralErrorScreen: React.FC<{ 
  title?: string;
  message?: string;
  errorDetails?: string; 
  onRetry?: () => void; 
}> = ({ title, message, errorDetails, onRetry }) => (
  <AppErrorScreen 
    type="general"
    title={title}
    message={message}
    errorDetails={errorDetails} 
    onRetry={onRetry}
  />
);

export default AppErrorScreen;