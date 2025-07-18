import type { Meta, StoryObj } from '@storybook/react';
import Skeleton, { 
  SkeletonText, 
  SkeletonCircle, 
  SkeletonRectangle, 
  SkeletonCard, 
  SkeletonList, 
  SkeletonTable 
} from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Common/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
콘텐츠 로딩 중에 표시되는 스켈레톤 컴포넌트입니다.

## 특징
- 3가지 기본 변형: rectangular, circular, text
- 2가지 애니메이션: pulse (기본), wave, none
- 다크모드 완전 지원
- 복합 스켈레톤 컴포넌트 제공 (Card, List, Table)
- 멀티라인 텍스트 지원

## 사용법
\`\`\`tsx
// 기본 사용
<Skeleton width="100px" height="20px" />

// 원형 스켈레톤
<SkeletonCircle width={48} height={48} />

// 텍스트 스켈레톤 (멀티라인)
<SkeletonText lines={3} />

// 카드 스켈레톤
<SkeletonCard />

// 리스트 스켈레톤
<SkeletonList items={5} />
\`\`\`
        `
      }
    }
  },
  argTypes: {
    width: {
      control: { type: 'text' },
      description: '너비 (CSS 값 또는 픽셀)',
      defaultValue: '100%'
    },
    height: {
      control: { type: 'text' },
      description: '높이 (CSS 값 또는 픽셀)',
      defaultValue: '1rem'
    },
    variant: {
      control: { type: 'select' },
      options: ['rectangular', 'circular', 'text'],
      description: '스켈레톤 변형',
      defaultValue: 'rectangular'
    },
    animation: {
      control: { type: 'select' },
      options: ['pulse', 'wave', 'none'],
      description: '애니메이션 타입',
      defaultValue: 'pulse'
    },
    lines: {
      control: { type: 'number', min: 1, max: 10 },
      description: '텍스트 라인 수 (variant="text"일 때만)',
      defaultValue: 1
    },
    className: {
      control: 'text',
      description: '추가 CSS 클래스'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

// 기본 스토리
export const Default: Story = {
  args: {
    width: '200px',
    height: '20px'
  }
};

// 다양한 크기
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Skeleton width="100px" height="16px" />
      <Skeleton width="200px" height="20px" />
      <Skeleton width="300px" height="24px" />
      <Skeleton width="100%" height="32px" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '다양한 크기의 스켈레톤입니다.'
      }
    }
  }
};

// 변형들
export const Variants: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <Skeleton variant="rectangular" width="120px" height="80px" />
      <Skeleton variant="circular" width="80px" height="80px" />
      <div className="flex-1">
        <Skeleton variant="text" width="200px" height="16px" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '사각형, 원형, 텍스트 변형을 보여줍니다.'
      }
    }
  }
};

// 애니메이션 타입
export const Animations: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Pulse (기본)</h4>
        <Skeleton animation="pulse" width="200px" height="20px" />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Wave</h4>
        <Skeleton animation="wave" width="200px" height="20px" />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">None</h4>
        <Skeleton animation="none" width="200px" height="20px" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '사용 가능한 애니메이션 타입들입니다.'
      }
    }
  }
};

// 텍스트 스켈레톤
export const TextSkeletons: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-2">단일 라인</h4>
        <SkeletonText width="250px" height="16px" />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">3줄 텍스트</h4>
        <SkeletonText lines={3} height="16px" />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">5줄 텍스트</h4>
        <SkeletonText lines={5} height="14px" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '단일 라인 및 멀티라인 텍스트 스켈레톤입니다. 마지막 라인은 자동으로 75% 너비로 설정됩니다.'
      }
    }
  }
};

// 원형 스켈레톤
export const CircularSkeletons: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <SkeletonCircle width={32} height={32} />
      <SkeletonCircle width={48} height={48} />
      <SkeletonCircle width={64} height={64} />
      <SkeletonCircle width={80} height={80} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '다양한 크기의 원형 스켈레톤입니다. 프로필 이미지, 아바타 등에 사용됩니다.'
      }
    }
  }
};

