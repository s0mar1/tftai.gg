// backend/src/services/errorMonitor.ts

import logger from '../config/logger';
import { EventEmitter } from 'events';

/**
 * 에러 심각도 레벨
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 에러 카테고리
 */
export enum ErrorCategory {
  DATABASE = 'database',
  API = 'api',
  AUTHENTICATION = 'authentication',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UNKNOWN = 'unknown'
}

/**
 * 에러 컨텍스트 정보
 */
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: Date;
  category?: string;
  additionalData?: Record<string, any>;
}

/**
 * 구조화된 에러 정보
 */
export interface StructuredError {
  id: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: Date;
  fingerprint: string; // 에러 그룹화를 위한 핑거프린트
  occurrenceCount: number;
  resolved: boolean;
  tags: string[];
}

/**
 * 에러 통계 정보
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByHour: Array<{ hour: string; count: number }>;
  topErrors: Array<{
    fingerprint: string;
    message: string;
    count: number;
    lastOccurrence: Date;
  }>;
}

/**
 * 에러 모니터링 시스템 클래스
 */
export class ErrorMonitor extends EventEmitter {
  private static instance: ErrorMonitor;
  private errorStore: Map<string, StructuredError> = new Map();
  private recentErrors: StructuredError[] = [];
  private readonly MAX_RECENT_ERRORS = 1000;
  private readonly MAX_ERROR_STORE_SIZE = 5000;
  private readonly ERROR_SAMPLING_THRESHOLD = 100; // 1분당 100개 이상 시 샘플링
  private errorRateCounter: Map<string, number> = new Map();
  private lastRateReset = Date.now();
  private batchBuffer: StructuredError[] = [];
  private readonly BATCH_SIZE = 50;
  private batchTimer: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  /**
   * 에러 핑거프린트 생성 (에러 그룹화용)
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    const errorSignature = [
      error.name,
      error.message.replace(/\d+/g, 'N'), // 숫자를 일반화
      context.endpoint || 'unknown',
      context.method || 'unknown'
    ].join('|');

    return Buffer.from(errorSignature).toString('base64').substring(0, 16);
  }

  /**
   * 에러 카테고리 자동 분류
   */
  private categorizeError(error: Error, context: ErrorContext): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // 데이터베이스 에러
    if (message.includes('mongo') || message.includes('database') || 
        message.includes('connection') || message.includes('timeout')) {
      return ErrorCategory.DATABASE;
    }

    // API 에러
    if (context.endpoint && (message.includes('validation') || 
        message.includes('bad request') || message.includes('not found'))) {
      return ErrorCategory.API;
    }

