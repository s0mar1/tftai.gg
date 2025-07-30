// frontend/src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './graphql/client';
import { cacheAnalyzer } from './utils/cacheAnalyzer';
// ReactQueryDevtools는 개발 모드에서만 로드
import App from './App.tsx'
import { AppContextProvider } from './context/index.tsx'; 
import TFTDataErrorBoundary from './components/common/TFTDataErrorBoundary';
import ErrorBoundary from './components/common/ErrorBoundary';
import { setupGlobalErrorHandlers } from './utils/errorHandler';
import './utils/performanceMetrics'; // 성능 측정 도구 초기화
import './utils/apolloOptimizations'; // Apollo Client 최적화 도구 초기화
import './utils/devTools'; // 개발자 도구 초기화 (개발 환경에서만)
import './i18n.ts'; // i18next 초기화
// import './index.css' // <-- 이 라인을 주석 처리하거나 제거합니다.

import './styles/main.css'; // <-- 이 라인을 추가하여 main.css를 임포트합니다.

// 전역 에러 핸들러 설정
setupGlobalErrorHandlers();

// QueryClient 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5분
      cacheTime: 10 * 60 * 1000, // 10분
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// 캐시 분석기 설정 (기존 클라이언트 동작에 영향 없음)
cacheAnalyzer.registerApolloClient(apolloClient);
cacheAnalyzer.registerReactQueryClient(queryClient);

// 개발 환경에서만 캐시 모니터링 시작
if (import.meta.env.MODE === 'development') {
  cacheAnalyzer.startMonitoring(60000); // 1분마다 모니터링
}

// 조건부로 ReactQueryDevtools 로드
const DevTools = import.meta.env.MODE === 'development' ? 
  React.lazy(() => import('@tanstack/react-query-devtools').then(d => ({ default: d.ReactQueryDevtools }))) : 
  () => null;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary level="app">
      <ApolloProvider client={apolloClient}>
        <QueryClientProvider client={queryClient}>
          <TFTDataErrorBoundary>
            <AppContextProvider>
             <BrowserRouter
               future={{
                 v7_relativeSplatPath: true,
                 v7_startTransition: true
               }}
             >
              <App />
             </BrowserRouter>
            </AppContextProvider>
          </TFTDataErrorBoundary>
          {import.meta.env.MODE === 'development' && (
            <React.Suspense fallback={null}>
              <div className="fixed-overlay">
                <DevTools initialIsOpen={false} />
              </div>
            </React.Suspense>
          )}
        </QueryClientProvider>
      </ApolloProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)