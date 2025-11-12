import React, { Profiler, ProfilerOnRenderCallback } from 'react';

/**
 * React Profiler 컴포넌트
 * 컴포넌트 렌더링 성능을 추적하고 분석하는 도구
 */

interface ReactProfilerProps {
  id: string;
  children: React.ReactNode;
  enabled?: boolean;
  onRender?: ProfilerOnRenderCallback;
  logToConsole?: boolean;
}

// 성능 메트릭을 저장할 맵
const performanceMetrics = new Map<string, Array<{
  actualDuration: number;
  baseDuration: number;
  commitTime: number;
  phase: 'mount' | 'update';
  startTime: number;
}>>();

// 성능 데이터 분석 함수
const analyzePerformanceData = (id: string) => {
  const metrics = performanceMetrics.get(id) || [];
  if (metrics.length === 0) return null;

  const mountMetrics = metrics.filter(m => m.phase === 'mount');
  const updateMetrics = metrics.filter(m => m.phase === 'update');
  
  const avgActualDuration = metrics.reduce((sum, m) => sum + m.actualDuration, 0) / metrics.length;
  const avgBaseDuration = metrics.reduce((sum, m) => sum + m.baseDuration, 0) / metrics.length;
  const maxActualDuration = Math.max(...metrics.map(m => m.actualDuration));
  const minActualDuration = Math.min(...metrics.map(m => m.actualDuration));

  return {
    id,
    totalRenders: metrics.length,
    mountRenders: mountMetrics.length,
    updateRenders: updateMetrics.length,
    avgActualDuration: Math.round(avgActualDuration * 100) / 100,
    avgBaseDuration: Math.round(avgBaseDuration * 100) / 100,
    maxActualDuration: Math.round(maxActualDuration * 100) / 100,
    minActualDuration: Math.round(minActualDuration * 100) / 100,
    efficiency: Math.round((avgBaseDuration / avgActualDuration) * 100),
  };
};

// 기본 onRender 콜백
const defaultOnRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  // 개발 모드에서만 실행
  if (process.env.NODE_ENV !== 'development') return;

  // 성능 데이터 저장
  if (!performanceMetrics.has(id)) {
    performanceMetrics.set(id, []);
  }
  
  performanceMetrics.get(id)!.push({
    actualDuration,
    baseDuration,
    commitTime,
    phase,
    startTime,
  });

  // 느린 렌더링 감지 (16ms 이상)
  if (actualDuration > 16) {
    console.warn(`🐌 Slow render detected in "${id}":`, {
      phase,
      actualDuration: `${actualDuration.toFixed(2)}ms`,
      baseDuration: `${baseDuration.toFixed(2)}ms`,
      efficiency: `${Math.round((baseDuration / actualDuration) * 100)}%`,
    });
  }

  // 주기적으로 성능 분석 리포트 출력 (100번 렌더링마다)
  const metrics = performanceMetrics.get(id)!;
  if (metrics.length % 100 === 0) {
    const analysis = analyzePerformanceData(id);
    if (analysis) {
      console.group(`📊 Performance Report for "${id}"`);
      console.table(analysis);
      console.groupEnd();
    }
  }
};

// 로그를 콘솔에 출력하는 onRender 콜백
const consoleOnRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log(`⚛️ ${id} (${phase})`, {
    actualDuration: `${actualDuration.toFixed(2)}ms`,
    baseDuration: `${baseDuration.toFixed(2)}ms`,
    startTime: `${startTime.toFixed(2)}ms`,
    commitTime: `${commitTime.toFixed(2)}ms`,
  });
  
  // 기본 분석도 함께 실행
  defaultOnRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
};

export const ReactProfiler: React.FC<ReactProfilerProps> = ({
  id,
  children,
  enabled = process.env.NODE_ENV === 'development',
  onRender,
  logToConsole = false,
}) => {
  // 프로덕션에서는 Profiler를 제거
  if (!enabled) {
    return <>{children}</>;
  }

  const renderCallback = onRender || (logToConsole ? consoleOnRender : defaultOnRender);

  return (
    <Profiler id={id} onRender={renderCallback}>
      {children}
    </Profiler>
  );
};

// 성능 메트릭 조회 함수들
export const getPerformanceMetrics = (id: string) => {
  return performanceMetrics.get(id) || [];
};

export const getPerformanceAnalysis = (id: string) => {
  return analyzePerformanceData(id);
};

export const getAllPerformanceAnalyses = () => {
  const analyses: Record<string, any> = {};
  for (const [id] of performanceMetrics) {
    const analysis = analyzePerformanceData(id);
    if (analysis) {
      analyses[id] = analysis;
    }
  }
  return analyses;
};

export const clearPerformanceMetrics = (id?: string) => {
  if (id) {
    performanceMetrics.delete(id);
  } else {
    performanceMetrics.clear();
  }
};

// 성능 문제가 있는 컴포넌트 찾기
export const findSlowComponents = (threshold = 16) => {
  const slowComponents: Array<{
    id: string;
    avgDuration: number;
    maxDuration: number;
    slowRenderCount: number;
  }> = [];

  for (const [id, metrics] of performanceMetrics) {
    const slowRenders = metrics.filter(m => m.actualDuration > threshold);
    if (slowRenders.length > 0) {
      const avgDuration = slowRenders.reduce((sum, m) => sum + m.actualDuration, 0) / slowRenders.length;
      const maxDuration = Math.max(...slowRenders.map(m => m.actualDuration));
      
      slowComponents.push({
        id,
        avgDuration: Math.round(avgDuration * 100) / 100,
        maxDuration: Math.round(maxDuration * 100) / 100,
        slowRenderCount: slowRenders.length,
      });
    }
  }

  return slowComponents.sort((a, b) => b.avgDuration - a.avgDuration);
};

// HOC 버전의 Profiler
export const withProfiler = <P extends object>(
  Component: React.ComponentType<P>,
  profileId?: string
) => {
  const ProfiledComponent = React.forwardRef<any, P>((props, ref) => {
    const id = profileId || Component.displayName || Component.name || 'AnonymousComponent';
    
    return (
      <ReactProfiler id={id}>
        <Component {...props} ref={ref} />
      </ReactProfiler>
    );
  });

  ProfiledComponent.displayName = `withProfiler(${Component.displayName || Component.name})`;
  
  return ProfiledComponent;
};

export default ReactProfiler;