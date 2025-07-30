import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import Card, { StatCard } from '../../components/common/Card';
import { TierListPageSkeleton } from '../../components/common/TFTSkeletons';
import Skeleton from '../../components/common/Skeleton';

// 로딩 상태 패턴들을 보여주는 스토리
const LoadingStatesDemo: React.FC = () => {
  return <div>Loading States Demo</div>;
};

const meta: Meta<typeof LoadingStatesDemo> = {
  title: 'Patterns/Loading States',
  component: LoadingStatesDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
다양한 로딩 상태 패턴들을 보여주는 스토리입니다.

## 포함된 패턴
- 버튼 로딩 상태
- 카드 스켈레톤
- 페이지 스켈레톤
- 인라인 로딩
- Progressive Loading
- 에러 상태와의 전환

## 사용 시나리오
- 데이터 페칭 중
- 폼 제출 중
- 페이지 전환 중
- 컴포넌트 초기화 중
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof LoadingStatesDemo>;

// 버튼 로딩 상태
export const ButtonLoadingStates: Story = {
  render: () => {
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    const handleClick = (id: string) => {
      setLoadingStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setLoadingStates(prev => ({ ...prev, [id]: false }));
      }, 3000);
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
            버튼 로딩 상태
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button
              loading={loadingStates.primary}
              onClick={() => handleClick('primary')}
            >
              Primary 버튼
            </Button>
            <Button
              variant="secondary"
              loading={loadingStates.secondary}
              onClick={() => handleClick('secondary')}
            >
              Secondary 버튼
            </Button>
            <Button
              variant="outline"
              loading={loadingStates.outline}
              onClick={() => handleClick('outline')}
            >
              Outline 버튼
            </Button>
            <Button
              variant="danger"
              loading={loadingStates.danger}
              onClick={() => handleClick('danger')}
            >
              Danger 버튼
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
            크기별 로딩 상태
          </h3>
          <div className="flex items-end gap-3">
            <Button
              size="sm"
              loading={loadingStates.small}
              onClick={() => handleClick('small')}
            >
              Small
            </Button>
            <Button
              size="md"
              loading={loadingStates.medium}
              onClick={() => handleClick('medium')}
            >
              Medium
            </Button>
            <Button
              size="lg"
              loading={loadingStates.large}
              onClick={() => handleClick('large')}
            >
              Large
            </Button>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '클릭 시 3초간 로딩 상태가 되는 다양한 버튼들입니다.'
      }
    }
  }
};

// 스켈레톤 로딩
export const SkeletonLoading: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
          기본 스켈레톤
        </h3>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
          카드 스켈레톤
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
          통계 카드 스켈레톤
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="w-8 h-8 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
          TFT 페이지 스켈레톤
        </h3>
        <TierListPageSkeleton />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '다양한 컴포넌트의 스켈레톤 로딩 상태입니다.'
      }
    }
  }
};

