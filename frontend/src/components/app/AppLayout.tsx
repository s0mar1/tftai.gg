import React, { Suspense } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import PerfectedChampionTooltip from '../common/PerfectedChampionTooltip';
import PerformanceDashboard from '../common/PerformanceDashboard';
import PageLoadingFallback from '../common/PageLoadingFallback.jsx';
import ErrorBoundary from '../common/ErrorBoundary';
import { useTFTData } from '../../context/TFTDataContext';
import { usePerformanceDashboard } from '../../context/UIStateContext';

// AppLayout Props 타입 정의
interface AppLayoutProps {
  children: React.ReactNode;
}

// 메인 레이아웃 컴포넌트
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  // TFT 데이터에서 툴팁 정보 가져오기
  const { tooltip } = useTFTData();
  
  // Performance Dashboard 상태 가져오기
  const { showPerformanceDashboard } = usePerformanceDashboard();

  return (
    <div className="bg-background-base dark:bg-dark-background-base min-h-screen flex flex-col">
      {/* Header */}
      <ErrorBoundary level="component">
        <Header />
      </ErrorBoundary>
      
      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full">
        <ErrorBoundary level="page">
          <Suspense fallback={<PageLoadingFallback />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
      
      {/* Floating Elements */}
      
      {/* Champion Tooltip - 조건부 렌더링 */}
      {tooltip.visible && (
        <Suspense fallback={null}>
          <PerfectedChampionTooltip 
            champion={tooltip.data && 'cost' in tooltip.data ? tooltip.data : null} 
            position={tooltip.position} 
          />
        </Suspense>
      )}
      
      {/* Performance Dashboard - 조건부 렌더링 */}
      <Suspense fallback={null}>
        <PerformanceDashboard isVisible={showPerformanceDashboard} />
      </Suspense>
      
      {/* Footer */}
      <ErrorBoundary level="component">
        <Footer />
      </ErrorBoundary>
    </div>
  );
};

export default AppLayout;