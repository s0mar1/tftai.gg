// 공유 타입들을 중앙화된 위치에서 import
export * from '../shared/types';

// 프론트엔드 전용 타입들만 여기에 유지

// 프론트엔드 전용 타입들
export interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenderTime: number;
  memoryUsage: {
    used: number;
    total: number;
  } | null;
}

export interface TooltipData {
  visible: boolean;
  data: Champion | null;
  position: {
    x: number;
    y: number;
  };
}

export interface CacheConfig {
  ttl: number;
  key: string;
  enabled: boolean;
}

export interface Region {
  id: string;
  name: string;
  platform: string;
  locale: string;
}

export interface QueryOptions<TData> {
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error | null; resetErrorBoundary: () => void }>;
  level?: 'app' | 'page' | 'component';
  errorMetadata?: Record<string, unknown>;
}

export interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'auto' | 'sync' | 'async';
  fetchpriority?: 'high' | 'low' | 'auto';
}

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full' | 'fluid';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'responsive' | 'fluid';
  fluid?: boolean;
  containerQuery?: boolean;
  breakpoints?: Record<string, number>;
}

export interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: number;
  className?: string;
  containerQuery?: boolean;
  auto?: boolean;
  minItemWidth?: string;
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  animation?: 'pulse' | 'wave' | 'none';
  lines?: number;
}

// 기타 공유 타입들(Ranker, ItemStats, TraitStats, Guide 등)은 shared/types.ts로 이동됨

