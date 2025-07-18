import React from 'react';
import classNames from 'classnames';
import { ContainerAwareComponent, getContainerClasses } from '../../hooks/useContainerQuery';

// 공통 타입 정의
type MaxWidthOption = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full' | 'fluid';
type PaddingOption = 'none' | 'sm' | 'md' | 'lg' | 'responsive' | 'fluid';
type BreakpointCols = {
  base: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
};

// 컨테이너 쿼리 렌더 함수 타입
type ContainerQueryRenderFunction = (props: {
  width: number;
  height: number;
  breakpoint: string;
}) => React.ReactNode;

// ResponsiveContainer Props 타입
interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode | ContainerQueryRenderFunction;
  className?: string;
  maxWidth?: MaxWidthOption;
  padding?: PaddingOption;
  fluid?: boolean;
  containerQuery?: boolean;
  breakpoints?: Record<string, number>;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
  children, 
  className,
  maxWidth = '7xl',
  padding = 'responsive',
  fluid = false,
  containerQuery = false,
  breakpoints,
  ...props 
}) => {
  const paddingClasses = {
    none: '',
    sm: 'px-4 py-2',
    md: 'px-6 py-4',
    lg: 'px-8 py-6',
    responsive: 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
    fluid: 'px-2 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 lg:px-8 lg:py-6',
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
    fluid: 'max-w-none',
  };

  const baseClasses = classNames(
    'w-full',
    {
      'mx-auto': !fluid,
      'min-h-0': fluid, // 플렉스 컨테이너에서 축소 허용
    },
    maxWidthClasses[maxWidth],
    paddingClasses[padding],
    className
  );

  // Container Query 사용 시
  if (containerQuery) {
    return (
      <ContainerAwareComponent
        className={baseClasses}
        breakpoints={breakpoints}
        {...props}
      >
        {({ width, height, breakpoint }) => {
          return typeof children === 'function'
            ? children({ width, height, breakpoint })
            : children;
        }}
      </ContainerAwareComponent>
    );
  }

  // 기본 반응형 컨테이너
  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  );
};

// ResponsiveGrid Props 타입
interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: BreakpointCols;
  gap?: number;
  className?: string;
  containerQuery?: boolean;
  auto?: boolean;
  minItemWidth?: string;
}

// 모바일 우선 그리드 시스템
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ 
  children, 
  cols = { base: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className,
  containerQuery = false,
  auto = false,
  minItemWidth = '250px',
  ...props 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    auto: `grid-cols-[repeat(auto-fit,minmax(${minItemWidth},1fr))]`,
  };

  const responsiveClasses = auto 
    ? gridCols.auto
    : [
        gridCols[cols.base as keyof typeof gridCols],
        cols.sm && `sm:${gridCols[cols.sm as keyof typeof gridCols]}`,
        cols.md && `md:${gridCols[cols.md as keyof typeof gridCols]}`,
        cols.lg && `lg:${gridCols[cols.lg as keyof typeof gridCols]}`,
        cols.xl && `xl:${gridCols[cols.xl as keyof typeof gridCols]}`,
        cols['2xl'] && `2xl:${gridCols[cols['2xl'] as keyof typeof gridCols]}`,
      ].filter(Boolean).join(' ');

  const baseClasses = classNames(
    'grid',
    responsiveClasses,
    `gap-${gap}`,
    className
  );

  // Container Query 사용 시
  if (containerQuery) {
    return (
      <ContainerAwareComponent
        className={baseClasses}
        {...props}
      >
        {({ width, breakpoint }) => {
          // 컨테이너 크기에 따른 동적 그리드
          const dynamicCols = getDynamicColumns(width, minItemWidth);
          
          return (
            <div
              className={classNames(
                'grid',
                `gap-${gap}`,
                className
              )}
              style={{
                gridTemplateColumns: `repeat(${dynamicCols}, minmax(0, 1fr))`,
              }}
            >
              {children}
            </div>
          );
        }}
      </ContainerAwareComponent>
    );
  }

  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  );
};

// 동적 컬럼 수 계산
const getDynamicColumns = (containerWidth: number, minItemWidth: string): number => {
  const minWidth = parseInt(minItemWidth);
  const cols = Math.floor(containerWidth / minWidth);
  return Math.max(1, cols);
};

// ResponsiveCard Props 타입
interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

// 모바일 친화적 카드 컴포넌트
export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({ 
  children, 
  className,
  interactive = false,
  ...props 
}) => {
  return (
    <div
      className={classNames(
        'bg-white dark:bg-gray-800 rounded-lg shadow-md',
        'border border-gray-200 dark:border-gray-700',
        'transition-all duration-200',
        {
          'hover:shadow-lg hover:scale-105 cursor-pointer': interactive,
          'active:scale-95': interactive,
        },
        'p-4 sm:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default ResponsiveContainer;