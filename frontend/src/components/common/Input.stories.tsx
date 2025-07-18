import type { Meta, StoryObj } from '@storybook/react';
import Input, { SearchInput, PasswordInput } from './Input';
import { useState } from 'react';

// 아이콘 컴포넌트들
const UserIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const meta: Meta<typeof Input> = {
  title: 'Components/Common/Input',
  component: Input,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
다양한 형태의 입력 필드를 제공하는 컴포넌트입니다.

## 특징
- 3가지 크기: sm, md, lg
- 3가지 변형: default, filled, unstyled
- 좌우 아이콘 지원
- 좌우 애드온 지원
- 라벨과 도움말 텍스트
- 에러 상태 지원
- 다크모드 완전 지원
- 특화 컴포넌트: SearchInput, PasswordInput

## 사용법
\`\`\`tsx
// 기본 사용
<Input placeholder="이름을 입력하세요" />

// 라벨과 도움말
<Input 
  label="이메일" 
  placeholder="your@email.com"
  helperText="로그인에 사용할 이메일을 입력하세요"
/>

// 아이콘과 함께
<Input 
  leftIcon={<UserIcon />}
  placeholder="사용자 이름"
/>

// 애드온과 함께
<Input 
  leftAddon="https://"
  placeholder="example.com"
/>

// 에러 상태
<Input 
  error
  helperText="올바른 이메일 형식이 아닙니다"
/>

// 검색 입력
<SearchInput 
  placeholder="검색어를 입력하세요"
  onSearch={(value) => console.log('Searching:', value)}
/>

// 패스워드 입력
<PasswordInput 
  label="패스워드"
  placeholder="패스워드를 입력하세요"
/>
\`\`\`
        `
      }
    }
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: '입력 필드 크기'
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'filled', 'unstyled'],
      description: '입력 필드 변형'
    },
    error: {
      control: 'boolean',
      description: '에러 상태'
    },
    disabled: {
      control: 'boolean',
      description: '비활성화 상태'
    },
    label: {
      control: 'text',
      description: '라벨 텍스트'
    },
    helperText: {
      control: 'text',
      description: '도움말 텍스트'
    },
    placeholder: {
      control: 'text',
      description: '플레이스홀더 텍스트'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Input>;

// 기본 스토리
export const Default: Story = {
  args: {
    placeholder: '기본 입력 필드'
  }
};

// 크기별
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Input size="sm" placeholder="작은 크기 (Small)" />
      <Input size="md" placeholder="중간 크기 (Medium)" />
      <Input size="lg" placeholder="큰 크기 (Large)" />
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

// 변형별
export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <Input variant="default" placeholder="기본 스타일 (Default)" />
      <Input variant="filled" placeholder="채워진 스타일 (Filled)" />
      <Input variant="unstyled" placeholder="스타일 없음 (Unstyled)" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '3가지 스타일 변형을 비교합니다.'
      }
    }
  }
};

// 상태별
export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <Input placeholder="일반 상태" />
      <Input placeholder="포커스된 상태" autoFocus />
      <Input placeholder="비활성화된 상태" disabled />
      <Input placeholder="에러 상태" error />
      <Input placeholder="에러 상태" error helperText="오류가 발생했습니다." />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '다양한 상태의 입력 필드들입니다.'
      }
    }
  }
};

// 라벨과 도움말
export const WithLabelsAndHelpers: Story = {
  render: () => (
    <div className="space-y-6">
      <Input 
        label="이름" 
        placeholder="홍길동"
        helperText="실명을 입력해주세요."
      />
      <Input 
        label="이메일" 
        type="email"
        placeholder="your@email.com"
        helperText="로그인에 사용할 이메일 주소입니다."
      />
      <Input 
        label="나이" 
        type="number"
        placeholder="25"
        error
        helperText="올바른 나이를 입력해주세요."
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '라벨과 도움말 텍스트가 있는 입력 필드들입니다.'
      }
    }
  }
};

// 아이콘과 함께
export const WithIcons: Story = {
  render: () => (
    <div className="space-y-4">
      <Input 
        leftIcon={<UserIcon />}
        placeholder="사용자 이름"
      />
      <Input 
        leftIcon={<EmailIcon />}
        type="email"
        placeholder="이메일 주소"
      />
      <Input 
        rightIcon={<SearchIcon />}
        placeholder="검색어를 입력하세요"
      />
      <Input 
        leftIcon={<UserIcon />}
        rightIcon={<SearchIcon />}
        placeholder="사용자 검색"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '좌측, 우측, 양쪽 아이콘을 가진 입력 필드들입니다.'
      }
    }
  }
};

// 애드온과 함께
export const WithAddons: Story = {
  render: () => (
    <div className="space-y-4">
      <Input 
        leftAddon="https://"
        placeholder="example.com"
        label="웹사이트 URL"
      />
      <Input 
        rightAddon=".com"
        placeholder="mysite"
        label="도메인 이름"
      />
      <Input 
        leftAddon="$"
        rightAddon="USD"
        placeholder="0.00"
        type="number"
        label="가격"
      />
      <Input 
        leftAddon="@"
        placeholder="username"
        label="사용자 이름"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '좌우 애드온이 있는 입력 필드들입니다. URL, 가격, 사용자명 등에 유용합니다.'
      }
    }
  }
};

