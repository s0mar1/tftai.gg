import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card, { CardHeader, CardContent, CardFooter } from '../../components/common/Card';

// 접근성 가이드라인을 보여주는 스토리
const AccessibilityDemo: React.FC = () => {
  return <div>Accessibility Guidelines Demo</div>;
};

const meta: Meta<typeof AccessibilityDemo> = {
  title: 'Patterns/Accessibility Guidelines',
  component: AccessibilityDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
접근성 가이드라인과 베스트 프랙티스를 보여주는 스토리입니다.

## 주요 원칙
- **WCAG 2.1 AA 준수**: 웹 접근성 지침 준수
- **키보드 네비게이션**: 모든 기능을 키보드로 접근 가능
- **스크린리더 지원**: 의미 있는 ARIA 레이블 제공
- **색상 대비**: 충분한 색상 대비율 유지
- **포커스 관리**: 명확한 포커스 표시

## 테스트 방법
- Tab 키로 네비게이션 테스트
- 스크린 리더로 읽기 테스트
- 색상 대비 도구로 검증
- 키보드만으로 모든 기능 사용 테스트
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof AccessibilityDemo>;

// 색상 대비 테스트
export const ColorContrast: Story = {
  render: () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            색상 대비 테스트
          </h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            WCAG 2.1 AA 기준 (4.5:1) 이상의 색상 대비를 유지합니다
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 좋은 예시들 */}
            <div>
              <h4 className="text-base font-semibold text-green-600 mb-4">✅ 좋은 예시 (4.5:1 이상)</h4>
              <div className="space-y-3">
                <div className="p-3 bg-background-card dark:bg-dark-background-card border rounded-lg">
                  <div className="text-text-primary dark:text-dark-text-primary font-medium">
                    주요 텍스트 (7.2:1)
                  </div>
                  <div className="text-text-secondary dark:text-dark-text-secondary text-sm">
                    보조 텍스트 (4.8:1)
                  </div>
                </div>
                
                <Button>
                  접근 가능한 버튼
                </Button>
                
                <div className="p-3 bg-brand-mint text-white rounded-lg">
                  <div className="font-medium">브랜드 색상 텍스트 (5.1:1)</div>
                </div>
                
                <div className="p-3 bg-green-600 text-white rounded-lg">
                  <div className="font-medium">성공 메시지 (4.6:1)</div>
                </div>
                
                <div className="p-3 bg-error-red text-white rounded-lg">
                  <div className="font-medium">오류 메시지 (5.9:1)</div>
                </div>
              </div>
            </div>
            
            {/* 나쁜 예시들 */}
            <div>
              <h4 className="text-base font-semibold text-red-600 mb-4">❌ 피해야 할 예시 (4.5:1 미만)</h4>
              <div className="space-y-3">
                <div className="p-3 bg-background-card dark:bg-dark-background-card border rounded-lg">
                  <div className="text-tft-gray-200 font-medium">
                    너무 연한 텍스트 (2.1:1)
                  </div>
                  <div className="text-yellow-300 text-sm">
                    대비가 부족한 경고 (1.8:1)
                  </div>
                </div>
                
                <button className="px-4 py-2 bg-tft-gray-100 text-tft-gray-200 rounded-lg">
                  대비 부족한 버튼
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ 실제로는 이런 색상을 사용하지 마세요. 예시를 위해서만 표시됩니다.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '색상 대비 비율을 테스트하고 접근성 기준을 준수하는 예시들입니다.'
      }
    }
  }
};

