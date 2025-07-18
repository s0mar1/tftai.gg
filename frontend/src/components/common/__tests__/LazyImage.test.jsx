import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LazyImage from '../LazyImage';

// IntersectionObserver 모킹
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('LazyImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders placeholder initially', () => {
    render(<LazyImage src="/test-image.jpg" alt="Test Image" />);
    
    const placeholder = screen.getByTestId('lazy-image-placeholder');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveClass('animate-pulse');
  });

  test('applies correct dimensions to placeholder', () => {
    const { container } = render(
      <LazyImage src="/test-image.jpg" alt="Test Image" width={200} height={100} />
    );
    
    const placeholder = screen.getByTestId('lazy-image-placeholder');
    expect(placeholder).toHaveStyle({
      width: '200px',
      height: '100px'
    });
  });

  test('applies custom className', () => {
    const { container } = render(
      <LazyImage src="/test-image.jpg" alt="Test Image" className="custom-image" />
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-image');
  });

  test('creates IntersectionObserver on mount', () => {
    render(<LazyImage src="/test-image.jpg" alt="Test Image" />);
    
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        rootMargin: '50px',
        threshold: 0.1
      })
    );
  });

  test('simulates image loading when intersection occurs', async () => {
    let observerCallback;
    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    render(<LazyImage src="/test-image.jpg" alt="Test Image" />);
    
    // IntersectionObserver 콜백 시뮬레이션
    const mockEntry = {
      isIntersecting: true,
      target: document.createElement('div')
    };
    
    observerCallback([mockEntry]);
    
    await waitFor(() => {
      const image = screen.getByAltText('Test Image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.jpg');
    });
  });

  test('handles image load error', async () => {
    let observerCallback;
    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    render(<LazyImage src="/invalid-image.jpg" alt="Test Image" />);
    
    // IntersectionObserver 콜백 시뮬레이션
    const mockEntry = {
      isIntersecting: true,
      target: document.createElement('div')
    };
    
    observerCallback([mockEntry]);
    
    await waitFor(() => {
      const image = screen.getByAltText('Test Image');
      expect(image).toBeInTheDocument();
    });

    // 이미지 로드 에러 시뮬레이션
    const image = screen.getByAltText('Test Image');
    const errorEvent = new Event('error');
    image.dispatchEvent(errorEvent);

    await waitFor(() => {
      expect(screen.getByTestId('lazy-image-error')).toBeInTheDocument();
    });
  });

  test('shows loading state while image loads', async () => {
    let observerCallback;
    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    render(<LazyImage src="/test-image.jpg" alt="Test Image" />);
    
    // IntersectionObserver 콜백 시뮬레이션
    const mockEntry = {
      isIntersecting: true,
      target: document.createElement('div')
    };
    
    observerCallback([mockEntry]);
    
    await waitFor(() => {
      expect(screen.getByTestId('lazy-image-loading')).toBeInTheDocument();
    });
  });

  test('passes through additional props to image element', async () => {
    let observerCallback;
    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    render(
      <LazyImage 
        src="/test-image.jpg" 
        alt="Test Image" 
        title="Test Title"
        loading="lazy"
      />
    );
    
    // IntersectionObserver 콜백 시뮬레이션
    const mockEntry = {
      isIntersecting: true,
      target: document.createElement('div')
    };
    
    observerCallback([mockEntry]);
    
    await waitFor(() => {
      const image = screen.getByAltText('Test Image');
      expect(image).toHaveAttribute('title', 'Test Title');
      expect(image).toHaveAttribute('loading', 'lazy');
    });
  });
});