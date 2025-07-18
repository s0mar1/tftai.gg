import React from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import { DarkModeProvider } from './context/DarkModeContext';
import { UIStateProvider } from './context/UIStateContext';
import AppInitializer from './components/app/AppInitializer';
import AppLayout from './components/app/AppLayout';
import { LanguageRoutes } from './components/routing/LanguageRouter';
import PerformanceMonitor from './components/common/PerformanceMonitor';

/**
 * 메인 App 컴포넌트
 * 
 * 이제 단일 책임만 가집니다:
 * 1. 전역 Provider들 설정
 * 2. 최상위 ErrorBoundary 설정
 * 3. 초기화 및 레이아웃 위임
 */
const App: React.FC = () => {
  console.log('App: 새로운 간소화된 App 컴포넌트 렌더링');

  return (
    <ErrorBoundary level="app">
      {/* 전역 상태 관리 Provider들 */}
      <DarkModeProvider>
        <UIStateProvider>
          {/* 앱 초기화 로직 (로딩/에러 상태 처리) */}
          <AppInitializer>
            {/* 메인 레이아웃 */}
            <AppLayout>
              {/* 라우팅 */}
              <LanguageRoutes />
            </AppLayout>
            {/* 성능 모니터링 (개발 환경에서만) */}
            <PerformanceMonitor />
          </AppInitializer>
        </UIStateProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  );
};

export default App;
