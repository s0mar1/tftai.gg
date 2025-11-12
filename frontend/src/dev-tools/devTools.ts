/**
 * 개발자 도구 유틸리티
 * 개발 환경에서 캐시 상태, 성능 등을 쉽게 확인할 수 있는 도구들
 */

import { cacheAnalyzer } from './cacheAnalyzer';

/**
 * 개발자 콘솔 명령어 등록
 * 브라우저 콘솔에서 사용할 수 있는 유틸리티 함수들
 */
export function registerDevTools(): void {
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  // 전역 window 객체에 개발 도구 추가
  const devTools = {
    // 캐시 관련 도구들
    cache: {
      /**
       * 캐시 통계 출력
       * 사용법: window.devTools.cache.stats()
       */
      stats: () => {
        const stats = cacheAnalyzer.analyzeCache();
        console.table({
          'Apollo Hit Rate': stats.apollo.hitRate + '%',
          'Apollo Size': (stats.apollo.size / 1024).toFixed(2) + ' KB',
          'Apollo Queries': stats.apollo.totalQueries,
          'React Query Active': stats.reactQuery.activeQueries,
          'React Query Stale': stats.reactQuery.staleQueries,
          'React Query Size': (stats.reactQuery.size / 1024).toFixed(2) + ' KB'
        });
        return stats;
      },

      /**
       * 상세 캐시 리포트 출력
       * 사용법: window.devTools.cache.report()
       */
      report: () => {
        const report = cacheAnalyzer.generateReport();
        console.log(report);
        return report;
      },

      /**
       * 캐시 최적화 실행
       * 사용법: window.devTools.cache.optimize()
       */
      optimize: () => {
        cacheAnalyzer.optimizeCache();
        console.log('🚀 캐시 최적화가 완료되었습니다.');
      },

      /**
       * 캐시 통계 초기화
       * 사용법: window.devTools.cache.reset()
       */
      reset: () => {
        cacheAnalyzer.resetStats();
        console.log('📊 캐시 통계가 초기화되었습니다.');
      },

      /**
       * Apollo 캐시 내용 출력
       * 사용법: window.devTools.cache.apollo()
       */
      apollo: () => {
        const apolloClient = (window as any).apolloClient;
        if (apolloClient?.cache) {
          const cacheData = apolloClient.cache.extract();
          console.log('Apollo Cache Data:', cacheData);
          return cacheData;
        }
        console.warn('Apollo Client가 전역에 노출되지 않았습니다.');
        return null;
      },

      /**
       * React Query 캐시 내용 출력
       * 사용법: window.devTools.cache.reactQuery()
       */
      reactQuery: () => {
        const queryClient = (window as any).queryClient;
        if (queryClient) {
          const queries = queryClient.getQueryCache().getAll();
          const cacheData = queries.map(query => ({
            queryKey: query.queryKey,
            state: query.state.status,
            data: query.state.data,
            isActive: query.isActive(),
            isStale: query.isStale()
          }));
          console.table(cacheData);
          return cacheData;
        }
        console.warn('React Query Client가 전역에 노출되지 않았습니다.');
        return null;
      }
    },

    // 성능 관련 도구들
    performance: {
      /**
       * 현재 페이지 성능 메트릭스 출력
       * 사용법: window.devTools.performance.metrics()
       */
      metrics: () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        const metrics = {
          'Page Load Time': Math.round(navigation.loadEventEnd - navigation.fetchStart) + 'ms',
          'DOM Content Loaded': Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) + 'ms',
          'First Paint': paint.find(p => p.name === 'first-paint')?.startTime.toFixed(2) + 'ms',
          'First Contentful Paint': paint.find(p => p.name === 'first-contentful-paint')?.startTime.toFixed(2) + 'ms',
          'DNS Lookup': Math.round(navigation.domainLookupEnd - navigation.domainLookupStart) + 'ms',
          'TCP Connect': Math.round(navigation.connectEnd - navigation.connectStart) + 'ms'
        };
        
        console.table(metrics);
        return metrics;
      },

      /**
       * 메모리 사용량 출력 (Chrome에서만 사용 가능)
       * 사용법: window.devTools.performance.memory()
       */
      memory: () => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          const memoryInfo = {
            'Used JS Heap': (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
            'Total JS Heap': (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
            'JS Heap Limit': (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
          };
          console.table(memoryInfo);
          return memoryInfo;
        }
        console.warn('메모리 정보는 Chrome에서만 사용할 수 있습니다.');
        return null;
      },

      /**
       * 리소스 로딩 타이밍 분석
       * 사용법: window.devTools.performance.resources()
       */
      resources: () => {
        const resources = performance.getEntriesByType('resource');
        const slowResources = resources
          .filter((resource: any) => resource.duration > 100)
          .map((resource: any) => ({
            name: resource.name.split('/').pop(),
            duration: Math.round(resource.duration) + 'ms',
            size: resource.transferSize ? (resource.transferSize / 1024).toFixed(2) + ' KB' : 'unknown',
            type: resource.initiatorType
          }))
          .sort((a, b) => parseInt(b.duration) - parseInt(a.duration));

        console.table(slowResources);
        return slowResources;
      }
    },

    // GraphQL 관련 도구들
    graphql: {
      /**
       * 최근 GraphQL 쿼리 로그 출력
       * 사용법: window.devTools.graphql.queries()
       */
      queries: () => {
        const stats = cacheAnalyzer.analyzeCache();
        console.log('최근 Apollo 쿼리들:');
        console.table(stats.apollo.topQueries);
        return stats.apollo.topQueries;
      },

      /**
       * GraphQL 에러 로그 출력 (localStorage에서 가져오기)
       * 사용법: window.devTools.graphql.errors()
       */
      errors: () => {
        try {
          const errorLog = localStorage.getItem('graphql_errors');
          if (errorLog) {
            const errors = JSON.parse(errorLog);
            console.table(errors);
            return errors;
          }
          console.log('저장된 GraphQL 에러가 없습니다.');
          return [];
        } catch (error) {
          console.error('GraphQL 에러 로그를 불러오는데 실패했습니다:', error);
          return null;
        }
      }
    },

    // 유틸리티 도구들
    utils: {
      /**
       * 로컬 스토리지 내용 출력
       * 사용법: window.devTools.utils.localStorage()
       */
      localStorage: () => {
        const items: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            try {
              items[key] = JSON.parse(localStorage.getItem(key) || '');
            } catch {
              items[key] = localStorage.getItem(key);
            }
          }
        }
        console.table(items);
        return items;
      },

      /**
       * 환경 변수 출력
       * 사용법: window.devTools.utils.env()
       */
      env: () => {
        const env = {
          'Mode': import.meta.env.MODE,
          'API Base URL': import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001',
          'Development': import.meta.env.DEV,
          'Production': import.meta.env.PROD
        };
        console.table(env);
        return env;
      },

      /**
       * 현재 페이지 상태 분석
       * 사용법: window.devTools.utils.pageInfo()
       */
      pageInfo: () => {
        const info = {
          'URL': window.location.href,
          'User Agent': navigator.userAgent,
          'Language': navigator.language,
          'Online': navigator.onLine,
          'Cookies Enabled': navigator.cookieEnabled,
          'Screen Size': `${screen.width}x${screen.height}`,
          'Viewport Size': `${window.innerWidth}x${window.innerHeight}`
        };
        console.table(info);
        return info;
      }
    },

    /**
     * 도움말 출력
     * 사용법: window.devTools.help()
     */
    help: () => {
      console.log(`
🛠️ TFT Meta Analyzer 개발자 도구

📊 캐시 관련:
- devTools.cache.stats()     : 캐시 통계 요약
- devTools.cache.report()    : 상세 캐시 리포트
- devTools.cache.optimize()  : 캐시 최적화 실행
- devTools.cache.reset()     : 통계 초기화
- devTools.cache.apollo()    : Apollo 캐시 데이터
- devTools.cache.reactQuery(): React Query 캐시 데이터

⚡ 성능 관련:
- devTools.performance.metrics()   : 페이지 성능 메트릭스
- devTools.performance.memory()    : 메모리 사용량 (Chrome)
- devTools.performance.resources() : 느린 리소스 분석

🔍 GraphQL 관련:
- devTools.graphql.queries() : 최근 쿼리 로그
- devTools.graphql.errors()  : GraphQL 에러 로그

🔧 유틸리티:
- devTools.utils.localStorage() : 로컬 스토리지 내용
- devTools.utils.env()          : 환경 변수
- devTools.utils.pageInfo()     : 페이지 정보

❓ 도움말:
- devTools.help() : 이 도움말 다시 보기
      `);
    }
  };

  // 전역에 등록
  (window as any).devTools = devTools;

  // 초기 메시지
  console.log('🛠️ TFT Meta Analyzer 개발자 도구가 로드되었습니다.');
  console.log('사용법: window.devTools.help()');
}

// 자동 등록
registerDevTools();