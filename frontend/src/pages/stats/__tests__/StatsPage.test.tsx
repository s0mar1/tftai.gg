import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsPage from '../StatsPage';

// 필요한 모킹
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'stats.title': '통계',
        'stats.subtitle': '아이템 및 시너지 통계',
        'stats.itemStats': '아이템 통계',
        'stats.traitStats': '시너지 통계',
        'stats.filters': '필터',
        'stats.all': '전체',
        'stats.winRate': '승률',
        'stats.top4Rate': 'Top 4',
        'stats.averagePlacement': '평균 등수',
        'stats.totalGames': '총 게임',
        'stats.games': `${options?.count || 0}게임`,
        'stats.noStatsFound': '통계를 찾을 수 없습니다'
      };
      return translations[key] || key;
    }
  })
}));

jest.mock('../../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    performanceData: {
      renderCount: 1,
      averageRenderTime: 10
    }
  })
}));

jest.mock('../../../components/common/ResponsiveContainer', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>
}));

jest.mock('../../../components/common/TFTSkeletons', () => ({
  StatsPageSkeleton: () => <div data-testid="stats-skeleton">Loading...</div>
}));

// fetch API 모킹
global.fetch = jest.fn();

describe('StatsPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    
    // 성공적인 API 응답 모킹
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            _id: '1',
            itemName: 'Test Item',
            itemIcon: 'item.png',
            totalGames: 100,
            winRate: 25,
            top4Rate: 60,
            averagePlacement: 3.5
          }
        ]
      })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('로딩 상태를 올바르게 표시해야 함', async () => {
    // 로딩 상태를 시뮬레이션하기 위해 fetch를 지연시킴
    (fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<StatsPage />);

    expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument();
  });

  test('페이지 제목과 탭이 올바르게 표시되어야 함', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('통계')).toBeInTheDocument();
      expect(screen.getByText('아이템 통계')).toBeInTheDocument();
      expect(screen.getByText('시너지 통계')).toBeInTheDocument();
    });
  });

  test('아이템 탭이 기본으로 선택되어야 함', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      const itemTab = screen.getByText('아이템 통계');
      expect(itemTab).toHaveClass('bg-blue-600');
    });
  });

  test('시너지 탭을 클릭할 수 있어야 함', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      const traitTab = screen.getByText('시너지 통계');
      fireEvent.click(traitTab);
      
      expect(traitTab).toHaveClass('bg-blue-600');
    });
  });

  test('필터가 올바르게 표시되어야 함', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('필터')).toBeInTheDocument();
      expect(screen.getByDisplayValue('all')).toBeInTheDocument();
      expect(screen.getByDisplayValue('winRate')).toBeInTheDocument();
      expect(screen.getByDisplayValue('desc')).toBeInTheDocument();
    });
  });

  test('필터 변경이 동작해야 함', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      const sortFilter = screen.getByDisplayValue('winRate');
      fireEvent.change(sortFilter, { target: { value: 'top4Rate' } });
      
      expect(sortFilter).toHaveValue('top4Rate');
    });
  });

  test('통계 데이터가 올바르게 표시되어야 함', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
      expect(screen.getByText('100게임')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('3.5')).toBeInTheDocument();
    });
  });

  test('API 에러가 발생해도 크래시하지 않아야 함', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<StatsPage />);

    await waitFor(() => {
      // 에러가 발생해도 페이지가 렌더링되어야 함
      expect(screen.getByText('통계')).toBeInTheDocument();
    });
  });

  test('데이터가 없을 때 적절한 메시지를 표시해야 함', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('통계를 찾을 수 없습니다')).toBeInTheDocument();
    });
  });

  test('탭 변경 시 새로운 데이터를 요청해야 함', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      const traitTab = screen.getByText('시너지 통계');
      fireEvent.click(traitTab);
    });

    // fetch가 traits 엔드포인트로 호출되었는지 확인
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/stats/traits'),
        expect.any(Object)
      );
    });
  });
});