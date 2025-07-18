import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTFTData } from '../../context/TFTDataContext';
import { TFTDataLoadingScreen, I18nLoadingScreen } from './AppLoadingScreen';
import { TFTDataErrorScreen } from './AppErrorScreen';

// AppInitializer Props 타입 정의
interface AppInitializerProps {
  children: React.ReactNode;
}

// 앱 초기화 상태 관리 컴포넌트
const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  console.log('AppInitializer: 초기화 상태 확인 시작');
  
  // 국제화(i18n) 준비 상태
  const { ready: i18nReady } = useTranslation();
  
  // TFT 데이터 상태
  const tftData = useTFTData();
  const { loading: tftDataLoading, error: tftDataError } = tftData;

  console.log('AppInitializer: 상태 확인', {
    i18nReady,
    tftDataLoading,
    tftDataError: !!tftDataError,
    tftDataErrorMessage: tftDataError,
  });

  // 1. i18n이 준비되지 않은 경우
  if (!i18nReady) {
    console.log('AppInitializer: i18n 로딩 중...');
    return <I18nLoadingScreen />;
  }

  // 2. TFT 데이터 에러가 발생한 경우
  if (tftDataError) {
    console.log('AppInitializer: TFT 데이터 에러 발생:', tftDataError);
    return <TFTDataErrorScreen errorDetails={tftDataError} />;
  }

  // 3. TFT 데이터 로딩 중인 경우
  if (tftDataLoading) {
    console.log('AppInitializer: TFT 데이터 로딩 중...');
    return <TFTDataLoadingScreen />;
  }

  // 4. 모든 초기화가 완료된 경우 - 메인 앱 렌더링
  console.log('AppInitializer: 모든 초기화 완료, 메인 앱 렌더링');
  return <>{children}</>;
};

export default AppInitializer;