// 키보드 네비게이션
export const KeyboardNavigation: Story = {
  render: () => {
    const [focusedItem, setFocusedItem] = useState<string>('');

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              키보드 네비게이션 테스트
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Tab, Shift+Tab, Enter, Space, Arrow 키로 모든 요소에 접근 가능해야 합니다
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-border-light dark:border-dark-border-light rounded-lg">
                <h4 className="font-medium mb-3 text-text-primary dark:text-dark-text-primary">
                  버튼 그룹
                </h4>
                <div className="flex gap-3">
                  <Button
                    onFocus={() => setFocusedItem('button1')}
                    onBlur={() => setFocusedItem('')}
                  >
                    첫 번째 버튼
                  </Button>
                  <Button
                    variant="outline"
                    onFocus={() => setFocusedItem('button2')}
                    onBlur={() => setFocusedItem('')}
                  >
                    두 번째 버튼
                  </Button>
                  <Button
                    variant="ghost"
                    onFocus={() => setFocusedItem('button3')}
                    onBlur={() => setFocusedItem('')}
                  >
                    세 번째 버튼
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border-2 border-dashed border-border-light dark:border-dark-border-light rounded-lg">
                <h4 className="font-medium mb-3 text-text-primary dark:text-dark-text-primary">
                  폼 요소들
                </h4>
                <div className="space-y-3">
                  <Input
                    label="이름"
                    placeholder="이름을 입력하세요"
                    onFocus={() => setFocusedItem('input1')}
                    onBlur={() => setFocusedItem('')}
                  />
                  <Input
                    label="이메일"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    onFocus={() => setFocusedItem('input2')}
                    onBlur={() => setFocusedItem('')}
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="agree"
                      onFocus={() => setFocusedItem('checkbox')}
                      onBlur={() => setFocusedItem('')}
                    />
                    <label htmlFor="agree" className="text-sm">
                      이용약관에 동의합니다
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-2 border-dashed border-border-light dark:border-dark-border-light rounded-lg">
                <h4 className="font-medium mb-3 text-text-primary dark:text-dark-text-primary">
                  링크 및 인터랙티브 요소
                </h4>
                <div className="space-y-2">
                  <a
                    href="#"
                    className="block text-brand-mint hover:underline focus:outline-none focus:ring-2 focus:ring-brand-mint rounded"
                    onFocus={() => setFocusedItem('link1')}
                    onBlur={() => setFocusedItem('')}
                  >
                    일반 링크
                  </a>
                  <button
                    className="block text-left w-full p-2 hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-mint rounded"
                    onFocus={() => setFocusedItem('customButton')}
                    onBlur={() => setFocusedItem('')}
                  >
                    커스텀 버튼
                  </button>
                </div>
              </div>
              
              {focusedItem && (
                <div className="p-3 bg-brand-mint/10 rounded-lg">
                  <p className="text-sm text-brand-mint font-medium">
                    현재 포커스: {focusedItem}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter>
            <div className="w-full space-y-2 text-xs text-text-secondary dark:text-dark-text-secondary">
              <div><kbd className="px-1 bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded">Tab</kbd> - 다음 요소로 이동</div>
              <div><kbd className="px-1 bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded">Shift+Tab</kbd> - 이전 요소로 이동</div>
              <div><kbd className="px-1 bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded">Enter/Space</kbd> - 요소 활성화</div>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Tab 키를 사용해 모든 인터랙티브 요소에 순서대로 접근할 수 있는지 테스트합니다.'
      }
    }
  }
};

// ARIA 레이블과 의미론적 HTML
export const ARIAAndSemantics: Story = {
  render: () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [notifications, setNotifications] = useState(3);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              ARIA 레이블과 의미론적 HTML
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              스크린 리더가 이해할 수 있는 의미 있는 마크업을 사용합니다
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* 제목 구조 */}
              <section>
                <h4 className="text-base font-semibold text-text-primary dark:text-dark-text-primary mb-3">
                  제목 구조 (Heading Structure)
                </h4>
                <div className="p-4 border border-border-light dark:border-dark-border-light rounded-lg">
                  <h1 className="text-2xl font-bold mb-2">메인 제목 (h1)</h1>
                  <h2 className="text-xl font-semibold mb-2">섹션 제목 (h2)</h2>
                  <h3 className="text-lg font-medium mb-2">서브 섹션 (h3)</h3>
                  <h4 className="text-base font-medium mb-2">상세 제목 (h4)</h4>
                  <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                    논리적 계층 구조를 유지하여 스크린 리더 사용자가 쉽게 탐색할 수 있습니다.
                  </p>
                </div>
              </section>

              {/* ARIA 레이블 */}
              <section>
                <h4 className="text-base font-semibold text-text-primary dark:text-dark-text-primary mb-3">
                  ARIA 레이블 예시
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Button
                      aria-label={`알림 ${notifications}개`}
                      onClick={() => setNotifications(0)}
                    >
                      🔔 알림
                      {notifications > 0 && (
                        <span
                          className="ml-2 px-2 py-1 bg-error-red text-white text-xs rounded-full"
                          aria-label={`읽지 않은 알림 ${notifications}개`}
                        >
                          {notifications}
                        </span>
                      )}
                    </Button>
                  </div>
                  
                  <div>
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      aria-expanded={isExpanded}
                      aria-controls="collapsible-content"
                      className="flex items-center space-x-2 p-2 hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100 rounded"
                    >
                      <span>{isExpanded ? '▼' : '▶'}</span>
                      <span>펼치기/접기</span>
                    </button>
                    <div
                      id="collapsible-content"
                      className={`mt-2 p-3 bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded ${
                        isExpanded ? 'block' : 'hidden'
                      }`}
                      aria-hidden={!isExpanded}
                    >
                      이 내용은 버튼을 클릭했을 때 나타납니다.
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="progress-demo" className="block text-sm font-medium mb-2">
                      진행률 (73%)
                    </label>
                    <div
                      role="progressbar"
                      aria-valuenow={73}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="프로필 완성률"
                      className="w-full bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded-full h-2"
                    >
                      <div
                        className="bg-brand-mint h-2 rounded-full transition-all duration-300"
                        style={{ width: '73%' }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 폼 레이블 */}
              <section>
                <h4 className="text-base font-semibold text-text-primary dark:text-dark-text-primary mb-3">
                  폼 접근성
                </h4>
                <form className="space-y-4">
                  <div>
                    <label 
                      htmlFor="username"
                      className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1"
                    >
                      사용자 이름 <span className="text-error-red">*</span>
                    </label>
                    <Input
                      id="username"
                      placeholder="사용자 이름을 입력하세요"
                      aria-required="true"
                      aria-describedby="username-help"
                    />
                    <div
                      id="username-help"
                      className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1"
                    >
                      3-20자, 영문과 숫자만 사용 가능
                    </div>
                  </div>
                  
                  <fieldset className="border border-border-light dark:border-dark-border-light rounded-lg p-4">
                    <legend className="px-2 text-sm font-medium">알림 설정</legend>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        이메일 알림
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        푸시 알림
                      </label>
                    </div>
                  </fieldset>
                </form>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'ARIA 속성과 의미론적 HTML을 사용하여 스크린 리더 호환성을 개선하는 예시들입니다.'
      }
    }
  }
};

