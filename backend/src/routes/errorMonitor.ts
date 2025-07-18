// backend/src/routes/errorMonitor.ts

import express, { Request, Response, NextFunction } from 'express';
import { errorMonitor, ErrorCategory, ErrorSeverity } from '../services/errorMonitor';
import { checkDBConnection } from '../middlewares/dbConnectionCheck';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

/**
 * 에러 모니터링 대시보드 API
 */

// 에러 통계 조회
router.get('/stats', checkDBConnection, asyncHandler(async (_req: Request, _res: Response, _next: NextFunction) => {
  const { hours = '24' } = _req.query;
  
  const timeRange = {
    start: new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000),
    end: new Date()
  };

  const stats = errorMonitor.getErrorStats(timeRange);
  
  _res.json({
    success: true,
    data: stats,
    meta: {
      timeRange,
      hours: parseInt(hours as string)
    }
  });
}));

// 최근 에러 목록 조회
router.get('/recent', checkDBConnection, asyncHandler(async (_req: Request, _res: Response, _next: NextFunction) => {
  const { limit = '50', category, severity, resolved } = _req.query;
  
  const filters: any = {};
  
  if (category && Object.values(ErrorCategory).includes(category as ErrorCategory)) {
    filters.category = category as ErrorCategory;
  }
  
  if (severity && Object.values(ErrorSeverity).includes(severity as ErrorSeverity)) {
    filters.severity = severity as ErrorSeverity;
  }
  
  if (resolved !== undefined) {
    filters.resolved = resolved === 'true';
  }

  const errors = errorMonitor.filterErrors(filters);
  const limitedErrors = errors.slice(0, parseInt(limit as string));
  
  _res.json({
    success: true,
    data: limitedErrors,
    meta: {
      total: errors.length,
      limit: parseInt(limit as string),
      filters
    }
  });
}));

// 특정 에러 상세 정보 조회
router.get('/error/:fingerprint', checkDBConnection, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { fingerprint } = _req.params;
    
    const errorDetails = errorMonitor.getErrorDetails(fingerprint);
    
    if (!errorDetails) {
      return _res.status(404).json({
        success: false,
        error: {
          message: '에러를 찾을 수 없습니다.',
          statusCode: 404
        }
      });
    }
    
    _res.json({
      success: true,
      data: errorDetails
    });
  } catch (error) {
    logger.error('에러 상세 정보 조회 중 오류 발생:', error);
    _next(error);
  }
});

