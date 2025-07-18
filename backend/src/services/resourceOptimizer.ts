// 리소스 사용량 최적화 서비스
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger';
import os from 'os';
import { fileURLToPath } from 'url';

interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

interface WorkerTask {
  id: string;
  type: string;
  data: any;
  priority: number;
  timeout: number;
}

interface WorkerPool {
  workers: Worker[];
  taskQueue: WorkerTask[];
  busyWorkers: Set<Worker>;
  maxWorkers: number;
}

class ResourceOptimizer {
  private workerPool: WorkerPool;
  private resourceUsage: ResourceUsage;
  private readonly MAX_WORKERS: number;
  private readonly TASK_TIMEOUT = 30000; // 30초
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.MAX_WORKERS = Math.min(os.cpus().length, 4); // 최대 4개 워커
    this.workerPool = {
      workers: [],
      taskQueue: [],
      busyWorkers: new Set(),
      maxWorkers: this.MAX_WORKERS
    };
    this.resourceUsage = {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0
    };
    
    this.initializeWorkerPool();
    
    // Feature flag로 리소스 모니터링 제어
    if (process.env.ENABLE_RESOURCE_MONITORING === 'true') {
      this.startResourceMonitoring();
    }
  }

  /**
   * 워커 풀 초기화
   */
  private initializeWorkerPool(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction) {
      logger.info('개발 환경에서는 워커 풀을 비활성화합니다');
      return;
    }
    
    for (let i = 0; i < this.MAX_WORKERS; i++) {
      this.createWorker();
    }
    logger.info(`워커 풀 초기화 완료: ${this.MAX_WORKERS}개 워커`);
  }

  /**
   * 워커 생성
   */
  private createWorker(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // 개발 환경에서는 워커 대신 메인 스레드에서 처리
    if (!isProduction) {
      logger.info('개발 환경에서는 워커 스레드를 건너뜀');
      return;
    }
    
    const currentFilePath = fileURLToPath(import.meta.url);
    // 프로덕션 환경: 'src'를 'dist'로, '.ts'를 '.js'로 변경
    const workerPath = currentFilePath
      .replace(`${path.sep}src${path.sep}`, `${path.sep}dist${path.sep}`)
      .replace(/\.ts$/, '.js');

    const worker = new Worker(workerPath, {
      workerData: { isWorker: true }
    });

    worker.on('message', (result) => {
      this.handleWorkerMessage(worker, result);
    });

    worker.on('error', (_error) => {
      logger.error('워커 에러:', _error);
      this.replaceWorker(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn(`워커 비정상 종료: ${code}`);
        this.replaceWorker(worker);
      }
    });

    this.workerPool.workers.push(worker);
  }

  /**
   * 워커 교체
   */
  private replaceWorker(oldWorker: Worker): void {
    const index = this.workerPool.workers.indexOf(oldWorker);
    if (index > -1) {
      this.workerPool.workers.splice(index, 1);
      this.workerPool.busyWorkers.delete(oldWorker);
      oldWorker.terminate();
      this.createWorker();
    }
  }

  /**
   * 워커 메시지 처리
   */
  private handleWorkerMessage(worker: Worker, result: any): void {
    this.workerPool.busyWorkers.delete(worker);
    
    // 대기 중인 작업 처리
    this.processNextTask();
  }

  /**
   * CPU 집약적 작업 처리
   */
  public async processCPUIntensiveTask<T>(
    taskType: string,
    data: any,
    priority: number = 1
  ): Promise<T> {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // 개발 환경에서는 메인 스레드에서 직접 처리
    if (!isProduction) {
      try {
        let result;
        switch (taskType) {
          case 'heavyComputation':
            result = await performHeavyComputation(data);
            break;
          case 'dataProcessing':
            result = await processLargeData(data);
            break;
          case 'imageProcessing':
            result = await processImage(data);
            break;
          default:
            throw new Error(`Unknown task type: ${taskType}`);
        }
        return result as T;
      } catch (_error) {
        throw _error;
      }
    }
    
    return new Promise((resolve, reject) => {
      const taskId = this.generateTaskId();
      const task: WorkerTask = {
        id: taskId,
        type: taskType,
        data,
        priority,
        timeout: this.TASK_TIMEOUT
      };

      // 우선순위 기반 큐 삽입
      this.insertTaskByPriority(task);
      
      // 결과 처리
      const resultHandler = (result: any) => {
        if (result.taskId === taskId) {
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.data);
          }
        }
      };

      // 타임아웃 설정
      const timeout = setTimeout(() => {
        reject(new Error('Task timeout'));
      }, this.TASK_TIMEOUT);

      // 작업 시작
      this.processNextTask();
      
      // 정리
      setTimeout(() => {
        clearTimeout(timeout);
      }, this.TASK_TIMEOUT + 1000);
    });
  }

  /**
   * 우선순위 기반 작업 삽입
   */
  private insertTaskByPriority(task: WorkerTask): void {
    const index = this.workerPool.taskQueue.findIndex(t => t.priority < task.priority);
    if (index === -1) {
      this.workerPool.taskQueue.push(task);
    } else {
      this.workerPool.taskQueue.splice(index, 0, task);
    }
  }

  /**
   * 다음 작업 처리
   */
  private processNextTask(): void {
    if (this.workerPool.taskQueue.length === 0) return;

    const availableWorker = this.workerPool.workers.find(w => 
      !this.workerPool.busyWorkers.has(w)
    );

    if (availableWorker) {
      const task = this.workerPool.taskQueue.shift();
      if (task) {
        this.workerPool.busyWorkers.add(availableWorker);
        availableWorker.postMessage(task);
      }
    }
  }

  /**
   * I/O 최적화 - 파일 읽기/쓰기
   */
  public async optimizedFileRead(filePath: string): Promise<Buffer> {
    try {
      const readFile = promisify(fs.readFile);
      const stats = await promisify(fs.stat)(filePath);
      
      // 큰 파일은 스트리밍으로 처리
      if (stats.size > 10 * 1024 * 1024) { // 10MB 이상
        return this.streamFileRead(filePath);
      }
      
      // 작은 파일은 일반 읽기
      return await readFile(filePath);
    } catch (_error) {
      logger.error('파일 읽기 최적화 실패:', _error);
      throw _error;
    }
  }

  /**
   * 스트리밍 파일 읽기
   */
  private streamFileRead(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 }); // 64KB 청크
      
      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      
      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      stream.on('error', reject);
    });
  }

  /**
   * 배치 I/O 처리
   */
  public async batchFileOperations(
    operations: Array<{ type: 'read' | 'write', path: string, data?: any }>
  ): Promise<any[]> {
    const results: any[] = [];
    
    // 운영체제별 최적 배치 크기
    const batchSize = process.platform === 'win32' ? 10 : 20;
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (op) => {
          try {
            if (op.type === 'read') {
              return await this.optimizedFileRead(op.path);
            } else {
              const writeFile = promisify(fs.writeFile);
              await writeFile(op.path, op.data);
              return { success: true };
            }
          } catch (_error) {
            logger.error(`배치 I/O 오류 (${op.type}): ${op.path}`, _error);
            return { _error: (_error as Error).message };
          }
        })
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * 네트워크 요청 최적화
   */
  public async optimizedNetworkRequest(
    requests: Array<() => Promise<any>>,
    maxConcurrency: number = 5
  ): Promise<any[]> {
    const results: any[] = [];
    const executing: Promise<any>[] = [];
    
    for (const request of requests) {
      const promise = request().then(result => {
        results.push(result);
      }).catch(error => {
        logger.error('네트워크 요청 오류:', _error);
        results.push({ _error: _error.message });
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
   * 리소스 사용량 모니터링
   */
  private startResourceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateResourceUsage();
    }, 5000); // 5초마다 업데이트
  }

  /**
   * 리소스 사용량 업데이트
   */
  private updateResourceUsage(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.resourceUsage = {
      cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // 밀리초 단위
      memory: memUsage.heapUsed / 1024 / 1024, // MB 단위
      disk: 0, // 디스크 사용량 측정 (구현 필요)
      network: 0 // 네트워크 사용량 측정 (구현 필요)
    };
    
    // 높은 리소스 사용량 경고
    if (this.resourceUsage.cpu > 80) {
      logger.warn('높은 CPU 사용량 감지', { cpu: this.resourceUsage.cpu });
    }
    
    if (this.resourceUsage.memory > 400) {
      logger.warn('높은 메모리 사용량 감지', { memory: this.resourceUsage.memory });
    }
  }

  /**
   * 작업 ID 생성
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 리소스 사용량 조회
   */
  public getResourceUsage(): ResourceUsage {
    return { ...this.resourceUsage };
  }

  /**
   * 워커 풀 상태 조회
   */
  public getWorkerPoolStatus(): any {
    return {
      totalWorkers: this.workerPool.workers.length,
      busyWorkers: this.workerPool.busyWorkers.size,
      queueSize: this.workerPool.taskQueue.length,
      availableWorkers: this.workerPool.workers.length - this.workerPool.busyWorkers.size
    };
  }

  /**
   * 리소스 최적화 종료
   */
  public shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // 모든 워커 종료
    this.workerPool.workers.forEach(worker => {
      worker.terminate();
    });
    
    logger.info('리소스 최적화 서비스 종료');
  }
}

