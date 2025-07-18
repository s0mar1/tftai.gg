import React, { useRef, useCallback, useState } from 'react';
import { Link, LinkProps, useNavigate } from 'react-router-dom';

interface SmartLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
  preloadDelay?: number;
  prefetchStrategy?: 'hover' | 'viewport' | 'immediate' | 'none';
  children: React.ReactNode;
  className?: string;
}

// 이미 프리로드된 경로들을 추적
const preloadedRoutes = new Set<string>();

// 동적 import 매핑 (라우트 패턴에 따른 컴포넌트 매핑)
const routeComponentMap: Record<string, () => Promise<any>> = {
  '/summoner': () => import('../../pages/summoner/SummonerPage'),
  '/tierlist': () => import('../../pages/tierlist/TierListPage'),
  '/ranking': () => import('../../pages/ranking/RankingPage'),
  '/ai-chat': () => import('../../pages/AiQnaPage/AiQnaPage'),
  '/deck-builder': () => import('../../pages/DeckBuilderPage/DeckBuilderPage'),
  '/guides': () => import('../../pages/GuideListPage/GuideListPage'),
  '/stats': () => import('../../pages/stats/StatsPage'),
  '/about': () => import('../../pages/AboutPage/AboutPage'),
};

/**
 * 라우트 경로를 기반으로 해당하는 컴포넌트 import 함수를 찾습니다.
 */
const getImportFunctionForRoute = (path: string): (() => Promise<any>) | null => {
  // 언어 접두사 제거 (예: /ko/summoner -> /summoner)
  const normalizedPath = path.replace(/^\/[a-z]{2}/, '');
  
  // 정확히 일치하는 경로 찾기
  if (routeComponentMap[normalizedPath]) {
    return routeComponentMap[normalizedPath];
  }
  
  // 패턴 매칭으로 동적 경로 처리
  for (const [pattern, importFunc] of Object.entries(routeComponentMap)) {
    if (normalizedPath.startsWith(pattern)) {
      return importFunc;
    }
  }
  
  return null;
};

/**
 * 컴포넌트를 프리로드하는 함수
 */
const preloadComponent = async (path: string): Promise<void> => {
  if (preloadedRoutes.has(path)) {
    return; // 이미 프리로드됨
  }
  
  const importFunc = getImportFunctionForRoute(path);
  if (!importFunc) {
    return; // 매핑된 컴포넌트가 없음
  }
  
  try {
    console.log(`[SmartLink] Preloading component for route: ${path}`);
    await importFunc();
    preloadedRoutes.add(path);
    console.log(`[SmartLink] Successfully preloaded: ${path}`);
  } catch (error) {
    console.warn(`[SmartLink] Failed to preload component for ${path}:`, error);
  }
};

/**
 * Intersection Observer를 사용한 뷰포트 프리로딩
 */
const useViewportPreloading = (path: string, enabled: boolean) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hasPreloaded, setHasPreloaded] = useState(false);

  React.useEffect(() => {
    if (!enabled || hasPreloaded || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          preloadComponent(path);
          setHasPreloaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // 뷰포트 100px 전에 프리로드
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [path, enabled, hasPreloaded]);

  return ref;
};

/**
 * 스마트 링크 컴포넌트
 * 다양한 프리로딩 전략을 지원하는 최적화된 Link 컴포넌트
 */
export const SmartLink: React.FC<SmartLinkProps> = ({
  to,
  preloadDelay = 300,
  prefetchStrategy = 'hover',
  children,
  className = '',
  ...linkProps
}) => {
  const navigate = useNavigate();
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const [isPreloading, setIsPreloading] = useState(false);
  
  // 뷰포트 프리로딩을 위한 ref
  const viewportRef = useViewportPreloading(to, prefetchStrategy === 'viewport');

  // 즉시 프리로딩 (컴포넌트 마운트 시)
  React.useEffect(() => {
    if (prefetchStrategy === 'immediate') {
      preloadComponent(to);
    }
  }, [to, prefetchStrategy]);

  // 호버 프리로딩 핸들러
  const handleMouseEnter = useCallback(() => {
    if (prefetchStrategy !== 'hover' || preloadedRoutes.has(to)) return;

    hoverTimeoutRef.current = setTimeout(async () => {
      setIsPreloading(true);
      await preloadComponent(to);
      setIsPreloading(false);
    }, preloadDelay);
  }, [to, prefetchStrategy, preloadDelay]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      setIsPreloading(false);
    }
  }, []);

  // 터치 기기를 위한 터치 시작 핸들러
  const handleTouchStart = useCallback(() => {
    if (prefetchStrategy === 'hover' && !preloadedRoutes.has(to)) {
      preloadComponent(to);
    }
  }, [to, prefetchStrategy]);

  // 클릭 핸들러 (프리로드되지 않은 경우 즉시 로드)
  const handleClick = useCallback((e: React.MouseEvent) => {
    // 프리로드가 진행 중이거나 완료되지 않은 경우
    if (!preloadedRoutes.has(to)) {
      // 컴포넌트가 로드될 때까지 약간의 지연을 위해 프리로드 시도
      preloadComponent(to);
    }
  }, [to]);

  const linkClassName = `${className} ${isPreloading ? 'opacity-75' : ''}`.trim();

  return (
    <Link
      ref={prefetchStrategy === 'viewport' ? viewportRef : undefined}
      to={to}
      className={linkClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      {...linkProps}
    >
      {children}
      {isPreloading && (
        <span className="ml-1 inline-block w-2 h-2 bg-current rounded-full animate-pulse opacity-50" />
      )}
    </Link>
  );
};

/**
 * 프리로딩 상태를 확인하는 훅
 */
export const usePreloadingStatus = () => {
  return {
    preloadedRoutes: Array.from(preloadedRoutes),
    isPreloaded: (path: string) => preloadedRoutes.has(path),
    clearPreloadCache: () => preloadedRoutes.clear(),
  };
};

/**
 * 특정 경로를 수동으로 프리로드하는 훅
 */
export const usePreloadRoute = () => {
  return useCallback((path: string) => preloadComponent(path), []);
};

export default SmartLink;