import type { Meta, StoryObj } from '@storybook/react';
import Button, { IconButton, ButtonGroup, type ButtonVariant, type ButtonSize } from './Button';

// 아이콘 컴포넌트들
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const meta: Meta<typeof Button> = {
  title: 'Components/Common/Button',
  component: Button,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
다양한 상황에서 사용할 수 있는 버튼 컴포넌트입니다.

## 특징
- 5가지 변형: primary, secondary, outline, ghost, danger
- 3가지 크기: sm, md, lg
- 로딩 상태 지원
- 좌우 아이콘 지원
- 전체 너비 옵션
- 다크모드 완전 지원
- 접근성 준수

## 사용법
\`\`\`tsx
// 기본 사용
<Button>클릭하세요</Button>

// 변형과 크기
<Button variant="primary" size="lg">큰 기본 버튼</Button>

// 아이콘과 함께
<Button leftIcon={<PlusIcon />}>추가</Button>
<Button rightIcon={<DownloadIcon />}>다운로드</Button>

// 로딩 상태
<Button loading>처리 중...</Button>

// 아이콘 전용 버튼
<IconButton icon={<SearchIcon />} aria-label="검색" />

// 버튼 그룹
<ButtonGroup>
  <Button>첫 번째</Button>
  <Button>두 번째</Button>
  <Button>세 번째</Button>
</ButtonGroup>
\`\`\`
        `
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: '버튼 변형'
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: '버튼 크기'
    },
    loading: {
      control: 'boolean',
      description: '로딩 상태'
    },
    disabled: {
      control: 'boolean',
      description: '비활성화 상태'
    },
    fullWidth: {
      control: 'boolean',
      description: '전체 너비 사용'
    },
    children: {
      control: 'text',
      description: '버튼 텍스트'
    },
    onClick: {
      action: 'clicked',
      description: '클릭 이벤트 핸들러'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

// 기본 스토리
export const Default: Story = {
  args: {
    children: '기본 버튼'
  }
};

// 모든 변형
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '사용 가능한 모든 버튼 변형을 보여줍니다.'
      }
    }
  }
};

// 크기별
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
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

// 상태별
export const States: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Button>Normal</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary">Normal</Button>
        <Button variant="secondary" disabled>Disabled</Button>
        <Button variant="secondary" loading>Loading</Button>
      </div>
      <div className="flex gap-3">
        <Button variant="danger">Normal</Button>
        <Button variant="danger" disabled>Disabled</Button>
        <Button variant="danger" loading>Loading</Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '일반, 비활성화, 로딩 상태를 비교합니다.'
      }
    }
  }
};

// 아이콘과 함께
export const WithIcons: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Button leftIcon={<PlusIcon />}>추가</Button>
        <Button rightIcon={<DownloadIcon />}>다운로드</Button>
        <Button leftIcon={<SearchIcon />} rightIcon={<DownloadIcon />}>검색 후 다운로드</Button>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" leftIcon={<SearchIcon />}>검색</Button>
        <Button variant="ghost" rightIcon={<DownloadIcon />}>내보내기</Button>
        <Button variant="danger" leftIcon={<TrashIcon />}>삭제</Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '좌측, 우측, 양쪽 아이콘을 가진 버튼들입니다.'
      }
    }
  }
};

// 전체 너비
export const FullWidth: Story = {
  render: () => (
    <div className="max-w-md space-y-3">
      <Button fullWidth>전체 너비 버튼</Button>
      <Button variant="outline" fullWidth>전체 너비 아웃라인</Button>
      <Button variant="danger" fullWidth leftIcon={<TrashIcon />}>전체 너비 삭제</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '컨테이너의 전체 너비를 차지하는 버튼들입니다.'
      }
    }
  }
};

// 아이콘 버튼
export const IconButtons: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex gap-3">
        <IconButton icon={<PlusIcon />} aria-label="추가" />
        <IconButton icon={<SearchIcon />} aria-label="검색" variant="secondary" />
        <IconButton icon={<DownloadIcon />} aria-label="다운로드" variant="outline" />
        <IconButton icon={<TrashIcon />} aria-label="삭제" variant="danger" />
      </div>
      <div className="flex gap-3">
        <IconButton icon={<PlusIcon />} aria-label="추가" size="sm" />
        <IconButton icon={<SearchIcon />} aria-label="검색" size="md" />
        <IconButton icon={<DownloadIcon />} aria-label="다운로드" size="lg" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
