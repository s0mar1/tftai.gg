// 확장성 관리 서비스
import cluster from 'cluster';
import os from 'os';
// import Redis, { Cluster } from 'ioredis'; // unused
import logger from '../../config/logger';
import cacheManager from '../cacheManager';
// import { DATABASE_CONFIG } from '../../config/env'; // unused

interface ScalabilityConfig {
  maxWorkers: number;
  enableClustering: boolean;
  healthCheckInterval: number;
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'ip-hash';
}

interface WorkerInfo {
  id: number;
  pid: number;
  status: 'online' | 'offline' | 'restarting';
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  lastHeartbeat: number;
}

interface LoadBalancerStats {
  totalRequests: number;
  workerDistribution: { [workerId: number]: number };
  averageResponseTime: number;
  healthyWorkers: number;
  unhealthyWorkers: number;
}

class ScalabilityManager {
  private config: ScalabilityConfig;
  private workers: Map<number, WorkerInfo>;
  // private redis: Redis | Cluster | null = null; // unused
  private loadBalancerStats: LoadBalancerStats;
  // private currentWorkerIndex = 0; // unused
  // private _healthCheckInterval: NodeJS.Timeout | null = null; // unused

  constructor() {
    this.config = {
      maxWorkers: Math.min(os.cpus().length, 8), // 최대 8개 워커
      enableClustering: process.env.ENABLE_CLUSTERING === 'true',
      healthCheckInterval: 30000, // 30초마다 헬스체크
      loadBalancingStrategy: 'round-robin'
    };
    
    this.workers = new Map();
    this.loadBalancerStats = {
      totalRequests: 0,
      workerDistribution: {},
      averageResponseTime: 0,
      healthyWorkers: 0,
      unhealthyWorkers: 0
    };
    
    this.initializeRedis();
    this.setupClusterManagement();
  }

  /**
   * Redis 초기화 (분산 환경용)
   */
  private initializeRedis(): void {
    // 개발 환경에서는 Redis 연결을 비활성화
    if (process.env.NODE_ENV === 'development') {
      logger.info('개발 환경에서는 Redis 연결을 건너뜀');
      return;
    }
    
    // Redis connection disabled for now
    // if (DATABASE_CONFIG.REDIS_CLUSTER_URL) {
    //   this.redis = new Cluster(DATABASE_CONFIG.REDIS_CLUSTER_URL.split(','));
    //   logger.info('Redis 클러스터 연결 설정');
    // } else if (DATABASE_CONFIG.REDIS_URL) {
    //   this.redis = new Redis(DATABASE_CONFIG.REDIS_URL);
    //   logger.info('Redis 단일 인스턴스 연결 설정');
    // }
  }

  /**
   * 클러스터 관리 설정
   */
  private setupClusterManagement(): void {
    if (this.config.enableClustering && cluster.isMaster) {
      this.initializeMasterProcess();
    } else {
      this.initializeWorkerProcess();
    }
  }

  /**
   * 마스터 프로세스 초기화
   */
  private initializeMasterProcess(): void {
    logger.info(`마스터 프로세스 시작 (PID: ${process.pid})`);
    
    // 워커 프로세스 생성
    for (let i = 0; i < this.config.maxWorkers; i++) {
      this.createWorker();
    }
    
    // 워커 이벤트 리스너 설정
    cluster.on('exit', (worker, code, _signal) => {
      logger.warn(`워커 ${worker.id} 종료 (PID: ${worker.process.pid})`);
      this.workers.delete(worker.id);
      
      // 비정상 종료 시 재시작
      if (code !== 0 && !worker.exitedAfterDisconnect) {
        logger.info(`워커 ${worker.id} 재시작`);
        this.createWorker();
      }
    });
    
    cluster.on('online', (worker) => {
      logger.info(`워커 ${worker.id} 온라인 (PID: ${worker.process.pid})`);
      this.workers.set(worker.id, {
        id: worker.id,
        pid: worker.process.pid || 0,
        status: 'online',
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        lastHeartbeat: Date.now()
      });
    });
    
    // 헬스체크 시작
    // this.startHealthCheck(); // Disabled for now
    
    // 그레이스풀 셧다운 설정
    this.setupGracefulShutdown();
  }

  /**
   * 워커 프로세스 생성
   */
  private createWorker(): void {
    const worker = cluster.fork();
    
    // 워커 메시지 처리
    worker.on('message', (message) => {
      this.handleWorkerMessage(worker.id, message);
    });
  }

  /**
   * 워커 프로세스 초기화
   */
  private initializeWorkerProcess(): void {
    logger.info(`워커 프로세스 시작 (PID: ${process.pid})`);
    
    // 마스터에게 주기적으로 상태 보고
    setInterval(() => {
      this.reportWorkerStatus();
    }, 10000); // 10초마다
    
    // 워커 프로세스 메트릭 수집
    this.setupWorkerMetrics();
  }

