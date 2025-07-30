import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import Button from '../../components/common/Button';
import Input, { SearchInput, PasswordInput } from '../../components/common/Input';
import Card, { CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import ErrorMessage from '../../components/common/ErrorMessage';

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

// 폼 패턴들을 보여주는 스토리
const FormPatternsDemo: React.FC = () => {
  return <div>Form Patterns Demo</div>;
};

const meta: Meta<typeof FormPatternsDemo> = {
  title: 'Patterns/Form Patterns',
  component: FormPatternsDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
다양한 폼 패턴들을 보여주는 스토리입니다.

## 포함된 패턴
- 로그인 폼
- 회원가입 폼
- 검색 폼
- 프로필 설정 폼
- 필터링 폼
- 인라인 편집 폼
- 스테퍼 폼

## 사용 시나리오
- 사용자 인증
- 데이터 입력
- 검색 및 필터링
- 설정 변경
- 프로필 관리
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof FormPatternsDemo>;

// 기본 로그인 폼
export const LoginForm: Story = {
  render: () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
      email: '',
      password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      // 시뮬레이션
      setTimeout(() => {
        if (formData.email === 'test@test.com' && formData.password === 'password') {
          setLoading(false);
          alert('로그인 성공!');
        } else {
          setError('이메일 또는 패스워드가 올바르지 않습니다.');
          setLoading(false);
        }
      }, 1500);
    };

    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary text-center">
              로그인
            </h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center">
              TFT Meta Analyzer에 오신 것을 환영합니다
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <ErrorMessage 
                  type="validation" 
                  message={error}
                  showDismiss
                  onDismiss={() => setError('')}
                />
              )}
              
              <Input
                label="이메일"
                type="email"
                leftIcon={<EmailIcon />}
                placeholder="이메일을 입력하세요"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
              
              <PasswordInput
                label="패스워드"
                placeholder="패스워드를 입력하세요"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
              
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  로그인 상태 유지
                </label>
                <a href="#" className="text-brand-mint hover:underline">
                  패스워드 찾기
                </a>
              </div>
              
              <Button
                type="submit"
                loading={loading}
                fullWidth
              >
                로그인
              </Button>
            </form>
          </CardContent>
          
          <CardFooter>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center">
              계정이 없으신가요?{' '}
              <a href="#" className="text-brand-mint hover:underline">
                회원가입
              </a>
            </p>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary text-center mt-2">
              💡 테스트: test@test.com / password
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '기본적인 로그인 폼 패턴입니다. 이메일 검증, 로딩 상태, 에러 처리를 포함합니다.'
      }
    }
  }
};

// 회원가입 폼
export const SignupForm: Story = {
  render: () => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
      summonerName: '',
      email: '',
      password: '',
      confirmPassword: '',
      region: 'kr',
      agreeToTerms: false
    });

    const validateForm = () => {
      const newErrors: Record<string, string> = {};
      
      if (!formData.summonerName) {
        newErrors.summonerName = '소환사 이름을 입력해주세요.';
      }
      
      if (!formData.email) {
        newErrors.email = '이메일을 입력해주세요.';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = '올바른 이메일 형식이 아닙니다.';
      }
      
      if (!formData.password) {
        newErrors.password = '패스워드를 입력해주세요.';
      } else if (formData.password.length < 8) {
        newErrors.password = '패스워드는 8자 이상이어야 합니다.';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '패스워드가 일치하지 않습니다.';
      }
      
      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = '이용약관에 동의해주세요.';
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) return;
      
      setLoading(true);
      
      // 시뮬레이션
      setTimeout(() => {
        setLoading(false);
        alert('회원가입이 완료되었습니다!');
      }, 2000);
    };

    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary text-center">
              회원가입
            </h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center">
              새로운 계정을 만들어보세요
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <SearchInput
                label="소환사 이름"
                placeholder="소환사 이름을 검색하세요"
                value={formData.summonerName}
                onChange={(e) => setFormData(prev => ({ ...prev, summonerName: e.target.value }))}
                onSearch={(name) => console.log('Searching:', name)}
                error={!!errors.summonerName}
                helperText={errors.summonerName || "Riot 게임 소환사 이름을 입력하세요"}
              />
              
              <Input
                label="이메일"
                type="email"
                leftIcon={<EmailIcon />}
                placeholder="이메일을 입력하세요"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                error={!!errors.email}
                helperText={errors.email}
              />
              
              <PasswordInput
                label="패스워드"
                placeholder="패스워드를 입력하세요"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                error={!!errors.password}
                helperText={errors.password || "8자 이상, 숫자와 특수문자 포함"}
              />
              
              <PasswordInput
                label="패스워드 확인"
                placeholder="패스워드를 다시 입력하세요"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
              />
              
              <Input
                label="서버 지역"
                leftAddon="Server:"
                placeholder="kr"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                helperText="플레이하는 서버 지역 (kr, na, euw 등)"
              />
              
              <div className="space-y-3">
                <label className="flex items-start text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 mr-2"
                    checked={formData.agreeToTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                  />
                  <span>
                    <a href="#" className="text-brand-mint hover:underline">이용약관</a> 및{' '}
                    <a href="#" className="text-brand-mint hover:underline">개인정보 처리방침</a>에 동의합니다
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="text-xs text-error-red">{errors.agreeToTerms}</p>
                )}
              </div>
              
              <Button
                type="submit"
                loading={loading}
                fullWidth
              >
                계정 만들기
              </Button>
            </form>
          </CardContent>
          
          <CardFooter>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center">
              이미 계정이 있으신가요?{' '}
              <a href="#" className="text-brand-mint hover:underline">
                로그인
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '회원가입 폼 패턴입니다. 폼 검증, 실시간 오류 표시, 복잡한 입력 필드들을 포함합니다.'
      }
    }
  }
};

