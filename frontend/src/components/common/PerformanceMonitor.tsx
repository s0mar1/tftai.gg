import React, { useEffect, useState, memo } from 'react';
import { 
  getAllPerformanceAnalyses, 
  findSlowComponents, 
  clearPerformanceMetrics 
} from './ReactProfiler';

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
}

interface ChunkLoadMetrics {
  chunkName: string;
  loadTime: number;
  size: number;
  cached: boolean;
}

/**
 * Web Vitals와 코드 분할 성능을 모니터링하는 컴포넌트
 */
export const PerformanceMonitor: React.FC = memo(() => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });
  const [chunkMetrics, setChunkMetrics] = useState<ChunkLoadMetrics[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Web Vitals 측정
    if ('web-vital' in window || 'PerformanceObserver' in window) {
      measureWebVitals();
    }

    // 리소스 타이밍 측정 (청크 로드 시간)
    measureChunkLoading();

    // 개발 환경에서만 디버그 정보 표시
    if (process.env.NODE_ENV === 'development') {
      setShowDebug(true);
    }
  }, []);

  const measureWebVitals = () => {
    try {
      // First Contentful Paint
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          setMetrics(prev => ({ ...prev, fid: (entry as any).processingStart - entry.startTime }));
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            setMetrics(prev => ({ ...prev, cls: clsValue }));
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Time to First Byte
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.fetchStart;
        setMetrics(prev => ({ ...prev, ttfb }));
      }
    } catch (error) {
      console.warn('Performance measurement not supported:', error);
    }
  };

  const measureChunkLoading = () => {
    const observer = new PerformanceObserver((list) => {
      const chunks: ChunkLoadMetrics[] = [];
      
      for (const entry of list.getEntries()) {
        if (entry.name.includes('.js') && entry.name.includes('assets')) {
          const chunkName = entry.name.split('/').pop()?.split('.')[0] || 'unknown';
          const loadTime = entry.responseEnd - entry.fetchStart;
          const size = (entry as any).transferSize || 0;
          const cached = (entry as any).transferSize === 0;
          
          chunks.push({
            chunkName,
            loadTime,
            size,
            cached,
          });
        }
      }
      
      setChunkMetrics(prev => [...prev, ...chunks]);
    });

    observer.observe({ entryTypes: ['resource'] });
  };

  const formatMetric = (value: number | null, unit: string = 'ms') => {
    if (value === null) return 'N/A';
    return `${Math.round(value)}${unit}`;
  };

  const getScoreColor = (metric: string, value: number | null) => {
    if (value === null) return 'text-gray-500';
    
    switch (metric) {
      case 'fcp':
        return value < 1800 ? 'text-green-500' : value < 3000 ? 'text-yellow-500' : 'text-red-500';
      case 'lcp':
        return value < 2500 ? 'text-green-500' : value < 4000 ? 'text-yellow-500' : 'text-red-500';
      case 'fid':
        return value < 100 ? 'text-green-500' : value < 300 ? 'text-yellow-500' : 'text-red-500';
      case 'cls':
        return value < 0.1 ? 'text-green-500' : value < 0.25 ? 'text-yellow-500' : 'text-red-500';
      case 'ttfb':
        return value < 800 ? 'text-green-500' : value < 1800 ? 'text-yellow-500' : 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!showDebug) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 fixed-overlay">
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Performance Monitor
          </h3>
          <button
            onClick={() => setShowDebug(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        {/* Web Vitals */}
        <div className="space-y-1 mb-3">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Core Web Vitals</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`${getScoreColor('fcp', metrics.fcp)}`}>
              FCP: {formatMetric(metrics.fcp)}
            </div>
            <div className={`${getScoreColor('lcp', metrics.lcp)}`}>
              LCP: {formatMetric(metrics.lcp)}
            </div>
            <div className={`${getScoreColor('fid', metrics.fid)}`}>
              FID: {formatMetric(metrics.fid)}
            </div>
            <div className={`${getScoreColor('cls', metrics.cls)}`}>
              CLS: {formatMetric(metrics.cls, '')}
            </div>
            <div className={`${getScoreColor('ttfb', metrics.ttfb)}`}>
              TTFB: {formatMetric(metrics.ttfb)}
            </div>
          </div>
        </div>

        {/* Chunk Loading Stats */}
        {chunkMetrics.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Chunks Loaded ({chunkMetrics.length})
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {chunkMetrics.slice(-5).map((chunk, index) => (
                <div key={index} className="text-xs flex justify-between items-center">
                  <span className="truncate max-w-20" title={chunk.chunkName}>
                    {chunk.chunkName}
                  </span>
                  <span className={`${chunk.cached ? 'text-green-500' : 'text-blue-500'}`}>
                    {chunk.cached ? 'cached' : `${Math.round(chunk.loadTime)}ms`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tips */}
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            💡 {getPerformanceTip(metrics)}
          </div>
        </div>
      </div>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

const getPerformanceTip = (metrics: PerformanceMetrics): string => {
  if (metrics.fcp && metrics.fcp > 3000) {
    return 'FCP가 느립니다. 중요한 리소스를 우선 로드해보세요.';
  }
  if (metrics.lcp && metrics.lcp > 4000) {
    return 'LCP가 느립니다. 이미지 최적화나 lazy loading을 검토해보세요.';
  }
  if (metrics.cls && metrics.cls > 0.25) {
    return 'CLS가 높습니다. 레이아웃 변경을 줄여보세요.';
  }
  if (metrics.fid && metrics.fid > 300) {
    return 'FID가 높습니다. JavaScript 실행 시간을 최적화해보세요.';
  }
  return '성능이 양호합니다! 계속 모니터링하세요.';
};

/**
 * 성능 메트릭을 수집하는 커스텀 훅
 */
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  useEffect(() => {
    // 간단한 메트릭 수집
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setMetrics(prev => ({
        ...prev,
        ttfb: navigation.responseStart - navigation.fetchStart,
      }));
    }
  }, []);

  return metrics;
};

export default PerformanceMonitor;