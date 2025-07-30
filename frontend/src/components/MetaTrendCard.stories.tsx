import type { Meta, StoryObj } from '@storybook/react';
import MetaTrendCard from './MetaTrendCard';
import { TFTDataProvider } from '../context/TFTDataContext';

// Mock TFT 데이터
const mockTFTData = {
  champions: [
    {
      apiName: 'TFT12_Jinx',
      name: { ko: '징크스' },
      traits: ['Anarchist', 'Sniper'],
      cost: 1
    },
    {
      apiName: 'TFT12_Violet',
      name: { ko: '바이' },
      traits: ['Enforcer', 'Pit Fighter'],
      cost: 2
    },
    {
      apiName: 'TFT12_Caitlyn',
      name: { ko: '케이틀린' },
      traits: ['Enforcer', 'Sniper'],
      cost: 3
    },
    {
      apiName: 'TFT12_Ekko',
      name: { ko: '에코' },
      traits: ['Ambusher', 'Scrap'],
      cost: 4
    },
    {
      apiName: 'TFT12_Jayce',
      name: { ko: '제이스' },
      traits: ['Academy', 'Enforcer'],
      cost: 5
    }
  ],
  traits: [
    {
      apiName: 'Anarchist',
      name: { ko: '무정부주의자' }
    },
    {
      apiName: 'Sniper',
      name: { ko: '저격수' }
    },
    {
      apiName: 'Enforcer',
      name: { ko: '집행관' }
    },
    {
      apiName: 'Pit Fighter',
      name: { ko: '투사' }
    },
    {
      apiName: 'Ambusher',
      name: { ko: '암살자' }
    },
    {
      apiName: 'Scrap',
      name: { ko: '고철' }
    },
    {
      apiName: 'Academy',
      name: { ko: '아카데미' }
    }
  ],
  loading: false,
  error: null
};

// Mock Deck 데이터
const mockDecks = {
  highroll: {
    coreUnits: [
      { apiName: 'TFT12_Jinx' },
      { apiName: 'TFT12_Violet' },
      { apiName: 'TFT12_Caitlyn' },
      { apiName: 'TFT12_Ekko' },
      { apiName: 'TFT12_Jayce' }
    ],
    tierRank: 'S',
    totalGames: 1234,
    top4Count: 789,
    carryChampionName: { ko: '징크스' },
    mainTraitName: { ko: '무정부주의자' }
  },
  reroll: {
    coreUnits: [
      { apiName: 'TFT12_Jinx' },
      { apiName: 'TFT12_Violet' },
      { apiName: 'TFT12_Caitlyn' }
    ],
    tierRank: 'A',
    totalGames: 892,
    top4Count: 523,
    carryChampionName: { ko: '바이' },
    mainTraitName: { ko: '집행관' }
  },
  slowroll: {
    coreUnits: [
      { apiName: 'TFT12_Violet' },
      { apiName: 'TFT12_Caitlyn' },
      { apiName: 'TFT12_Ekko' }
    ],
    tierRank: 'B',
    totalGames: 567,
    top4Count: 284,
    carryChampionName: { ko: '에코' },
    mainTraitName: { ko: '암살자' }
  },
  budget: {
    coreUnits: [
      { apiName: 'TFT12_Jinx' },
      { apiName: 'TFT12_Violet' }
    ],
    tierRank: 'C',
    totalGames: 234,
    top4Count: 93,
    carryChampionName: { ko: '징크스' },
    mainTraitName: { ko: '무정부주의자' }
  },
  meme: {
    coreUnits: [
      { apiName: 'TFT12_Jayce' }
    ],
    tierRank: 'D',
    totalGames: 89,
    top4Count: 22,
    carryChampionName: { ko: '제이스' },
    mainTraitName: { ko: '아카데미' }
  }
};