아이콘만 표시되는 버튼들입니다. 접근성을 위해 aria-label이 필수입니다.

\`\`\`tsx
<IconButton 
  icon={<SearchIcon />} 
  aria-label="검색" 
  variant="outline" 
/>
\`\`\`
        `
      }
    }
  }
};

// 버튼 그룹
export const ButtonGroups: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">수평 그룹</h4>
        <ButtonGroup>
          <Button>첫 번째</Button>
          <Button>두 번째</Button>
          <Button>세 번째</Button>
        </ButtonGroup>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-3">수직 그룹</h4>
        <ButtonGroup orientation="vertical">
          <Button>첫 번째</Button>
          <Button>두 번째</Button>
          <Button>세 번째</Button>
        </ButtonGroup>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">아웃라인 그룹</h4>
        <ButtonGroup variant="outline">
          <Button>왼쪽</Button>
          <Button>가운데</Button>
          <Button>오른쪽</Button>
        </ButtonGroup>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">작은 크기 그룹</h4>
        <ButtonGroup size="sm">
          <Button>Small</Button>
          <Button>Group</Button>
          <Button>Buttons</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
연관된 버튼들을 그룹화하는 컴포넌트입니다.

\`\`\`tsx
// 수평 그룹
<ButtonGroup>
  <Button>첫 번째</Button>
  <Button>두 번째</Button>
</ButtonGroup>

// 수직 그룹
<ButtonGroup orientation="vertical">
  <Button>첫 번째</Button>
  <Button>두 번째</Button>
</ButtonGroup>
\`\`\`
        `
      }
    }
  }
};

// TFT 특화 버튼들
export const TFTSpecific: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">소환사 검색</h4>
        <div className="flex gap-3">
          <Button variant="primary" leftIcon={<SearchIcon />}>소환사 검색</Button>
          <Button variant="outline">새로고침</Button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">덱 빌더 액션</h4>
        <div className="flex gap-3">
          <Button variant="primary" leftIcon={<PlusIcon />}>챔피언 추가</Button>
          <Button variant="secondary">덱 저장</Button>
          <Button variant="outline" rightIcon={<DownloadIcon />}>덱 공유</Button>
          <Button variant="danger" leftIcon={<TrashIcon />}>덱 삭제</Button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">메타 분석</h4>
        <ButtonGroup>
          <Button>이번 패치</Button>
          <Button>지난 패치</Button>
          <Button>전체 기간</Button>
        </ButtonGroup>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">티어 필터</h4>
        <ButtonGroup size="sm">
          <Button variant="outline">전체</Button>
          <Button variant="outline">S티어</Button>
          <Button variant="outline">A티어</Button>
          <Button variant="outline">B티어</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'TFT Meta Analyzer에서 실제로 사용될 수 있는 버튼 조합들입니다.'
      }
    }
  }
};

// 로딩 상태 데모
export const LoadingDemo: Story = {
  render: () => {
    const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});

    const handleClick = (id: string) => {
      setLoadingStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setLoadingStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    };

    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <Button 
            loading={loadingStates.search}
            onClick={() => handleClick('search')}
            leftIcon={!loadingStates.search && <SearchIcon />}
          >
            검색하기
          </Button>
          <Button 
            variant="secondary"
            loading={loadingStates.save}
            onClick={() => handleClick('save')}
          >
            저장하기
          </Button>
          <Button 
            variant="danger"
            loading={loadingStates.delete}
            onClick={() => handleClick('delete')}
            leftIcon={!loadingStates.delete && <TrashIcon />}
          >
            삭제하기
          </Button>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '클릭하면 2초간 로딩 상태가 되는 인터랙티브 데모입니다.'
      }
    }
  }
};

// 접근성 테스트
export const AccessibilityTest: Story = {
  args: {
    children: '접근성 테스트 버튼',
    variant: 'primary'
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
        story: '색상 대비, 버튼 라벨, 포커스 순서 등 접근성 기준을 검증하는 스토리입니다.'
      }
    }
  }
};