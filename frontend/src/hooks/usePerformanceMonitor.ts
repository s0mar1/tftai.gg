import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceOptions {
  enableProfiling?: boolean;
  threshold?: number;
  trackReRenders?: boolean;
  trackMemory?: boolean;
}

interface PerformanceData {
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenderTime: number;
  memoryUsage: MemoryUsage | null;
}

interface MemoryUsage {
  used: number;
  total: number;
  limit?: number;
}

interface PerformanceMetric {
  component: string;
  renderTime: number;
  renderCount: number;
  timestamp: string;
  memoryUsage: MemoryUsage | null;
  url: string;
}

// 성능 메트릭 수집 훅
export const usePerformanceMonitor = (componentName: string, options: PerformanceOptions = {}) => {
  const {
    enableProfiling = true,
    threshold = 100,
    trackReRenders = true,
    trackMemory = false,
  } = options;

  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const mountTime = useRef(Date.now());
  const metricsQueue = useRef<PerformanceMetric[]>([]);

  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    renderCount: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    totalRenderTime: 0,
    memoryUsage: null,
  });

  // This effect runs once to set up a periodic state update.
  useEffect(() => {
    if (!enableProfiling) return;

    const intervalId = setInterval(() => {
      if (metricsQueue.current.length === 0) return;

      const metricsToProcess = metricsQueue.current;
      metricsQueue.current = [];

      setPerformanceData((prev: PerformanceData) => {
        let updatedData = { ...prev };
        metricsToProcess.forEach((metric: PerformanceMetric) => {
          updatedData = {
            ...updatedData,
            renderCount: updatedData.renderCount + 1,
            totalRenderTime: updatedData.totalRenderTime + metric.renderTime,
            averageRenderTime: (updatedData.totalRenderTime + metric.renderTime) / (updatedData.renderCount + 1),
            maxRenderTime: Math.max(updatedData.maxRenderTime, metric.renderTime),
            minRenderTime: Math.min(updatedData.minRenderTime, metric.renderTime),
            memoryUsage: metric.memoryUsage || updatedData.memoryUsage,
          };
        });
        return updatedData;
      });
    }, 500); // Update state every 500ms

    return () => clearInterval(intervalId);
  }, [enableProfiling]);

  // This effect runs on every render to measure performance.
  // It does NOT set state directly to avoid infinite loops.
  useEffect(() => {
    if (!enableProfiling) return;

    const renderStartTime = lastRenderTime.current;
    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartTime;
    
    renderCount.current += 1;
    lastRenderTime.current = renderEndTime;

    let memoryUsage: MemoryUsage | null = null;
    if (trackMemory && 'memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      };
    }

    const metric: PerformanceMetric = {
      component: componentName,
      renderTime,
      renderCount: renderCount.current,
      timestamp: new Date().toISOString(),
      memoryUsage,
      url: window.location.href,
    };

    // Add metric to the queue instead of updating state directly
    metricsQueue.current.push(metric);

    // Performance logging disabled to prevent console spam

    if (renderTime > threshold) {
      // console.warn(`[Performance Warning] ${componentName} took ${renderTime}ms to render`);
      if (import.meta.env.MODE === 'production') {
        reportPerformanceMetric(metric);
      }
    }

    // Re-render tracking disabled to prevent console spam
  });

  return {
    performanceData,
  };
};

// 웹 바이탈 메트릭 수집
export const useWebVitals = () => {
  useEffect(() => {
    // Core Web Vitals 측정
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navigationTiming = entry;
          const metrics = {
            // First Contentful Paint
            fcp: navigationTiming.responseEnd - navigationTiming.fetchStart,
            // DOM Content Loaded
            dcl: navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart,
            // Load Complete
            load: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
          };

          if (import.meta.env.MODE === 'development') {
            console.log('[Web Vitals]', metrics);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => observer.disconnect();
  }, []);
};

// 메모리 사용량 모니터링
export const useMemoryMonitor = () => {
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const memoryUsage: MemoryUsage = {
          used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024),
        };

        if (import.meta.env.MODE === 'development') {
          console.log('[Memory Usage]', memoryUsage);
        }

        // 메모리 사용량이 너무 높으면 경고
        if (memoryUsage.used > memoryUsage.limit * 0.9) {
          console.warn('[Memory Warning] High memory usage detected');
        }
      }
    };

    // 30초마다 메모리 체크
    const interval = setInterval(checkMemory, 30000);
    return () => clearInterval(interval);
  }, []);
};

// 성능 메트릭 리포팅 (서버 전송 비활성화)
const reportPerformanceMetric = async (metric: PerformanceMetric): Promise<void> => {
  // 백엔드에 /api/performance-metrics 엔드포인트가 없으므로 로컬 로깅만 수행
  if (import.meta.env.MODE === 'development') {
    console.log('[Performance Metric]', metric);
  }
  // 서버 전송 비활성화: 405 에러 방지
  // TODO: 필요시 백엔드에 performance-metrics 엔드포인트 구현 후 활성화
};

// 네트워크 상태 모니터링
export const useNetworkMonitor = () => {
  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const logConnection = (): void => {
        console.log('[Network]', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        });
      };

      connection.addEventListener('change', logConnection);
      logConnection(); // 초기 상태 로그

      return () => connection.removeEventListener('change', logConnection);
    }
  }, []);
};