import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorMessage, { NetworkError, NotFoundError, TimeoutError } from '../ErrorMessage';

describe('ErrorMessage', () => {
  test('기본 generic 타입으로 렌더링되어야 함', () => {
    render(<ErrorMessage />);
    
    expect(screen.getByText('오류 발생')).toBeInTheDocument();
    expect(screen.getByText('알 수 없는 오류가 발생했습니다.')).toBeInTheDocument();
  });

  test('커스텀 메시지를 표시해야 함', () => {
    const customMessage = '사용자 정의 에러 메시지';
    render(<ErrorMessage message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  test('네트워크 에러 타입이 올바르게 표시되어야 함', () => {
    render(<ErrorMessage type="network" />);
    
    expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
    expect(screen.getByText('서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.')).toBeInTheDocument();
  });

  test('재시도 버튼이 동작해야 함', () => {
    const mockOnRetry = jest.fn();
    render(<ErrorMessage onRetry={mockOnRetry} showRetry={true} />);
    
    const retryButton = screen.getByText('다시 시도');
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  test('닫기 버튼이 동작해야 함', () => {
    const mockOnDismiss = jest.fn();
    render(<ErrorMessage onDismiss={mockOnDismiss} showDismiss={true} />);
    
    const dismissButton = screen.getByText('닫기');
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  test('재시도와 닫기 버튼이 모두 표시되어야 함', () => {
    const mockOnRetry = jest.fn();
    const mockOnDismiss = jest.fn();
    
    render(
      <ErrorMessage 
        onRetry={mockOnRetry} 
        onDismiss={mockOnDismiss} 
        showRetry={true} 
        showDismiss={true} 
      />
    );
    
    expect(screen.getByText('다시 시도')).toBeInTheDocument();
    expect(screen.getByText('닫기')).toBeInTheDocument();
  });

  test('헬퍼 컴포넌트들이 올바르게 동작해야 함', () => {
    const { rerender } = render(<NetworkError />);
    expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
    
    rerender(<NotFoundError />);
    expect(screen.getByText('데이터를 찾을 수 없음')).toBeInTheDocument();
    
    rerender(<TimeoutError />);
    expect(screen.getByText('요청 시간 초과')).toBeInTheDocument();
  });

  test('모든 에러 타입이 올바른 제목을 가져야 함', () => {
    const errorTypes = [
      { type: 'network', title: '네트워크 오류' },
      { type: 'notFound', title: '데이터를 찾을 수 없음' },
      { type: 'timeout', title: '요청 시간 초과' },
      { type: 'validation', title: '입력 오류' },
      { type: 'unauthorized', title: '권한 없음' },
      { type: 'maintenance', title: '서비스 점검' },
      { type: 'rateLimit', title: '요청 제한' }
    ] as const;

    errorTypes.forEach(({ type, title }) => {
      const { rerender } = render(<ErrorMessage type={type} />);
      expect(screen.getByText(title)).toBeInTheDocument();
      rerender(<div />); // 리렌더링을 위해 다른 컴포넌트로 교체
    });
  });
});