// 검색 폼
export const SearchForm: Story = {
  render: () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
      region: 'kr',
      tier: '',
      queue: 'ranked'
    });
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<string[]>([]);

    const handleSearch = async (query: string) => {
      if (!query.trim()) return;
      
      setSearching(true);
      
      // 시뮬레이션
      setTimeout(() => {
        setResults([
          `"${query}" - 다이아 II (3,456 LP)`,
          `"${query}" - 마스터 (234 LP)`,
          `"${query}" - 챌린저 (1,234 LP)`,
        ]);
        setSearching(false);
      }, 1000);
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              소환사 검색
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              소환사 이름으로 프로필과 통계를 검색하세요
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <SearchInput
                size="lg"
                placeholder="소환사 이름을 입력하세요 (예: Hide on bush)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={handleSearch}
                loading={searching}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="서버"
                  placeholder="kr"
                  value={filters.region}
                  onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                  size="sm"
                />
                
                <Input
                  label="최소 티어"
                  placeholder="다이아"
                  value={filters.tier}
                  onChange={(e) => setFilters(prev => ({ ...prev, tier: e.target.value }))}
                  size="sm"
                />
                
                <Input
                  label="큐 타입"
                  placeholder="랭크"
                  value={filters.queue}
                  onChange={(e) => setFilters(prev => ({ ...prev, queue: e.target.value }))}
                  size="sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">
                검색 결과
              </h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 border border-border-light dark:border-dark-border-light rounded-lg hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary dark:text-dark-text-primary">
                        {result}
                      </span>
                      <Button size="sm" variant="outline">
                        보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '검색 폼 패턴입니다. 메인 검색과 필터링 옵션, 결과 표시를 포함합니다.'
      }
    }
  }
};