// 검색 입력
export const SearchInputs: Story = {
  render: () => {
    const [searchValue, setSearchValue] = useState('');
    const [results, setResults] = useState<string[]>([]);

    const handleSearch = (value: string) => {
      // 실제로는 API 호출
      setResults([
        `"${value}"에 대한 결과 1`,
        `"${value}"에 대한 결과 2`,
        `"${value}"에 대한 결과 3`,
      ]);
    };

    return (
      <div className="space-y-4">
        <SearchInput 
          placeholder="기본 검색"
          onSearch={handleSearch}
        />
        
        <SearchInput 
          label="소환사 검색"
          placeholder="소환사 이름을 입력하세요"
          size="lg"
          onSearch={handleSearch}
        />
        
        <SearchInput 
          placeholder="제어된 검색"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSearch={handleSearch}
          onClear={() => {
            setSearchValue('');
            setResults([]);
          }}
        />

        {results.length > 0 && (
          <div className="mt-4 p-3 bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded-lg">
            <h4 className="text-sm font-medium mb-2">검색 결과:</h4>
            <ul className="text-sm space-y-1">
              {results.map((result, index) => (
                <li key={index}>{result}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
검색 기능이 내장된 입력 필드입니다.

\`\`\`tsx
<SearchInput 
  placeholder="검색어를 입력하세요"
  onSearch={(value) => console.log('Searching:', value)}
  onClear={() => console.log('Cleared')}
/>
\`\`\`
        `
      }
    }
  }
};

// 패스워드 입력
export const PasswordInputs: Story = {
  render: () => (
    <div className="space-y-4">
      <PasswordInput 
        placeholder="패스워드 입력"
      />
      
      <PasswordInput 
        label="패스워드"
        placeholder="패스워드를 입력하세요"
        helperText="8자 이상, 숫자와 특수문자 포함"
      />
      
      <PasswordInput 
        label="패스워드 확인"
        placeholder="패스워드를 다시 입력하세요"
        error
        helperText="패스워드가 일치하지 않습니다"
      />

      <PasswordInput 
        label="토글 없는 패스워드"
        placeholder="패스워드"
        showToggle={false}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
패스워드 입력을 위한 특화 컴포넌트입니다. 보기/숨기기 토글 기능이 내장되어 있습니다.

\`\`\`tsx
<PasswordInput 
  label="패스워드"
  placeholder="패스워드를 입력하세요"
  showToggle={true}
/>
\`\`\`
        `
      }
    }
  }
};

// TFT 특화 입력들
export const TFTSpecific: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">소환사 검색</h4>
        <SearchInput 
          size="lg"
          placeholder="소환사 이름을 입력하세요 (예: Hide on bush)"
          onSearch={(value) => console.log('Searching summoner:', value)}
        />
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">챔피언 필터</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchInput 
            placeholder="챔피언 이름으로 검색"
            size="sm"
          />
          <Input 
            placeholder="최소 코스트"
            type="number"
            min="1"
            max="5"
            size="sm"
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">덱 코드</h4>
        <Input 
          label="덱 코드"
          placeholder="덱 코드를 붙여넣기하세요"
          helperText="TFT Tactics나 다른 도구에서 생성된 덱 코드"
        />
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">서버 선택</h4>
        <Input 
          leftAddon="https://"
          rightAddon=".api.riotgames.com"
          placeholder="kr"
          helperText="서버 지역 코드를 입력하세요"
        />
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">게임 통계 필터</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="최소 게임 수"
            type="number"
            placeholder="10"
            size="sm"
          />
          <Input 
            label="최소 티어"
            placeholder="다이아"
            size="sm"
          />
          <Input 
            label="패치 버전"
            placeholder="13.24"
            size="sm"
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'TFT Meta Analyzer에서 실제로 사용될 수 있는 입력 필드들입니다.'
      }
    }
  }
};

// 폼 예제
export const FormExample: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      summoner: '',
      email: '',
      password: '',
      confirmPassword: '',
      region: 'kr',
      notifications: true
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Form submitted:', formData);
    };

    return (
      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        <SearchInput 
          label="소환사 이름"
          placeholder="소환사 이름을 검색하세요"
          value={formData.summoner}
          onChange={(e) => setFormData(prev => ({ ...prev, summoner: e.target.value }))}
          onSearch={(value) => console.log('Searching:', value)}
          helperText="정확한 소환사 이름을 입력해주세요"
        />

        <Input 
          label="이메일"
          type="email"
          leftIcon={<EmailIcon />}
          placeholder="your@email.com"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          error={!!errors.email}
          helperText={errors.email || "계정 생성에 필요합니다"}
        />

        <PasswordInput 
          label="패스워드"
          placeholder="패스워드를 입력하세요"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          helperText="8자 이상, 숫자와 특수문자 포함"
        />

        <PasswordInput 
          label="패스워드 확인"
          placeholder="패스워드를 다시 입력하세요"
          value={formData.confirmPassword}
          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
          helperText={formData.password !== formData.confirmPassword && formData.confirmPassword !== '' ? "패스워드가 일치하지 않습니다" : ""}
        />

        <Input 
          label="서버 지역"
          leftAddon="Server:"
          placeholder="kr"
          value={formData.region}
          onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
          helperText="플레이하는 서버 지역을 선택하세요"
        />

        <button 
          type="submit"
          className="w-full bg-brand-mint text-white py-2.5 px-4 rounded-lg hover:bg-brand-mint/90 transition-colors"
        >
          계정 생성
        </button>
      </form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '실제 폼에서 사용되는 다양한 입력 필드들의 조합 예시입니다.'
      }
    }
  }
};

// 접근성 테스트
export const AccessibilityTest: Story = {
  args: {
    label: '접근성 테스트 입력',
    placeholder: '텍스트를 입력하세요',
    helperText: '이 필드는 접근성 기준을 준수합니다'
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
            id: 'label',
            enabled: true
          },
          {
            id: 'aria-input-field-name',
            enabled: true
          }
        ]
      }
    },
    docs: {
      description: {
        story: '라벨, 색상 대비, ARIA 속성 등 접근성 기준을 검증하는 스토리입니다.'
      }
    }
  }
};