const meta: Meta<typeof MetaTrendCard> = {
  title: 'Components/MetaTrendCard',
  component: MetaTrendCard,
  decorators: [
    (Story) => (
      <TFTDataProvider value={mockTFTData}>
        <div className="max-w-md">
          <Story />
        </div>
      </TFTDataProvider>
    ),
  ],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
TFT 메타 트렌드를 표시하는 카드 컴포넌트입니다.

## 특징
- TFT 덱 정보 시각화
- 티어별 색상 구분 (S, A, B, C, D)
- 승률, 픽률 등 통계 정보 표시
- 챔피언 시너지 정보 포함
- 다크모드 완전 지원
- 클릭 시 상세 페이지 이동

## 데이터 구조
\`\`\`tsx
interface Deck {
  coreUnits: { apiName: string }[];
  tierRank: string;
  totalGames: number;
  top4Count: number;
  carryChampionName: string | { ko: string };
  mainTraitName: string | { ko: string };
}
\`\`\`
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof MetaTrendCard>;

// 기본 스토리
export const Default: Story = {
  args: {
    deck: mockDecks.highroll
  }
};

// 티어별 카드들
export const TierVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <h4 className="text-sm font-medium mb-2 text-text-secondary dark:text-dark-text-secondary">S티어</h4>
        <MetaTrendCard deck={mockDecks.highroll} />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-text-secondary dark:text-dark-text-secondary">A티어</h4>
        <MetaTrendCard deck={mockDecks.reroll} />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-text-secondary dark:text-dark-text-secondary">B티어</h4>
        <MetaTrendCard deck={mockDecks.slowroll} />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-text-secondary dark:text-dark-text-secondary">C티어</h4>
        <MetaTrendCard deck={mockDecks.budget} />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-text-secondary dark:text-dark-text-secondary">D티어</h4>
        <MetaTrendCard deck={mockDecks.meme} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '각 티어별로 다른 색상과 통계를 가진 메타 트렌드 카드들입니다.'
      }
    }
  }
};

// 다양한 컴프 타입
export const CompVariations: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold mb-3 text-text-primary dark:text-dark-text-primary">
          하이롤 컴프
        </h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
          높은 코스트 챔피언 중심의 빌드업 컴프
        </p>
        <MetaTrendCard deck={{
          ...mockDecks.highroll,
          coreUnits: [
            { apiName: 'TFT12_Jayce' },
            { apiName: 'TFT12_Ekko' },
            { apiName: 'TFT12_Caitlyn' },
            { apiName: 'TFT12_Violet' },
            { apiName: 'TFT12_Jinx' }
          ],
          totalGames: 1456,
          top4Count: 934
        }} />
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-3 text-text-primary dark:text-dark-text-primary">
          리롤 컴프
        </h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
          저코스트 챔피언 3성 위주의 초반 강세 컴프
        </p>
        <MetaTrendCard deck={{
          ...mockDecks.reroll,
          coreUnits: [
            { apiName: 'TFT12_Jinx' },
            { apiName: 'TFT12_Violet' },
            { apiName: 'TFT12_Caitlyn' }
          ],
          totalGames: 2134,
          top4Count: 1267
        }} />
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-3 text-text-primary dark:text-dark-text-primary">
          슬로우롤 컴프
        </h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
          중간 코스트 챔피언으로 안정적인 운영
        </p>
        <MetaTrendCard deck={{
          ...mockDecks.slowroll,
          totalGames: 1789,
          top4Count: 894
        }} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'TFT의 주요 컴프 유형별 메타 트렌드 카드 예시입니다.'
      }
    }
  }
};

// 통계 비교
export const StatsComparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold mb-3 text-text-primary dark:text-dark-text-primary">
          고승률 컴프
        </h4>
        <MetaTrendCard deck={{
          ...mockDecks.highroll,
          totalGames: 500,
          top4Count: 380, // 76% 승률
          tierRank: 'S'
        }} />
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-3 text-text-primary dark:text-dark-text-primary">
          고픽률 컴프
        </h4>
        <MetaTrendCard deck={{
          ...mockDecks.reroll,
          totalGames: 5000,
          top4Count: 2250, // 45% 승률이지만 많이 플레이됨
          tierRank: 'A'
        }} -->
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-3 text-text-primary dark:text-dark-text-primary">
          저승률 컴프
        </h4>
        <MetaTrendCard deck={{
          ...mockDecks.budget,
          totalGames: 200,
          top4Count: 60, // 30% 승률
          tierRank: 'D'
        }} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '다양한 승률과 픽률을 가진 컴프들의 비교입니다. Top4 비율이 시각적으로 구분됩니다.'
      }
    }
  }
};

// 데이터 로딩 상태
export const LoadingStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold mb-3 text-text-primary dark:text-dark-text-primary">
          챔피언 데이터 없음
        </h4>
        <TFTDataProvider value={{ ...mockTFTData, champions: [] }}>
          <MetaTrendCard deck={mockDecks.highroll} />
        </TFTDataProvider>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-3 text-text-primary dark:text-dark-text-primary">
          로딩 중
        </h4>
        <TFTDataProvider value={{ ...mockTFTData, loading: true }}>
          <MetaTrendCard deck={mockDecks.highroll} />
        </TFTDataProvider>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '데이터 로딩 상태나 오류 상황에서의 컴포넌트 표시 상태입니다.'
      }
    }
  }
};

// 인터랙션 데모
export const InteractionDemo: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
        💡 카드를 클릭하면 해당 덱의 상세 페이지로 이동합니다.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetaTrendCard deck={mockDecks.highroll} />
        <MetaTrendCard deck={mockDecks.reroll} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '실제 클릭 인터랙션이 동작하는 메타 트렌드 카드들입니다.'
      }
    }
  }
};

// 접근성 테스트
export const AccessibilityTest: Story = {
  args: {
    deck: mockDecks.highroll
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true
          },
          {
            id: 'button-name',
            enabled: true
          },
          {
            id: 'focus-order-semantics',
            enabled: true
          }
        ]
      }
    },
    docs: {
      description: {
        story: '색상 대비, 포커스 순서, 키보드 내비게이션 등 접근성 기준을 검증하는 스토리입니다.'
      }
    }
  }
};