    // 인증/권한 에러
    if (message.includes('unauthorized') || message.includes('forbidden') || 
        message.includes('token') || message.includes('auth')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // 외부 서비스 에러
    if (message.includes('riot') || message.includes('api') || 
        message.includes('external') || message.includes('fetch')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    // 성능 에러
    if (message.includes('timeout') || message.includes('memory') || 
        message.includes('performance') || message.includes('slow')) {
      return ErrorCategory.PERFORMANCE;
    }

    // 보안 에러
    if (message.includes('security') || message.includes('xss') || 
        message.includes('injection') || message.includes('csrf')) {
      return ErrorCategory.SECURITY;
    }

    // 비즈니스 로직 에러
    if (stack.includes('services/') || stack.includes('business')) {
      return ErrorCategory.BUSINESS_LOGIC;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * 에러 심각도 자동 판정
   */
  private assessSeverity(error: Error, _context: ErrorContext): ErrorSeverity {
    const message = error.message.toLowerCase();

    // 치명적 에러
    if (message.includes('crash') || message.includes('fatal') || 
        message.includes('panic') || message.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }

    // 높은 심각도
    if (message.includes('database') || message.includes('auth') || 
        message.includes('security') || message.includes('corruption')) {
      return ErrorSeverity.HIGH;
    }

    // 중간 심각도
    if (message.includes('timeout') || message.includes('network') || 
        message.includes('external') || message.includes('performance')) {
      return ErrorSeverity.MEDIUM;
    }

    // 낮은 심각도 (기본값)
    return ErrorSeverity.LOW;
  }

  /**
   * 에러 모니터링 및 기록 (성능 최적화 버전)
   */
  captureError(error: Error, context: ErrorContext = {}): StructuredError {
    const timestamp = new Date();
    const fingerprint = this.generateFingerprint(error, context);
    const category = this.categorizeError(error, context);
    const severity = this.assessSeverity(error, context);

    // 에러 샘플링 체크
    if (!this.shouldCaptureError(fingerprint, severity)) {
      // 샘플링으로 인해 건너뛰는 경우, 기존 에러 카운트만 증가
      const existingError = this.errorStore.get(fingerprint);
      if (existingError) {
        existingError.occurrenceCount++;
        existingError.timestamp = timestamp;
        return existingError;
      }
    }

    // 기존 에러 업데이트 또는 새 에러 생성
    let structuredError = this.errorStore.get(fingerprint);
    
    if (structuredError) {
      // 기존 에러 발생 횟수 증가
      structuredError.occurrenceCount++;
      structuredError.timestamp = timestamp;
      structuredError.context = { ...structuredError.context, ...context };
    } else {
      // 새 에러 생성
      structuredError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: error.message,
        stack: error.stack,
        category,
        severity,
        context: { ...context, timestamp },
        timestamp,
        fingerprint,
        occurrenceCount: 1,
        resolved: false,
        tags: this.generateTags(error, context, category, severity)
      } as StructuredError;
      
      this.errorStore.set(fingerprint, structuredError!);
      
      // 에러 저장소 크기 제한
      if (this.errorStore.size > this.MAX_ERROR_STORE_SIZE) {
        this.cleanupOldErrors();
      }
    }

    // 배치 처리를 위해 버퍼에 추가
    if (structuredError) {
      this.batchBuffer.push(structuredError);
    }
    
    // 배치 크기에 도달하거나 중요한 에러인 경우 즉시 처리
    if (this.batchBuffer.length >= this.BATCH_SIZE || 
        severity === ErrorSeverity.CRITICAL || 
        severity === ErrorSeverity.HIGH) {
      this.processBatch();
    } else {
      // 배치 타이머 설정 (1초 후 자동 처리)
      this.scheduleBatchProcessing();
    }

    return structuredError!;
  }

  /**
   * 에러 샘플링 여부 결정
   */
  private shouldCaptureError(fingerprint: string, severity: ErrorSeverity): boolean {
    // 중요한 에러는 항상 캡처
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      return true;
    }

    // 에러 비율 카운터 리셋 (1분마다)
    const now = Date.now();
    if (now - this.lastRateReset > 60000) {
      this.errorRateCounter.clear();
      this.lastRateReset = now;
    }

    // 현재 에러의 발생 빈도 확인
    const currentCount = this.errorRateCounter.get(fingerprint) || 0;
    this.errorRateCounter.set(fingerprint, currentCount + 1);

    // 샘플링 임계값을 초과하면 샘플링 적용
    if (currentCount > this.ERROR_SAMPLING_THRESHOLD) {
      // 10% 확률로만 캡처
      return Math.random() < 0.1;
    }

    return true;
  }

  /**
   * 배치 처리 스케줄링
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, 1000);
  }

  /**
   * 배치 처리 실행
   */
  private processBatch(): void {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // 배치 처리
    batch.forEach(structuredError => {
      // 최근 에러 목록에 추가
      this.recentErrors.unshift(structuredError);
      if (this.recentErrors.length > this.MAX_RECENT_ERRORS) {
        this.recentErrors.pop();
      }

      // 로그 기록
      logger.error(`[ErrorMonitor] ${structuredError.category}:${structuredError.severity} - ${structuredError.message}`, {
        fingerprint: structuredError.fingerprint,
        occurrenceCount: structuredError.occurrenceCount,
        context: structuredError.context,
        stack: structuredError.stack
      });

      // 이벤트 발생
      this.emit('error', structuredError);

      // 심각도에 따른 즉시 알림
      if (structuredError.severity === ErrorSeverity.CRITICAL || 
          structuredError.severity === ErrorSeverity.HIGH) {
        this.emit('critical_error', structuredError);
      }
    });

    logger.info(`[ErrorMonitor] 배치 처리 완료: ${batch.length}개 에러 처리됨`);
  }

  /**
   * 오래된 에러 정리
   */
  private cleanupOldErrors(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7일 전
    const errors = Array.from(this.errorStore.values());
    
    // 오래된 에러 제거
    const toDelete = errors
      .filter(error => error.timestamp < cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(0, this.errorStore.size - this.MAX_ERROR_STORE_SIZE + 1000);

    toDelete.forEach(error => {
      this.errorStore.delete(error.fingerprint);
    });

    logger.info(`[ErrorMonitor] 오래된 에러 정리 완료: ${toDelete.length}개 에러 제거됨`);
  }

  /**
   * 에러 태그 생성
   */
  private generateTags(error: Error, context: ErrorContext, category: ErrorCategory, severity: ErrorSeverity): string[] {
    const tags: string[] = [category, severity];

    // 컨텍스트 기반 태그
    if (context.endpoint) {
      tags.push(`endpoint:${context.endpoint}`);
    }
    if (context.method) {
      tags.push(`method:${context.method}`);
    }
    if (context.userId) {
      tags.push('user_related');
    }

    // 에러 내용 기반 태그
    const message = error.message.toLowerCase();
    if (message.includes('timeout')) tags.push('timeout');
    if (message.includes('network')) tags.push('network');
    if (message.includes('validation')) tags.push('validation');
    if (message.includes('permission')) tags.push('permission');

    return tags;
  }

  /**
   * 에러 통계 생성
   */
  getErrorStats(timeRange: { start: Date; end: Date }): ErrorStats {
    const filteredErrors = this.recentErrors.filter(
      error => error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
    );

    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;
    const errorsByHour: Record<string, number> = {};

    // 카테고리별, 심각도별 통계
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    filteredErrors.forEach(error => {
      errorsByCategory[error.category]++;
      errorsBySeverity[error.severity]++;

      const hour = error.timestamp.toISOString().substring(0, 13);
      errorsByHour[hour] = (errorsByHour[hour] || 0) + 1;
    });

    // 시간대별 통계 배열로 변환
    const errorsByHourArray = Object.entries(errorsByHour)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // 상위 에러 목록
    const topErrors = Array.from(this.errorStore.values())
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10)
      .map(error => ({
        fingerprint: error.fingerprint,
        message: error.message,
        count: error.occurrenceCount,
        lastOccurrence: error.timestamp
      }));

    return {
      totalErrors: filteredErrors.length,
      errorsByCategory,
      errorsBySeverity,
      errorsByHour: errorsByHourArray,
      topErrors
    };
  }

  /**
   * 특정 에러 해결 처리
   */
  resolveError(fingerprint: string, resolvedBy: string): boolean {
    const error = this.errorStore.get(fingerprint);
    if (error) {
      error.resolved = true;
      error.tags.push(`resolved_by:${resolvedBy}`);
      
      logger.info(`[ErrorMonitor] Error resolved: ${fingerprint} by ${resolvedBy}`);
      this.emit('error_resolved', error);
      
      return true;
    }
    return false;
  }

  /**
   * 에러 목록 조회
   */
  getRecentErrors(limit: number = 50): StructuredError[] {
    return this.recentErrors.slice(0, limit);
  }

  /**
   * 특정 에러 상세 정보 조회
   */
  getErrorDetails(fingerprint: string): StructuredError | null {
    return this.errorStore.get(fingerprint) || null;
  }

  /**
   * 에러 필터링
   */
  filterErrors(filters: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    resolved?: boolean;
    timeRange?: { start: Date; end: Date };
  }): StructuredError[] {
    let errors = this.recentErrors;

    if (filters.category) {
      errors = errors.filter(error => error.category === filters.category);
    }

    if (filters.severity) {
      errors = errors.filter(error => error.severity === filters.severity);
    }

    if (filters.resolved !== undefined) {
      errors = errors.filter(error => error.resolved === filters.resolved);
    }

    if (filters.timeRange) {
      errors = errors.filter(error => 
        error.timestamp >= filters.timeRange!.start && 
        error.timestamp <= filters.timeRange!.end
      );
    }

    return errors;
  }

