/**
 * 접근성 최적화된 카드 컴포넌트
 * 키보드 네비게이션, 스크린 리더, 마이크로 인터랙션 지원
 */

import React, { forwardRef } from 'react';
import { useHoverAnimation, useScrollAnimation } from '../../hooks/useMicroInteractions';
import { useReducedMotion, useScreenReaderText } from '../../hooks/useAccessibility';

interface AccessibleCardProps {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: {
    src: string;
    alt: string;
  };
  stats?: Array<{
    label: string;
    value: number | string;
    format?: 'number' | 'percentage' | 'placement';
  }>;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
  animateOnScroll?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  // 접근성 속성
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
}

const AccessibleCard = forwardRef<HTMLDivElement, AccessibleCardProps>(({
  title,
  subtitle,
  description,
  image,
  stats = [],
  actions = [],
  clickable = false,
  onClick,
  className = '',
  animateOnScroll = true,
  loading = false,
  children,
  role = 'article',
  ariaLabel,
  ariaDescribedBy,
  tabIndex,
  ...props
}, ref) => {
  
  // 마이크로 인터랙션 및 접근성 훅
  const { hoverProps } = useHoverAnimation(1.02, 200);
  const { isVisible, elementRef } = useScrollAnimation(0.1);
  const { prefersReducedMotion, getAnimationClass } = useReducedMotion();
  const { formatNumber, formatPercentage, formatPlacement } = useScreenReaderText();
  
  // 통계 포맷팅
  const formatStatValue = (value: number | string, format: string = 'number'): { display: string; screenReader: string } => {
    if (typeof value === 'string') {
      return { display: value, screenReader: value };
    }
    
    switch (format) {
      case 'percentage':
        return { 
          display: `${value}%`, 
          screenReader: formatPercentage(value) 
        };
      case 'placement':
        return { 
          display: `${value}등`, 
          screenReader: formatPlacement(value) 
        };
      case 'number':
      default:
        return { 
          display: formatNumber(value), 
          screenReader: formatNumber(value) 
        };
    }
  };
  
  // 카드 스타일
  const cardClasses = [
    'bg-background-card dark:bg-dark-background-card',
    'border border-border-light dark:border-dark-border-light',
    'rounded-lg shadow-sm',
    'transition-all duration-200',
    'focus-within:ring-2 focus-within:ring-brand-mint focus-within:ring-offset-2',
    clickable ? 'cursor-pointer hover:shadow-md' : '',
    animateOnScroll && !prefersReducedMotion ? getAnimationClass(
      `transform transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`,
      ''
    ) : '',
    className
  ].filter(Boolean).join(' ');
  
  // 클릭 핸들러
  const handleClick = React.useCallback(() => {
    if (clickable && onClick) {
      onClick();
    }
  }, [clickable, onClick]);
  
  // 키보드 핸들러
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (clickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  }, [clickable, onClick]);
  
  // 로딩 상태
  if (loading) {
    return (
      <div 
        ref={animateOnScroll ? elementRef : ref}
        className={cardClasses}
        role="status"
        aria-label="로딩 중"
      >
        <div className="p-6 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 인터랙션 속성
  const interactionProps = clickable && !prefersReducedMotion ? hoverProps : {};
  
  return (
    <div
      ref={animateOnScroll ? elementRef : ref}
      className={cardClasses}
      role={role}
      aria-label={ariaLabel || title}
      aria-describedby={ariaDescribedBy}
      tabIndex={clickable ? (tabIndex ?? 0) : tabIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...interactionProps}
      {...props}
    >
      {/* 이미지 영역 */}
      {image && (
        <div className="aspect-video rounded-t-lg overflow-hidden">
          <img
            src={image.src}
            alt={image.alt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      
      {/* 콘텐츠 영역 */}
      <div className="p-6">
        {/* 헤더 */}
        {(title || subtitle) && (
          <div className="mb-4">
            {title && (
              <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-1">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        {/* 설명 */}
        {description && (
          <p className="text-text-primary dark:text-dark-text-primary mb-4 leading-relaxed">
            {description}
          </p>
        )}
        
        {/* 커스텀 콘텐츠 */}
        {children && (
          <div className="mb-4">
            {children}
          </div>
        )}
        
        {/* 통계 */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-4" role="group" aria-label="통계 정보">
            {stats.map((stat, index) => {
              const formatted = formatStatValue(stat.value, stat.format);
              return (
                <div key={index} className="text-center">
                  <div 
                    className="text-2xl font-bold text-brand-mint"
                    aria-label={`${stat.label}: ${formatted.screenReader}`}
                  >
                    {formatted.display}
                  </div>
                  <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* 액션 버튼들 */}
        {actions.length > 0 && (
          <div className="flex gap-2 justify-end">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation(); // 카드 클릭 이벤트 방지
                  action.onClick();
                }}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-mint
                  ${action.variant === 'primary' 
                    ? 'bg-brand-mint hover:bg-brand-mint/90 text-white' 
                    : 'bg-background-base dark:bg-dark-background-base text-text-primary dark:text-dark-text-primary border border-border-light dark:border-dark-border-light hover:bg-background-card dark:hover:bg-dark-background-card'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

AccessibleCard.displayName = 'AccessibleCard';

export default AccessibleCard;