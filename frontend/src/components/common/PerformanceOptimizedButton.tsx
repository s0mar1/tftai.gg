/**
 * 성능 최적화된 버튼 컴포넌트
 * React 18 Concurrent Features + 마이크로 인터랙션 + 접근성
 */

import React, { forwardRef } from 'react';
import { useHoverAnimation, useRippleEffect } from '../../hooks/useMicroInteractions';
import { useReducedMotion } from '../../hooks/useAccessibility';

interface PerformanceOptimizedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ripple?: boolean;
  hover?: boolean;
  children: React.ReactNode;
}

const PerformanceOptimizedButton = forwardRef<HTMLButtonElement, PerformanceOptimizedButtonProps>(
  ({ 
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    ripple = true,
    hover = true,
    disabled,
    className = '',
    children,
    onClick,
    ...props 
  }, ref) => {
    
    // 마이크로 인터랙션 훅들
    const { hoverProps } = useHoverAnimation(1.02, 150);
    const { RippleContainer } = useRippleEffect();
    const { prefersReducedMotion, getAnimationClass } = useReducedMotion();
    
    // 기본 스타일
    const baseClasses = [
      'relative inline-flex items-center justify-center',
      'font-medium rounded-lg transition-all duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      getAnimationClass('transform-gpu', '') // GPU 가속 활용
    ].join(' ');
    
    // 변형별 스타일
    const variantClasses = {
      primary: [
        'bg-brand-mint hover:bg-brand-mint/90 text-white',
        'focus-visible:ring-brand-mint shadow-sm hover:shadow-md',
        'active:bg-brand-mint/95'
      ].join(' '),
      secondary: [
        'bg-background-card dark:bg-dark-background-card',
        'text-text-primary dark:text-dark-text-primary',
        'border border-border-light dark:border-dark-border-light',
        'hover:bg-background-base dark:hover:bg-dark-background-base',
        'focus-visible:ring-brand-mint shadow-sm hover:shadow-md'
      ].join(' '),
      ghost: [
        'text-text-primary dark:text-dark-text-primary',
        'hover:bg-background-card dark:hover:bg-dark-background-card',
        'focus-visible:ring-brand-mint'
      ].join(' '),
      danger: [
        'bg-error-red hover:bg-red-600 text-white',
        'focus-visible:ring-red-500 shadow-sm hover:shadow-md',
        'active:bg-red-700'
      ].join(' ')
    };
    
    // 사이즈별 스타일
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5'
    };
    
    // 로딩 상태 처리
    const isDisabled = disabled || loading;
    
    // 최종 클래스 조합
    const finalClassName = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    ].join(' ');
    
    // 클릭 핸들러 (성능 최적화)
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    }, [isDisabled, onClick]);
    
    // 호버 속성 (애니메이션 감소 설정 고려)
    const interactionProps = hover && !prefersReducedMotion ? hoverProps : {};
    
    // 버튼 콘텐츠
    const buttonContent = (
      <>
        {loading && (
          <div 
            className={getAnimationClass('animate-spin', '')}
            aria-hidden="true"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
        
        {!loading && leftIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        <span className={loading ? 'opacity-0' : 'opacity-100'}>
          {children}
        </span>
        
        {!loading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </>
    );
    
    // 리플 효과가 활성화된 경우
    if (ripple && !prefersReducedMotion) {
      return (
        <RippleContainer className={finalClassName}>
          <button
            ref={ref}
            disabled={isDisabled}
            onClick={handleClick}
            aria-busy={loading}
            aria-disabled={isDisabled}
            {...interactionProps}
            {...props}
            className="w-full h-full flex items-center justify-center gap-inherit"
          >
            {buttonContent}
          </button>
        </RippleContainer>
      );
    }
    
    // 기본 버튼
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        aria-busy={loading}
        aria-disabled={isDisabled}
        className={finalClassName}
        {...interactionProps}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

PerformanceOptimizedButton.displayName = 'PerformanceOptimizedButton';

export default PerformanceOptimizedButton;