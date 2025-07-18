import type { Meta, StoryObj } from '@storybook/react';
import Card, { 
  CardHeader, 
  CardContent, 
  CardFooter, 
  ImageCard, 
  StatCard, 
  ListCard 
} from './Card';
import Button from './Button';

// 아이콘 컴포넌트들
const ChartIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const MoreIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const meta: Meta<typeof Card> = {
  title: 'Components/Common/Card',
  component: Card,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
다양한 콘텐츠를 담을 수 있는 카드 컴포넌트입니다.

## 특징
- 4가지 변형: default, outlined, elevated, filled
- 3가지 크기: sm, md, lg
- 호버 효과 및 클릭 가능 옵션
- 구성 요소: CardHeader, CardContent, CardFooter
- 특화 카드: ImageCard, StatCard, ListCard
- 다크모드 완전 지원

## 사용법
\`\`\`tsx
// 기본 카드
<Card>
  <CardHeader title="제목" subtitle="부제목" />
  <CardContent>
    카드 내용이 들어갑니다.
  </CardContent>
  <CardFooter>
    <Button>액션</Button>
  </CardFooter>
</Card>

// 이미지 카드
<ImageCard
  src="/path/to/image.jpg"
  alt="이미지 설명"
  title="이미지 제목"
  description="이미지 설명"
/>

// 통계 카드
<StatCard
  title="총 게임 수"
  value="1,234"
  change={{ value: "+12%", type: "increase" }}
  icon={<ChartIcon />}
/>

// 리스트 카드
<ListCard
  title="최근 매치"
  items={[
    { id: "1", primary: "승리", secondary: "1등" },
    { id: "2", primary: "패배", secondary: "8등" }
  ]}
/>
\`\`\`
        `
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'outlined', 'elevated', 'filled'],
      description: '카드 변형'
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: '카드 크기 (패딩)'
    },
    padding: {
      control: 'boolean',
      description: '내부 패딩 적용 여부'
    },
    hover: {
      control: 'boolean',
      description: '호버 효과 활성화'
    },
    clickable: {
      control: 'boolean',
      description: '클릭 가능 상태'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Card>;

// 기본 스토리
export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">기본 카드</h3>
        <p className="text-text-secondary dark:text-dark-text-secondary">
          이것은 기본적인 카드 컴포넌트입니다.
        </p>
      </div>
    )
  }
};

// 변형별
export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="default">
        <h4 className="font-semibold mb-2">Default</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          기본 테두리가 있는 카드입니다.
        </p>
      </Card>
      
      <Card variant="outlined">
        <h4 className="font-semibold mb-2">Outlined</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          두꺼운 테두리가 있는 카드입니다.
        </p>
      </Card>
      
      <Card variant="elevated">
        <h4 className="font-semibold mb-2">Elevated</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          그림자가 있는 카드입니다.
        </p>
      </Card>
      
      <Card variant="filled">
        <h4 className="font-semibold mb-2">Filled</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          배경색이 채워진 카드입니다.
        </p>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '4가지 카드 변형을 비교합니다.'
      }
    }
  }
};

// 크기별
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Card size="sm">
        <h4 className="font-semibold">Small Card</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">작은 패딩을 가진 카드입니다.</p>
      </Card>
      
      <Card size="md">
        <h4 className="font-semibold">Medium Card</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">중간 패딩을 가진 카드입니다.</p>
      </Card>
      
      <Card size="lg">
        <h4 className="font-semibold">Large Card</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">큰 패딩을 가진 카드입니다.</p>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '3가지 크기 옵션을 비교합니다.'
      }
    }
  }
};

// 인터랙티브 카드
export const Interactive: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card hover>
        <h4 className="font-semibold mb-2">Hover Effect</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          마우스를 올리면 효과가 나타납니다.
        </p>
      </Card>
      
      <Card clickable onClick={() => alert('카드가 클릭되었습니다!')}>
        <h4 className="font-semibold mb-2">Clickable Card</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          클릭 가능한 카드입니다.
        </p>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '호버 효과와 클릭 가능한 카드들입니다.'
      }
    }
  }
};

