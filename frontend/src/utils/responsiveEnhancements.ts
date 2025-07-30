/**
 * 반응형 디자인 고도화를 위한 유틸리티 모음
 * 다양한 브라우저 환경과 해상도에서 깔끔한 동작 보장
 */
import { useEffect, useState, useCallback } from 'react';

// 디바이스 타입 감지
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';
export type ScreenOrientation = 'portrait' | 'landscape';

export interface ViewportInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: ScreenOrientation;
  pixelRatio: number;
  isHighDPI: boolean;
  aspectRatio: number;
}

// 뷰포트 정보 훅
export const useViewportInfo = (): ViewportInfo => {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: 1,
        isHighDPI: false,
        aspectRatio: 16/9,
      };
    }

    return getViewportInfo();
  });

  const updateViewportInfo = useCallback(() => {
    setViewportInfo(getViewportInfo());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('resize', updateViewportInfo);
    window.addEventListener('orientationchange', updateViewportInfo);
    
    return () => {
      window.removeEventListener('resize', updateViewportInfo);
      window.removeEventListener('orientationchange', updateViewportInfo);
    };
  }, [updateViewportInfo]);

  return viewportInfo;
};

// 뷰포트 정보 계산
const getViewportInfo = (): ViewportInfo => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  const aspectRatio = width / height;

  const deviceType: DeviceType = 
    width < 768 ? 'mobile' :
    width < 1024 ? 'tablet' :
    width >= 2560 ? 'ultrawide' : 'desktop';

  const orientation: ScreenOrientation = width > height ? 'landscape' : 'portrait';

  return {
    width,
    height,
    deviceType,
    orientation,
    pixelRatio,
    isHighDPI: pixelRatio > 1.5,
    aspectRatio,
  };
};

