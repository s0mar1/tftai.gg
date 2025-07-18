import React, { Suspense } from 'react';
import PageLoadingFallback from './PageLoadingFallback';

// 고차 컴포넌트로 Lazy Loading 래핑
const withLazyLoading = (Component, fallback = <PageLoadingFallback />) => {
  return (props) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

// 컴포넌트별 커스텀 로딩 상태
const ComponentLoader = ({ isLoading, error, children, fallback }) => {
  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-500 text-center">
          <p className="text-lg font-medium">컴포넌트 로딩 실패</p>
          <p className="text-sm">페이지를 새로고침해주세요.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return fallback || <PageLoadingFallback />;
  }

  return children;
};

// Vite 호환 lazy loading 헬퍼 (우선순위 지원)
export const createLazyComponent = (importFunc, options = {}) => {
  const { priority = 'medium', customFallback } = options;
  
  // 우선순위에 따른 로딩 전략
  const createImportStrategy = () => {
    switch (priority) {
      case 'high':
        // 높은 우선순위: 즉시 로딩
        return importFunc();
      case 'medium':
        // 중간 우선순위: 약간의 지연
        return new Promise(resolve => {
          setTimeout(() => {
            importFunc().then(resolve);
          }, 50);
        });
      case 'low':
        // 낮은 우선순위: 더 긴 지연
        return new Promise(resolve => {
          setTimeout(() => {
            importFunc().then(resolve);
          }, 200);
        });
      default:
        return importFunc();
    }
  };

  const LazyComponent = React.lazy(() => 
    createImportStrategy().then(module => {
      // Vite의 동적 import 결과 처리
      if (module.default) {
        return { default: module.default };
      }
      // 이미 올바른 형식인 경우
      return module;
    }).catch(err => {
      console.error(`Lazy loading error (priority: ${priority}):`, err);
      // 에러 발생 시 빈 컴포넌트 반환
      return { 
        default: () => (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500 text-center">
              <p className="text-lg font-medium">페이지 로딩 실패</p>
              <p className="text-sm">새로고침해주세요.</p>
            </div>
          </div>
        )
      };
    })
  );
  
  return (props) => (
    <Suspense fallback={customFallback || <PageLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// 중요하지 않은 컴포넌트들을 위한 지연 로딩 (성능 모니터링 포함)
export const createDeferredComponent = (importFunc, delay = 100) => {
  const LazyComponent = React.lazy(() => 
    new Promise(resolve => {
      const loadStartTime = performance.now();
      
      setTimeout(() => {
        importFunc()
          .then(module => {
            const loadEndTime = performance.now();
            const loadTime = loadEndTime - loadStartTime;
            
            // 성능 메트릭 로깅 (개발 모드에서만)
            if (process.env.NODE_ENV === 'development') {
              console.log(`Deferred component loaded in ${loadTime.toFixed(2)}ms`);
            }
            
            // Vite의 동적 import 결과 처리
            if (module.default) {
              resolve({ default: module.default });
            } else {
              resolve(module);
            }
          })
          .catch(err => {
            console.error('Deferred loading error:', err);
            resolve({ 
              default: () => (
                <div className="flex items-center justify-center py-8">
                  <div className="text-red-500 text-center">
                    <p className="text-lg font-medium">페이지 로딩 실패</p>
                    <p className="text-sm">새로고침해주세요.</p>
                  </div>
                </div>
              )
            });
          });
      }, delay);
    })
  );
  
  return (props) => (
    <Suspense fallback={<PageLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// 번들 크기 최적화를 위한 성능 메트릭 수집
export const bundleMetrics = {
  loadTimes: new Map(),
  
  recordLoadTime(componentName, loadTime) {
    if (!this.loadTimes.has(componentName)) {
      this.loadTimes.set(componentName, []);
    }
    this.loadTimes.get(componentName).push(loadTime);
  },
  
  getAverageLoadTime(componentName) {
    const times = this.loadTimes.get(componentName) || [];
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  },
  
  getAllMetrics() {
    const metrics = {};
    for (const [componentName, times] of this.loadTimes) {
      metrics[componentName] = {
        averageLoadTime: this.getAverageLoadTime(componentName),
        loadCount: times.length,
        totalLoadTime: times.reduce((sum, time) => sum + time, 0)
      };
    }
    return metrics;
  }
};

export { withLazyLoading, ComponentLoader };
export default ComponentLoader;