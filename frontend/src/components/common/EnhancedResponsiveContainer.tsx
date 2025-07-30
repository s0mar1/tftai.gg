import React, { useMemo } from 'react';
import classNames from 'classnames';
import { 
  useResponsiveInfo, 
  createResponsiveClasses,
  getResponsiveSpacing 
} from '../../utils/responsiveEnhancements';

// 확장된 반응형 컨테이너 Props
export interface EnhancedResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  
  // 레이아웃 옵션
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full' | 'none';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  
  // 반응형 옵션
  enableSafeArea?: boolean;
  optimizeForTouch?: boolean;
  reduceMotion?: boolean;
  adaptToNetwork?: boolean;
  
  // 접근성 옵션
  role?: string;
  ariaLabel?: string;
  
  // 성능 옵션
  enableGPUAcceleration?: boolean;
  willChange?: boolean;
}

const EnhancedResponsiveContainer: React.FC<EnhancedResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = '7xl',
  padding = 'responsive',
  margin = 'auto',
  enableSafeArea = false,
  optimizeForTouch = true,
  reduceMotion = true,
  adaptToNetwork = true,
  role,
  ariaLabel,
  enableGPUAcceleration = false,
  willChange = false,
  ...props
}) => {
  const { 
    viewport, 
    browserSupport, 
    isTouchDevice, 
    prefersReducedMotion, 
    safeArea, 
    networkStatus 
  } = useResponsiveInfo();

  // 최대 너비 클래스 매핑
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
    none: 'max-w-none',
  };

  // 반응형 패딩 계산
  const responsivePadding = useMemo(() => {
    if (padding === 'responsive') {
      const baseSpacing = getResponsiveSpacing(16, viewport.deviceType);
      return {
        base: `px-4 py-4`,
        sm: `sm:px-6 sm:py-6`,
        lg: `lg:px-8 lg:py-8`,
        xl: `xl:px-12 xl:py-12`,
      };
    }
    
    const paddingMap = {
      none: '',
      xs: 'px-2 py-2',
      sm: 'px-4 py-4',
      md: 'px-6 py-6',
      lg: 'px-8 py-8',
      xl: 'px-12 py-12',
    };
    
    return { base: paddingMap[padding] || '' };
  }, [padding, viewport.deviceType]);

  // 마진 클래스
  const marginClasses = {
    none: '',
    xs: 'mx-2 my-2',
    sm: 'mx-4 my-4',
    md: 'mx-6 my-6',
    lg: 'mx-8 my-8',
    xl: 'mx-12 my-12',
    auto: 'mx-auto',
  };

  // 동적 클래스 생성
  const containerClasses = useMemo(() => {
    const baseClasses = classNames(
      'w-full',
      maxWidthClasses[maxWidth],
      marginClasses[margin],
      
      // Safe Area 대응
      enableSafeArea && 'safe-area-full',
      
      // 터치 최적화
      optimizeForTouch && isTouchDevice && 'touch-optimized',
      
      // 모션 감소 대응
      reduceMotion && prefersReducedMotion && 'motion-reduce-safe',
      
      // 네트워크 적응
      adaptToNetwork && networkStatus.effectiveType === '2g' && 'data-saver-mode',
      
      // 브라우저 호환성
      !browserSupport.cssGrid && 'grid-fallback',
      !browserSupport.flexbox && 'flex-fallback',
      
      // 성능 최적화
      enableGPUAcceleration && 'safari-fix',
      willChange && 'will-change-transform',
      
      className
    );

    // 반응형 패딩 클래스 추가
    const paddingClassString = createResponsiveClasses(responsivePadding);
    
    return `${baseClasses} ${paddingClassString}`.trim();
  }, [
    maxWidth,
    margin,
    enableSafeArea,
    optimizeForTouch,
    isTouchDevice,
    reduceMotion,
    prefersReducedMotion,
    adaptToNetwork,
    networkStatus.effectiveType,
    browserSupport.cssGrid,
    browserSupport.flexbox,
    enableGPUAcceleration,
    willChange,
    className,
    responsivePadding,
  ]);

  // 인라인 스타일 (동적 Safe Area 적용)
  const inlineStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    
    if (enableSafeArea) {
      styles.paddingTop = `calc(var(--safe-area-inset-top) + ${styles.paddingTop || '0px'})`;
      styles.paddingBottom = `calc(var(--safe-area-inset-bottom) + ${styles.paddingBottom || '0px'})`;
      styles.paddingLeft = `calc(var(--safe-area-inset-left) + ${styles.paddingLeft || '0px'})`;
      styles.paddingRight = `calc(var(--safe-area-inset-right) + ${styles.paddingRight || '0px'})`;
    }
    
    if (enableGPUAcceleration) {
      styles.transform = 'translateZ(0)';
      styles.willChange = 'transform';
    }
    
    return styles;
  }, [enableSafeArea, enableGPUAcceleration]);

  // 접근성 속성
  const accessibilityProps = useMemo(() => {
    const a11yProps: Record<string, string> = {};
    
    if (role) a11yProps.role = role;
    if (ariaLabel) a11yProps['aria-label'] = ariaLabel;
    
    // 터치 디바이스에서 터치 액션 최적화
    if (isTouchDevice) {
      a11yProps['touch-action'] = 'manipulation';
    }
    
    return a11yProps;
  }, [role, ariaLabel, isTouchDevice]);

  return (
    <div
      className={containerClasses}
      style={inlineStyles}
      {...accessibilityProps}
      {...props}
    >
      {children}
    </div>
  );
};