// Progressive Loading
export const ProgressiveLoading: Story = {
  render: () => {
    const [stage, setStage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const startProgressiveLoading = () => {
      setIsLoading(true);
      setStage(0);
      
      // 단계적 로딩 시뮬레이션
      const stages = [1, 2, 3, 4];
      stages.forEach((stageNum, index) => {
        setTimeout(() => {
          setStage(stageNum);
          if (index === stages.length - 1) {
            setTimeout(() => {
              setIsLoading(false);
              setStage(0);
            }, 1000);
          }
        }, (index + 1) * 1000);
      });
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
            Progressive Loading
          </h3>
          <Button 
            onClick={startProgressiveLoading} 
            disabled={isLoading}
            className="mb-4"
          >
            {isLoading ? '로딩 중...' : '단계적 로딩 시작'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1단계: 기본 구조 */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {stage >= 1 ? (
                <div className="w-12 h-12 bg-brand-mint rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
              ) : (
                <Skeleton className="w-12 h-12 rounded-full" />
              )}
              <div className="flex-1">
                {stage >= 1 ? (
                  <div>
                    <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">첫 번째 카드</h4>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">기본 정보</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                )}
              </div>
            </div>
            
            {/* 2단계: 상세 정보 */}
            {stage >= 2 ? (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">진행률</span>
                  <span className="text-sm font-medium text-brand-mint">75%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">상태</span>
                  <span className="text-sm font-medium text-green-600">활성</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            )}

            {/* 3단계: 액션 버튼 */}
            {stage >= 3 ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline">취소</Button>
                <Button size="sm">확인</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-8 w-16" />
              </div>
            )}
          </Card>

          {/* 두 번째 카드 */}
          <Card className="p-4">
            <div className="space-y-4">
              {stage >= 2 ? (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">두 번째 카드</h4>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                      두 번째 단계에서 로드됨
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <Skeleton className="w-16 h-16 rounded-full mx-auto mb-2" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </>
              )}
            </div>
          </Card>

          {/* 세 번째 카드 */}
          <Card className="p-4">
            <div className="space-y-4">
              {stage >= 4 ? (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                      ✓
                    </div>
                    <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">완료!</h4>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                      모든 데이터 로드 완료
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <Skeleton className="w-16 h-16 rounded-full mx-auto mb-2" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '단계적으로 콘텐츠가 로드되는 Progressive Loading 패턴입니다.'
      }
    }
  }
};

// 인라인 로딩
export const InlineLoading: Story = {
  render: () => {
    const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

    const toggleLoading = (id: string) => {
      setLoadingItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
            인라인 로딩 상태
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-border-light dark:border-dark-border-light rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-mint rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium text-text-primary dark:text-dark-text-primary">사용자 데이터</div>
                  <div className="text-sm text-text-secondary dark:text-dark-text-secondary">프로필 정보</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loadingItems.user ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-brand-mint border-t-transparent rounded-full"></div>
                    <span className="text-sm text-text-secondary dark:text-dark-text-secondary">로딩 중...</span>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => toggleLoading('user')}>
                    새로고침
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-border-light dark:border-dark-border-light rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium text-text-primary dark:text-dark-text-primary">매치 기록</div>
                  <div className="text-sm text-text-secondary dark:text-dark-text-secondary">최근 20게임</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loadingItems.matches ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-text-secondary dark:text-dark-text-secondary">분석 중...</span>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => toggleLoading('matches')}>
                    분석하기
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-border-light dark:border-dark-border-light rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium text-text-primary dark:text-dark-text-primary">통계 데이터</div>
                  <div className="text-sm text-text-secondary dark:text-dark-text-secondary">시즌 전체</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loadingItems.stats ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-text-secondary dark:text-dark-text-secondary">계산 중...</span>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => toggleLoading('stats')}>
                    업데이트
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '개별 섹션별로 독립적인 로딩 상태를 가지는 인라인 로딩 패턴입니다.'
      }
    }
  }
};

// 에러 상태와의 전환
export const ErrorStateTransition: Story = {
  render: () => {
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const simulateRequest = () => {
      setState('loading');
      
      setTimeout(() => {
        // 50% 확률로 성공/실패
        if (Math.random() > 0.5) {
          setState('success');
          setTimeout(() => setState('idle'), 2000);
        } else {
          setState('error');
        }
      }, 2000);
    };

    const retry = () => {
      setState('idle');
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
            로딩 → 성공/에러 전환
          </h3>
          <Card className="p-6">
            <div className="text-center space-y-4">
              {state === 'idle' && (
                <>
                  <div className="w-16 h-16 bg-tft-gray-200 dark:bg-dark-tft-gray-200 rounded-full mx-auto flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">데이터 요청 준비</h4>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                      버튼을 클릭하여 데이터를 요청하세요
                    </p>
                  </div>
                  <Button onClick={simulateRequest}>
                    데이터 요청하기
                  </Button>
                </>
              )}

              {state === 'loading' && (
                <>
                  <div className="w-16 h-16 border-4 border-brand-mint border-t-transparent rounded-full mx-auto animate-spin"></div>
                  <div>
                    <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">로딩 중...</h4>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                      데이터를 가져오고 있습니다
                    </p>
                  </div>
                </>
              )}

              {state === 'success' && (
                <>
                  <div className="w-16 h-16 bg-green-500 rounded-full mx-auto flex items-center justify-center">
                    <span className="text-2xl text-white">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-600">성공!</h4>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                      데이터를 성공적으로 불러왔습니다
                    </p>
                  </div>
                </>
              )}

              {state === 'error' && (
                <>
                  <div className="w-16 h-16 bg-error-red rounded-full mx-auto flex items-center justify-center">
                    <span className="text-2xl text-white">✕</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-error-red">오류 발생</h4>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                      데이터를 불러오는 중 문제가 발생했습니다
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={retry}>
                      취소
                    </Button>
                    <Button onClick={simulateRequest}>
                      다시 시도
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '로딩 상태에서 성공 또는 에러 상태로의 전환을 보여주는 패턴입니다.'
      }
    }
  }
};