// 구성 요소가 있는 카드
export const WithComponents: Story = {
  render: () => (
    <div className="max-w-md">
      <Card>
        <CardHeader 
          title="사용자 프로필"
          subtitle="최근 활동 정보"
          action={
            <button className="text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary">
              <MoreIcon />
            </button>
          }
        />
        
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-mint rounded-full flex items-center justify-center text-white">
                <UserIcon />
              </div>
              <div>
                <p className="font-medium">홍길동</p>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">마스터 티어</p>
              </div>
            </div>
            <p className="text-sm">
              최근 30게임에서 평균 3.2등을 기록했습니다.
            </p>
          </div>
        </CardContent>
        
        <CardFooter>
          <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
            2시간 전 활동
          </span>
          <Button size="sm">프로필 보기</Button>
        </CardFooter>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'CardHeader, CardContent, CardFooter를 사용한 완전한 카드 구성입니다.'
      }
    }
  }
};

// 이미지 카드
export const ImageCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ImageCard
        src="https://via.placeholder.com/300x200/3ED2B9/ffffff?text=TFT+Champion"
        alt="챔피언 이미지"
        title="아트록스"
        description="강력한 물리 딜러로, 적들을 제압하는 능력이 뛰어납니다."
        footer={
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">코스트: 1</span>
            <Button size="sm">상세 정보</Button>
          </div>
        }
      />
      
      <ImageCard
        src="https://via.placeholder.com/300x200/E74C3C/ffffff?text=TFT+Item"
        alt="아이템 이미지"
        title="무한의 대검"
        description="치명타 확률과 치명타 피해량을 크게 증가시킵니다."
        clickable
        hover
        onClick={() => alert('아이템 카드 클릭!')}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '이미지가 포함된 카드들입니다. TFT 챔피언이나 아이템 표시에 적합합니다.'
      }
    }
  }
};

// 통계 카드
export const StatCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="총 게임 수"
        value="1,234"
        change={{ value: "+12%", type: "increase" }}
        icon={<ChartIcon />}
        description="지난 주 대비"
      />
      
      <StatCard
        title="평균 순위"
        value="3.2"
        change={{ value: "-0.3", type: "decrease" }}
        icon={<TrophyIcon />}
        description="최근 30게임"
      />
      
      <StatCard
        title="승률"
        value="68%"
        change={{ value: "동일", type: "neutral" }}
        icon={<StarIcon />}
        description="1-4등 기준"
      />
      
      <StatCard
        title="LP"
        value="2,456"
        change={{ value: "+156", type: "increase" }}
        icon={<UserIcon />}
        description="현재 시즌"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '통계 정보를 표시하는 카드들입니다. 대시보드나 프로필 페이지에 유용합니다.'
      }
    }
  }
};

// 리스트 카드
export const ListCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ListCard
        title="최근 매치"
        items={[
          {
            id: "1",
            primary: "승리 #1",
            secondary: "2분 전 • 하이롤 텍사이",
            icon: <div className="w-3 h-3 bg-green-500 rounded-full" />,
            action: <span className="text-xs text-text-secondary dark:text-dark-text-secondary">+25 LP</span>
          },
          {
            id: "2",
            primary: "패배 #8",
            secondary: "15분 전 • 리롤 컴프",
            icon: <div className="w-3 h-3 bg-red-500 rounded-full" />,
            action: <span className="text-xs text-text-secondary dark:text-dark-text-secondary">-18 LP</span>
          },
          {
            id: "3",
            primary: "승리 #3",
            secondary: "1시간 전 • 빌드업 컴프",
            icon: <div className="w-3 h-3 bg-yellow-500 rounded-full" />,
            action: <span className="text-xs text-text-secondary dark:text-dark-text-secondary">+12 LP</span>
          }
        ]}
        onItemClick={(id) => console.log('Match clicked:', id)}
      />
      
      <ListCard
        title="메타 챔피언"
        items={[
          {
            id: "aatrox",
            primary: "아트록스",
            secondary: "승률 72% • 평균 2.1등",
            action: <Button size="sm" variant="outline">빌드</Button>
          },
          {
            id: "azir",
            primary: "아지르",
            secondary: "승률 68% • 평균 2.4등",
            action: <Button size="sm" variant="outline">빌드</Button>
          },
          {
            id: "cassiopeia",
            primary: "카시오페아",
            secondary: "승률 65% • 평균 2.6등",
            action: <Button size="sm" variant="outline">빌드</Button>
          }
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '리스트 형태의 데이터를 표시하는 카드들입니다. 매치 히스토리나 챔피언 목록에 유용합니다.'
      }
    }
  }
};

