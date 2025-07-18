import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// 에러를 발생시키는 컴포넌트
const ThrowError = ({ shouldError = false }: { shouldError?: boolean }) => {
  if (shouldError) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // 콘솔 에러 메시지 억제
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('에러가 없을 때 자식 컴포넌트를 정상적으로 렌더링해야 함', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('에러가 발생했을 때 fallback UI를 표시해야 함', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText('페이지를 새로고침해 주세요.')).toBeInTheDocument();
  });

  test('app 레벨에서 적절한 에러 메시지를 표시해야 함', () => {
    render(
      <ErrorBoundary level="app">
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('앱에서 문제가 발생했습니다')).toBeInTheDocument();
  });

  test('page 레벨에서 적절한 에러 메시지를 표시해야 함', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('페이지에서 문제가 발생했습니다')).toBeInTheDocument();
  });

  test('component 레벨에서 적절한 에러 메시지를 표시해야 함', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('컴포넌트에서 문제가 발생했습니다')).toBeInTheDocument();
  });

  test('커스텀 onError 콜백이 호출되어야 함', () => {
    const mockOnError = jest.fn();
    
    render(
      <ErrorBoundary level="component" onError={mockOnError}>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });
});