/**
 * 성능 측정 유틸리티
 * GraphQL 전환 전후 성능 비교를 위한 메트릭스 수집
 */

interface NetworkRequest {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;
  type: 'REST' | 'GraphQL';
}

interface PerformanceMetrics {
  networkRequests: NetworkRequest[];
  totalRequests: number;
  totalDataSize: number;
  totalDuration: number;
  averageDuration: number;
  largestRequest: NetworkRequest | null;
  slowestRequest: NetworkRequest | null;
}

class PerformanceTracker {
  private requests: NetworkRequest[] = [];
  private originalFetch: typeof fetch;
  private isTracking = false;

  constructor() {
    this.originalFetch = window.fetch;
  }

  /**
   * 성능 추적 시작
   */
  startTracking(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.requests = [];
    
    // fetch 가로채기
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      const startTime = performance.now();
      
      try {
        const response = await this.originalFetch(input, init);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // 응답 크기 계산 (근사치)
        let size = 0;
        try {
          const clonedResponse = response.clone();
          const text = await clonedResponse.text();
          size = new Blob([text]).size;
        } catch (e) {
          // 크기 계산 실패시 Content-Length 헤더 사용
          const contentLength = response.headers.get('content-length');
          size = contentLength ? parseInt(contentLength, 10) : 0;
        }
        
        // 요청 타입 판별
        const type: 'REST' | 'GraphQL' = url.includes('/graphql') ? 'GraphQL' : 'REST';
        
        this.requests.push({
          url,
          method,
          startTime,
          endTime,
          duration,
          size,
          type
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.requests.push({
          url,
          method,
          startTime,
          endTime,
          duration,
          size: 0,
          type: url.includes('/graphql') ? 'GraphQL' : 'REST'
        });
        
        throw error;
      }
    };
    
    console.log('🎯 성능 추적 시작');
  }

  /**
   * 성능 추적 중지
   */
  stopTracking(): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    window.fetch = this.originalFetch;
    console.log('🎯 성능 추적 종료');
  }

  /**
   * 현재까지의 메트릭스 반환
   */
  getMetrics(): PerformanceMetrics {
    const totalRequests = this.requests.length;
    const totalDataSize = this.requests.reduce((sum, req) => sum + req.size, 0);
    const totalDuration = this.requests.reduce((sum, req) => sum + req.duration, 0);
    const averageDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;
    
    const largestRequest = this.requests.reduce((largest, req) => 
      !largest || req.size > largest.size ? req : largest, null as NetworkRequest | null
    );
    
    const slowestRequest = this.requests.reduce((slowest, req) => 
      !slowest || req.duration > slowest.duration ? req : slowest, null as NetworkRequest | null
    );

    return {
      networkRequests: [...this.requests],
      totalRequests,
      totalDataSize,
      totalDuration,
      averageDuration,
      largestRequest,
      slowestRequest
    };
  }

  /**
   * REST vs GraphQL 비교 메트릭스
   */
  getComparisonMetrics(): {
    rest: PerformanceMetrics;
    graphql: PerformanceMetrics;
    improvement: {
      requestsReduction: number;
      dataSizeReduction: number;
      durationReduction: number;
    };
  } {
    const restRequests = this.requests.filter(req => req.type === 'REST');
    const graphqlRequests = this.requests.filter(req => req.type === 'GraphQL');
    
    const createMetrics = (requests: NetworkRequest[]): PerformanceMetrics => {
      const totalRequests = requests.length;
      const totalDataSize = requests.reduce((sum, req) => sum + req.size, 0);
      const totalDuration = requests.reduce((sum, req) => sum + req.duration, 0);
      const averageDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;
      
      const largestRequest = requests.reduce((largest, req) => 
        !largest || req.size > largest.size ? req : largest, null as NetworkRequest | null
      );
      
      const slowestRequest = requests.reduce((slowest, req) => 
        !slowest || req.duration > slowest.duration ? req : slowest, null as NetworkRequest | null
      );

      return {
        networkRequests: requests,
        totalRequests,
        totalDataSize,
        totalDuration,
        averageDuration,
        largestRequest,
        slowestRequest
      };
    };
    
    const rest = createMetrics(restRequests);
    const graphql = createMetrics(graphqlRequests);
    
    const improvement = {
      requestsReduction: rest.totalRequests > 0 ? 
        ((rest.totalRequests - graphql.totalRequests) / rest.totalRequests) * 100 : 0,
      dataSizeReduction: rest.totalDataSize > 0 ? 
        ((rest.totalDataSize - graphql.totalDataSize) / rest.totalDataSize) * 100 : 0,
      durationReduction: rest.totalDuration > 0 ? 
        ((rest.totalDuration - graphql.totalDuration) / rest.totalDuration) * 100 : 0
    };
    
    return { rest, graphql, improvement };
  }

