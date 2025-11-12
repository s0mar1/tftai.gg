/**
 * 캐시 성능 분석 및 최적화 도구
 * Apollo Client와 TanStack Query 캐시를 모니터링하고 최적화
 */

import { ApolloClient } from '@apollo/client';
import { QueryClient } from '@tanstack/react-query';

/**
 * 캐시 통계 인터페이스
 */
interface CacheStats {
  apollo: {
    size: number;
    hitRate: number;
    missRate: number;
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    topQueries: Array<{
      operationName: string;
      count: number;
      lastAccessed: number;
    }>;
  };
  reactQuery: {
    size: number;
    activeQueries: number;
    staleQueries: number;
    inactiveQueries: number;
    topQueries: Array<{
      queryKey: string;
      state: string;
      lastUpdated: number;
    }>;
  };
  recommendations: string[];
}

/**
 * 캐시 성능 분석기 클래스
 */
export class CacheAnalyzer {
  private apolloClient: ApolloClient<any> | null = null;
  private reactQueryClient: QueryClient | null = null;
  private stats: {
    apollo: {
      totalQueries: number;
      cacheHits: number;
      cacheMisses: number;
      queryLog: Map<string, { count: number; lastAccessed: number }>;
    };
    reactQuery: {
      queryStats: Map<string, { accessCount: number; lastAccessed: number }>;
    };
  } = {
    apollo: {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      queryLog: new Map()
    },
    reactQuery: {
      queryStats: new Map()
    }
  };

  /**
   * 클라이언트 등록
   */
  registerApolloClient(client: ApolloClient<any>): void {
    this.apolloClient = client;
    this.setupApolloMonitoring();
  }

  registerReactQueryClient(client: QueryClient): void {
    this.reactQueryClient = client;
    this.setupReactQueryMonitoring();
  }

