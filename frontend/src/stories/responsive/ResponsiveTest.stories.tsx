import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';

import Header from '../../components/layout/Header';
import HomePage from '../../pages/HomePage';
import MetaTrendCard from '../../components/MetaTrendCard';
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

// 테스트용 덱 데이터
const mockDeckData = {
  deckKey: 'test-deck-1',
  tierRank: 'S',
  totalGames: 1250,
  top4Count: 875,
  winCount: 188,
  averagePlacement: 3.8,
  carryChampionName: { ko: '아펠리오스', en: 'Aphelios' },
  mainTraitName: { ko: '저격수', en: 'Sniper' },
  coreUnits: [
    {
      name: { ko: '아펠리오스', en: 'Aphelios' },
      image_url: '/images/champions/tft13_aphelios.png',
      apiName: 'TFT13_Aphelios',
      tier: 3,
      cost: 4,
      items: []
    },
    {
      name: { ko: '진', en: 'Jhin' },
      image_url: '/images/champions/tft13_jhin.png',
      apiName: 'TFT13_Jhin',
      tier: 2,
      cost: 4,
      items: []
    },
    {
      name: { ko: '코그모', en: 'KogMaw' },
      image_url: '/images/champions/tft13_kogmaw.png',
      apiName: 'TFT13_KogMaw',
      tier: 1,
      cost: 2,
      items: []
    }
  ]
};

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
  title: 'Responsive/Viewport Tests',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
PC 환경 최적화를 위한 반응형 테스트 스토리입니다.

## 🖥️ 테스트 대상 해상도
- **1024x768**: 작은 데스크톱
- **1280x720**: HD 데스크톱  
- **1366x768**: 노트북 표준
- **1536x864**: 대형 노트북
- **1920x1080**: Full HD 모니터
- **2560x1440**: QHD 모니터
- **3440x1440**: 울트라와이드 21:9

## 🎯 테스트 방법
1. Storybook 우측 상단 **도구 모음**에서 뷰포트 아이콘 클릭
2. 다양한 해상도로 전환하며 레이아웃 확인
3. 브라우저 창 크기를 수동으로 조정하여 동적 반응형 테스트
4. 다크/라이트 모드 전환하여 테마별 확인

