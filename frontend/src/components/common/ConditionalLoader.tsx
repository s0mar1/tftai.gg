import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import PageLoadingFallback from './PageLoadingFallback';

interface ConditionalLoaderProps {
  importFunc: () => Promise<any>;
  condition: boolean;
  fallback?: React.ReactNode;
  children?: React.ReactNode;
  delay?: number;
}

/**
 * 조건부 컴포넌트 로딩
 * 특정 조건이 만족될 때만 컴포넌트를 동적으로 로드합니다.
 */
export const ConditionalLoader: React.FC<ConditionalLoaderProps> = ({
  importFunc,
  condition,
  fallback = <PageLoadingFallback />,
  children,
  delay = 0
}) => {
  const [LazyComponent, setLazyComponent] = useState<React.LazyExoticComponent<React.ComponentType<any>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (condition && !LazyComponent && !isLoading) {
      setIsLoading(true);
      
      const loadComponent = async () => {
        try {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          const component = lazy(importFunc);
          setLazyComponent(() => component);
          setError(null);
        } catch (err) {
          console.error('ConditionalLoader: Component loading error:', err);
          setError('컴포넌트 로딩에 실패했습니다.');
        } finally {
          setIsLoading(false);
        }
      };

      loadComponent();
    }
  }, [condition, LazyComponent, isLoading, importFunc, delay]);

  if (!condition) {
    return <>{children}</>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-500 text-center">
          <p className="text-lg font-medium">로딩 실패</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !LazyComponent) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      <LazyComponent />
    </Suspense>
  );
};

interface IntersectionLoaderProps {
  importFunc: () => Promise<any>;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
}

/**
 * Intersection Observer를 사용한 지연 로딩
 * 요소가 뷰포트에 진입할 때 컴포넌트를 로드합니다.
 */
export const IntersectionLoader: React.FC<IntersectionLoaderProps> = ({
  importFunc,
  fallback = <PageLoadingFallback />,
  rootMargin = '50px',
  threshold = 0.1,
  className = ''
}) => {
  const [LazyComponent, setLazyComponent] = useState<React.LazyExoticComponent<React.ComponentType<any>> | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !LazyComponent && !isLoading) {
          setIsIntersecting(true);
          setIsLoading(true);
          
          const loadComponent = async () => {
            try {
              const component = lazy(importFunc);
              setLazyComponent(() => component);
            } catch (err) {
              console.error('IntersectionLoader: Component loading error:', err);
            } finally {
              setIsLoading(false);
            }
          };

          loadComponent();
          observer.disconnect(); // 한 번 로드되면 관찰 중단
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [importFunc, LazyComponent, isLoading, rootMargin, threshold]);

  return (
    <div ref={ref} className={className}>
      {LazyComponent ? (
        <Suspense fallback={fallback}>
          <LazyComponent />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
};

interface HoverLoaderProps {
  importFunc: () => Promise<any>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

/**
 * 마우스 호버 시 컴포넌트 로딩
 * 호버 이벤트 발생 시 컴포넌트를 미리 로드합니다.
 */
export const HoverLoader: React.FC<HoverLoaderProps> = ({
  importFunc,
  children,
  fallback = <PageLoadingFallback />,
  delay = 300
}) => {
  const [LazyComponent, setLazyComponent] = useState<React.LazyExoticComponent<React.ComponentType<any>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showComponent, setShowComponent] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (LazyComponent || isLoading) return;

    timeoutRef.current = setTimeout(() => {
      setIsLoading(true);
      
      const loadComponent = async () => {
        try {
          const component = lazy(importFunc);
          setLazyComponent(() => component);
        } catch (err) {
          console.error('HoverLoader: Component loading error:', err);
        } finally {
          setIsLoading(false);
        }
      };

      loadComponent();
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleClick = () => {
    setShowComponent(true);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {showComponent && LazyComponent ? (
        <Suspense fallback={fallback}>
          <LazyComponent />
        </Suspense>
      ) : (
        children
      )}
    </div>
  );
};

export default ConditionalLoader;