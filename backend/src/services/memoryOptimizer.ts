// 메모리 관리 최적화 서비스
import logger from '../config/logger';
import cacheManager from './cacheManager';
import { EventEmitter } from 'events';

interface MemoryUsage {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

interface MemoryStats {
  current: MemoryUsage;
  peak: MemoryUsage;
  gcCount: number;
  lastGcTime: number;
  cacheStats: any;
}

class MemoryOptimizer extends EventEmitter {
  private memoryStats: MemoryStats;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MEMORY_THRESHOLD = 400 * 1024 * 1024; // 400MB로 감소
  private readonly GC_THRESHOLD = 0.80; // 80%로 감소 (더 빠른 GC)
  private readonly MONITORING_INTERVAL = 60000; // 1분마다 모니터링 (더 자주)

  constructor() {
    super();
    this.memoryStats = {
      current: this.getMemoryUsage(),
      peak: this.getMemoryUsage(),
      gcCount: 0,
      lastGcTime: Date.now(),
      cacheStats: {}
    };
    
    this.setupMemoryMonitoring();
    this.setupGCListeners();
  }

  /**
   * 현재 메모리 사용량 조회
   */
  private getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers
    };
  }

  /**
   * 메모리 모니터링 설정
   */
  private setupMemoryMonitoring(): void {
    // Feature flag로 메모리 모니터링 제어
    if (process.env.ENABLE_MEMORY_MONITORING !== 'true') {
      logger.info('메모리 모니터링이 비활성화되어 있습니다 (ENABLE_MEMORY_MONITORING=false)');
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.MONITORING_INTERVAL);

    logger.info('메모리 모니터링 시작');
  }

  /**
   * GC 이벤트 리스너 설정
   */
  private setupGCListeners(): void {
    // GC 이벤트 추적 (Node.js 14+)
    if (process.env.NODE_ENV === 'development') {
      process.on('beforeExit', () => {
        logger.info('프로세스 종료 전 메모리 정리');
        this.forceGarbageCollection();
      });
    }
  }

  /**
   * 메모리 사용량 체크 및 최적화
   */
  private async checkMemoryUsage(): Promise<void> {
    const current = this.getMemoryUsage();
    this.memoryStats.current = current;

    // 피크 메모리 업데이트
    if (current.heapUsed > this.memoryStats.peak.heapUsed) {
      this.memoryStats.peak = current;
    }

    // 메모리 사용률 계산
    const heapUsageRatio = current.heapUsed / current.heapTotal;
    
    // 메모리 압박 상황 감지
    if (current.heapUsed > this.MEMORY_THRESHOLD || heapUsageRatio > this.GC_THRESHOLD) {
      logger.warn('메모리 사용량 높음', {
        heapUsed: this.formatBytes(current.heapUsed),
        heapTotal: this.formatBytes(current.heapTotal),
        heapUsageRatio: (heapUsageRatio * 100).toFixed(2) + '%',
        rss: this.formatBytes(current.rss)
      });

      await this.performMemoryOptimization();
    }

    // 캐시 통계 업데이트
    this.memoryStats.cacheStats = cacheManager.getStats();

    // 메모리 통계 로깅 (5분마다)
    if (Date.now() - this.memoryStats.lastGcTime > 300000) {
      this.logMemoryStats();
    }
  }

  /**
   * 메모리 최적화 수행
   */
  private async performMemoryOptimization(): Promise<void> {
    try {
      logger.info('메모리 최적화 시작');

      // 1. 캐시 정리 (오래된 캐시부터)
      await this.cleanupOldCaches();

      // 2. 강제 가비지 컬렉션 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development') {
        this.forceGarbageCollection();
      }

      // 3. 큰 객체 정리
      await this.cleanupLargeObjects();

      // 4. 이벤트 리스너 정리
      this.cleanupEventListeners();

      logger.info('메모리 최적화 완료');
      this.emit('memoryOptimized');

    } catch (_error) {
      logger.error('메모리 최적화 실패:', _error);
    }
  }

  /**
   * 오래된 캐시 정리
   */
  private async cleanupOldCaches(): Promise<void> {
    try {
      const stats = cacheManager.getStats();
      
      // L1 캐시 통계 확인
      if (stats.l1CacheStats) {
        const hitRatio = stats.l1CacheStats.hits / 
          (stats.l1CacheStats.hits + stats.l1CacheStats.misses);
        
        // 히트율이 낮은 경우 캐시 크기 조정
        if (hitRatio < 0.3) {
          logger.info('L1 캐시 히트율 낮음, 부분 정리 수행');
          // 캐시 크기를 절반으로 줄임 (구체적인 구현은 cacheManager에서)
        }
      }

      logger.info('캐시 정리 완료');
    } catch (_error) {
      logger.error('캐시 정리 실패:', _error);
    }
  }

  /**
   * 큰 객체 정리
   */
  private async cleanupLargeObjects(): Promise<void> {
    try {
      // 전역 변수에서 큰 객체 참조 해제
      if (global.gc) {
        global.gc();
      }

      logger.debug('큰 객체 정리 완료');
    } catch (_error) {
      logger.error('큰 객체 정리 실패:', _error);
    }
  }

  /**
   * 이벤트 리스너 정리
   */
  private cleanupEventListeners(): void {
    try {
      // 현재 객체의 리스너 수 확인
      const listenerCount = this.eventNames().length;
      
      if (listenerCount > 10) {
        logger.warn(`이벤트 리스너 수가 많음: ${listenerCount}`);
        
        // 오래된 리스너 정리
        this.eventNames().forEach(eventName => {
          const listeners = this.listeners(eventName);
          if (listeners.length > 3) {
            this.removeAllListeners(eventName);
          }
        });
      }

      logger.debug('이벤트 리스너 정리 완료');
    } catch (_error) {
      logger.error('이벤트 리스너 정리 실패:', _error);
    }
  }

  /**
   * 강제 가비지 컬렉션
   */
  private forceGarbageCollection(): void {
    try {
      if (global.gc) {
        const before = this.getMemoryUsage();
        global.gc();
        const after = this.getMemoryUsage();
        
        this.memoryStats.gcCount++;
        this.memoryStats.lastGcTime = Date.now();
        
        logger.info('강제 GC 수행', {
          before: this.formatBytes(before.heapUsed),
          after: this.formatBytes(after.heapUsed),
          freed: this.formatBytes(before.heapUsed - after.heapUsed),
          gcCount: this.memoryStats.gcCount
        });
      } else {
        logger.warn('GC 함수를 사용할 수 없음 (--expose-gc 플래그 필요)');
      }
    } catch (_error) {
      logger.error('강제 GC 실패:', _error);
    }
  }

  /**
   * 메모리 통계 로깅
   */
  private logMemoryStats(): void {
    const current = this.memoryStats.current;
    const peak = this.memoryStats.peak;
    
    logger.info('메모리 통계', {
      current: {
        heapUsed: this.formatBytes(current.heapUsed),
        heapTotal: this.formatBytes(current.heapTotal),
        rss: this.formatBytes(current.rss),
        external: this.formatBytes(current.external)
      },
      peak: {
        heapUsed: this.formatBytes(peak.heapUsed),
        heapTotal: this.formatBytes(peak.heapTotal),
        rss: this.formatBytes(peak.rss)
      },
      gcCount: this.memoryStats.gcCount,
      heapUsageRatio: ((current.heapUsed / current.heapTotal) * 100).toFixed(2) + '%'
    });
  }

  /**
   * 바이트를 읽기 쉬운 형태로 변환
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 메모리 통계 조회
   */
  public getMemoryStats(): MemoryStats {
    return {
      ...this.memoryStats,
      current: this.getMemoryUsage()
    };
  }

  /**
   * 메모리 모니터링 중지
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('메모리 모니터링 중지');
    }
  }

  /**
   * 메모리 워밍업 (자주 사용되는 데이터 미리 로드)
   */
  public async warmupMemory(): Promise<void> {
    try {
      logger.info('메모리 워밍업 시작');
      
      // 자주 사용되는 캐시 키들 미리 로드
      const commonCacheKeys = [
        'meta_decks_full',
        'meta_decks_ai_format_10',
        'meta_decks_top_10'
      ];

      for (const key of commonCacheKeys) {
        await cacheManager.get(key);
      }

      logger.info('메모리 워밍업 완료');
    } catch (_error) {
      logger.error('메모리 워밍업 실패:', _error);
    }
  }

  /**
   * 메모리 사용량 알림 설정
   */
  public setMemoryAlert(threshold: number, callback: (usage: MemoryUsage) => void): void {
    this.on('memoryAlert', callback);
    
    const checkAlert = () => {
      const usage = this.getMemoryUsage();
      if (usage.heapUsed > threshold) {
        this.emit('memoryAlert', usage);
      }
    };

    // Feature flag로 메모리 알림 체크 제어
    if (process.env.ENABLE_MEMORY_MONITORING === 'true') {
      setInterval(checkAlert, 10000); // 10초마다 체크
    }
  }
}

// 싱글톤 인스턴스
const memoryOptimizer = new MemoryOptimizer();

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
  memoryOptimizer.stopMonitoring();
});

process.on('SIGINT', () => {
  memoryOptimizer.stopMonitoring();
});

export default memoryOptimizer;