import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';

// 새로운 고도화된 컴포넌트들
import EnhancedResponsiveContainer, { 
  EnhancedResponsiveGrid 
} from '../../components/common/EnhancedResponsiveContainer';
import OptimizedImage from '../../components/common/OptimizedImage';
import AccessibleNavigation, { 
  SkipLink, 
  FocusTrap 
} from '../../components/common/AccessibleNavigation';

// 기존 컴포넌트들
import Header from '../../components/layout/Header';
import MetaTrendCard from '../../components/MetaTrendCard';
import { TFTDataProvider } from '../../context/TFTDataContext';
import { DarkModeProvider } from '../../context/DarkModeContext';

// 아이콘 컴포넌트들 (예시)
const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

const CogIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

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
  deckKey: 'enhanced-test-deck',
  tierRank: 'S',
  totalGames: 2500,
  top4Count: 1750,
  winCount: 375,
  averagePlacement: 3.2,
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
    }
  ]
};

// 네비게이션 아이템 데이터
const navigationItems = [
  {
    id: 'home',
    label: '홈',
    href: '/',
    icon: HomeIcon,
    shortcut: 'h',
    ariaLabel: '홈페이지로 이동'
  },
  {
    id: 'tierlist',
    label: '티어리스트',
    href: '/tierlist',
    icon: ChartIcon,
    shortcut: 't',
    ariaLabel: '티어리스트 페이지로 이동'
  },
  {
    id: 'guides',
    label: '가이드',
    href: '/guides',
    icon: CogIcon,
    shortcut: 'g',
    ariaLabel: '가이드 페이지로 이동'
  },
  {
    id: 'ranking',
    label: '랭킹',
    href: '/ranking',
    shortcut: 'r',
    ariaLabel: '랭킹 페이지로 이동'
  },
  {
    id: 'disabled',
    label: '비활성화됨',
    href: '/disabled',
    shortcut: 'd',
    disabled: true,
    ariaLabel: '비활성화된 메뉴'
  }
];

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
  title: 'Enhanced Responsive/UI UX Optimization',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## 🚀 고도화된 반응형 UI/UX 시스템

이 스토리는 새롭게 개발된 고도화 컴포넌트들의 종합적인 테스트 환경입니다.

### 🎯 새로운 기능들

#### 1. **EnhancedResponsiveContainer**
- 뷰포트 정보 자동 감지
- Safe Area 대응 (iOS 노치/펀치홀)
- 터치 디바이스 최적화
- 네트워크 상태 적응
- GPU 가속 활성화 옵션

#### 2. **OptimizedImage**
- WebP/AVIF 자동 변환
- 지연 로딩 최적화
- 고해상도 디스플레이 대응
- 블러 해시 지원
- 네트워크 상태별 품질 조정

#### 3. **AccessibleNavigation**
- 키보드 네비게이션 완벽 지원
- 단축키 시스템
- 스크린 리더 최적화
- 포커스 트랩 기능
- 터치 디바이스 최적화