// 오류 처리와 피드백
export const ErrorHandling: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      email: 'invalid-email',
      password: '123'
    });
    const [errors, setErrors] = useState({
      email: '올바른 이메일 형식이 아닙니다.',
      password: '패스워드는 최소 8자 이상이어야 합니다.'
    });
    const [submitError, setSubmitError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              오류 처리와 접근성 피드백
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              오류 메시지는 명확하고 구체적이며, 해결 방법을 제시해야 합니다
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div
                  role="alert"
                  className="p-3 bg-error-red/10 border border-error-red/20 rounded-lg"
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-error-red">⚠️</span>
                    <div>
                      <div className="font-medium text-error-red">오류가 발생했습니다</div>
                      <div className="text-sm text-error-red mt-1">{submitError}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label
                  htmlFor="error-email"
                  className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1"
                >
                  이메일 <span className="text-error-red">*</span>
                </label>
                <Input
                  id="error-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  error={!!errors.email}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <div
                    id="email-error"
                    role="alert"
                    className="text-xs text-error-red mt-1"
                  >
                    {errors.email}
                  </div>
                )}
              </div>
              
              <div>
                <label
                  htmlFor="error-password"
                  className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1"
                >
                  패스워드 <span className="text-error-red">*</span>
                </label>
                <Input
                  id="error-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  error={!!errors.password}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                {errors.password && (
                  <div
                    id="password-error"
                    role="alert"
                    className="text-xs text-error-red mt-1"
                  >
                    {errors.password}
                  </div>
                )}
              </div>
              
              <Button type="submit" aria-describedby="form-help">
                로그인
              </Button>
              
              <div id="form-help" className="text-xs text-text-secondary dark:text-dark-text-secondary">
                모든 필수 필드를 올바르게 입력한 후 로그인 버튼을 클릭하세요.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'role="alert", aria-invalid, aria-describedby 등을 사용한 접근 가능한 오류 처리 예시입니다.'
      }
    }
  }
};

