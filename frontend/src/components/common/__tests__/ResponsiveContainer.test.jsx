import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResponsiveContainer, { ResponsiveGrid, ResponsiveCard } from '../ResponsiveContainer';

// ResizeObserver 모킹
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('ResponsiveContainer', () => {
  test('renders children correctly', () => {
    render(
      <ResponsiveContainer>
        <div data-testid="test-child">Test Content</div>
      </ResponsiveContainer>
    );
    
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  test('applies correct CSS classes for maxWidth', () => {
    const { container } = render(
      <ResponsiveContainer maxWidth="lg">
        <div>Content</div>
      </ResponsiveContainer>
    );
    
    const containerElement = container.firstChild;
    expect(containerElement).toHaveClass('max-w-lg');
  });

  test('applies responsive padding classes', () => {
    const { container } = render(
      <ResponsiveContainer padding="responsive">
        <div>Content</div>
      </ResponsiveContainer>
    );
    
    const containerElement = container.firstChild;
    expect(containerElement).toHaveClass('px-4', 'py-4', 'sm:px-6', 'sm:py-6', 'lg:px-8', 'lg:py-8');
  });

  test('applies fluid styling when fluid prop is true', () => {
    const { container } = render(
      <ResponsiveContainer fluid>
        <div>Content</div>
      </ResponsiveContainer>
    );
    
    const containerElement = container.firstChild;
    expect(containerElement).toHaveClass('min-h-0');
    expect(containerElement).not.toHaveClass('mx-auto');
  });

  test('applies custom className', () => {
    const { container } = render(
      <ResponsiveContainer className="custom-class">
        <div>Content</div>
      </ResponsiveContainer>
    );
    
    const containerElement = container.firstChild;
    expect(containerElement).toHaveClass('custom-class');
  });
});

describe('ResponsiveGrid', () => {
  test('renders with default grid classes', () => {
    const { container } = render(
      <ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );
    
    const gridElement = container.firstChild;
    expect(gridElement).toHaveClass('grid', 'grid-cols-1', 'gap-4');
  });

  test('applies responsive column classes', () => {
    const { container } = render(
      <ResponsiveGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );
    
    const gridElement = container.firstChild;
    expect(gridElement).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
  });

  test('applies auto grid when auto prop is true', () => {
    const { container } = render(
      <ResponsiveGrid auto minItemWidth="200px">
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );
    
    const gridElement = container.firstChild;
    expect(gridElement).toHaveClass('grid-cols-[repeat(auto-fit,minmax(200px,1fr))]');
  });

  test('applies custom gap', () => {
    const { container } = render(
      <ResponsiveGrid gap={8}>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );
    
    const gridElement = container.firstChild;
    expect(gridElement).toHaveClass('gap-8');
  });
});

describe('ResponsiveCard', () => {
  test('renders children correctly', () => {
    render(
      <ResponsiveCard>
        <div data-testid="card-content">Card Content</div>
      </ResponsiveCard>
    );
    
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });

  test('applies default card styling', () => {
    const { container } = render(
      <ResponsiveCard>
        <div>Content</div>
      </ResponsiveCard>
    );
    
    const cardElement = container.firstChild;
    expect(cardElement).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-lg', 'shadow-md');
  });

  test('applies interactive styling when interactive prop is true', () => {
    const { container } = render(
      <ResponsiveCard interactive>
        <div>Content</div>
      </ResponsiveCard>
    );
    
    const cardElement = container.firstChild;
    expect(cardElement).toHaveClass('hover:shadow-lg', 'hover:scale-105', 'cursor-pointer');
  });

  test('applies custom className', () => {
    const { container } = render(
      <ResponsiveCard className="custom-card">
        <div>Content</div>
      </ResponsiveCard>
    );
    
    const cardElement = container.firstChild;
    expect(cardElement).toHaveClass('custom-card');
  });
});