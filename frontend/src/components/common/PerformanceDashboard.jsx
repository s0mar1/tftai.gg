import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import ResponsiveContainer, { ResponsiveGrid, ResponsiveCard } from './ResponsiveContainer';

const PerformanceDashboard = ({ isVisible = false }) => {
  const { performanceData } = usePerformanceMonitor('PerformanceDashboard', {
    enableProfiling: isVisible,
    trackMemory: true,
  });

  const [componentMetrics, setComponentMetrics] = useState({});
  const [systemMetrics, setSystemMetrics] = useState({
    fps: 0,
    memory: null,
    connections: 0,
  });

  useEffect(() => {
    if (!isVisible) return;

    const collectSystemMetrics = () => {
      // FPS 측정
      let fps = 0;
      let frameCount = 0;
      let startTime = performance.now();

      const frame = () => {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - startTime >= 1000) {
          fps = Math.round(frameCount / ((currentTime - startTime) / 1000));
          frameCount = 0;
          startTime = currentTime;
          
          setSystemMetrics(prev => ({ ...prev, fps }));
        }
        
        requestAnimationFrame(frame);
      };
      
      requestAnimationFrame(frame);

      // 메모리 사용량 측정
      const updateMemory = () => {
        if ('memory' in performance) {
          const memory = {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
          };
          setSystemMetrics(prev => ({ ...prev, memory }));
        }
      };

      updateMemory();
      const memoryInterval = setInterval(updateMemory, 5000);

      return () => {
        clearInterval(memoryInterval);
      };
    };

    const cleanup = collectSystemMetrics();
    return cleanup;
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-md w-full fixed-overlay">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          성능 대시보드
        </h3>
      </div>
      
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* 시스템 메트릭 */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">시스템 성능</h4>
          <ResponsiveGrid cols={{ base: 2 }} gap={2}>
            <MetricCard 
              title="FPS" 
              value={systemMetrics.fps}
              unit=""
              color={systemMetrics.fps > 30 ? 'green' : 'red'}
            />
            <MetricCard 
              title="메모리" 
              value={systemMetrics.memory?.used || 0}
              unit="MB"
              color={systemMetrics.memory?.used > 100 ? 'yellow' : 'green'}
            />
          </ResponsiveGrid>
        </div>

        {/* 컴포넌트 메트릭 */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">컴포넌트 성능</h4>
          <div className="space-y-2">
            <MetricRow 
              label="렌더링 횟수" 
              value={performanceData.renderCount}
            />
            <MetricRow 
              label="평균 렌더링 시간" 
              value={`${performanceData.averageRenderTime?.toFixed(2) || 0}ms`}
            />
            <MetricRow 
              label="최대 렌더링 시간" 
              value={`${performanceData.maxRenderTime || 0}ms`}
            />
          </div>
        </div>

        {/* 네트워크 상태 */}
        <NetworkStatus />
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit, color = 'blue' }) => {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-center">
      <div className="text-xs text-gray-500 dark:text-gray-400">{title}</div>
      <div className={`text-lg font-bold ${colorClasses[color]}`}>
        {value}{unit}
      </div>
    </div>
  );
};

const MetricRow = ({ label, value }) => {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
};

const NetworkStatus = () => {
  const [networkInfo, setNetworkInfo] = useState(null);

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        });
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  if (!networkInfo) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-gray-700 dark:text-gray-300">네트워크 상태</h4>
      <div className="space-y-1">
        <MetricRow label="연결 타입" value={networkInfo.effectiveType} />
        <MetricRow label="다운로드 속도" value={`${networkInfo.downlink} Mbps`} />
        <MetricRow label="RTT" value={`${networkInfo.rtt}ms`} />
        {networkInfo.saveData && (
          <div className="text-xs text-orange-600 dark:text-orange-400">
            데이터 절약 모드 활성화
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;