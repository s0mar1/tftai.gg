import type { Meta, StoryObj } from '@storybook/react';
import ErrorMessage, { 
  NetworkError, 
  NotFoundError, 
  TimeoutError, 
  ValidationError, 
  UnauthorizedError, 
  MaintenanceError, 
  RateLimitError,
  type ErrorType 
} from './ErrorMessage';

const meta: Meta<typeof ErrorMessage> = {
  title: 'Components/Common/ErrorMessage',
  component: ErrorMessage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
오류 상황에 대한 사용자 친화적인 메시지를 표시하는 컴포넌트입니다.

## 특징
- 7가지 오류 타입 지원 (network, notFound, timeout, validation, unauthorized, maintenance, rateLimit, generic)
- 다크모드 완전 지원
- 재시도 및 닫기 기능
- 접근성 준수 (ARIA 레이블, 키보드 네비게이션)
- 타입별 맞춤 아이콘과 색상

## 사용법
\`\`\`tsx
// 기본 사용
<ErrorMessage type="network" />

// 커스텀 메시지와 액션
<ErrorMessage 
  type="network"
  message="사용자 정의 오류 메시지"
  onRetry={() => console.log('재시도')}
  onDismiss={() => console.log('닫기')}
  showRetry={true}
  showDismiss={true}
/>

// 헬퍼 컴포넌트 사용
<NetworkError onRetry={handleRetry} />
\`\`\`
        `
      }
    }
  },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['generic', 'network', 'notFound', 'timeout', 'validation', 'unauthorized', 'maintenance', 'rateLimit'],
      description: '오류 타입'
    },
    message: {
      control: 'text',
      description: '커스텀 오류 메시지 (선택사항)'
    },
    showRetry: {
      control: 'boolean',
      description: '재시도 버튼 표시 여부'
    },
    showDismiss: {
      control: 'boolean',
      description: '닫기 버튼 표시 여부'
    },
    onRetry: {
      action: 'onRetry',
      description: '재시도 버튼 클릭 핸들러'
    },
    onDismiss: {
      action: 'onDismiss',
      description: '닫기 버튼 클릭 핸들러'
    },
    className: {
      control: 'text',
      description: '추가 CSS 클래스'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ErrorMessage>;

// 기본 스토리
export const Default: Story = {
  args: {
    type: 'generic'
  }
};

// 네트워크 오류
export const NetworkError_: Story = {
  args: {
    type: 'network',
    showRetry: true
  },
  name: 'Network Error'
};

// 데이터 없음
export const NotFound: Story = {
  args: {
    type: 'notFound',
    showRetry: true
  }
};

// 시간 초과
export const Timeout: Story = {
  args: {
    type: 'timeout',
    showRetry: true
  }
};

// 입력 검증 오류
export const Validation: Story = {
  args: {
    type: 'validation',
    message: '이메일 형식이 올바르지 않습니다.',
    showRetry: false,
    showDismiss: true
  }
};

// 권한 없음
export const Unauthorized: Story = {
  args: {
    type: 'unauthorized',
    showRetry: false,
    showDismiss: true
  }
};

// 서비스 점검
export const Maintenance: Story = {
  args: {
    type: 'maintenance',
    showRetry: false,
    showDismiss: true
  }
};

// 요청 제한
export const RateLimit: Story = {
  args: {
    type: 'rateLimit',
    showRetry: true
  }
};

// 커스텀 메시지
export const CustomMessage: Story = {
  args: {
    type: 'network',
    message: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
    showRetry: true,
    showDismiss: true
  }
};

// 액션 버튼들
export const WithActions: Story = {
  args: {
    type: 'network',
    showRetry: true,
    showDismiss: true,
    onRetry: () => console.log('재시도 클릭'),
    onDismiss: () => console.log('닫기 클릭')
  }
};

// 스타일링 테스트
export const Styled: Story = {
  args: {
    type: 'validation',
    message: '입력된 정보를 확인해주세요.',
    className: 'max-w-md mx-auto',
    showRetry: false,
    showDismiss: true
  }
};

// 모든 타입 비교
export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <ErrorMessage type="generic" />
      <ErrorMessage type="network" showRetry />
      <ErrorMessage type="notFound" showRetry />
      <ErrorMessage type="timeout" showRetry />
      <ErrorMessage type="validation" showDismiss />
      <ErrorMessage type="unauthorized" showDismiss />
      <ErrorMessage type="maintenance" showDismiss />
      <ErrorMessage type="rateLimit" showRetry />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '모든 오류 타입을 한 번에 비교해볼 수 있는 스토리입니다.'
      }
    }
  }
};

// 헬퍼 컴포넌트들
export const HelperComponents: Story = {
  render: () => (
    <div className="space-y-4">
      <NetworkError showRetry onRetry={() => console.log('Network retry')} />
      <NotFoundError showRetry onRetry={() => console.log('NotFound retry')} />
      <TimeoutError showRetry onRetry={() => console.log('Timeout retry')} />
      <ValidationError message="커스텀 검증 오류 메시지" showDismiss />
      <UnauthorizedError showDismiss />
      <MaintenanceError showDismiss />
      <RateLimitError showRetry />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
헬퍼 컴포넌트들을 사용한 예시입니다.

\`\`\`tsx
import { NetworkError, NotFoundError, ValidationError } from './ErrorMessage';

// 사용법
<NetworkError onRetry={handleRetry} />
<NotFoundError message="사용자를 찾을 수 없습니다" />
<ValidationError showDismiss />
\`\`\`
        `
      }
    }
  }
};

// 반응형 테스트
export const ResponsiveTest: Story = {
  args: {
    type: 'network',
    showRetry: true,
    showDismiss: true
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile'
    },
    docs: {
      description: {
        story: '모바일 화면에서의 반응형 동작을 확인할 수 있습니다.'
      }
    }
  }
};

// 접근성 테스트
export const AccessibilityTest: Story = {
  args: {
    type: 'network',
    showRetry: true,
    showDismiss: true
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
          }
        ]
      }
    },
    docs: {
      description: {
        story: '접근성 기준을 준수하는지 확인하는 스토리입니다. 색상 대비, 버튼 라벨 등을 검사합니다.'
      }
    }
  }
};