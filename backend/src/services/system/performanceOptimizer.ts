// API 응답 시간 최적화 서비스
import { Request, Response, NextFunction } from 'express';
import logger from '../../config/logger';
import { CACHE_TTL } from '../../config/cacheTTL';
import cacheManager from '../cacheManager';
import cluster from 'cluster';
import os from 'os';

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowRequests: number;
  concurrentRequests: number;
  queueSize: number;
}

interface RequestInfo {
  id: string;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  cached: boolean;
}

class PerformanceOptimizer {
  private metrics: PerformanceMetrics;
  private activeRequests: Map<string, RequestInfo>;
  private requestQueue: Array<() => Promise<any>>;
  private readonly MAX_CONCURRENT_REQUESTS = 100;
  private readonly SLOW_REQUEST_THRESHOLD = 2000; // 2초
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      concurrentRequests: 0,
      queueSize: 0
    };
    this.activeRequests = new Map();
    this.requestQueue = [];
    
    this.setupPerformanceMonitoring();
  }

  /**
   * 성능 모니터링 설정
   */
  private setupPerformanceMonitoring(): void {
    // Feature flag로 성능 모니터링 제어
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      // 주기적으로 성능 메트릭 로깅
      setInterval(() => {
        this.logPerformanceMetrics();
      }, 60000); // 1분마다
    }

    // 요청 큐 처리 (개발/배포 환경 모두 필요하지만 간격 조정)
    const queueInterval = process.env.NODE_ENV === 'development' ? 1000 : 100; // 개발환경에서는 1초마다
    setInterval(() => {
      this.processRequestQueue();
    }, queueInterval);
  }

  /**
   * 요청 성능 추적 미들웨어
   */
  public trackRequest() {
    return (_req: Request, _res: Response, _next: NextFunction) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      const requestInfo: RequestInfo = {
        id: requestId,
        url: _req.url,
        method: _req.method,
        startTime,
        cached: false
      };

      // 활성 요청에 추가
      this.activeRequests.set(requestId, requestInfo);
      this.metrics.concurrentRequests++;

      // 응답 완료 시 메트릭 업데이트
      _res.on('finish', () => {
        this.finishRequest(requestId, _res);
      });

      // 요청 컨텍스트에 ID 추가
      (_req as any).requestId = requestId;
      _next();
    };
  }

  /**
   * 캐시 최적화 미들웨어
   */
  public optimizeCache() {
    return async (_req: Request, _res: Response, _next: NextFunction) => {
      const cacheKey = this.generateCacheKey(_req);
      const requestId = (_req as any).requestId;

      try {
        // 캐시에서 확인
        const cachedData = await cacheManager.get(cacheKey);
        if (cachedData) {
          // 캐시 히트 - 빠른 응답
          if (requestId && this.activeRequests.has(requestId)) {
            this.activeRequests.get(requestId)!.cached = true;
          }
          
          logger.debug(`캐시 히트: ${cacheKey}`);
          return _res.json(cachedData);
        }

        // 캐시 미스 - 다음 미들웨어로
        _next();
      } catch (_error) {
        logger.error('캐시 최적화 미들웨어 오류:', _error);
        _next();
      }
    };
  }

  /**
   * 응답 압축 최적화
   */
  public optimizeResponse() {
    return (_req: Request, _res: Response, _next: NextFunction) => {
      const originalSend = _res.send;
      const originalJson = _res.json;

      // JSON 응답 최적화
      _res.json = function(data: any) {
        try {
          // 큰 응답 데이터 스트리밍
          if (JSON.stringify(data).length > 100000) { // 100KB 이상
            _res.setHeader('Content-Type', 'application/json');
            _res.setHeader('Transfer-Encoding', 'chunked');
            
            // 청크 단위로 전송
            const chunks = performanceOptimizer.chunkLargeResponse(data);
            chunks.forEach((chunk, index) => {
              setTimeout(() => {
                _res.write(JSON.stringify(chunk));
                if (index === chunks.length - 1) {
                  _res.end();
                }
              }, index * 10); // 10ms 간격
            });
            
            return _res;
          }
          
          // 일반 응답
          return originalJson.call(this, data);
        } catch (_error) {
          logger.error('응답 최적화 오류:', _error);
          return originalJson.call(this, data);
        }
      };

      _next();
    };
  }

  /**
   * 병렬 처리 최적화
   */
  public async parallelProcess<T>(
    tasks: Array<() => Promise<T>>,
    maxConcurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 데이터베이스 쿼리 최적화
   */
  public async optimizeQuery<T>(
    queryFunction: () => Promise<T>,
    cacheKey: string,
    ttl: number = CACHE_TTL.DEFAULT
  ): Promise<T> {
    // 캐시 확인
    const cached = await cacheManager.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // 쿼리 실행
    const startTime = Date.now();
    const result = await queryFunction();
    const duration = Date.now() - startTime;

    // 느린 쿼리 감지
    if (duration > this.SLOW_REQUEST_THRESHOLD) {
      logger.warn(`느린 쿼리 감지: ${cacheKey} (${duration}ms)`);
    }

    // 캐시 저장
    await cacheManager.set(cacheKey, result, ttl);
    return result;
  }

  /**
   * 응답 배치 처리
   */
  public async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 요청 큐 처리
   */
  private async processRequestQueue(): Promise<void> {
    if (this.requestQueue.length === 0) return;
    
    const availableSlots = this.MAX_CONCURRENT_REQUESTS - this.metrics.concurrentRequests;
    const tasksToProcess = Math.min(availableSlots, this.requestQueue.length);

    for (let i = 0; i < tasksToProcess; i++) {
      const task = this.requestQueue.shift();
      if (task) {
        task().catch(error => {
          logger.error('큐 처리 중 오류:', error);
        });
      }
    }

    this.metrics.queueSize = this.requestQueue.length;
  }

  /**
   * 큰 응답 데이터 청킹
   */
  private chunkLargeResponse(data: any, chunkSize: number = 1000): any[] {
    if (Array.isArray(data)) {
      const chunks: any[] = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }
      return chunks;
    }
    return [data];
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(_req: Request): string {
    // URL에서 쿼리 파라미터 제거하고 경로만 사용
    const baseUrl = _req.url.split('?')[0];
    const params = JSON.stringify(_req.query);
    const body = _req.method !== 'GET' ? JSON.stringify(_req.body) : '';
    
    // 간결한 캐시 키 생성
    const cacheKey = body 
      ? `${_req.method}:${baseUrl}:${params}:${body}`
      : `${_req.method}:${baseUrl}:${params}`;
    
    // 키 길이 제한 (256자)
    if (cacheKey.length > 256) {
      const hash = require('crypto').createHash('md5').update(cacheKey).digest('hex');
      return `${_req.method}:${baseUrl}:${hash}`;
    }
    
    return cacheKey;
  }

  /**
   * 요청 완료 처리
   */
  private finishRequest(requestId: string, _res: Response): void {
    const requestInfo = this.activeRequests.get(requestId);
    if (!requestInfo) return;

    const endTime = Date.now();
    const duration = endTime - requestInfo.startTime;

    requestInfo.endTime = endTime;
    requestInfo.duration = duration;

    // 메트릭 업데이트
    this.metrics.requestCount++;
    this.metrics.concurrentRequests--;
    
    // 평균 응답 시간 계산
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + duration) / 
      this.metrics.requestCount;

    // 느린 요청 카운트
    if (duration > this.SLOW_REQUEST_THRESHOLD) {
      this.metrics.slowRequests++;
      logger.warn(`느린 요청 감지: ${requestInfo.url} (${duration}ms)`);
    }

    // 활성 요청에서 제거
    this.activeRequests.delete(requestId);
  }

  /**
   * 성능 메트릭 로깅
   */
  private logPerformanceMetrics(): void {
    logger.info('성능 메트릭', {
      requestCount: this.metrics.requestCount,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      slowRequestPercentage: this.metrics.requestCount > 0 ? 
        ((this.metrics.slowRequests / this.metrics.requestCount) * 100).toFixed(2) + '%' : '0%',
      concurrentRequests: this.metrics.concurrentRequests,
      queueSize: this.metrics.queueSize,
      memoryUsage: process.memoryUsage()
    });
  }

  /**
   * 성능 메트릭 조회
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 서버 클러스터링 설정 (멀티코어 활용)
   */
  public setupClustering(): void {
    if (cluster.isMaster) {
      const numCPUs = os.cpus().length;
      logger.info(`마스터 프로세스 ${process.pid} 시작`);
      logger.info(`${numCPUs}개의 워커 프로세스 생성`);

      // 워커 프로세스 생성
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      // 워커 프로세스 종료 시 재시작
      cluster.on('exit', (worker, code, signal) => {
        logger.warn(`워커 프로세스 ${worker.process.pid} 종료`);
        logger.info('새로운 워커 프로세스 시작');
        cluster.fork();
      });
    } else {
      // 워커 프로세스에서 서버 시작
      logger.info(`워커 프로세스 ${process.pid} 시작`);
    }
  }

  /**
   * 스트리밍 응답 처리
   */
  public streamResponse(_res: Response, data: any[], chunkSize: number = 100): void {
    _res.setHeader('Content-Type', 'application/json');
    _res.setHeader('Transfer-Encoding', 'chunked');
    
    _res.write('[');
    
    let isFirst = true;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      if (!isFirst) {
        _res.write(',');
      }
      
      _res.write(JSON.stringify(chunk).slice(1, -1)); // 배열 브래킷 제거
      isFirst = false;
    }
    
    _res.write(']');
    _res.end();
  }
}

// 싱글톤 인스턴스
const performanceOptimizer = new PerformanceOptimizer();
export default performanceOptimizer;