  /**
   * 메트릭스를 콘솔에 출력
   */
  logMetrics(): void {
    const metrics = this.getMetrics();
    const comparison = this.getComparisonMetrics();
    
    console.group('📊 성능 메트릭스');
    
    console.log('전체 요청:', metrics.totalRequests);
    console.log('총 데이터 크기:', this.formatBytes(metrics.totalDataSize));
    console.log('총 소요 시간:', metrics.totalDuration.toFixed(2) + 'ms');
    console.log('평균 응답 시간:', metrics.averageDuration.toFixed(2) + 'ms');
    
    if (metrics.largestRequest) {
      console.log('최대 용량 요청:', {
        url: metrics.largestRequest.url,
        size: this.formatBytes(metrics.largestRequest.size)
      });
    }
    
    if (metrics.slowestRequest) {
      console.log('최대 소요시간 요청:', {
        url: metrics.slowestRequest.url,
        duration: metrics.slowestRequest.duration.toFixed(2) + 'ms'
      });
    }
    
    console.group('🔄 REST vs GraphQL 비교');
    console.log('REST 요청:', comparison.rest.totalRequests);
    console.log('GraphQL 요청:', comparison.graphql.totalRequests);
    console.log('요청 수 감소:', comparison.improvement.requestsReduction.toFixed(1) + '%');
    console.log('데이터 크기 감소:', comparison.improvement.dataSizeReduction.toFixed(1) + '%');
    console.log('응답 시간 감소:', comparison.improvement.durationReduction.toFixed(1) + '%');
    console.groupEnd();
    
    console.groupEnd();
  }

  /**
   * 메트릭스를 테이블 형태로 출력
   */
  logDetailedMetrics(): void {
    const metrics = this.getMetrics();
    
    console.group('📊 상세 성능 메트릭스');
    
    if (metrics.networkRequests.length > 0) {
      console.table(
        metrics.networkRequests.map(req => ({
          URL: req.url.length > 50 ? req.url.substring(0, 50) + '...' : req.url,
          Method: req.method,
          Type: req.type,
          Duration: req.duration.toFixed(2) + 'ms',
          Size: this.formatBytes(req.size)
        }))
      );
    } else {
      console.log('추적된 요청이 없습니다.');
    }
    
    console.groupEnd();
  }

  /**
   * 바이트를 읽기 쉬운 형태로 변환
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 요청 목록 초기화
   */
  clearMetrics(): void {
    this.requests = [];
    console.log('🧹 성능 메트릭스 초기화');
  }
}

// 글로벌 인스턴스
export const performanceTracker = new PerformanceTracker();

// 개발 환경에서 윈도우 객체에 추가 (디버깅용)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).performanceTracker = performanceTracker;
  console.log('🎯 Performance Tracker가 window.performanceTracker로 등록되었습니다.');
  console.log('사용법:');
  console.log('- window.performanceTracker.startTracking() : 추적 시작');
  console.log('- window.performanceTracker.stopTracking() : 추적 종료');
  console.log('- window.performanceTracker.logMetrics() : 메트릭스 출력');
  console.log('- window.performanceTracker.logDetailedMetrics() : 상세 메트릭스 출력');
}

export default performanceTracker;