### 🧪 테스트 시나리오
1. **다양한 뷰포트 크기에서 테스트**
2. **키보드만으로 네비게이션 테스트**
3. **다크/라이트 모드 전환 테스트**
4. **터치 디바이스 시뮬레이션**
5. **네트워크 속도 시뮬레이션**
        `
      }
    },
    viewport: {
      viewports: {
        mobile: { name: '모바일 (375px)', styles: { width: '375px', height: '667px' } },
        tablet: { name: '태블릿 (768px)', styles: { width: '768px', height: '1024px' } },
        laptop: { name: '노트북 (1366px)', styles: { width: '1366px', height: '768px' } },
        desktop: { name: '데스크톱 (1920px)', styles: { width: '1920px', height: '1080px' } },
        ultrawide: { name: '울트라와이드 (3440px)', styles: { width: '3440px', height: '1440px' } },
      },
    },
  }
};

export default meta;
type Story = StoryObj;

// Enhanced Container 테스트
export const EnhancedContainerTest: Story = {
  name: '🔧 Enhanced Container 테스트',
  render: () => (
    <StoryWrapper>
      <SkipLink href="#main-content">메인 콘텐츠로 건너뛰기</SkipLink>
      
      <EnhancedResponsiveContainer
        maxWidth="7xl"
        padding="responsive"
        enableSafeArea={true}
        optimizeForTouch={true}
        reduceMotion={true}
        adaptToNetwork={true}
        className="py-8"
        ariaLabel="메인 콘텐츠 영역"
      >
        <div id="main-content">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-8">
            Enhanced Responsive Container
          </h1>
          
          {/* 기능 설명 카드들 */}
          <EnhancedResponsiveGrid
            columns={{ base: 1, sm: 2, lg: 3 }}
            gap={6}
            className="mb-12"
          >
            {[
              {
                title: '🔍 뷰포트 감지',
                description: '디바이스 타입, 해상도, DPI 자동 감지',
                features: ['모바일/태블릿/데스크톱 구분', '고해상도 디스플레이 대응', '화면 방향 감지']
              },
              {
                title: '📱 Safe Area 대응',
                description: 'iOS 노치, 펀치홀 등 안전 영역 자동 처리',
                features: ['env() 변수 활용', '동적 패딩 조정', '다양한 디바이스 지원']
              },
              {
                title: '🎯 터치 최적화',
                description: '터치 디바이스에서 사용성 향상',
                features: ['최소 터치 타겟 크기', '터치 제스처 최적화', '호버 효과 비활성화']
              },
              {
                title: '🌐 네트워크 적응',
                description: '네트워크 상태에 따른 자동 최적화',
                features: ['2G에서 데이터 절약', '효과적 타입 감지', '자동 품질 조정']
              },
              {
                title: '⚡ 성능 최적화',
                description: 'GPU 가속 및 렌더링 최적화',
                features: ['하드웨어 가속', 'will-change 최적화', 'Safari 이슈 수정']
              },
              {
                title: '♿ 접근성',
                description: '모든 사용자를 위한 포용적 디자인',
                features: ['모션 감소 지원', 'ARIA 라벨', '키보드 네비게이션']
              }
            ].map((feature, i) => (
              <div key={i} className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-1">
                  {feature.features.map((feat, j) => (
                    <li key={j} className="text-xs text-text-secondary dark:text-dark-text-secondary flex items-center gap-2">
                      <span className="w-1 h-1 bg-brand-mint rounded-full flex-shrink-0"></span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </EnhancedResponsiveGrid>

          {/* 실시간 뷰포트 정보 */}
          <div className="bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
              📊 실시간 뷰포트 정보
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-brand-mint">너비</div>
                <div className="text-text-secondary dark:text-dark-text-secondary">
                  {typeof window !== 'undefined' ? `${window.innerWidth}px` : '---'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-brand-mint">높이</div>
                <div className="text-text-secondary dark:text-dark-text-secondary">
                  {typeof window !== 'undefined' ? `${window.innerHeight}px` : '---'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-brand-mint">DPR</div>
                <div className="text-text-secondary dark:text-dark-text-secondary">
                  {typeof window !== 'undefined' ? window.devicePixelRatio : '---'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-brand-mint">방향</div>
                <div className="text-text-secondary dark:text-dark-text-secondary">
                  {typeof window !== 'undefined' ? 
                    (window.innerWidth > window.innerHeight ? 'Landscape' : 'Portrait') : '---'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </EnhancedResponsiveContainer>
    </StoryWrapper>
  ),
};

// Optimized Image 테스트
export const OptimizedImageTest: Story = {
  name: '🖼️ Optimized Image 테스트',
  render: () => (
    <StoryWrapper>
      <EnhancedResponsiveContainer maxWidth="6xl" padding="responsive">
        <h1 className="text-3xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-8">
          Optimized Image Component
        </h1>

        <EnhancedResponsiveGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
          {/* 기본 이미지 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              기본 최적화 이미지
            </h3>
            <OptimizedImage
              src="/images/champions/tft13_aphelios.png"
              alt="아펠리오스 챔피언"
              aspectRatio="1/1"
              className="rounded-lg shadow-md"
              loading="eager"
              showLoadingSkeleton={true}
            />
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              WebP/AVIF 자동 변환, 고해상도 대응
            </p>
          </div>

          {/* 지연 로딩 이미지 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              지연 로딩 이미지
            </h3>
            <OptimizedImage
              src="/images/champions/tft13_jhin.png"
              alt="진 챔피언"
              aspectRatio="1/1"
              className="rounded-lg shadow-md"
              loading="lazy"
              showLoadingSkeleton={true}
              enableBlurHash={true}
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjM0VEMkI5IiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4K"
            />
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Intersection Observer 기반 지연 로딩
            </p>
          </div>

          {/* 폴백 이미지 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              폴백 처리 이미지
            </h3>
            <OptimizedImage
              src="/images/nonexistent.png"
              alt="존재하지 않는 이미지"
              aspectRatio="1/1"
              className="rounded-lg shadow-md"
              fallbackSrc="/images/placeholder.png"
              showLoadingSkeleton={true}
            />
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              오류 시 폴백 이미지 자동 표시
            </p>
          </div>
        </EnhancedResponsiveGrid>

        {/* 이미지 최적화 정보 */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
            📈 이미지 최적화 기능
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">형식 최적화</h4>
              <ul className="space-y-1 text-blue-600 dark:text-blue-200">
                <li>• AVIF 우선 지원 (최대 50% 용량 절약)</li>
                <li>• WebP 폴백 (최대 25% 용량 절약)</li>
                <li>• 레거시 브라우저 JPEG/PNG 지원</li>
                <li>• 브라우저별 자동 선택</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">성능 최적화</h4>
              <ul className="space-y-1 text-blue-600 dark:text-blue-200">
                <li>• Intersection Observer 지연 로딩</li>
                <li>• 네트워크 상태별 품질 조정</li>
                <li>• 고해상도 srcSet 자동 생성</li>
                <li>• 블러 해시 placeholder 지원</li>
              </ul>
            </div>
          </div>
        </div>
      </EnhancedResponsiveContainer>
    </StoryWrapper>
  ),
};

// Accessible Navigation 테스트
export const AccessibleNavigationTest: Story = {
  name: '♿ Accessible Navigation 테스트',
  render: () => (
    <StoryWrapper>
      <SkipLink href="#navigation-content">네비게이션으로 건너뛰기</SkipLink>
      
      <EnhancedResponsiveContainer maxWidth="6xl" padding="responsive">
        <div id="navigation-content">
          <h1 className="text-3xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-8">
            Accessible Navigation System
          </h1>

          {/* 수평 네비게이션 */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-4">
              수평 네비게이션 (키보드 테스트 가능)
            </h2>
            <div className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 shadow-md">
              <AccessibleNavigation
                items={navigationItems}
                orientation="horizontal"
                enableKeyboardNavigation={true}
                enableShortcuts={true}
                ariaLabel="수평 메인 네비게이션"
                onItemSelect={(item) => console.log('Selected:', item.label)}
              />
            </div>
            <div className="mt-4 text-sm text-text-secondary dark:text-dark-text-secondary">
              <p><strong>키보드 조작:</strong> 좌우 화살표로 이동, Enter/Space로 선택</p>
              <p><strong>단축키:</strong> Alt + H(홈), Alt + T(티어리스트), Alt + G(가이드), Alt + R(랭킹)</p>
            </div>
          </div>

          {/* 수직 네비게이션 */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-4">
              수직 네비게이션
            </h2>
            <div className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 shadow-md max-w-sm">
              <AccessibleNavigation
                items={navigationItems}
                orientation="vertical"
                enableKeyboardNavigation={true}
                enableShortcuts={true}
                ariaLabel="수직 사이드 네비게이션"
                onItemSelect={(item) => console.log('Selected:', item.label)}
              />
            </div>
            <div className="mt-4 text-sm text-text-secondary dark:text-dark-text-secondary">
              <p><strong>키보드 조작:</strong> 상하 화살표로 이동, Home/End로 처음/끝 이동</p>
            </div>
          </div>

          {/* 포커스 트랩 데모 */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-4">
              포커스 트랩 데모
            </h2>
            <FocusTrap enabled={true}>
              <div className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 shadow-md border-2 border-brand-mint">
                <h3 className="text-lg font-semibold mb-4">포커스가 이 영역에 갇힙니다</h3>
                <div className="space-y-4">
                  <button className="px-4 py-2 bg-brand-mint text-white rounded-lg hover:bg-brand-mint/80 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2">
                    첫 번째 버튼
                  </button>
                  <input 
                    type="text" 
                    placeholder="입력 필드"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint focus:border-transparent"
                  />
                  <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                    마지막 버튼
                  </button>
                </div>
                <p className="mt-4 text-sm text-text-secondary dark:text-dark-text-secondary">
                  Tab 키로 순환, Shift+Tab으로 역순환
                </p>
              </div>
            </FocusTrap>
          </div>

          {/* 접근성 기능 설명 */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
              ♿ 접근성 기능 목록
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">키보드 지원</h4>
                <ul className="space-y-1 text-green-600 dark:text-green-200">
                  <li>• 화살표 키 네비게이션</li>
                  <li>• Home/End 키 지원</li>
                  <li>• Enter/Space 키 활성화</li>
                  <li>• Escape 키 포커스 해제</li>
                  <li>• Tab 순환 및 포커스 트랩</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">스크린 리더</h4>
                <ul className="space-y-1 text-green-600 dark:text-green-200">
                  <li>• ARIA 라벨 및 역할 정의</li>
                  <li>• 상태 변경 안내</li>
                  <li>• 구조적 마크업</li>
                  <li>• Skip Link 제공</li>
                  <li>• 컨텍스트 정보 제공</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </EnhancedResponsiveContainer>
    </StoryWrapper>
  ),
};

// 종합 통합 테스트
export const ComprehensiveIntegrationTest: Story = {
  name: '🎯 종합 통합 테스트',
  render: () => (
    <StoryWrapper>
      <SkipLink href="#main-integration-content">메인 콘텐츠로 건너뛰기</SkipLink>
      
      {/* 헤더 */}
      <Header />
      
      {/* 메인 콘텐츠 */}
      <EnhancedResponsiveContainer
        id="main-integration-content"
        maxWidth="7xl"
        padding="responsive"
        enableSafeArea={true}
        optimizeForTouch={true}
        reduceMotion={true}
        adaptToNetwork={true}
        role="main"
        ariaLabel="메인 콘텐츠 영역"
      >
        {/* 히어로 섹션 */}
        <div className="text-center py-12 sm:py-16 lg:py-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary dark:text-dark-text-primary mb-6">
            고도화된 반응형 UI/UX
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary dark:text-dark-text-secondary max-w-3xl mx-auto mb-8">
            모든 디바이스와 브라우저에서 완벽하게 동작하는 포용적이고 접근 가능한 사용자 경험
          </p>
          
          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-brand-mint text-white rounded-lg font-semibold hover:bg-brand-mint/80 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 transition-colors duration-200">
              시작하기
            </button>
            <button className="px-8 py-3 border-2 border-brand-mint text-brand-mint rounded-lg font-semibold hover:bg-brand-mint hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 transition-all duration-200">
              더 알아보기
            </button>
          </div>
        </div>

        {/* 메타 트렌드 카드 섹션 */}
        <section className="py-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-12">
            실시간 메타 트렌드
          </h2>
          
          <EnhancedResponsiveGrid
            columns={{ base: 1, md: 2, lg: 3 }}
            gap={8}
            loadingState="loaded"
            className="max-w-6xl mx-auto"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <MetaTrendCard 
                key={i}
                deck={{
                  ...mockDeckData,
                  deckKey: `integration-test-${i + 1}`,
                  tierRank: ['S', 'A', 'B', 'C', 'D', 'F'][i],
                  totalGames: Math.floor(Math.random() * 5000) + 1000,
                  averagePlacement: (Math.random() * 3 + 2).toFixed(1),
                }}
              />
            ))}
          </EnhancedResponsiveGrid>
        </section>

        {/* 기능 소개 섹션 */}
        <section className="py-16 bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded-2xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary dark:text-dark-text-primary mb-4">
              주요 개선사항
            </h2>
            <p className="text-lg text-text-secondary dark:text-dark-text-secondary">
              사용자 경험을 한 단계 끌어올리는 고도화된 기능들
            </p>
          </div>

          <EnhancedResponsiveGrid
            columns={{ base: 1, sm: 2, lg: 4 }}
            gap={6}
          >
            {[
              {
                icon: '🚀',
                title: '성능 최적화',
                description: 'GPU 가속, 이미지 최적화, 지연 로딩으로 빠른 로딩 속도 보장'
              },
              {
                icon: '♿',
                title: '접근성 강화',
                description: '키보드 네비게이션, 스크린 리더 지원, ARIA 라벨로 모든 사용자 포용'
              },
              {
                icon: '📱',
                title: '모바일 최적화',
                description: 'Safe Area 대응, 터치 최적화, 반응형 디자인으로 완벽한 모바일 경험'
              },
              {
                icon: '🌐',
                title: '브라우저 호환성',
                description: '@supports 쿼리, 폴리필, 점진적 향상으로 모든 브라우저 지원'
              }
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </EnhancedResponsiveGrid>
        </section>

        {/* 테스트 상태 대시보드 */}
        <section className="py-16">
          <h2 className="text-2xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-8">
            시스템 상태 확인
          </h2>
          
          <div className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 shadow-md">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
              {[
                { label: '반응형 디자인', status: '✅' },
                { label: '키보드 네비게이션', status: '✅' },
                { label: '이미지 최적화', status: '✅' },
                { label: 'Safe Area 대응', status: '✅' },
                { label: '다크모드 지원', status: '✅' },
                { label: '브라우저 호환성', status: '✅' },
                { label: '성능 최적화', status: '✅' },
                { label: '접근성 준수', status: '✅' }
              ].map((item, i) => (
                <div key={i} className="p-3 bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded-lg">
                  <div className="text-2xl mb-1">{item.status}</div>
                  <div className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </EnhancedResponsiveContainer>
    </StoryWrapper>
  ),
};