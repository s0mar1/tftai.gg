import { useState, useEffect, useRef } from 'react';
import React from 'react';

type Breakpoints = Record<string, number>;

interface ContainerSize {
  width: number;
  height: number;
  breakpoint: string;
}

// Container Query 훅 - 부모 컨테이너 크기에 반응
export const useContainerQuery = (breakpoints: Breakpoints = {}): [React.RefObject<HTMLDivElement>, ContainerSize] => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({
    width: 0,
    height: 0,
    breakpoint: 'xs',
  });

  const defaultBreakpoints: Breakpoints = {
    xs: 0,
    sm: 320,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
    ...breakpoints,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // 현재 브레이크포인트 계산
        const currentBreakpoint = Object.entries(defaultBreakpoints)
          .reverse()
          .find(([, value]) => width >= value)?.[0] || 'xs';

        setContainerSize({
          width: Math.round(width),
          height: Math.round(height),
          breakpoint: currentBreakpoint,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return [containerRef, containerSize];
};

interface ContainerAwareComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode | ((props: ContainerSize) => React.ReactNode);
  className?: string;
  breakpoints?: Breakpoints;
}

// Container-aware 컴포넌트 래퍼
export const ContainerAwareComponent: React.FC<ContainerAwareComponentProps> = ({ 
  children, 
  className = '',
  breakpoints,
  ...props 
}) => {
  const [containerRef, { width, height, breakpoint }] = useContainerQuery(breakpoints);
  
  return (
    <div
      ref={containerRef}
      className={`container-aware ${className}`}
      data-container-size={breakpoint}
      style={{ 
        '--container-width': `${width}px`,
        '--container-height': `${height}px`,
      }}
      {...props}
    >
      {typeof children === 'function' 
        ? children({ width, height, breakpoint })
        : children
      }
    </div>
  );
};

// 유틸리티 함수들
export const getContainerClasses = (breakpoint: string, classMap: Record<string, string>): string => {
  const classes: string[] = [];
  
  Object.entries(classMap).forEach(([bp, className]) => {
    if (shouldApplyBreakpoint(breakpoint, bp)) {
      classes.push(className);
    }
  });
  
  return classes.join(' ');
};

const shouldApplyBreakpoint = (current: string, target: string): boolean => {
  const order = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = order.indexOf(current);
  const targetIndex = order.indexOf(target);
  
  return currentIndex >= targetIndex;
};

export default useContainerQuery;