## ✅ 확인 사항
- 모든 요소가 화면에 적절히 배치되는가?
- 텍스트가 읽기 어렵거나 잘리지 않는가?
- 네비게이션이 모든 크기에서 사용 가능한가?
- 카드/컴포넌트 간격이 적절한가?
        `
      }
    },
    viewport: {
      viewports: {
        smallDesktop: {
          name: '작은 데스크톱 (1024x768)',
          styles: { width: '1024px', height: '768px' },
        },
        hdDesktop: {
          name: 'HD 데스크톱 (1280x720)',
          styles: { width: '1280px', height: '720px' },
        },
        laptop: {
          name: '노트북 표준 (1366x768)',
          styles: { width: '1366px', height: '768px' },
        },
        largeLaptop: {
          name: '대형 노트북 (1536x864)',
          styles: { width: '1536px', height: '864px' },
        },
        fullHD: {
          name: 'Full HD (1920x1080)',
          styles: { width: '1920px', height: '1080px' },
        },
        qhd: {
          name: 'QHD (2560x1440)',
          styles: { width: '2560px', height: '1440px' },
        },
        ultrawide: {
          name: '울트라와이드 (3440x1440)',
          styles: { width: '3440px', height: '1440px' },
        },
      },
    },
  }
};

export default meta;
type Story = StoryObj;

// Header 반응형 테스트
export const HeaderResponsive: Story = {
  name: '🧭 Header 반응형 테스트',
  render: () => (
    <StoryWrapper>
      <Header />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-4">
              Header 반응형 테스트
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg">
                <h3 className="font-semibold mb-2">✅ 확인 사항</h3>
                <ul className="space-y-1 text-text-secondary dark:text-dark-text-secondary">
                  <li>• 로고와 텍스트 가독성</li>
                  <li>• 검색바 반응형 동작</li>
                  <li>• 네비게이션 메뉴 표시</li>
                  <li>• 모바일 햄버거 메뉴</li>
                </ul>
              </div>
              <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg">
                <h3 className="font-semibold mb-2">🖥️ 큰 화면 (1920px+)</h3>
                <ul className="space-y-1 text-text-secondary dark:text-dark-text-secondary">
                  <li>• 전체 네비게이션 표시</li>
                  <li>• 검색바 최대 너비</li>
                  <li>• 여유로운 간격</li>
                </ul>
              </div>
              <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg">
                <h3 className="font-semibold mb-2">📱 작은 화면 (1024px-)</h3>
                <ul className="space-y-1 text-text-secondary dark:text-dark-text-secondary">
                  <li>• 햄버거 메뉴 활성화</li>
                  <li>• 검색바 하단 이동</li>
                  <li>• 로고 텍스트 단축</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StoryWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Header 컴포넌트의 다양한 화면 크기에서의 반응형 동작을 테스트합니다.'
      }
    }
  }
};

// HomePage 반응형 테스트
export const HomePageResponsive: Story = {
  name: '🏠 HomePage 반응형 테스트',
  render: () => (
    <StoryWrapper>
      <div className="bg-background-base dark:bg-dark-background-base">
        <Header />
        <HomePage />
      </div>
    </StoryWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: 'HomePage의 Hero 섹션과 트렌드 카드 그리드가 다양한 화면 크기에서 어떻게 반응하는지 테스트합니다.'
      }
    }
  }
};

// MetaTrendCard 반응형 테스트
export const MetaTrendCardResponsive: Story = {
  name: '📊 MetaTrendCard 반응형 테스트',
  render: () => (
    <StoryWrapper>
      <div className="p-8 bg-background-base dark:bg-dark-background-base min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-8">
            메타 트렌드 카드 반응형 테스트
          </h2>
          
          {/* 단일 카드 테스트 */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-4">
              단일 카드 테스트
            </h3>
            <div className="max-w-sm mx-auto">
              <MetaTrendCard deck={mockDeckData} />
            </div>
          </div>
          
          {/* 그리드 레이아웃 테스트 */}
          <div>
            <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-4">
              그리드 레이아웃 테스트
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
              {Array.from({ length: 8 }, (_, i) => (
                <MetaTrendCard 
                  key={i} 
                  deck={{
                    ...mockDeckData,
                    deckKey: `test-deck-${i + 1}`,
                    tierRank: ['S', 'A', 'B', 'C'][i % 4]
                  }} 
                />
              ))}
            </div>
          </div>
          
          {/* 테스트 가이드 */}
          <div className="mt-12 p-6 bg-brand-mint/10 rounded-lg">
            <h3 className="text-lg font-semibold text-brand-mint mb-4">
              📋 테스트 가이드
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">작은 화면 (768px 미만)</h4>
                <ul className="space-y-1 text-text-secondary dark:text-dark-text-secondary">
                  <li>• 1열 그리드 (세로 스택)</li>
                  <li>• 카드 간격: 1.5rem</li>
                  <li>• 최대 너비 활용</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">큰 화면 (768px 이상)</h4>
                <ul className="space-y-1 text-text-secondary dark:text-dark-text-secondary">
                  <li>• 3열 고정 그리드</li>
                  <li>• 카드 간격: 2rem</li>
                  <li>• 최대 너비: 5xl (1024px)</li>
                  <li>• 중앙 정렬로 집중도 향상</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StoryWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: 'MetaTrendCard 컴포넌트의 그리드 레이아웃과 개별 카드 반응형 동작을 테스트합니다.'
      }
    }
  }
};

// DeckCard 반응형 테스트 (TierListPage에서 사용되는 컴포넌트)
export const DeckCardResponsive: Story = {
  name: '🃏 DeckCard 반응형 테스트',
  render: () => {
    // DeckCard 컴포넌트를 모방한 테스트 컴포넌트
    const TestDeckCard = () => (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 overflow-hidden" style={{ borderLeftColor: '#F87171' }}>
        {/* 모바일 레이아웃 (md 미만) */}
        <div className="block md:hidden">
          <div className="p-4 space-y-4">
            {/* 상단: 티어 + 제목 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md text-white text-lg sm:text-2xl font-bold flex-shrink-0" style={{ backgroundColor: '#F87171' }}>
                S
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 truncate">
                  저격수 아펠리오스
                </h3>
              </div>
            </div>

            {/* 특성 표시 */}
            <div className="flex flex-wrap gap-1.5">
              {['저격수', '반란군', '마법공학'].map((trait, i) => (
                <div key={i} className="px-2 py-1 bg-brand-mint text-white text-xs rounded">
                  {trait}
                </div>
              ))}
            </div>

            {/* 유닛 표시 */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="w-12 h-12 bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded border-2 border-blue-500"></div>
              ))}
            </div>

            {/* 통계 (2x2 그리드) */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <p className="font-bold text-sm text-brand-mint">3.8</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">평균 순위</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <p className="font-bold text-sm text-brand-mint">70.0%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Top 4</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <p className="font-bold text-sm text-brand-mint">15.0%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">승률</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100">1250</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">게임</p>
              </div>
            </div>
          </div>
        </div>

        {/* 데스크톱 레이아웃 (md 이상) */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6 p-4">
          {/* 좌측: 티어 + 제목 (반응형 너비) */}
          <div className="flex items-center gap-3 lg:gap-4 flex-shrink-0 w-48 lg:w-64 xl:w-72">
            <div className="flex items-center justify-center w-10 h-10 rounded-md text-white text-2xl font-bold" style={{ backgroundColor: '#F87171' }}>
              S
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base lg:text-lg text-gray-800 dark:text-gray-100">
                <div className="truncate">저격수</div>
                <div className="truncate text-sm lg:text-base font-medium text-gray-600 dark:text-gray-300">
                  아펠리오스
                </div>
              </h3>
            </div>
          </div>

          {/* 중앙: 특성 + 유닛 (유연한 너비) */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* 특성 표시 */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {['저격수', '반란군', '마법공학', '급습'].map((trait, i) => (
                <div key={i} className="px-2 py-1 bg-brand-mint text-white text-xs rounded">
                  {trait}
                </div>
              ))}
            </div>
            
            {/* 유닛 표시 */}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="w-12 h-12 bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded border-2 border-blue-500"></div>
              ))}
            </div>
          </div>

          {/* 우측: 통계 (반응형 그리드) */}
          <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 w-40 lg:w-72 xl:w-80 text-center">
            <div>
              <p className="font-bold text-sm lg:text-base text-brand-mint">3.8</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">평균 순위</p>
            </div>
            <div>
              <p className="font-bold text-sm lg:text-base text-brand-mint">70.0%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Top 4</p>
            </div>
            <div>
              <p className="font-bold text-sm lg:text-base text-brand-mint">15.0%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">승률</p>
            </div>
            <div>
              <p className="font-bold text-sm lg:text-base text-gray-800 dark:text-gray-100">1250</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">게임</p>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <StoryWrapper>
        <div className="p-8 bg-background-base dark:bg-dark-background-base min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-8">
              덱 카드 반응형 테스트
            </h2>
            
            <div className="space-y-6">
              {/* 단일 카드들 */}
              {['S', 'A', 'B', 'C'].map((tier, i) => (
                <TestDeckCard key={tier} />
              ))}
            </div>
            
            {/* 테스트 가이드 */}
            <div className="mt-12 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 mb-4">
                🎯 DeckCard 반응형 테스트 포인트
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                    모바일 레이아웃 (768px 미만)
                  </h4>
                  <ul className="space-y-1 text-yellow-600 dark:text-yellow-200">
                    <li>• 세로형 스택 레이아웃</li>
                    <li>• 2x2 통계 그리드</li>
                    <li>• 특성 배지 줄바꿈</li>
                    <li>• 유닛 중앙 정렬</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                    데스크톱 레이아웃 (768px 이상)
                  </h4>
                  <ul className="space-y-1 text-yellow-600 dark:text-yellow-200">
                    <li>• 가로형 플렉스 레이아웃</li>
                    <li>• 1x4 또는 2x2 통계 그리드</li>
                    <li>• 유연한 중앙 영역</li>
                    <li>• 고정 너비 제거</li>
                  </ul>
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
        story: 'TierListPage에서 사용되는 DeckCard 컴포넌트의 모바일/데스크톱 반응형 레이아웃을 테스트합니다.'
      }
    }
  }
};

// 전체 레이아웃 통합 테스트
export const FullLayoutResponsive: Story = {
  name: '🔄 전체 레이아웃 통합 테스트',
  render: () => (
    <StoryWrapper>
      <div className="bg-background-base dark:bg-dark-background-base min-h-screen">
        <Header />
        <main className="pt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 페이지 제목 */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-text-primary dark:text-dark-text-primary mb-4">
                전체 레이아웃 반응형 테스트
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-text-secondary dark:text-dark-text-secondary max-w-2xl mx-auto">
                모든 주요 컴포넌트가 함께 작동할 때의 반응형 동작을 확인합니다.
              </p>
            </div>
            
            {/* 메타 트렌드 카드 섹션 */}
            <section className="mb-12">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-6">
                실시간 메타 트렌드
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
                {Array.from({ length: 3 }, (_, i) => (
                  <MetaTrendCard 
                    key={i} 
                    deck={{
                      ...mockDeckData,
                      deckKey: `trend-${i + 1}`,
                      tierRank: ['S', 'A', 'B'][i]
                    }} 
                  />
                ))}
              </div>
            </section>
            
            {/* 브레이드크럼 및 네비게이션 테스트 */}
            <section className="mb-8">
              <nav className="flex flex-wrap items-center gap-2 text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
                <a href="#" className="hover:text-brand-mint">홈</a>
                <span>/</span>
                <a href="#" className="hover:text-brand-mint">티어리스트</a>
                <span>/</span>
                <span className="text-text-primary dark:text-dark-text-primary">현재 페이지</span>
              </nav>
            </section>
            
            {/* 반응형 테스트 상태표 */}
            <section className="mb-12">
              <div className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
                  반응형 상태 체크리스트
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[
                    { name: '헤더 네비게이션', status: '✅' },
                    { name: '검색바 반응형', status: '✅' },
                    { name: '카드 그리드', status: '✅' },
                    { name: '텍스트 크기 조정', status: '✅' },
                    { name: '간격 최적화', status: '✅' },
                    { name: '다크모드 지원', status: '✅' },
                    { name: '터치 친화적', status: '✅' },
                    { name: '크로스 브라우저', status: '🔄' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-lg">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </StoryWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: '헤더, 메인 콘텐츠, 카드 그리드 등 모든 요소가 함께 작동할 때의 전체적인 반응형 동작을 테스트합니다.'
      }
    }
  }
};