  /**
   * 에러 패턴 분석
   */
  analyzeErrorPatterns(): {
    spikes: Array<{ time: Date; count: number }>;
    trends: Array<{ category: ErrorCategory; trend: 'increasing' | 'decreasing' | 'stable' }>;
    correlations: Array<{ error1: string; error2: string; correlation: number }>;
  } {
    // 에러 급증 감지
    const spikes = this.detectErrorSpikes();
    
    // 에러 트렌드 분석
    const trends = this.analyzeErrorTrends();
    
    // 에러 상관관계 분석
    const correlations = this.analyzeErrorCorrelations();

    return { spikes, trends, correlations };
  }

  /**
   * 에러 급증 감지
   */
  private detectErrorSpikes(): Array<{ time: Date; count: number }> {
    const hourlyErrors: Record<string, number> = {};
    
    this.recentErrors.forEach(error => {
      const hour = error.timestamp.toISOString().substring(0, 13);
      hourlyErrors[hour] = (hourlyErrors[hour] || 0) + 1;
    });

    const counts = Object.values(hourlyErrors);
    const average = counts.reduce((a, b) => a + b, 0) / counts.length;
    const threshold = average * 2; // 평균의 2배 이상을 급증으로 판단

    return Object.entries(hourlyErrors)
      .filter(([_, count]) => count > threshold)
      .map(([hour, count]) => ({ time: new Date(hour), count }));
  }