// 포커스 관리
export const FocusManagement: Story = {
  render: () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTab, setCurrentTab] = useState(0);
    const modalRef = React.useRef<HTMLDivElement>(null);
    const openButtonRef = React.useRef<HTMLButtonElement>(null);

    const tabs = ['프로필', '설정', '알림'];

    const openModal = () => {
      setIsModalOpen(true);
      // 모달이 열릴 때 포커스를 모달 내부로 이동
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    };

    const closeModal = () => {
      setIsModalOpen(false);
      // 모달이 닫힐 때 포커스를 열기 버튼으로 되돌림
      openButtonRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              포커스 관리
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              모달, 탭, 드롭다운 등에서 적절한 포커스 관리가 필요합니다
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* 탭 네비게이션 */}
              <div>
                <h4 className="text-base font-semibold text-text-primary dark:text-dark-text-primary mb-3">
                  탭 네비게이션
                </h4>
                <div
                  role="tablist"
                  className="flex border-b border-border-light dark:border-dark-border-light"
                >
                  {tabs.map((tab, index) => (
                    <button
                      key={tab}
                      role="tab"
                      aria-selected={currentTab === index}
                      aria-controls={`tabpanel-${index}`}
                      id={`tab-${index}`}
                      onClick={() => setCurrentTab(index)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') {
                          setCurrentTab((currentTab + 1) % tabs.length);
                        } else if (e.key === 'ArrowLeft') {
                          setCurrentTab((currentTab - 1 + tabs.length) % tabs.length);
                        }
                      }}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        currentTab === index
                          ? 'border-brand-mint text-brand-mint'
                          : 'border-transparent text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                {tabs.map((tab, index) => (
                  <div
                    key={tab}
                    role="tabpanel"
                    id={`tabpanel-${index}`}
                    aria-labelledby={`tab-${index}`}
                    className={`mt-4 p-4 ${currentTab === index ? 'block' : 'hidden'}`}
                  >
                    <h5 className="font-medium text-text-primary dark:text-dark-text-primary">
                      {tab} 설정
                    </h5>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-2">
                      {tab}와 관련된 설정을 여기서 변경할 수 있습니다.
                    </p>
                  </div>
                ))}
              </div>
              
              {/* 모달 */}
              <div>
                <h4 className="text-base font-semibold text-text-primary dark:text-dark-text-primary mb-3">
                  모달 다이얼로그
                </h4>
                <Button ref={openButtonRef} onClick={openModal}>
                  모달 열기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 모달 */}
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={closeModal}
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              tabIndex={-1}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 max-w-md w-full mx-4 focus:outline-none focus:ring-2 focus:ring-brand-mint"
            >
              <h4 id="modal-title" className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
                모달 제목
              </h4>
              <p className="text-text-secondary dark:text-dark-text-secondary mb-6">
                이것은 접근 가능한 모달 다이얼로그입니다. ESC 키나 배경을 클릭하여 닫을 수 있습니다.
              </p>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={closeModal}>
                  취소
                </Button>
                <Button onClick={closeModal}>
                  확인
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '모달, 탭 등의 인터랙티브 요소에서 적절한 포커스 관리를 보여주는 예시입니다.'
      }
    }
  }
};

// 접근성 체크리스트
export const AccessibilityChecklist: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            접근성 체크리스트
          </h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            개발 시 확인해야 할 접근성 항목들입니다
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 필수 항목 */}
            <div>
              <h4 className="text-base font-semibold text-green-600 mb-4">
                ✅ 필수 항목 (Must Have)
              </h4>
              <div className="space-y-3">
                {[
                  '키보드로 모든 기능에 접근 가능',
                  '충분한 색상 대비 (4.5:1 이상)',
                  '의미 있는 alt 텍스트 제공',
                  '논리적인 제목 구조 (h1-h6)',
                  '폼 요소에 적절한 label 연결',
                  '포커스 표시가 명확함',
                  '오류 메시지가 구체적이고 도움이 됨',
                  'role, aria-* 속성 적절히 사용'
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 권장 항목 */}
            <div>
              <h4 className="text-base font-semibold text-blue-600 mb-4">
                💡 권장 항목 (Should Have)
              </h4>
              <div className="space-y-3">
                {[
                  '스킵 네비게이션 링크 제공',
                  'prefers-reduced-motion 지원',
                  '랜드마크 역할 사용 (nav, main, aside)',
                  '브레드크럼 네비게이션',
                  '페이지 제목이 명확함',
                  '언어 속성 설정 (lang)',
                  '자동 재생되는 미디어 제어',
                  '충분한 클릭 영역 (44px 이상)'
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-tft-gray-100 dark:bg-dark-tft-gray-100 rounded-lg">
            <h4 className="font-semibold text-text-primary dark:text-dark-text-primary mb-3">
              🛠️ 테스트 도구
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium mb-2">브라우저 확장</h5>
                <ul className="space-y-1 text-text-secondary dark:text-dark-text-secondary">
                  <li>• axe DevTools</li>
                  <li>• WAVE Web Accessibility Evaluator</li>
                  <li>• Lighthouse (접근성 감사)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2">온라인 도구</h5>
                <ul className="space-y-1 text-text-secondary dark:text-dark-text-secondary">
                  <li>• WebAIM Contrast Checker</li>
                  <li>• Colour Contrast Analyser</li>
                  <li>• NVDA, JAWS (스크린 리더)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
              ⚠️ 주의사항
            </h4>
            <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              <li>• 자동화된 도구로는 모든 접근성 문제를 찾을 수 없습니다</li>
              <li>• 실제 사용자 테스트가 가장 중요합니다</li>
              <li>• 키보드 네비게이션을 직접 테스트해보세요</li>
              <li>• 스크린 리더로 실제 읽어보는 것을 권장합니다</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '개발 시 참고할 수 있는 접근성 체크리스트와 테스트 도구 가이드입니다.'
      }
    }
  }
};