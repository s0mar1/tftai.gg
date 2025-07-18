import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerformanceDashboard from '../PerformanceDashboard';

// usePerformanceMonitor 훅 모킹
jest.mock('../../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: jest.fn(() => ({
    performanceData: {
      renderCount: 5,
      averageRenderTime: 12.5,
      maxRenderTime: 25,
      minRenderTime: 8,
      totalRenderTime: 62.5,
      memoryUsage: { used: 45, total: 100 }
    }
  }))
}));

// Performance API 모킹
const mockPerformance = {
  memory: {
    usedJSHeapSize: 45 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2048 * 1024 * 1024
  },
  now: jest.fn(() => Date.now())
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

// requestAnimationFrame 모킹
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));

// Navigator connection 모킹
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  writable: true
});

describe('PerformanceDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders when visible prop is true', () => {
    render(<PerformanceDashboard isVisible={true} />);
    
    expect(screen.getByText('성능 대시보드')).toBeInTheDocument();
  });

  test('does not render when visible prop is false', () => {
    render(<PerformanceDashboard isVisible={false} />);
    
    expect(screen.queryByText('성능 대시보드')).not.toBeInTheDocument();
  });

  test('displays system metrics section', () => {
    render(<PerformanceDashboard isVisible={true} />);
    
    expect(screen.getByText('시스템 성능')).toBeInTheDocument();
    expect(screen.getByText('FPS')).toBeInTheDocument();
    expect(screen.getByText('메모리')).toBeInTheDocument();
  });

  test('displays component metrics section', () => {
    render(<PerformanceDashboard isVisible={true} />);
    
    expect(screen.getByText('컴포넌트 성능')).toBeInTheDocument();
    expect(screen.getByText('렌더링 횟수')).toBeInTheDocument();
    expect(screen.getByText('평균 렌더링 시간')).toBeInTheDocument();
    expect(screen.getByText('최대 렌더링 시간')).toBeInTheDocument();
  });

  test('displays performance data correctly', () => {
    render(<PerformanceDashboard isVisible={true} />);
    
    expect(screen.getByText('5')).toBeInTheDocument(); // renderCount
    expect(screen.getByText('12.50ms')).toBeInTheDocument(); // averageRenderTime
    expect(screen.getByText('25ms')).toBeInTheDocument(); // maxRenderTime
  });

  test('displays network status when connection is available', () => {
    render(<PerformanceDashboard isVisible={true} />);
    
    expect(screen.getByText('네트워크 상태')).toBeInTheDocument();
    expect(screen.getByText('연결 타입')).toBeInTheDocument();
    expect(screen.getByText('다운로드 속도')).toBeInTheDocument();
    expect(screen.getByText('RTT')).toBeInTheDocument();
  });

  test('displays network connection data correctly', () => {
    render(<PerformanceDashboard isVisible={true} />);
    
    expect(screen.getByText('4g')).toBeInTheDocument();
    expect(screen.getByText('10 Mbps')).toBeInTheDocument();
    expect(screen.getByText('50ms')).toBeInTheDocument();
  });

  test('shows data save mode indicator when enabled', () => {
    // 데이터 절약 모드 활성화
    Object.defineProperty(navigator, 'connection', {
      value: {
        ...navigator.connection,
        saveData: true
      },
      writable: true
    });

    render(<PerformanceDashboard isVisible={true} />);
    
    expect(screen.getByText('데이터 절약 모드 활성화')).toBeInTheDocument();
  });

  test('applies correct styling classes', () => {
    const { container } = render(<PerformanceDashboard isVisible={true} />);
    
    const dashboard = container.firstChild;
    expect(dashboard).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
    expect(dashboard).toHaveClass('bg-white', 'dark:bg-gray-800');
    expect(dashboard).toHaveClass('rounded-lg', 'shadow-lg');
  });

  test('handles missing performance.memory gracefully', () => {
    // performance.memory 제거
    const originalMemory = window.performance.memory;
    delete window.performance.memory;

    render(<PerformanceDashboard isVisible={true} />);
    
    expect(screen.getByText('메모리')).toBeInTheDocument();
    expect(screen.getByText('0MB')).toBeInTheDocument();

    // 복원
    window.performance.memory = originalMemory;
  });

  test('handles missing navigator.connection gracefully', () => {
    // navigator.connection을 undefined로 설정
    const originalConnection = navigator.connection;
    Object.defineProperty(navigator, 'connection', {
      value: undefined,
      writable: true,
      configurable: true
    });

    render(<PerformanceDashboard isVisible={true} />);
    
    // 네트워크 상태 섹션이 표시되지 않아야 함
    expect(screen.queryByText('네트워크 상태')).not.toBeInTheDocument();

    // 복원
    Object.defineProperty(navigator, 'connection', {
      value: originalConnection,
      writable: true,
      configurable: true
    });
  });
});