// 안전한 뷰포트 단위 사용 (iOS Safari 이슈 대응)
export const useSafeViewportHeight = (): number => {
  const [vh, setVh] = useState(() => {
    if (typeof window === 'undefined') return 600;
    return window.innerHeight;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateVh = (): void => {
      const newVh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${newVh}px`);
      setVh(window.innerHeight);
    };

    updateVh();
    window.addEventListener('resize', updateVh);
    window.addEventListener('orientationchange', updateVh);
    
    return () => {
      window.removeEventListener('resize', updateVh);
      window.removeEventListener('orientationchange', updateVh);
    };
  }, []);

  return vh;
};

// 터치 디바이스 감지
export const useIsTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = (): boolean => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - Legacy IE support
        navigator.msMaxTouchPoints > 0
      );
    };

    setIsTouchDevice(checkTouchDevice());
  }, []);

  return isTouchDevice;
};

// 브라우저 지원 감지
export interface BrowserSupport {
  cssGrid: boolean;
  flexbox: boolean;
  customProperties: boolean;
  containerQueries: boolean;
  backdropFilter: boolean;
  aspectRatio: boolean;
  webp: boolean;
  avif: boolean;
}

export const useBrowserSupport = (): BrowserSupport => {
  const [support, setSupport] = useState<BrowserSupport>({
    cssGrid: false,
    flexbox: false,
    customProperties: false,
    containerQueries: false,
    backdropFilter: false,
    aspectRatio: false,
    webp: false,
    avif: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSupport = async (): Promise<BrowserSupport> => {
      const [webpSupport, avifSupport] = await Promise.all([
        checkImageFormat('webp'),
        checkImageFormat('avif'),
      ]);

      return {
        cssGrid: CSS.supports('display', 'grid'),
        flexbox: CSS.supports('display', 'flex'),
        customProperties: CSS.supports('color', 'var(--test)'),
        containerQueries: CSS.supports('container-type', 'inline-size'),
        backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
        aspectRatio: CSS.supports('aspect-ratio', '16/9'),
        webp: webpSupport,
        avif: avifSupport,
      };
    };

    checkSupport().then(setSupport);
  }, []);

  return support;
};

// 이미지 형식 지원 확인
const checkImageFormat = (format: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const testImages = {
      webp: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
      avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=',
    };

    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = testImages[format as keyof typeof testImages];
  });
};

// 반응형 폰트 크기 계산
export const getResponsiveFontSize = (
  baseSize: number,
  viewport: ViewportInfo,
  options: {
    minSize?: number;
    maxSize?: number;
    scaleFactor?: number;
  } = {}
): string => {
  const { minSize = baseSize * 0.75, maxSize = baseSize * 1.5, scaleFactor = 0.02 } = options;
  
  // 뷰포트 너비에 따른 동적 크기 계산
  const dynamicSize = baseSize + (viewport.width - 375) * scaleFactor;
  const clampedSize = Math.max(minSize, Math.min(maxSize, dynamicSize));
  
  return `${clampedSize}px`;
};

// 반응형 간격 계산
export const getResponsiveSpacing = (
  baseSpacing: number,
  deviceType: DeviceType
): number => {
  const spacingMultipliers = {
    mobile: 0.75,
    tablet: 0.875,
    desktop: 1,
    ultrawide: 1.25,
  };
  
  return baseSpacing * spacingMultipliers[deviceType];
};

// 안전한 스크롤 위치 계산
export const useSafeScrollPosition = (): { x: number; y: number } => {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateScrollPosition = (): void => {
      setScrollPosition({
        x: window.scrollX || window.pageXOffset || 0,
        y: window.scrollY || window.pageYOffset || 0,
      });
    };

    const throttledUpdate = throttle(updateScrollPosition, 16); // 60fps
    
    window.addEventListener('scroll', throttledUpdate, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledUpdate);
    };
  }, []);

  return scrollPosition;
};

// 접근성 고려 모션 감소 감지
export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent): void => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
};

// 고해상도 이미지 최적화
export const getOptimizedImageSrc = (
  baseSrc: string,
  viewport: ViewportInfo,
  browserSupport: BrowserSupport
): string => {
  // 픽셀 밀도에 따른 이미지 선택
  const densityMultiplier = viewport.isHighDPI ? 
    Math.min(Math.ceil(viewport.pixelRatio), 3) : 1;
  
  const densitySuffix = densityMultiplier > 1 ? `@${densityMultiplier}x` : '';
  
  // 파일 확장자 분리
  const lastDotIndex = baseSrc.lastIndexOf('.');
  const baseName = baseSrc.substring(0, lastDotIndex);
  const extension = baseSrc.substring(lastDotIndex + 1);
  
  // 최적화된 형식 선택
  let format = extension;
  if (browserSupport.avif) {
    format = 'avif';
  } else if (browserSupport.webp) {
    format = 'webp';
  }
  
  return `${baseName}${densitySuffix}.${format}`;
};

// 반응형 클래스명 생성 헬퍼
export const createResponsiveClasses = (
  breakpointClasses: Record<string, string>
): string => {
  return Object.entries(breakpointClasses)
    .map(([breakpoint, classes]) => {
      return breakpoint === 'base' ? classes : `${breakpoint}:${classes}`;
    })
    .join(' ');
};

// 성능 최적화된 디바운스 훅
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 스로틀 유틸리티
const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Safe Area 대응 (iOS 노치/펀치홀)
export const useSafeArea = (): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSafeArea = (): void => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);
    
    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
};

// 컨테이너 쿼리 폴리필 (레거시 브라우저 지원)
export const useContainerQueryPolyfill = (): void => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Container Queries 지원 확인
    if (!CSS.supports('container-type', 'inline-size')) {
      console.warn('Container Queries not supported. Using ResizeObserver fallback.');
      
      // 대체 방안: ResizeObserver 기반 구현
      const containers = document.querySelectorAll('[data-container-query]');
      const resizeObservers: ResizeObserver[] = [];
      
      containers.forEach((container) => {
        const resizeObserver = new ResizeObserver((entries) => {
          entries.forEach((entry) => {
            const { width } = entry.contentRect;
            const element = entry.target as HTMLElement;
            
            // 컨테이너 크기에 따른 클래스 적용
            element.classList.remove('container-sm', 'container-md', 'container-lg', 'container-xl');
            
            if (width >= 1024) {
              element.classList.add('container-xl');
            } else if (width >= 768) {
              element.classList.add('container-lg');
            } else if (width >= 480) {
              element.classList.add('container-md');
            } else {
              element.classList.add('container-sm');
            }
          });
        });
        
        resizeObserver.observe(container);
        resizeObservers.push(resizeObserver);
      });

      return () => {
        resizeObservers.forEach(observer => observer.disconnect());
      };
    }
  }, []);
};

// 다크모드 자동 감지
export const useSystemColorScheme = (): 'light' | 'dark' => {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setColorScheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (event: MediaQueryListEvent): void => {
      setColorScheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return colorScheme;
};

// 네트워크 상태 감지 (성능 최적화용)
export const useNetworkStatus = (): {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
} => {
  const [networkStatus, setNetworkStatus] = useState({
    online: true,
    effectiveType: '4g',
    downlink: undefined as number | undefined,
    rtt: undefined as number | undefined,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkStatus = (): void => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setNetworkStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      });
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return networkStatus;
};

// 종합 반응형 정보 훅
export const useResponsiveInfo = () => {
  const viewport = useViewportInfo();
  const browserSupport = useBrowserSupport();
  const isTouchDevice = useIsTouchDevice();
  const prefersReducedMotion = usePrefersReducedMotion();
  const safeArea = useSafeArea();
  const systemColorScheme = useSystemColorScheme();
  const networkStatus = useNetworkStatus();

  return {
    viewport,
    browserSupport,
    isTouchDevice,
    prefersReducedMotion,
    safeArea,
    systemColorScheme,
    networkStatus,
  };
};

export default {
  useViewportInfo,
  useSafeViewportHeight,
  useIsTouchDevice,
  useBrowserSupport,
  getResponsiveFontSize,
  getResponsiveSpacing,
  useSafeScrollPosition,
  usePrefersReducedMotion,
  getOptimizedImageSrc,
  createResponsiveClasses,
  useContainerQueryPolyfill,
  useDebounce,
  useSafeArea,
  useSystemColorScheme,
  useNetworkStatus,
  useResponsiveInfo,
};