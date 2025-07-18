// frontend/src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// ReactQueryDevtools는 개발 모드에서만 로드
import App from './App.tsx'
import { TFTDataProvider } from './context/TFTDataContext.tsx'; 
import TFTDataErrorBoundary from './components/common/TFTDataErrorBoundary';
import './i18n.ts'; // i18next 초기화
// import './index.css' // <-- 이 라인을 주석 처리하거나 제거합니다.

import './styles/main.css'; // <-- 이 라인을 추가하여 main.css를 임포트합니다.

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

// 조건부로 ReactQueryDevtools 로드
const DevTools = import.meta.env.MODE === 'development' ? 
  React.lazy(() => import('@tanstack/react-query-devtools').then(d => ({ default: d.ReactQueryDevtools }))) : 
  () => null;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TFTDataErrorBoundary>
        <TFTDataProvider>
         <BrowserRouter>
          <App />
         </BrowserRouter>
        </TFTDataProvider>
      </TFTDataErrorBoundary>
      {import.meta.env.MODE === 'development' && (
        <React.Suspense fallback={null}>
          <div className="fixed-overlay">
            <DevTools initialIsOpen={false} />
          </div>
        </React.Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>,
)