// 인라인 편집 폼
export const InlineEditForm: Story = {
  render: () => {
    const [editingField, setEditingField] = useState<string | null>(null);
    const [profileData, setProfileData] = useState({
      name: '홍길동',
      email: 'test@example.com',
      summonerName: 'Hide on bush',
      region: 'kr',
      bio: 'TFT를 좋아하는 플레이어입니다.'
    });
    const [tempValue, setTempValue] = useState('');

    const startEdit = (field: string) => {
      setEditingField(field);
      setTempValue(profileData[field as keyof typeof profileData]);
    };

    const saveEdit = () => {
      if (editingField) {
        setProfileData(prev => ({
          ...prev,
          [editingField]: tempValue
        }));
      }
      setEditingField(null);
      setTempValue('');
    };

    const cancelEdit = () => {
      setEditingField(null);
      setTempValue('');
    };

    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              프로필 설정
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              클릭하여 정보를 수정하세요
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {Object.entries(profileData).map(([key, value]) => (
                <div
                  key={key}
                  className="group border border-transparent hover:border-border-light dark:hover:border-dark-border-light rounded-lg p-3 transition-colors"
                >
                  <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1 capitalize">
                    {key === 'summonerName' ? '소환사 이름' : 
                     key === 'bio' ? '소개' : key}
                  </label>
                  
                  {editingField === key ? (
                    <div className="flex gap-2">
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        size="sm"
                      />
                      <Button size="sm" onClick={saveEdit}>
                        ✓
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer text-text-primary dark:text-dark-text-primary group-hover:text-brand-mint transition-colors"
                      onClick={() => startEdit(key)}
                    >
                      {value || '클릭하여 추가...'}
                      <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        ✏️
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          
          <CardFooter>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
              💡 Enter키로 저장, Escape키로 취소할 수 있습니다
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '인라인 편집 폼 패턴입니다. 클릭으로 편집 모드를 활성화하고 키보드 단축키를 지원합니다.'
      }
    }
  }
};

// 스테퍼 폼
export const StepperForm: Story = {
  render: () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
      // Step 1
      accountType: 'personal',
      summonerName: '',
      
      // Step 2
      email: '',
      password: '',
      
      // Step 3
      region: 'kr',
      preferredQueue: 'ranked',
      notifications: true
    });

    const steps = [
      { number: 1, title: '계정 유형', description: '어떤 용도로 사용하시나요?' },
      { number: 2, title: '로그인 정보', description: '이메일과 패스워드를 설정하세요' },
      { number: 3, title: '게임 설정', description: '플레이 정보를 알려주세요' }
    ];

    const nextStep = () => {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    };

    const prevStep = () => {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
      }
    };

    const renderStepContent = () => {
      switch (currentStep) {
        case 1:
          return (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block">
                  <input
                    type="radio"
                    name="accountType"
                    value="personal"
                    checked={formData.accountType === 'personal'}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                    className="mr-2"
                  />
                  개인 사용 - 개인 통계 및 분석
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="accountType"
                    value="coach"
                    checked={formData.accountType === 'coach'}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                    className="mr-2"
                  />
                  코치/분석가 - 팀 관리 및 고급 분석
                </label>
              </div>
              
              <SearchInput
                label="소환사 이름"
                placeholder="소환사 이름을 입력하세요"
                value={formData.summonerName}
                onChange={(e) => setFormData(prev => ({ ...prev, summonerName: e.target.value }))}
                onSearch={(name) => console.log('Validating:', name)}
              />
            </div>
          );
          
        case 2:
          return (
            <div className="space-y-4">
              <Input
                label="이메일"
                type="email"
                leftIcon={<EmailIcon />}
                placeholder="이메일을 입력하세요"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
              
              <PasswordInput
                label="패스워드"
                placeholder="패스워드를 입력하세요"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                helperText="8자 이상, 숫자와 특수문자 포함"
              />
            </div>
          );
          
        case 3:
          return (
            <div className="space-y-4">
              <Input
                label="주 서버"
                leftAddon="Server:"
                placeholder="kr"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
              />
              
              <Input
                label="선호 큐"
                placeholder="ranked"
                value={formData.preferredQueue}
                onChange={(e) => setFormData(prev => ({ ...prev, preferredQueue: e.target.value }))}
                helperText="주로 플레이하는 게임 모드"
              />
              
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={formData.notifications}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifications: e.target.checked }))}
                  className="mr-2"
                />
                이메일 알림 받기 (패치 노트, 메타 변화 등)
              </label>
            </div>
          );
          
        default:
          return null;
      }
    };

    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            {/* 스텝 인디케이터 */}
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        currentStep >= step.number
                          ? 'bg-brand-mint text-white'
                          : 'bg-tft-gray-200 dark:bg-dark-tft-gray-200 text-text-secondary'
                      }`}
                    >
                      {step.number}
                    </div>
                    <span className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        currentStep > step.number
                          ? 'bg-brand-mint'
                          : 'bg-tft-gray-200 dark:bg-dark-tft-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              {steps[currentStep - 1].title}
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              {steps[currentStep - 1].description}
            </p>
          </CardHeader>
          
          <CardContent>
            {renderStepContent()}
          </CardContent>
          
          <CardFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                이전
              </Button>
              
              {currentStep < steps.length ? (
                <Button onClick={nextStep}>
                  다음
                </Button>
              ) : (
                <Button onClick={() => alert('가입 완료!')}>
                  완료
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '단계별 스테퍼 폼 패턴입니다. 복잡한 가입 과정을 여러 단계로 나누어 진행합니다.'
      }
    }
  }
};

// 필터링 폼
export const FilterForm: Story = {
  render: () => {
    const [filters, setFilters] = useState({
      search: '',
      tier: '',
      cost: '',
      trait: '',
      patch: '13.24',
      minGames: '10'
    });
    const [results, setResults] = useState<number>(0);

    const handleFilter = () => {
      // 시뮬레이션
      const randomResults = Math.floor(Math.random() * 50) + 10;
      setResults(randomResults);
    };

    const resetFilters = () => {
      setFilters({
        search: '',
        tier: '',
        cost: '',
        trait: '',
        patch: '13.24',
        minGames: '10'
      });
      setResults(0);
    };

    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              메타 덱 필터
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              원하는 조건으로 덱을 검색하고 필터링하세요
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <SearchInput
                label="덱 이름 검색"
                placeholder="하이롤, 리롤 등"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                onSearch={handleFilter}
                size="sm"
              />
              
              <Input
                label="티어"
                placeholder="S, A, B, C, D"
                value={filters.tier}
                onChange={(e) => setFilters(prev => ({ ...prev, tier: e.target.value }))}
                size="sm"
              />
              
              <Input
                label="코스트"
                type="number"
                placeholder="1-5"
                value={filters.cost}
                onChange={(e) => setFilters(prev => ({ ...prev, cost: e.target.value }))}
                size="sm"
              />
              
              <Input
                label="시너지"
                placeholder="무정부주의자, 저격수 등"
                value={filters.trait}
                onChange={(e) => setFilters(prev => ({ ...prev, trait: e.target.value }))}
                size="sm"
              />
              
              <Input
                label="패치 버전"
                placeholder="13.24"
                value={filters.patch}
                onChange={(e) => setFilters(prev => ({ ...prev, patch: e.target.value }))}
                size="sm"
              />
              
              <Input
                label="최소 게임 수"
                type="number"
                placeholder="10"
                value={filters.minGames}
                onChange={(e) => setFilters(prev => ({ ...prev, minGames: e.target.value }))}
                size="sm"
              />
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleFilter}>
                필터 적용
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                초기화
              </Button>
            </div>
            
            {results > 0 && (
              <div className="mt-4 p-3 bg-brand-mint/10 rounded-lg">
                <p className="text-sm text-text-primary dark:text-dark-text-primary">
                  <span className="font-bold text-brand-mint">{results}개</span>의 덱이 조건에 맞습니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '복잡한 필터링 폼 패턴입니다. 여러 조건을 조합하여 데이터를 검색할 수 있습니다.'
      }
    }
  }
};

// 폼 패턴 비교
export const FormPatternsComparison: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
          폼 패턴 가이드
        </h2>
        <p className="text-text-secondary dark:text-dark-text-secondary">
          다양한 상황에 맞는 폼 패턴들을 선택하세요
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card hover>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mx-auto flex items-center justify-center text-white">
                🔐
              </div>
              <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">
                로그인 폼
              </h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                간단하고 깔끔한 인증 폼
              </p>
              <ul className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
                <li>• 최소한의 필드</li>
                <li>• 명확한 에러 메시지</li>
                <li>• 로딩 상태 표시</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card hover>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-green-500 rounded-lg mx-auto flex items-center justify-center text-white">
                📝
              </div>
              <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">
                회원가입 폼
              </h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                단계별 정보수집 폼
              </p>
              <ul className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
                <li>• 실시간 검증</li>
                <li>• 진행 상황 표시</li>
                <li>• 도움말 제공</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card hover>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-purple-500 rounded-lg mx-auto flex items-center justify-center text-white">
                🔍
              </div>
              <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">
                검색 폼
              </h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                빠르고 직관적인 검색
              </p>
              <ul className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
                <li>• 자동 완성 지원</li>
                <li>• 필터 옵션</li>
                <li>• 즉시 결과 표시</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card hover>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-orange-500 rounded-lg mx-auto flex items-center justify-center text-white">
                ✏️
              </div>
              <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">
                인라인 편집
              </h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                즉석에서 수정 가능한 폼
              </p>
              <ul className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
                <li>• 클릭으로 편집</li>
                <li>• 키보드 단축키</li>
                <li>• 즉시 저장/취소</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card hover>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-red-500 rounded-lg mx-auto flex items-center justify-center text-white">
                📊
              </div>
              <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">
                필터 폼
              </h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                복잡한 조건 설정 폼
              </p>
              <ul className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
                <li>• 다중 조건 지원</li>
                <li>• 실시간 결과</li>
                <li>• 저장된 필터</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card hover>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-teal-500 rounded-lg mx-auto flex items-center justify-center text-white">
                🔢
              </div>
              <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">
                스테퍼 폼
              </h4>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                단계별 진행 폼
              </p>
              <ul className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
                <li>• 진행 상황 표시</li>
                <li>• 뒤로가기 지원</li>
                <li>• 단계별 검증</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card variant="filled">
        <CardContent>
          <h4 className="font-semibold text-text-primary dark:text-dark-text-primary mb-3">
            💡 폼 선택 가이드
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-text-primary dark:text-dark-text-primary mb-2">
                간단한 작업 (1-3개 필드)
              </h5>
              <ul className="text-text-secondary dark:text-dark-text-secondary space-y-1">
                <li>• 로그인/로그아웃</li>
                <li>• 검색</li>
                <li>• 간단한 설정</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-text-primary dark:text-dark-text-primary mb-2">
                복잡한 작업 (4개 이상 필드)
              </h5>
              <ul className="text-text-secondary dark:text-dark-text-secondary space-y-1">
                <li>• 회원가입</li>
                <li>• 프로필 설정</li>
                <li>• 스테퍼 폼 사용</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '다양한 폼 패턴들을 비교하고 언제 어떤 패턴을 사용해야 하는지 가이드를 제공합니다.'
      }
    }
  }
};