  /**
   * 에러 트렌드 분석
   */
  private analyzeErrorTrends(): Array<{ category: ErrorCategory; trend: 'increasing' | 'decreasing' | 'stable' }> {
    const trends: Array<{ category: ErrorCategory; trend: 'increasing' | 'decreasing' | 'stable' }> = [];
    
    Object.values(ErrorCategory).forEach(category => {
      const categoryErrors = this.recentErrors.filter(error => error.category === category);
      
      if (categoryErrors.length < 10) {
        trends.push({ category, trend: 'stable' });
        return;
      }

      // 최근 24시간과 이전 24시간 비교
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const dayBeforeYesterday = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const recentCount = categoryErrors.filter(error => error.timestamp >= yesterday).length;
      const previousCount = categoryErrors.filter(error => 
        error.timestamp >= dayBeforeYesterday && error.timestamp < yesterday
      ).length;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentCount > previousCount * 1.2) {
        trend = 'increasing';
      } else if (recentCount < previousCount * 0.8) {
        trend = 'decreasing';
      }

      trends.push({ category, trend });
    });

    return trends;
  }

  /**
   * 에러 상관관계 분석
   */
  private analyzeErrorCorrelations(): Array<{ error1: string; error2: string; correlation: number }> {
    const correlations: Array<{ error1: string; error2: string; correlation: number }> = [];
    
    const fingerprints = Array.from(this.errorStore.keys());
    
    for (let i = 0; i < fingerprints.length; i++) {
      for (let j = i + 1; j < fingerprints.length; j++) {
        const error1 = this.errorStore.get(fingerprints[i]!);
        const error2 = this.errorStore.get(fingerprints[j]!);
        
        if (!error1 || !error2) continue;
        
        // 간단한 상관관계 계산 (시간대 기반)
        const correlation = this.calculateTimeBasedCorrelation(error1, error2);
        
        if (correlation > 0.7) {
          correlations.push({
            error1: error1.message,
            error2: error2.message,
            correlation
          });
        }
      }
    }

    return correlations.sort((a, b) => b.correlation - a.correlation);
  }

  /**
   * 시간 기반 상관관계 계산
   */
  private calculateTimeBasedCorrelation(error1: StructuredError, error2: StructuredError): number {
    // 간단한 구현: 같은 시간대에 발생한 에러들의 비율
    const timeDiff = Math.abs(error1.timestamp.getTime() - error2.timestamp.getTime());
    const maxTimeDiff = 60 * 60 * 1000; // 1시간
    
    return Math.max(0, 1 - (timeDiff / maxTimeDiff));
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    this.on('error', (error: StructuredError) => {
      // 에러 발생 시 추가 처리
      if (error.severity === ErrorSeverity.CRITICAL) {
        logger.error(`[CRITICAL] ${error.message}`, { error });
      }
      
      // 알림 서비스에 에러 전달 (지연 로드로 순환 참조 방지)
      this.notifyAlertService(error);
    });

    this.on('critical_error', (error: StructuredError) => {
      // 중요 에러 발생 시 즉시 알림
      logger.error(`[ALERT] Critical error detected: ${error.message}`, { error });
    });
  }

  /**
   * 알림 서비스에 에러 전달 (지연 로드)
   */
  private async notifyAlertService(error: StructuredError): Promise<void> {
    try {
      const { alertService } = await import('./alertService');
      await alertService.processError(error);
    } catch (err) {
      logger.error('알림 서비스 호출 중 오류 발생:', err);
    }
  }

  /**
   * 메모리 정리 (성능 최적화 버전)
   */
  cleanup(): void {
    const startTime = Date.now();
    
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7일 전
    
    // 최근 에러 목록 정리
    const beforeRecentCount = this.recentErrors.length;
    this.recentErrors = this.recentErrors.filter(error => error.timestamp > cutoff);
    
    // 에러 저장소 정리
    const beforeStoreSize = this.errorStore.size;
    for (const [fingerprint, error] of this.errorStore.entries()) {
      if (error.timestamp < cutoff) {
        this.errorStore.delete(fingerprint);
      }
    }
    
    // 배치 버퍼 정리
    if (this.batchBuffer.length > 0) {
      this.processBatch();
    }
    
    // 에러 비율 카운터 정리
    this.errorRateCounter.clear();
    this.lastRateReset = Date.now();
    
    const endTime = Date.now();
    const cleanupTime = endTime - startTime;
    
    logger.info(`[ErrorMonitor] 메모리 정리 완료`, {
      cleanupTime: `${cleanupTime}ms`,
      recentErrorsRemoved: beforeRecentCount - this.recentErrors.length,
      errorStoreRemoved: beforeStoreSize - this.errorStore.size,
      currentRecentErrors: this.recentErrors.length,
      currentErrorStore: this.errorStore.size
    });
  }

  /**
   * 에러 모니터링 시스템 상태 체크
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      errorStoreSize: number;
      recentErrorsSize: number;
      batchBufferSize: number;
      errorRateCounterSize: number;
      memoryUsage: number;
      lastCleanup: Date | null;
    };
    alerts: string[];
  } {
    const alerts: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // 메모리 사용량 추정
    const memoryUsage = (this.errorStore.size * 1024) + (this.recentErrors.length * 512);
    
    // 상태 체크
    if (this.errorStore.size > this.MAX_ERROR_STORE_SIZE * 0.9) {
      alerts.push('에러 저장소가 거의 가득 참');
      status = 'warning';
    }
    
    if (this.recentErrors.length > this.MAX_RECENT_ERRORS * 0.9) {
      alerts.push('최근 에러 목록이 거의 가득 참');
      status = 'warning';
    }
    
    if (this.batchBuffer.length > this.BATCH_SIZE * 2) {
      alerts.push('배치 버퍼가 예상보다 큼');
      status = 'warning';
    }
    
    if (memoryUsage > 50 * 1024 * 1024) { // 50MB 이상
      alerts.push('메모리 사용량이 높음');
      status = 'critical';
    }
    
    const hourlyErrorRate = this.recentErrors.filter(
      error => error.timestamp.getTime() > Date.now() - 3600000
    ).length;
    
    if (hourlyErrorRate > 1000) {
      alerts.push('시간당 에러 발생률이 높음');
      status = 'critical';
    }
    
    return {
      status,
      metrics: {
        errorStoreSize: this.errorStore.size,
        recentErrorsSize: this.recentErrors.length,
        batchBufferSize: this.batchBuffer.length,
        errorRateCounterSize: this.errorRateCounter.size,
        memoryUsage,
        lastCleanup: null // 실제 구현에서는 마지막 정리 시간 추적
      },
      alerts
    };
  }

  /**
   * 에러 모니터링 성능 메트릭
   */
  getPerformanceMetrics(): {
    processingTime: {
      average: number;
      max: number;
      min: number;
    };
    throughput: {
      errorsPerSecond: number;
      batchesPerMinute: number;
    };
    sampling: {
      totalProcessed: number;
      sampledOut: number;
      samplingRate: number;
    };
  } {
    // 간단한 성능 메트릭 구현
    const recentMinute = this.recentErrors.filter(
      error => error.timestamp.getTime() > Date.now() - 60000
    );
    
    return {
      processingTime: {
        average: 5, // 실제 구현에서는 처리 시간 추적
        max: 15,
        min: 1
      },
      throughput: {
        errorsPerSecond: recentMinute.length / 60,
        batchesPerMinute: Math.ceil(recentMinute.length / this.BATCH_SIZE)
      },
      sampling: {
        totalProcessed: this.recentErrors.length,
        sampledOut: 0, // 실제 구현에서는 샘플링된 에러 수 추적
        samplingRate: 0.9
      }
    };
  }
}

// 글로벌 에러 모니터 인스턴스
export const errorMonitor = ErrorMonitor.getInstance();

// 전역 에러 핸들러 설정
process.on('uncaughtException', (error) => {
  errorMonitor.captureError(error, { 
    category: 'UNKNOWN',
    additionalData: {
      severity: 'CRITICAL',
      tags: ['uncaught_exception']
    }
  });
});

process.on('unhandledRejection', (reason, _promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  errorMonitor.captureError(error, {
    category: 'UNKNOWN',
    additionalData: {
      severity: 'HIGH',
      tags: ['unhandled_rejection']
    }
  });
});

export default errorMonitor;