// 에러 해결 처리
router.post('/error/:fingerprint/resolve', checkDBConnection, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { fingerprint } = _req.params;
    const { resolvedBy = 'unknown' } = _req.body;
    
    const success = errorMonitor.resolveError(fingerprint, resolvedBy);
    
    if (!success) {
      return _res.status(404).json({
        success: false,
        error: {
          message: '에러를 찾을 수 없습니다.',
          statusCode: 404
        }
      });
    }
    
    _res.json({
      success: true,
      message: '에러가 해결 처리되었습니다.',
      data: {
        fingerprint,
        resolvedBy,
        resolvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('에러 해결 처리 중 오류 발생:', error);
    _next(error);
  }
});

// 에러 패턴 분석
router.get('/analysis', checkDBConnection, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const analysis = errorMonitor.analyzeErrorPatterns();
    
    _res.json({
      success: true,
      data: analysis,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('에러 패턴 분석 중 오류 발생:', error);
    _next(error);
  }
});

// 에러 카테고리 목록
router.get('/categories', (_req: Request, _res: Response) => {
  _res.json({
    success: true,
    data: Object.values(ErrorCategory)
  });
});

// 에러 심각도 목록
router.get('/severities', (_req: Request, _res: Response) => {
  _res.json({
    success: true,
    data: Object.values(ErrorSeverity)
  });
});

// 에러 검색
router.get('/search', checkDBConnection, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { 
      query: searchQuery, 
      category, 
      severity, 
      startDate, 
      endDate,
      limit = '100'
    } = _req.query;
    
    const filters: any = {};
    
    if (category && Object.values(ErrorCategory).includes(category as ErrorCategory)) {
      filters.category = category as ErrorCategory;
    }
    
    if (severity && Object.values(ErrorSeverity).includes(severity as ErrorSeverity)) {
      filters.severity = severity as ErrorSeverity;
    }
    
    if (startDate && endDate) {
      filters.timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }
    
    let errors = errorMonitor.filterErrors(filters);
    
    // 텍스트 검색
    if (searchQuery) {
      const searchTerm = (searchQuery as string).toLowerCase();
      errors = errors.filter(error => 
        error.message.toLowerCase().includes(searchTerm) ||
        error.stack?.toLowerCase().includes(searchTerm) ||
        error.context.endpoint?.toLowerCase().includes(searchTerm) ||
        error.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    const limitedErrors = errors.slice(0, parseInt(limit as string));
    
    _res.json({
      success: true,
      data: limitedErrors,
      meta: {
        total: errors.length,
        limit: parseInt(limit as string),
        searchQuery,
        filters
      }
    });
  } catch (error) {
    logger.error('에러 검색 중 오류 발생:', error);
    _next(error);
  }
});

// 에러 모니터링 건강상태 확인 (개선된 버전)
router.get('/health', asyncHandler(async (_req: Request, _res: Response) => {
  const healthStatus = errorMonitor.getHealthStatus();
  
  _res.json({
    success: true,
    data: {
      ...healthStatus,
      timestamp: new Date().toISOString()
    }
  });
}));

// 에러 모니터링 성능 메트릭
router.get('/performance', asyncHandler(async (_req: Request, _res: Response) => {
  const performanceMetrics = errorMonitor.getPerformanceMetrics();
  
  _res.json({
    success: true,
    data: performanceMetrics,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}));

// 에러 모니터링 시스템 정리 실행
router.post('/cleanup', asyncHandler(async (_req: Request, _res: Response) => {
  const startTime = Date.now();
  
  // 정리 실행
  errorMonitor.cleanup();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  _res.json({
    success: true,
    message: '에러 모니터링 시스템 정리가 완료되었습니다.',
    data: {
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }
  });
}));

// 에러 메트릭스 (Prometheus 형식)
router.get('/metrics', (_req: Request, _res: Response) => {
  try {
    const stats = errorMonitor.getErrorStats({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    });
    
    let metrics = '';
    
    // 총 에러 수
    metrics += `# HELP tft_errors_total Total number of errors\n`;
    metrics += `# TYPE tft_errors_total counter\n`;
    metrics += `tft_errors_total ${stats.totalErrors}\n\n`;
    
    // 카테고리별 에러 수
    metrics += `# HELP tft_errors_by_category_total Number of errors by category\n`;
    metrics += `# TYPE tft_errors_by_category_total counter\n`;
    Object.entries(stats.errorsByCategory).forEach(([category, count]) => {
      metrics += `tft_errors_by_category_total{category="${category}"} ${count}\n`;
    });
    metrics += '\n';
    
    // 심각도별 에러 수
    metrics += `# HELP tft_errors_by_severity_total Number of errors by severity\n`;
    metrics += `# TYPE tft_errors_by_severity_total counter\n`;
    Object.entries(stats.errorsBySeverity).forEach(([severity, count]) => {
      metrics += `tft_errors_by_severity_total{severity="${severity}"} ${count}\n`;
    });
    
    _res.set('Content-Type', 'text/plain');
    _res.send(metrics);
  } catch (error) {
    logger.error('에러 메트릭스 생성 중 오류 발생:', error);
    _res.status(500).send('# Error generating metrics\n');
  }
});

// 에러 모니터링 설정 조회
router.get('/config', (_req: Request, _res: Response) => {
  _res.json({
    success: true,
    data: {
      categories: Object.values(ErrorCategory),
      severities: Object.values(ErrorSeverity),
      maxRecentErrors: 1000,
      retentionPeriod: '7 days',
      features: {
        realTimeMonitoring: true,
        patternAnalysis: true,
        alerting: true,
        correlationAnalysis: true
      }
    }
  });
});

export default router;