// 워커 스레드 코드
if (!isMainThread && workerData?.isWorker) {
  parentPort?.on('message', async (task: WorkerTask) => {
    try {
      let result;
      
      switch (task.type) {
        case 'heavyComputation':
          result = await performHeavyComputation(task.data);
          break;
        case 'dataProcessing':
          result = await processLargeData(task.data);
          break;
        case 'imageProcessing':
          result = await processImage(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      parentPort?.postMessage({
        taskId: task.id,
        data: result
      });
    } catch (_error) {
      parentPort?.postMessage({
        taskId: task.id,
        _error: (_error as Error).message
      });
    }
  });
}

// 워커 작업 함수들
async function performHeavyComputation(data: any): Promise<any> {
  // CPU 집약적 계산 예제
  let result = 0;
  for (let i = 0; i < data.iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }
  return result;
}

async function processLargeData(data: any): Promise<any> {
  // 대량 데이터 처리 예제
  if (Array.isArray(data.items)) {
    return data.items.map((item: any) => {
      // 복잡한 변환 로직
      return {
        ...item,
        processed: true,
        timestamp: Date.now()
      };
    });
  }
  return data;
}

async function processImage(data: any): Promise<any> {
  // 이미지 처리 예제 (실제 구현 필요)
  return {
    processed: true,
    size: data.size,
    format: data.format
  };
}

// 싱글톤 인스턴스 (메인 스레드에서만)
const resourceOptimizer = isMainThread ? new ResourceOptimizer() : null;

// 프로세스 종료 시 정리
if (isMainThread) {
  process.on('SIGTERM', () => {
    resourceOptimizer?.shutdown();
  });
  
  process.on('SIGINT', () => {
    resourceOptimizer?.shutdown();
  });
}

export default resourceOptimizer;