// TFT 특화 카드들
export const TFTSpecific: Story = {
  render: () => (
    <div className="space-y-6">
      {/* 덱 빌더 카드 */}
      <div>
        <h4 className="text-lg font-semibold mb-4">덱 빌더</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card clickable hover>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-mint rounded-lg mx-auto mb-3 flex items-center justify-center text-white text-2xl">
                +
              </div>
              <h4 className="font-semibold">새 덱 만들기</h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                새로운 컴포지션을 만들어보세요
              </p>
            </div>
          </Card>
          
          <Card variant="outlined">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mx-auto mb-3 flex items-center justify-center text-white">
                <TrophyIcon />
              </div>
              <h4 className="font-semibold">하이롤 텍사이</h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                승률 74% • S티어
              </p>
            </div>
          </Card>
          
          <Card variant="outlined">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mx-auto mb-3 flex items-center justify-center text-white">
                <ChartIcon />
              </div>
              <h4 className="font-semibold">빌드업 컴프</h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                승률 68% • A티어
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* 메타 트렌드 카드 */}
      <div>
        <h4 className="text-lg font-semibold mb-4">메타 트렌드</h4>
        <Card variant="elevated">
          <CardHeader 
            title="이번 주 메타 변화"
            subtitle="패치 13.24b 기준"
            action={<Button size="sm" variant="outline">전체 보기</Button>}
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-green-600 dark:text-green-400 text-lg font-bold">↗ 상승</div>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary">아트록스 컴프</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-red-600 dark:text-red-400 text-lg font-bold">↘ 하락</div>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary">어쌔신 컴프</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-blue-600 dark:text-blue-400 text-lg font-bold">→ 유지</div>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary">마법사 컴프</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 랭킹 카드 */}
      <div>
        <h4 className="text-lg font-semibold mb-4">상위 랭커</h4>
        <Card>
          <ListCard
            title="챌린저 티어"
            items={[
              {
                id: "1",
                primary: "Dishsoap",
                secondary: "3,456 LP • 승률 68%",
                icon: <div className="text-yellow-500"><TrophyIcon /></div>,
                action: <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">#1</span>
              },
              {
                id: "2",
                primary: "milk",
                secondary: "3,234 LP • 승률 71%",
                icon: <div className="text-gray-400"><TrophyIcon /></div>,
                action: <span className="text-xs bg-gray-100 dark:bg-gray-900/30 px-2 py-1 rounded">#2</span>
              },
              {
                id: "3",
                primary: "souless",
                secondary: "3,125 LP • 승률 69%",
                icon: <div className="text-orange-500"><TrophyIcon /></div>,
                action: <span className="text-xs bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">#3</span>
              }
            ]}
            onItemClick={(id) => console.log('Summoner clicked:', id)}
          />
        </Card>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'TFT Meta Analyzer에서 실제로 사용될 수 있는 카드 구성들입니다.'
      }
    }
  }
};

// 반응형 그리드
export const ResponsiveGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} variant="elevated" hover>
          <div className="text-center">
            <div className="w-12 h-12 bg-brand-mint rounded-lg mx-auto mb-3 flex items-center justify-center text-white">
              {i + 1}
            </div>
            <h4 className="font-semibold">카드 {i + 1}</h4>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
              반응형 그리드의 카드입니다.
            </p>
          </div>
        </Card>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '반응형 그리드에서 동작하는 카드들입니다. 화면 크기에 따라 열 수가 조정됩니다.'
      }
    }
  }
};

// 접근성 테스트
export const AccessibilityTest: Story = {
  args: {
    clickable: true,
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">접근성 테스트 카드</h3>
        <p className="text-text-secondary dark:text-dark-text-secondary">
          이 카드는 접근성 기준을 준수합니다.
        </p>
      </div>
    )
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