// Grid 레이아웃을 위한 확장 컴포넌트
export interface EnhancedResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  
  // Grid 설정
  columns?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: number | string;
  autoFit?: boolean;
  minItemWidth?: string;
  
  // 성능 옵션
  enableVirtualization?: boolean;
  loadingState?: 'loading' | 'loaded' | 'error';
}

export const EnhancedResponsiveGrid: React.FC<EnhancedResponsiveGridProps> = ({
  children,
  className,
  columns = { base: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  autoFit = false,
  minItemWidth = '250px',
  enableVirtualization = false,
  loadingState = 'loaded',
  ...props
}) => {
  const { viewport, browserSupport } = useResponsiveInfo();

  // Grid 클래스 생성
  const gridClasses = useMemo(() => {
    if (autoFit) {
      return `grid gap-${gap}`;
    }
    
    const gridColsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-2', 
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    };
    
    const responsiveGrid = createResponsiveClasses({
      base: gridColsMap[columns.base || 1 as keyof typeof gridColsMap],
      sm: columns.sm ? `sm:${gridColsMap[columns.sm as keyof typeof gridColsMap]}` : undefined,
      md: columns.md ? `md:${gridColsMap[columns.md as keyof typeof gridColsMap]}` : undefined,
      lg: columns.lg ? `lg:${gridColsMap[columns.lg as keyof typeof gridColsMap]}` : undefined,
      xl: columns.xl ? `xl:${gridColsMap[columns.xl as keyof typeof gridColsMap]}` : undefined,
      '2xl': columns['2xl'] ? `2xl:${gridColsMap[columns['2xl'] as keyof typeof gridColsMap]}` : undefined,
    });
    
    return `grid gap-${gap} ${responsiveGrid}`;
  }, [autoFit, gap, columns]);

  // 최종 클래스 조합
  const finalClasses = classNames(
    gridClasses,
    !browserSupport.cssGrid && 'grid-fallback',
    enableVirtualization && 'virtual-scroll-container',
    className
  );

  // Auto-fit 그리드를 위한 인라인 스타일
  const gridStyle = useMemo(() => {
    if (autoFit) {
      return {
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
      };
    }
    return {};
  }, [autoFit, minItemWidth]);

  // 로딩 상태 처리
  if (loadingState === 'loading') {
    return (
      <div className={finalClasses} {...props}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48" />
        ))}
      </div>
    );
  }

  if (loadingState === 'error') {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Grid 로딩 중 오류가 발생했습니다.</div>
        <button 
          className="text-brand-mint hover:underline"
          onClick={() => window.location.reload()}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div 
      className={finalClasses} 
      style={gridStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default EnhancedResponsiveContainer;