// 사각형 스켈레톤
export const RectangularSkeletons: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <SkeletonRectangle width="150px" height="100px" />
      <SkeletonRectangle width="150px" height="100px" />
      <SkeletonRectangle width="150px" height="80px" />
      <SkeletonRectangle width="150px" height="120px" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '다양한 크기의 사각형 스켈레톤입니다. 이미지, 카드 등에 사용됩니다.'
      }
    }
  }
};

// 카드 스켈레톤
export const CardSkeleton: Story = {
  render: () => (
    <div className="max-w-md">
      <SkeletonCard />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '프로필 이미지, 제목, 설명이 포함된 카드 형태의 스켈레톤입니다.'
      }
    }
  }
};

// 리스트 스켈레톤
export const ListSkeleton: Story = {
  render: () => (
    <div className="max-w-md">
      <SkeletonList items={5} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '아이템 목록을 위한 스켈레톤입니다. 각 아이템은 아바타와 텍스트로 구성됩니다.'
      }
    }
  }
};

// 테이블 스켈레톤
export const TableSkeleton: Story = {
  render: () => (
    <div className="max-w-2xl">
      <SkeletonTable rows={5} columns={4} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '테이블 형태의 데이터를 위한 스켈레톤입니다. 헤더와 바디로 구분됩니다.'
      }
    }
  }
};

// 복합 레이아웃
export const ComplexLayout: Story = {
  render: () => (
    <div className="max-w-4xl space-y-6">
      {/* 헤더 섹션 */}
      <div className="flex items-center space-x-4 p-4 border rounded-lg">
        <SkeletonCircle width={64} height={64} />
        <div className="flex-1 space-y-2">
          <SkeletonText width="200px" height="20px" />
          <SkeletonText width="300px" height="16px" />
          <SkeletonText width="150px" height="14px" />
        </div>
        <SkeletonRectangle width="100px" height="36px" />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <SkeletonRectangle width="100%" height="200px" />
          <SkeletonText lines={4} />
        </div>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonList items={3} />
        </div>
      </div>

      {/* 테이블 섹션 */}
      <div>
        <SkeletonText width="150px" height="24px" className="mb-4" />
        <SkeletonTable rows={3} columns={5} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '실제 페이지 레이아웃과 유사한 복합 스켈레톤 구성입니다.'
      }
    }
  }
};

// TFT 특화 스켈레톤
export const TFTSpecific: Story = {
  render: () => (
    <div className="space-y-6">
      {/* 챔피언 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <SkeletonRectangle width="100%" height="80px" />
            <SkeletonText width="80%" height="16px" />
            <SkeletonText width="60%" height="14px" />
          </div>
        ))}
      </div>

      {/* 매치 히스토리 */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <SkeletonText width="60px" height="20px" />
            <SkeletonCircle width={40} height={40} />
            <div className="flex-1 space-y-1">
              <SkeletonText width="120px" height="16px" />
              <SkeletonText width="80px" height="14px" />
            </div>
            <SkeletonText width="50px" height="16px" />
          </div>
        ))}
      </div>

      {/* 티어리스트 */}
      <div className="space-y-4">
        {['S', 'A', 'B', 'C'].map((tier) => (
          <div key={tier} className="flex items-center space-x-4">
            <SkeletonText width="30px" height="40px" />
            <div className="flex space-x-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRectangle key={i} width="50px" height="50px" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'TFT Meta Analyzer에 특화된 스켈레톤 레이아웃들입니다.'
      }
    }
  }
};

// 반응형 테스트
export const ResponsiveTest: Story = {
  render: () => (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonList items={3} />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'mobile'
    },
    docs: {
      description: {
        story: '모바일 환경에서의 스켈레톤 동작을 확인할 수 있습니다.'
      }
    }
  }
};