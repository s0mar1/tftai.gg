import React from 'react';

// 로딩 화면 타입 정의
interface AppLoadingScreenProps {
  message?: string;
  type?: 'tft-data' | 'i18n' | 'general';
  showLogo?: boolean;
}

// 로딩 스피너 컴포넌트
const LoadingSpinner: React.FC = () => (
  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
);

// 로고 아이콘 (선택사항)
const AppLogo: React.FC = () => (
  <div className="mb-6">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C21.9939 8.94833 20.3541 6.19524 17.75 4.75" 
        stroke="#3ED2B9" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <path 
        d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" 
        stroke="#3ED2B9" 
        strokeWidth="2"
      />
      <path 
        d="M12 12V16C12 17.1046 12.8954 18 14 18" 
        stroke="#3ED2B9" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  </div>
);

// 메인 로딩 화면 컴포넌트
const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ 
  message, 
  type = 'general',
  showLogo = false 
}) => {
  // 타입별 기본 메시지
  const getDefaultMessage = (loadingType: typeof type): string => {
    switch (loadingType) {
      case 'tft-data':
        return 'TFT 데이터 로딩 중...';
      case 'i18n':
        return 'Loading translations...';
      case 'general':
      default:
        return '로딩 중...';
    }
  };

  const displayMessage = message || getDefaultMessage(type);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-base dark:bg-dark-background-base">
      <div className="text-center">
        {showLogo && <AppLogo />}
        
        <LoadingSpinner />
        
        <p className="mt-4 text-text-secondary dark:text-dark-text-secondary">
          {displayMessage}
        </p>
        
        {/* 추가적인 로딩 정보가 필요한 경우를 위한 슬롯 */}
        {type === 'tft-data' && (
          <div className="mt-2 text-xs text-text-tertiary dark:text-dark-text-tertiary">
            챔피언, 아이템, 특성 데이터를 불러오는 중입니다
          </div>
        )}
        
        {type === 'i18n' && (
          <div className="mt-2 text-xs text-text-tertiary dark:text-dark-text-tertiary">
            언어 파일을 불러오는 중입니다
          </div>
        )}
      </div>
    </div>
  );
};

// 특정 타입별 편의 컴포넌트들
export const TFTDataLoadingScreen: React.FC<{ message?: string }> = ({ message }) => (
  <AppLoadingScreen type="tft-data" message={message} showLogo={true} />
);

export const I18nLoadingScreen: React.FC<{ message?: string }> = ({ message }) => (
  <AppLoadingScreen type="i18n" message={message} />
);

export const GeneralLoadingScreen: React.FC<{ message?: string }> = ({ message }) => (
  <AppLoadingScreen type="general" message={message} />
);

export default AppLoadingScreen;