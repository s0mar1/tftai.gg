import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Skeleton, { SkeletonCircle, SkeletonText, SkeletonRectangle } from '../Skeleton';

describe('Skeleton 컴포넌트', () => {
  test('기본 Skeleton이 올바르게 렌더링되어야 함', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
  });

  test('커스텀 클래스명이 적용되어야 함', () => {
    const customClass = 'custom-skeleton-class';
    render(<Skeleton className={customClass} />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass(customClass);
  });

  test('펄스 애니메이션이 비활성화되어야 함', () => {
    render(<Skeleton animation="none" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).not.toHaveClass('animate-pulse');
  });

  test('웨이브 애니메이션이 적용되어야 함', () => {
    render(<Skeleton animation="wave" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-wave');
  });

  test('커스텀 색상이 적용되어야 함', () => {
    render(<Skeleton color="red" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('bg-red-300');
  });

  test('다크 모드에서 올바른 색상이 적용되어야 함', () => {
    render(<Skeleton color="gray" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('dark:bg-gray-600');
  });
});

describe('SkeletonCircle 컴포넌트', () => {
  test('원형 스켈레톤이 올바르게 렌더링되어야 함', () => {
    render(<SkeletonCircle />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('rounded-full');
  });

  test('커스텀 크기가 적용되어야 함', () => {
    render(<SkeletonCircle width={50} height={50} />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle({
      width: '50px',
      height: '50px'
    });
  });
});

describe('SkeletonText 컴포넌트', () => {
  test('텍스트 스켈레톤이 올바르게 렌더링되어야 함', () => {
    render(<SkeletonText />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('rounded');
  });

  test('기본 높이가 적용되어야 함', () => {
    render(<SkeletonText />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle({
      height: '14px'
    });
  });

  test('커스텀 너비가 적용되어야 함', () => {
    render(<SkeletonText width="200px" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle({
      width: '200px'
    });
  });
});

describe('SkeletonRectangle 컴포넌트', () => {
  test('사각형 스켈레톤이 올바르게 렌더링되어야 함', () => {
    render(<SkeletonRectangle />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('rounded-md');
  });

  test('커스텀 크기가 적용되어야 함', () => {
    render(<SkeletonRectangle width={100} height={80} />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle({
      width: '100px',
      height: '80px'
    });
  });
});

describe('Skeleton 접근성', () => {
  test('aria-label이 올바르게 적용되어야 함', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading...');
  });

  test('role이 올바르게 적용되어야 함', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
  });
});