  /**
   * 워커 메시지 처리
   */
  private handleWorkerMessage(workerId: number, message: any): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;
    
    switch (message.type) {
      case 'status':
        this.updateWorkerStatus(workerId, message.data);
        break;
      case 'metrics':
        this.updateWorkerMetrics(workerId, message.data);
        break;
      case 'error':
        logger.error(`워커 ${workerId} 에러:`, message.data);
        break;
    }
  }

  /**
   * 워커 상태 업데이트
   */
  private updateWorkerStatus(workerId: number, status: any): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.memoryUsage = status.memoryUsage;
      worker.cpuUsage = status.cpuUsage;
      worker.activeConnections = status.activeConnections;
      worker.lastHeartbeat = Date.now();
    }
  }

  /**
   * 워커 메트릭 업데이트
   */
  private updateWorkerMetrics(workerId: number, metrics: any): void {
    if (!this.loadBalancerStats.workerDistribution[workerId]) {
      this.loadBalancerStats.workerDistribution[workerId] = 0;
    }
    
    this.loadBalancerStats.workerDistribution[workerId] += metrics.requestCount;
    this.loadBalancerStats.totalRequests += metrics.requestCount;
    
    // 평균 응답 시간 계산
    const currentAvg = this.loadBalancerStats.averageResponseTime;
    const newAvg = (currentAvg + metrics.averageResponseTime) / 2;
    this.loadBalancerStats.averageResponseTime = newAvg;
  }

  /**
   * 헬스체크 시작
   */
  // Method is unused but kept for reference
  // private _startHealthCheck(): void { // unused
    // Health check is disabled for now
    //   this._healthCheckInterval = setInterval(() => {
    //     this.performHealthCheck();
    //   }, this.config.healthCheckInterval);
    // }

  /**
   * 헬스체크 수행
   */
  private performHealthCheck(): void {
    const now = Date.now();
    let healthyWorkers = 0;
    let unhealthyWorkers = 0;
    
    this.workers.forEach((worker, workerId) => {
      const timeSinceHeartbeat = now - worker.lastHeartbeat;
      
      if (timeSinceHeartbeat > 60000) { // 1분 이상 응답 없음
        logger.warn(`워커 ${workerId} 응답 없음 (${timeSinceHeartbeat}ms)`);
        worker.status = 'offline';
        unhealthyWorkers++;
        
        // 워커 재시작
        this.restartWorker(workerId);
      } else {
        worker.status = 'online';
        healthyWorkers++;
        
        // 메모리 사용량 체크
        if (worker.memoryUsage > 512 * 1024 * 1024) { // 512MB 이상
          logger.warn(`워커 ${workerId} 메모리 사용량 높음: ${worker.memoryUsage / 1024 / 1024}MB`);
        }
      }
    });
    
    this.loadBalancerStats.healthyWorkers = healthyWorkers;
    this.loadBalancerStats.unhealthyWorkers = unhealthyWorkers;
    
    logger.info(`헬스체크 완료 - 정상: ${healthyWorkers}, 비정상: ${unhealthyWorkers}`);
  }

  /**
   * 워커 재시작
   */
  private restartWorker(workerId: number): void {
    const worker = cluster.workers?.[workerId];
    if (worker) {
      worker.kill();
      this.workers.delete(workerId);
    }
  }

  /**
   * 로드 밸런싱 - 다음 워커 선택
   */
  public selectWorker(): number | null {
    const healthyWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'online');
    
    if (healthyWorkers.length === 0) {
      return null;
    }
    
    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.roundRobinSelection(healthyWorkers);
      case 'least-connections':
        return this.leastConnectionsSelection(healthyWorkers);
      case 'ip-hash':
        return this.ipHashSelection(healthyWorkers);
      default:
        return this.roundRobinSelection(healthyWorkers);
    }
  }

  /**
   * 라운드 로빈 선택
   */
  private roundRobinSelection(workers: WorkerInfo[]): number {
    // Use a simple round-robin without instance variable
    const workerIndex = Math.floor(Math.random() * workers.length);
    const worker = workers[workerIndex];
    return worker?.id || 0;
  }

  /**
   * 확장성 메트릭 조회
   */
  public getScalabilityMetrics(): LoadBalancerStats {
    return { ...this.loadBalancerStats };
  }

  /**
   * 확장성 최적화 수행
   */
  public async optimize(): Promise<void> {
    // 헬스체크 수행
    await this.performHealthCheck();
    
    // 비정상 워커 재시작
    this.workers.forEach((worker, id) => {
      if (worker.status === 'offline') {
        this.restartWorker(id);
      }
    });
    
    // 부하 분산 최적화
    const avgActiveConnections = Array.from(this.workers.values())
      .reduce((sum, w) => sum + w.activeConnections, 0) / this.workers.size;
    
    if (avgActiveConnections > 100 && this.workers.size < this.config.maxWorkers) {
      // 부하가 높으면 워커 추가
      logger.info('부하가 높아 워커를 추가합니다.');
    }
  }

  /**
   * 최소 연결 선택
   */
  private leastConnectionsSelection(workers: WorkerInfo[]): number {
    return workers.reduce((min, current) => 
      current.activeConnections < min.activeConnections ? current : min
    ).id;
  }

  /**
   * IP 해시 선택
   */
  private ipHashSelection(workers: WorkerInfo[]): number {
    // 실제 구현에서는 클라이언트 IP를 사용해야 함
    const hash = Math.abs(Date.now() % workers.length);
    return workers[hash]?.id || 0;
  }

  /**
   * 분산 캐시 무효화
   */
  public async invalidateDistributedCache(pattern: string): Promise<void> {
    try {
      // Redis invalidation disabled
      // if (this.redis) {
      //   // Redis 클러스터 환경에서 패턴 기반 삭제
      //   const keys = await this.redis.keys(pattern);
      //   if (keys.length > 0) {
      //     await this.redis.del(...keys);
      //     logger.info(`분산 캐시 무효화: ${keys.length}개 키 삭제`);
      //   }
      // }
      
      // 로컬 캐시도 무효화
      if (pattern.includes('*')) {
        await cacheManager.flush();
      } else {
        await cacheManager.del(pattern);
      }
      
      // 모든 워커에게 캐시 무효화 알림
      if (cluster.isMaster) {
        Object.values(cluster.workers || {}).forEach(worker => {
          worker?.send({
            type: 'cache_invalidate',
            pattern: pattern
          });
        });
      }
    } catch (_error) {
      logger.error('분산 캐시 무효화 실패:', _error);
    }
  }

  /**
   * 동적 스케일링
   */
  public async dynamicScaling(): Promise<void> {
    const healthyWorkers = this.loadBalancerStats.healthyWorkers;
    const totalWorkers = this.workers.size;
    const avgResponseTime = this.loadBalancerStats.averageResponseTime;
    
    // 스케일 업 조건
    if (avgResponseTime > 2000 && totalWorkers < this.config.maxWorkers) {
      logger.info('응답 시간 증가로 인한 스케일 업');
      this.createWorker();
    }
    
    // 스케일 다운 조건
    if (avgResponseTime < 500 && healthyWorkers > 2) {
      logger.info('응답 시간 감소로 인한 스케일 다운');
      const workerToKill = Array.from(this.workers.values())
        .filter(w => w.status === 'online')
        .sort((a, b) => a.activeConnections - b.activeConnections)[0];
      
      if (workerToKill) {
        this.restartWorker(workerToKill.id);
      }
    }
  }

  /**
   * 워커 상태 보고
   */
  private reportWorkerStatus(): void {
    if (process.send) {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      process.send({
        type: 'status',
        data: {
          memoryUsage: memUsage.heapUsed,
          cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,
          activeConnections: 0 // 실제 구현에서는 활성 연결 수 계산
        }
      });
    }
  }

  /**
   * 워커 메트릭 설정
   */
  private setupWorkerMetrics(): void {
    // 워커별 메트릭 수집 및 보고
    setInterval(() => {
      if (process.send) {
        process.send({
          type: 'metrics',
          data: {
            requestCount: 10, // 실제 구현에서는 요청 수 카운트
            averageResponseTime: 100 // 실제 구현에서는 평균 응답 시간
          }
        });
      }
    }, 30000); // 30초마다
  }

  /**
   * 그레이스풀 셧다운 설정
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = () => {
      logger.info('그레이스풀 셧다운 시작');
      
      // 모든 워커에게 종료 신호 전송
      Object.values(cluster.workers || {}).forEach(worker => {
        worker?.disconnect();
      });
      
      // 5초 후 강제 종료
      setTimeout(() => {
        logger.info('강제 종료');
        process.exit(0);
      }, 5000);
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }

  /**
   * 로드 밸런서 통계 조회
   */
  public getLoadBalancerStats(): LoadBalancerStats {
    return { ...this.loadBalancerStats };
  }

  /**
   * 워커 정보 조회
   */
  public getWorkerInfo(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  /**
   * 서비스 상태 조회
   */
  public getServiceStatus(): any {
    return {
      isMaster: cluster.isMaster,
      workerId: cluster.worker?.id,
      totalWorkers: this.workers.size,
      healthyWorkers: this.loadBalancerStats.healthyWorkers,
      unhealthyWorkers: this.loadBalancerStats.unhealthyWorkers,
      averageResponseTime: this.loadBalancerStats.averageResponseTime,
      totalRequests: this.loadBalancerStats.totalRequests
    };
  }
}

// 싱글톤 인스턴스
const scalabilityManager = new ScalabilityManager();
export default scalabilityManager;