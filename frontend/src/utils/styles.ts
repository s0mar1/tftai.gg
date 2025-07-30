/**
 * 공통 스타일 유틸리티
 * 
 * 자주 사용되는 스타일 조합을 중앙화하여 일관성 향상
 * 기존 컴포넌트를 수정하지 않고 참조용으로 사용
 * 
 * @note 새로운 컴포넌트 작성 시 이 스타일들을 활용하여 일관성 유지
 */

import classNames from 'classnames';

// 카드 스타일
export const cardStyles = {
  // 기본 카드 스타일 (기존 Card 컴포넌트와 동일)
  base: 'transition-all duration-200 dark:border-dark-border-light',
  
  variants: {
    default: 'bg-background-card border border-border-light rounded-lg dark:bg-dark-background-card dark:border-dark-border-light',
    outlined: 'bg-transparent border-2 border-border-light rounded-lg dark:border-dark-border-light',
    elevated: 'bg-background-card rounded-lg shadow-block dark:bg-dark-background-card dark:shadow-lg',
    filled: 'bg-tft-gray-100 rounded-lg dark:bg-dark-tft-gray-100',
  },
  
  padding: {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    none: '',
  },
  
  interactive: {
    hover: 'hover:shadow-lg hover:-translate-y-0.5 dark:hover:shadow-xl',
    clickable: 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-mint/20 dark:hover:shadow-xl',
  }
};

// 버튼 스타일
export const buttonStyles = {
  // 기본 버튼 스타일 (기존 Button 컴포넌트와 동일)
  base: [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-[0.98]'
  ].join(' '),
  
  variants: {
    primary: 'bg-brand-mint text-white hover:bg-brand-mint/90 focus:ring-brand-mint/50 dark:bg-brand-mint dark:text-white dark:hover:bg-brand-mint/90 dark:focus:ring-brand-mint/50',
    secondary: 'bg-panel-bg-secondary text-text-primary border border-border-light hover:bg-tft-gray-100 focus:ring-tft-gray-200 dark:bg-dark-panel-bg-secondary dark:text-dark-text-primary dark:border-dark-border-light dark:hover:bg-dark-tft-gray-100 dark:focus:ring-dark-tft-gray-200',
    outline: 'bg-transparent text-text-primary border border-border-light hover:bg-tft-gray-100 focus:ring-tft-gray-200 dark:text-dark-text-primary dark:border-dark-border-light dark:hover:bg-dark-tft-gray-100 dark:focus:ring-dark-tft-gray-200',
    ghost: 'bg-transparent text-text-primary hover:bg-tft-gray-100 focus:ring-tft-gray-200 dark:text-dark-text-primary dark:hover:bg-dark-tft-gray-100 dark:focus:ring-dark-tft-gray-200',
    danger: 'bg-error-red text-white hover:bg-red-600 focus:ring-error-red/50 dark:bg-error-red dark:text-white dark:hover:bg-red-600 dark:focus:ring-error-red/50',
  },
  
  sizes: {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  }
};

// 텍스트 스타일
export const textStyles = {
  // 색상 조합
  primary: 'text-text-primary dark:text-dark-text-primary',
  secondary: 'text-text-secondary dark:text-dark-text-secondary',
  error: 'text-error-red',
  brand: 'text-brand-mint',
  
  // 제목 스타일
  heading: {
    hero: 'text-5xl font-extrabold',
    section: 'text-2xl font-bold',
    card: 'text-lg font-semibold',
    sub: 'text-base font-medium',
  },
  
  // 본문 스타일
  body: {
    large: 'text-base font-normal',
    default: 'text-sm font-normal',
    small: 'text-xs font-normal',
  }
};

