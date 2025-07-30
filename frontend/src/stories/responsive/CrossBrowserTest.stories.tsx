import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';

import Header from '../../components/layout/Header';
import { TFTDataProvider } from '../../context/TFTDataContext';
import { DarkModeProvider } from '../../context/DarkModeContext';

// 테스트용 쿼리 클라이언트
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Storybook용 래퍼 컴포넌트
const StoryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <DarkModeProvider>
          <TFTDataProvider>
            <div className="min-h-screen bg-background-base dark:bg-dark-background-base">
              {children}
            </div>
          </TFTDataProvider>
        </DarkModeProvider>
      </BrowserRouter>
    </I18nextProvider>
  </QueryClientProvider>
);

const meta: Meta = {
  title: 'Responsive/Cross-Browser Tests',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
크로스 브라우저 호환성 및 CSS 기능 테스트입니다.

## 🌐 테스트 대상 브라우저
- **Chrome/Chromium**: Webkit 기반
- **Firefox**: Gecko 엔진  
- **Safari**: Webkit (macOS/iOS)
- **Edge**: Chromium 기반 (신버전)

## 🎯 테스트 항목
- CSS Grid/Flexbox 호환성
- CSS 변수 (Custom Properties) 지원
- Transition/Animation 동작
- 다크모드 전환
- 폰트 렌더링
- 그라데이션 및 그림자 효과

## 🔧 테스트 방법
1. 각 브라우저에서 동일한 스토리 확인
2. 개발자 도구로 CSS 속성 검증
3. 성능 탭에서 렌더링 성능 확인
4. 콘솔에서 JavaScript 오류 체크
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj;

// CSS 기능 호환성 테스트
export const CSSCompatibilityTest: Story = {
  name: '🎨 CSS 호환성 테스트',
  render: () => {
    const [currentTest, setCurrentTest] = useState('grid');
    
    const tests = [
      { id: 'grid', name: 'CSS Grid', status: 'supported' },
      { id: 'flexbox', name: 'Flexbox', status: 'supported' },
      { id: 'variables', name: 'CSS 변수', status: 'supported' },
      { id: 'transitions', name: 'Transitions', status: 'supported' },
      { id: 'gradients', name: 'Gradients', status: 'supported' },
      { id: 'shadows', name: 'Box Shadow', status: 'supported' },
      { id: 'backdrop', name: 'Backdrop Filter', status: 'partial' },
    ];

    return (
      <StoryWrapper>
        <div className="p-8 min-h-screen">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-8">
              CSS 기능 호환성 테스트
            </h1>
            
            {/* 테스트 선택 탭 */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {tests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => setCurrentTest(test.id)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentTest === test.id
                      ? 'bg-brand-mint text-white shadow-lg'
                      : 'bg-background-card dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100'
                  }`}
                >
                  {test.name}
                  <span className={`ml-2 text-xs ${
                    test.status === 'supported' ? 'text-green-500' : 
                    test.status === 'partial' ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {test.status === 'supported' ? '✅' : 
                     test.status === 'partial' ? '⚠️' : '❌'}
                  </span>
                </button>
              ))}
            </div>

            {/* CSS Grid 테스트 */}
            {currentTest === 'grid' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
                  CSS Grid 레이아웃 테스트
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-br from-brand-mint to-blue-500 rounded-lg p-6 text-white text-center shadow-lg transform hover:scale-105 transition-transform duration-200"
                    >
                      <div className="text-2xl font-bold mb-2">Grid {i + 1}</div>
                      <div className="text-sm opacity-80">반응형 그리드</div>
                    </div>
                  ))}
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>테스트 포인트:</strong> grid-template-columns, grid-gap, 반응형 breakpoint 동작
                  </p>
                </div>
              </div>
            )}

            {/* Flexbox 테스트 */}
            {currentTest === 'flexbox' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
                  Flexbox 레이아웃 테스트
                </h2>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 justify-center items-center p-6 bg-background-card dark:bg-dark-background-card rounded-lg">
                    {['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around'].map((justify) => (
                      <div key={justify} className={`flex ${justify} w-full p-4 bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded gap-2`}>
                        <div className="w-12 h-12 bg-brand-mint rounded"></div>
                        <div className="w-12 h-12 bg-blue-500 rounded"></div>
                        <div className="w-12 h-12 bg-purple-500 rounded"></div>
                        <span className="text-xs text-text-secondary dark:text-dark-text-secondary ml-auto">{justify}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>테스트 포인트:</strong> justify-content, align-items, flex-wrap, flex-grow 동작
                  </p>
                </div>
              </div>
            )}

            {/* CSS 변수 테스트 */}
            {currentTest === 'variables' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
                  CSS 변수 (Custom Properties) 테스트
                </h2>
                <div 
                  className="p-8 rounded-lg"
                  style={{
                    '--test-color': '#3ED2B9',
                    '--test-size': '2rem',
                    '--test-shadow': '0 10px 25px rgba(62, 210, 185, 0.3)',
                    background: 'var(--test-color)',
                    fontSize: 'var(--test-size)',
                    boxShadow: 'var(--test-shadow)',
                    color: 'white',
                    textAlign: 'center'
                  } as React.CSSProperties}
                >
                  CSS 변수를 사용한 동적 스타일링
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { prop: '--brand-mint', value: '#3ED2B9', desc: '브랜드 컬러' },
                    { prop: '--text-primary', value: '#2E2E2E', desc: '기본 텍스트' },
                    { prop: '--background-card', value: '#FFFFFF', desc: '카드 배경' }
                  ].map((item) => (
                    <div key={item.prop} className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg">
                      <code className="text-sm bg-tft-gray-100 dark:bg-dark-tft-gray-100 px-2 py-1 rounded">
                        {item.prop}
                      </code>
                      <div className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
                        {item.desc}
                      </div>
                      <div 
                        className="mt-2 w-full h-8 rounded"
                        style={{ backgroundColor: item.value }}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>테스트 포인트:</strong> var() 함수, CSS 변수 상속, 다크모드 변수 전환
                  </p>
                </div>
              </div>
            )}

            {/* Transitions 테스트 */}
            {currentTest === 'transitions' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
                  CSS Transitions & Animations 테스트
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Hover Effects</h3>
                    <div className="space-y-3">
                      <button className="w-full p-3 bg-brand-mint text-white rounded-lg transition-all duration-300 hover:bg-brand-mint/80 hover:shadow-lg hover:scale-105">
                        Hover me
                      </button>
                      <div className="w-full h-12 bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded-lg transition-colors duration-500 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500"></div>
                    </div>
                  </div>
                  
                  <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Loading Animations</h3>
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-4 h-4 bg-brand-mint rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          ></div>
                        ))}
                      </div>
                      <div className="w-full h-2 bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-mint to-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Transform Effects</h3>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-red-500 rounded-lg transition-transform duration-700 hover:rotate-180 hover:scale-125"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>테스트 포인트:</strong> transition-property, animation-duration, transform, @keyframes
                  </p>
                </div>
              </div>
            )}

            {/* 기타 테스트들 */}
            {currentTest === 'gradients' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
                  그라데이션 효과 테스트
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    'bg-gradient-to-r from-purple-500 to-pink-500',
                    'bg-gradient-to-br from-brand-mint to-blue-500',
                    'bg-gradient-to-t from-yellow-400 to-red-500',
                    'bg-gradient-to-l from-green-400 to-blue-500',
                    'bg-gradient-to-bl from-pink-500 to-purple-600',
                    'bg-gradient-to-tr from-indigo-500 to-purple-500'
                  ].map((gradient, i) => (
                    <div key={i} className={`${gradient} h-32 rounded-lg flex items-center justify-center text-white font-bold shadow-lg`}>
                      Gradient {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentTest === 'shadows' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
                  그림자 효과 테스트
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { name: 'Small Shadow', class: 'shadow-sm' },
                    { name: 'Medium Shadow', class: 'shadow-md' },
                    { name: 'Large Shadow', class: 'shadow-lg' },
                    { name: 'Extra Large', class: 'shadow-xl' },
                    { name: '2XL Shadow', class: 'shadow-2xl' },
                    { name: 'Custom Shadow', class: '', style: { boxShadow: '0 25px 50px -12px rgba(62, 210, 185, 0.5)' } }
                  ].map((shadow, i) => (
                    <div 
                      key={i} 
                      className={`bg-background-card dark:bg-dark-background-card p-6 rounded-lg text-center ${shadow.class}`}
                      style={shadow.style}
                    >
                      <div className="font-semibold text-text-primary dark:text-dark-text-primary mb-2">
                        {shadow.name}
                      </div>
                      <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                        {shadow.class || 'Custom CSS'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentTest === 'backdrop' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
                  Backdrop Filter 테스트
                </h2>
                <div className="relative">
                  <div className="h-64 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"></div>
                  <div 
                    className="absolute inset-4 bg-white/20 rounded-lg p-6 text-white"
                    style={{ backdropFilter: 'blur(10px)' }}
                  >
                    <h3 className="text-xl font-bold mb-2">Backdrop Blur Effect</h3>
                    <p className="text-sm opacity-90">
                      이 효과는 Safari와 최신 브라우저에서 지원됩니다. 
                      오래된 브라우저에서는 대체 스타일이 적용됩니다.
                    </p>
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>주의:</strong> backdrop-filter는 Firefox에서 부분 지원, IE에서 미지원
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </StoryWrapper>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '다양한 CSS 기능들의 브라우저 호환성을 테스트하고 시각적으로 확인할 수 있습니다.'
      }
    }
  }
};

// 브라우저별 렌더링 차이 테스트
export const BrowserRenderingTest: Story = {
  name: '🌐 브라우저 렌더링 테스트',
  render: () => {
    const [userAgent, setUserAgent] = useState('');
    
    useEffect(() => {
      setUserAgent(navigator.userAgent);
    }, []);

    const getBrowserInfo = () => {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome') && !ua.includes('Edg')) return { name: 'Chrome', icon: '🔵' };
      if (ua.includes('Firefox')) return { name: 'Firefox', icon: '🟠' };
      if (ua.includes('Safari') && !ua.includes('Chrome')) return { name: 'Safari', icon: '🔵' };
      if (ua.includes('Edg')) return { name: 'Edge', icon: '🟦' };
      return { name: 'Unknown', icon: '❓' };
    };

    const browser = getBrowserInfo();

    return (
      <StoryWrapper>
        <Header />
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary mb-4">
                브라우저 렌더링 테스트
              </h1>
              <div className="text-lg text-text-secondary dark:text-dark-text-secondary">
                현재 브라우저: {browser.icon} <strong>{browser.name}</strong>
              </div>
            </div>

            {/* 브라우저 정보 */}
            <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-4">
                브라우저 환경 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>User Agent:</strong>
                  <div className="mt-1 p-2 bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded text-xs break-all">
                    {userAgent}
                  </div>
                </div>
                <div className="space-y-2">
                  <div><strong>화면 해상도:</strong> {window.screen.width} × {window.screen.height}</div>
                  <div><strong>뷰포트 크기:</strong> {window.innerWidth} × {window.innerHeight}</div>
                  <div><strong>디바이스 픽셀 비율:</strong> {window.devicePixelRatio}</div>
                  <div><strong>컬러 스킴:</strong> {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}</div>
                </div>
              </div>
            </div>

            {/* Header 렌더링 테스트 */}
            <div className="space-y-8">
              <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
                  Header 렌더링 품질
                </h3>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
                  다양한 브라우저에서 헤더의 렌더링 품질과 레이아웃 일관성을 확인하세요.
                </div>
                <div className="border-2 border-dashed border-border-light dark:border-dark-border-light rounded-lg p-4">
                  <div className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2">
                    현재 렌더링된 헤더 (위 참조)
                  </div>
                </div>
              </div>

              {/* 폰트 렌더링 테스트 */}
              <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
                  폰트 렌더링 테스트
                </h3>
                <div className="space-y-4">
                  {[
                    { size: 'text-xs', label: 'Extra Small (12px)' },
                    { size: 'text-sm', label: 'Small (14px)' },
                    { size: 'text-base', label: 'Base (16px)' },
                    { size: 'text-lg', label: 'Large (18px)' },
                    { size: 'text-xl', label: 'Extra Large (20px)' },
                    { size: 'text-2xl', label: '2XL (24px)' },
                    { size: 'text-3xl', label: '3XL (30px)' }
                  ].map((font) => (
                    <div key={font.size} className="flex items-center gap-4">
                      <div className={`${font.size} font-medium text-text-primary dark:text-dark-text-primary flex-1`}>
                        TFT Meta Analyzer - 티에프티 메타 분석기 (가나다라 123 ABC)
                      </div>
                      <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
                        {font.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 성능 및 호환성 체크리스트 */}
              <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
                  브라우저별 체크리스트
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-600 mb-3">✅ 확인 사항</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                        CSS Grid 레이아웃 정상 작동
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                        Flexbox 정렬 정상
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                        CSS 변수 적용됨
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                        트랜지션 효과 작동
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                        폰트 로딩 완료
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-600 mb-3">⚠️ 주의 사항</h4>
                    <div className="space-y-2 text-sm text-text-secondary dark:text-dark-text-secondary">
                      <div>• Firefox: backdrop-filter 부분 지원</div>
                      <div>• Safari: 일부 Grid 속성 차이</div>
                      <div>• Edge Legacy: CSS 변수 미지원</div>
                      <div>• Chrome: 렌더링이 가장 일관됨</div>
                      <div>• 모바일 Safari: 뷰포트 단위 이슈</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StoryWrapper>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '현재 브라우저에서의 렌더링 품질과 호환성을 실시간으로 확인할 수 있습니다.'
      }
    }
  }
};