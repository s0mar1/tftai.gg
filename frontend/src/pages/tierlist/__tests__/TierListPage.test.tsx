import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TierListPage from '../TierListPage';

// 필요한 모킹
jest.mock('../../../hooks/useQuery', () => ({
  useDeckTiers: jest.fn(),
  useCacheInvalidation: jest.fn()
}));

jest.mock('../../../context/TFTDataContext', () => ({
  useTFTData: jest.fn()
}));

jest.mock('../../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: jest.fn(() => ({
    performanceData: {
      renderCount: 1,
      averageRenderTime: 10,
      maxRenderTime: 15
    }
  }))
}));

// ResponsiveContainer 모킹
jest.mock('../../../components/common/ResponsiveContainer', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}));

// TFTSkeletons 모킹
jest.mock('../../../components/common/TFTSkeletons', () => ({
  TierListPageSkeleton: () => <div data-testid="tier-list-skeleton">Loading...</div>
}));

// Trait 컴포넌트 모킹
jest.mock('../../summoner/components/Trait', () => ({
  __esModule: true,
  default: ({ trait }: { trait: any }) => <div data-testid="trait">{trait.name}</div>
}));

const mockUseDeckTiers = require('../../../hooks/useQuery').useDeckTiers;
const mockUseCacheInvalidation = require('../../../hooks/useQuery').useCacheInvalidation;
const mockUseTFTData = require('../../../context/TFTDataContext').useTFTData;

const mockTierData = [
  {
    deckKey: 'test-deck-1',
    tierRank: 'S',
    mainTraitName: 'Challenger',
    carryChampionName: 'Yasuo',
    averagePlacement: 3.2,
    totalGames: 100,
    top4Count: 75,
    winCount: 25,
    coreUnits: [
      {
        apiName: 'TFT_Set12_Yasuo',
        name: 'Yasuo',
        cost: 4,
        tier: 3,
        image_url: 'yasuo.jpg',
        recommendedItems: []
      }
    ]
  }
];

const mockTFTData = {
  champions: [
    {
      apiName: 'TFT_Set12_Yasuo',
      name: 'Yasuo',
      cost: 4,
      traits: ['Challenger', 'Samurai']
    }
  ],
  traits: [
    {
      apiName: 'TFT12_Challenger',
      name: 'Challenger',
      icon: 'challenger.png',
      effects: [
        { minUnits: 2, style: 'bronze' },
        { minUnits: 4, style: 'silver' },
        { minUnits: 6, style: 'gold' }
      ]
    }
  ],
  krNameMap: new Map([
    ['TFT_Set12_Yasuo', 'Yasuo'],
    ['TFT12_Challenger', 'Challenger']
  ]),
  showTooltip: jest.fn(),
  hideTooltip: jest.fn()
};

// 테스트 래퍼
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('TierListPage', () => {
  beforeEach(() => {
    mockUseTFTData.mockReturnValue(mockTFTData);
    mockUseCacheInvalidation.mockReturnValue({
      invalidateDeckTiers: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('로딩 상태를 올바르게 표시해야 함', () => {
    mockUseDeckTiers.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn()
    });

    render(
      <TestWrapper>
        <TierListPage />
      </TestWrapper>
    );

    expect(screen.getByTestId('tier-list-skeleton')).toBeInTheDocument();
  });

  test('에러 상태를 올바르게 표시해야 함', () => {
    mockUseDeckTiers.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Test error'),
      refetch: jest.fn()
    });

    render(
      <TestWrapper>
        <TierListPage />
      </TestWrapper>
    );

    expect(screen.getByText('덱 티어 정보를 불러오는 데 실패했습니다. 서버를 확인해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('다시 시도')).toBeInTheDocument();
  });

  test('덱 티어 데이터를 올바르게 표시해야 함', () => {
    mockUseDeckTiers.mockReturnValue({
      data: mockTierData,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <TestWrapper>
        <TierListPage />
      </TestWrapper>
    );

    expect(screen.getByText('실시간 덱 티어리스트')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('Challenger Yasuo')).toBeInTheDocument();
  });

  test('새로고침 버튼이 동작해야 함', async () => {
    const mockRefetch = jest.fn();
    const mockInvalidateDeckTiers = jest.fn();

    mockUseDeckTiers.mockReturnValue({
      data: mockTierData,
      isLoading: false,
      error: null,
      refetch: mockRefetch
    });

    mockUseCacheInvalidation.mockReturnValue({
      invalidateDeckTiers: mockInvalidateDeckTiers
    });

    render(
      <TestWrapper>
        <TierListPage />
      </TestWrapper>
    );

    const refreshButton = screen.getByText('새로고침');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockInvalidateDeckTiers).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  test('데이터가 없을 때 적절한 메시지를 표시해야 함', () => {
    mockUseDeckTiers.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <TestWrapper>
        <TierListPage />
      </TestWrapper>
    );

    expect(screen.getByText(/아직 분석된 덱 티어 정보가 없습니다/)).toBeInTheDocument();
  });
});