// 입력 필드 스타일
export const inputStyles = {
  base: [
    'w-full px-3 py-2 rounded-lg',
    'border border-border-light dark:border-dark-border-light',
    'bg-background-card dark:bg-dark-background-card',
    'text-text-primary dark:text-dark-text-primary',
    'placeholder:text-text-secondary dark:placeholder:text-dark-text-secondary',
    'focus:outline-none focus:ring-2 focus:ring-brand-mint/20 focus:border-brand-mint',
    'transition-all duration-200'
  ].join(' '),
  
  sizes: {
    sm: 'text-sm py-1.5',
    md: 'text-sm py-2',
    lg: 'text-base py-3',
  },
  
  states: {
    error: 'border-error-red focus:ring-error-red/20 focus:border-error-red',
    disabled: 'opacity-50 cursor-not-allowed',
  }
};

// 레이아웃 스타일
export const layoutStyles = {
  container: {
    base: 'max-w-7xl mx-auto px-6',
    fluid: 'w-full px-6',
    narrow: 'max-w-4xl mx-auto px-6',
  },
  
  section: {
    base: 'py-8',
    large: 'py-16',
    small: 'py-4',
  },
  
  grid: {
    base: 'grid gap-6',
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    }
  }
};

// 애니메이션 스타일
export const animationStyles = {
  fade: 'transition-opacity duration-200',
  scale: 'transition-transform duration-200',
  all: 'transition-all duration-200',
  
  hover: {
    lift: 'hover:-translate-y-0.5',
    scale: 'hover:scale-105',
    shadow: 'hover:shadow-lg',
  },
  
  skeleton: {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
  }
};

// 테이블 스타일
export const tableStyles = {
  container: 'overflow-x-auto',
  
  table: 'w-full border-collapse',
  
  header: {
    row: 'border-b border-border-light dark:border-dark-border-light',
    cell: 'px-4 py-3 text-left text-sm font-medium text-text-secondary dark:text-dark-text-secondary',
  },
  
  body: {
    row: 'border-b border-border-light dark:border-dark-border-light hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100',
    cell: 'px-4 py-3 text-sm text-text-primary dark:text-dark-text-primary',
  }
};

// 스타일 조합 헬퍼 함수
export function createCardClass(
  variant: keyof typeof cardStyles.variants = 'default',
  size: keyof typeof cardStyles.padding = 'md',
  interactive?: 'hover' | 'clickable'
): string {
  return classNames(
    cardStyles.base,
    cardStyles.variants[variant],
    cardStyles.padding[size],
    interactive && cardStyles.interactive[interactive]
  );
}

export function createButtonClass(
  variant: keyof typeof buttonStyles.variants = 'primary',
  size: keyof typeof buttonStyles.sizes = 'md'
): string {
  return classNames(
    buttonStyles.base,
    buttonStyles.variants[variant],
    buttonStyles.sizes[size]
  );
}

export function createTextClass(
  type: 'primary' | 'secondary' | 'error' | 'brand',
  style?: keyof typeof textStyles.heading | keyof typeof textStyles.body
): string {
  const classes = [textStyles[type]];
  
  if (style) {
    if (style in textStyles.heading) {
      classes.push(textStyles.heading[style as keyof typeof textStyles.heading]);
    } else if (style in textStyles.body) {
      classes.push(textStyles.body[style as keyof typeof textStyles.body]);
    }
  }
  
  return classNames(...classes);
}

// 반응형 헬퍼
export const responsive = {
  // 특정 화면 크기에서만 표시
  show: {
    mobile: 'block md:hidden',
    tablet: 'hidden md:block lg:hidden',
    desktop: 'hidden lg:block',
  },
  
  // 특정 화면 크기에서 숨김
  hide: {
    mobile: 'hidden md:block',
    tablet: 'block md:hidden lg:block',
    desktop: 'block lg:hidden',
  }
};

// Export all for convenience
export const commonStyles = {
  card: cardStyles,
  button: buttonStyles,
  text: textStyles,
  input: inputStyles,
  layout: layoutStyles,
  animation: animationStyles,
  table: tableStyles,
  responsive,
};