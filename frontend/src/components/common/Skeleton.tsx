import React from 'react';
import { SkeletonProps } from '../../types';

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'rectangular',
  animation = 'pulse',
  lines = 1,
}) => {
  const getBaseClasses = () => {
    const baseClasses = 'bg-gray-200 dark:bg-gray-700';
    
    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'animate-wave',
      none: '',
    };

    const variantClasses = {
      rectangular: 'rounded',
      circular: 'rounded-full',
      text: 'rounded-sm',
    };

    return `${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`;
  };

  const getStyle = () => ({
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  });

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={getBaseClasses()}
            style={{
              width: index === lines - 1 ? '75%' : '100%',
              height: typeof height === 'number' ? `${height}px` : height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={getBaseClasses()}
      style={getStyle()}
    />
  );
};

// 특화된 스켈레톤 컴포넌트들
export const SkeletonText: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton {...props} variant="text" />
);

export const SkeletonCircle: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton {...props} variant="circular" />
);

export const SkeletonRectangle: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton {...props} variant="rectangular" />
);

// 복합 스켈레톤 컴포넌트들
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border rounded-lg ${className}`}>
    <div className="flex items-center space-x-4 mb-4">
      <SkeletonCircle width={48} height={48} />
      <div className="space-y-2 flex-1">
        <SkeletonText width="60%" height={16} />
        <SkeletonText width="40%" height={14} />
      </div>
    </div>
    <SkeletonText lines={3} height={14} />
  </div>
);

export const SkeletonList: React.FC<{ 
  items?: number; 
  className?: string;
  itemHeight?: number;
}> = ({ 
  items = 5, 
  className = '',
  itemHeight = 60
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        <SkeletonCircle width={40} height={40} />
        <div className="flex-1 space-y-2">
          <SkeletonText width="70%" height={16} />
          <SkeletonText width="50%" height={14} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number;
  className?: string;
}> = ({ 
  rows = 5, 
  columns = 4,
  className = ''
}) => (
  <div className={`space-y-3 ${className}`}>
    {/* 테이블 헤더 */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, index) => (
        <SkeletonText key={index} width="80%" height={18} />
      ))}
    </div>
    
    {/* 테이블 바디 */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonText key={colIndex} width="90%" height={16} />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;