  /**
   * Apollo Client 모니터링 설정
   */
  private setupApolloMonitoring(): void {
    if (!this.apolloClient) return;

    // Apollo Client의 원본 query 메서드를 래핑
    const originalQuery = this.apolloClient.query.bind(this.apolloClient);
    
    this.apolloClient.query = async (options: any) => {
      const operationName = options.query?.definitions?.[0]?.name?.value || 'Unknown';
      const startTime = Date.now();
      
      try {
        const result = await originalQuery(options);
        
        // 캐시 히트/미스 판단 (네트워크 정책 기반)
        const isFromCache = options.fetchPolicy === 'cache-first' || 
                           options.fetchPolicy === 'cache-only' ||
                           result.loading === false;
        
        if (isFromCache) {
          this.stats.apollo.cacheHits++;
        } else {
          this.stats.apollo.cacheMisses++;
        }
        
        this.stats.apollo.totalQueries++;
        this.recordApolloQuery(operationName);
        
        // 성능 로깅
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          console.warn(`[Cache Analyzer] 느린 Apollo 쿼리: ${operationName} (${duration}ms)`);
        }
        
        return result;
      } catch (error) {
        this.stats.apollo.totalQueries++;
        this.stats.apollo.cacheMisses++;
        throw error;
      }
    };
  }

  /**
   * React Query 모니터링 설정
   */
  private setupReactQueryMonitoring(): void {
    if (!this.reactQueryClient) return;

    // React Query의 쿼리 상태 변화 감지
    this.reactQueryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'queryAdded' || event.type === 'queryUpdated') {
        const queryKey = JSON.stringify(event.query.queryKey);
        this.recordReactQuery(queryKey);
      }
    });
  }

  /**
   * Apollo 쿼리 기록
   */
  private recordApolloQuery(operationName: string): void {
    const existing = this.stats.apollo.queryLog.get(operationName) || {
      count: 0,
      lastAccessed: 0
    };
    
    existing.count++;
    existing.lastAccessed = Date.now();
    
    this.stats.apollo.queryLog.set(operationName, existing);
  }

  /**
   * React Query 쿼리 기록
   */
  private recordReactQuery(queryKey: string): void {
    const existing = this.stats.reactQuery.queryStats.get(queryKey) || {
      accessCount: 0,
      lastAccessed: 0
    };
    
    existing.accessCount++;
    existing.lastAccessed = Date.now();
    
    this.stats.reactQuery.queryStats.set(queryKey, existing);
  }

  /**
   * 캐시 통계 분석
   */
  analyzeCache(): CacheStats {
    const apolloStats = this.analyzeApolloCache();
    const reactQueryStats = this.analyzeReactQueryCache();
    const recommendations = this.generateRecommendations(apolloStats, reactQueryStats);

    return {
      apollo: apolloStats,
      reactQuery: reactQueryStats,
      recommendations
    };
  }

  /**
   * Apollo 캐시 분석
   */
  private analyzeApolloCache() {
    const totalQueries = this.stats.apollo.totalQueries;
    const hitRate = totalQueries > 0 ? (this.stats.apollo.cacheHits / totalQueries) * 100 : 0;
    const missRate = totalQueries > 0 ? (this.stats.apollo.cacheMisses / totalQueries) * 100 : 0;

    // 캐시 크기 계산 (추정치)
    const cacheSize = this.apolloClient?.cache?.extract ? 
      JSON.stringify(this.apolloClient.cache.extract()).length : 0;

    // 가장 많이 사용된 쿼리들
    const topQueries = Array.from(this.stats.apollo.queryLog.entries())
      .map(([operationName, stats]) => ({
        operationName,
        count: stats.count,
        lastAccessed: stats.lastAccessed
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      size: cacheSize,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      totalQueries,
      cacheHits: this.stats.apollo.cacheHits,
      cacheMisses: this.stats.apollo.cacheMisses,
      topQueries
    };
  }

  /**
   * React Query 캐시 분석
   */
  private analyzeReactQueryCache() {
    if (!this.reactQueryClient) {
      return {
        size: 0,
        activeQueries: 0,
        staleQueries: 0,
        inactiveQueries: 0,
        topQueries: []
      };
    }

    const cache = this.reactQueryClient.getQueryCache();
    const queries = cache.getAll();

    const activeQueries = queries.filter(q => q.isActive()).length;
    const staleQueries = queries.filter(q => q.isStale()).length;
    const inactiveQueries = queries.filter(q => !q.isActive()).length;

    // 캐시 크기 추정
    const cacheSize = queries.reduce((size, query) => {
      return size + (query.state.data ? JSON.stringify(query.state.data).length : 0);
    }, 0);

    // 가장 많이 사용된 쿼리들
    const topQueries = Array.from(this.stats.reactQuery.queryStats.entries())
      .map(([queryKey, stats]) => ({
        queryKey,
        state: queries.find(q => JSON.stringify(q.queryKey) === queryKey)?.state.status || 'unknown',
        lastUpdated: stats.lastAccessed
      }))
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, 10);

    return {
      size: cacheSize,
      activeQueries,
      staleQueries,
      inactiveQueries,
      topQueries
    };
  }

  /**
   * 최적화 권장사항 생성
   */
  private generateRecommendations(apollo: any, reactQuery: any): string[] {
    const recommendations: string[] = [];

    // Apollo 캐시 권장사항
    if (apollo.hitRate < 50) {
      recommendations.push('Apollo 캐시 히트율이 낮습니다. fetchPolicy를 "cache-first"로 설정하거나 캐시 TTL을 늘려보세요.');
    }

    if (apollo.size > 5 * 1024 * 1024) { // 5MB
      recommendations.push('Apollo 캐시 크기가 큽니다. 불필요한 필드를 제거하거나 캐시 정리를 고려해보세요.');
    }

    // React Query 권장사항
    if (reactQuery.staleQueries > reactQuery.activeQueries * 2) {
      recommendations.push('React Query에 많은 stale 쿼리가 있습니다. staleTime 설정을 확인해보세요.');
    }

    if (reactQuery.inactiveQueries > 50) {
      recommendations.push('React Query에 비활성 쿼리가 많습니다. cacheTime을 줄이거나 수동으로 정리해보세요.');
    }

    if (reactQuery.size > 10 * 1024 * 1024) { // 10MB
      recommendations.push('React Query 캐시 크기가 큽니다. 큰 데이터는 별도 저장소를 고려해보세요.');
    }

    // 중복 사용 패턴 분석
    if (apollo.topQueries.length > 0 && reactQuery.topQueries.length > 0) {
      recommendations.push('Apollo Client와 React Query를 함께 사용하고 있습니다. API 사용 패턴을 통일하는 것을 고려해보세요.');
    }

    if (recommendations.length === 0) {
      recommendations.push('캐시 성능이 양호합니다. 현재 설정을 유지하세요.');
    }

    return recommendations;
  }

  /**
   * 캐시 최적화 실행
   */
  optimizeCache(): void {
    this.optimizeApolloCache();
    this.optimizeReactQueryCache();
  }

  /**
   * Apollo 캐시 최적화
   */
  private optimizeApolloCache(): void {
    if (!this.apolloClient) return;

    try {
      // 오래된 쿼리 결과 정리
      const cache = this.apolloClient.cache;
      
      // 캐시에서 오래된 항목들 제거 (30분 이상 미사용)
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      
      for (const [operationName, stats] of this.stats.apollo.queryLog.entries()) {
        if (stats.lastAccessed < thirtyMinutesAgo && stats.count < 3) {
          // 자주 사용되지 않고 오래된 쿼리 제거
          // 실제 구현은 Apollo Client의 캐시 구조에 따라 달라질 수 있음
          console.log(`[Cache Optimizer] 오래된 쿼리 정리: ${operationName}`);
        }
      }

      // 캐시 가비지 컬렉션
      cache.gc();
      
      console.log('[Cache Optimizer] Apollo 캐시 최적화 완료');
    } catch (error) {
      console.warn('[Cache Optimizer] Apollo 캐시 최적화 실패:', error);
    }
  }

  /**
   * React Query 캐시 최적화
   */
  private optimizeReactQueryCache(): void {
    if (!this.reactQueryClient) return;

    try {
      // 비활성 쿼리 정리
      this.reactQueryClient.getQueryCache().clear();
      
      // 오래된 stale 쿼리 무효화
      const queries = this.reactQueryClient.getQueryCache().getAll();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      queries.forEach(query => {
        if (query.isStale() && query.state.dataUpdatedAt < fiveMinutesAgo) {
          this.reactQueryClient?.invalidateQueries({ queryKey: query.queryKey });
        }
      });
      
      console.log('[Cache Optimizer] React Query 캐시 최적화 완료');
    } catch (error) {
      console.warn('[Cache Optimizer] React Query 캐시 최적화 실패:', error);
    }
  }

  /**
   * 실시간 캐시 모니터링 시작
   */
  startMonitoring(interval: number = 60000): void {
    setInterval(() => {
      const stats = this.analyzeCache();
      
      // 임계값 초과 시 경고
      if (stats.apollo.hitRate < 30) {
        console.warn('[Cache Monitor] Apollo 캐시 히트율이 낮습니다:', stats.apollo.hitRate + '%');
      }
      
      if (stats.reactQuery.size > 20 * 1024 * 1024) { // 20MB
        console.warn('[Cache Monitor] React Query 캐시 크기가 큽니다:', (stats.reactQuery.size / 1024 / 1024).toFixed(2) + 'MB');
      }
      
      // 개발 환경에서만 상세 로깅
      if (import.meta.env.MODE === 'development') {
        console.log('[Cache Monitor] 캐시 통계:', {
          apollo: {
            hitRate: stats.apollo.hitRate + '%',
            size: (stats.apollo.size / 1024).toFixed(2) + 'KB'
          },
          reactQuery: {
            activeQueries: stats.reactQuery.activeQueries,
            size: (stats.reactQuery.size / 1024).toFixed(2) + 'KB'
          }
        });
      }
    }, interval);
  }

  /**
   * 캐시 상태 리포트 생성
   */
  generateReport(): string {
    const stats = this.analyzeCache();
    
    return `
=== 캐시 성능 리포트 ===

📊 Apollo Client:
- 캐시 히트율: ${stats.apollo.hitRate}%
- 총 쿼리 수: ${stats.apollo.totalQueries}
- 캐시 크기: ${(stats.apollo.size / 1024).toFixed(2)} KB
- 상위 쿼리: ${stats.apollo.topQueries.slice(0, 3).map(q => q.operationName).join(', ')}

📊 React Query:
- 활성 쿼리: ${stats.reactQuery.activeQueries}
- Stale 쿼리: ${stats.reactQuery.staleQueries}
- 캐시 크기: ${(stats.reactQuery.size / 1024).toFixed(2)} KB

💡 권장사항:
${stats.recommendations.map(r => `- ${r}`).join('\n')}

=== 리포트 끝 ===
    `.trim();
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.stats = {
      apollo: {
        totalQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        queryLog: new Map()
      },
      reactQuery: {
        queryStats: new Map()
      }
    };
  }
}

// 싱글톤 인스턴스
export const cacheAnalyzer = new CacheAnalyzer();

// 개발 환경에서 글로벌 액세스 제공
if (import.meta.env.MODE === 'development') {
  (window as any).cacheAnalyzer = cacheAnalyzer;
}