import React, { forwardRef } from 'react';
import classNames from 'classnames';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'filled';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  padding?: boolean;
  hover?: boolean;
  clickable?: boolean;
  children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  size = 'md',
  padding = true,
  hover = false,
  clickable = false,
  className,
  children,
  ...props
}, ref) => {
  const baseClasses = [
    'transition-all duration-200',
    'dark:border-dark-border-light'
  ];

  const variantClasses = {
    default: [
      'bg-background-card border border-border-light rounded-lg',
      'dark:bg-dark-background-card dark:border-dark-border-light'
    ],
    outlined: [
      'bg-transparent border-2 border-border-light rounded-lg',
      'dark:border-dark-border-light'
    ],
    elevated: [
      'bg-background-card rounded-lg shadow-block',
      'dark:bg-dark-background-card dark:shadow-lg'
    ],
    filled: [
      'bg-tft-gray-100 rounded-lg',
      'dark:bg-dark-tft-gray-100'
    ]
  };

  const sizeClasses = {
    sm: padding ? 'p-3' : '',
    md: padding ? 'p-4' : '',
    lg: padding ? 'p-6' : ''
  };

  const interactiveClasses = {
    hover: hover ? [
      'hover:shadow-lg hover:-translate-y-0.5',
      'dark:hover:shadow-xl'
    ] : [],
    clickable: clickable ? [
      'cursor-pointer',
      'hover:shadow-lg hover:-translate-y-0.5',
      'active:translate-y-0 active:shadow-md',
      'focus:outline-none focus:ring-2 focus:ring-brand-mint/20',
      'dark:hover:shadow-xl'
    ] : []
  };

  const cardClasses = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    interactiveClasses.hover,
    interactiveClasses.clickable,
    className
  );

  const Element = clickable ? 'button' : 'div';

  return (
    <Element
      ref={ref as any}
      className={cardClasses}
      {...props}
    >
      {children}
    </Element>
  );
});

Card.displayName = 'Card';

// 카드 헤더 컴포넌트
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
  ...props
}) => {
  return (
    <div 
      className={classNames(
        'flex items-start justify-between',
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">
        {children || (
          <>
            {title && (
              <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>
      {action && (
        <div className="ml-3 flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

// 카드 콘텐츠 컴포넌트
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div 
      className={classNames(
        'text-text-primary dark:text-dark-text-primary',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// 카드 푸터 컴포넌트
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div 
      className={classNames(
        'flex items-center justify-between pt-3 border-t border-border-light dark:border-dark-border-light',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// 이미지 카드 컴포넌트
export interface ImageCardProps extends Omit<CardProps, 'children'> {
  src: string;
  alt: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  imageClassName?: string;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  src,
  alt,
  title,
  description,
  footer,
  imageClassName,
  ...cardProps
}) => {
  return (
    <Card {...cardProps} padding={false}>
      <img 
        src={src} 
        alt={alt}
        className={classNames(
          'w-full h-48 object-cover',
          cardProps.variant === 'default' ? 'rounded-t-lg' : 'rounded-t-lg',
          imageClassName
        )}
      />
      {(title || description || footer) && (
        <div className="p-4">
          {title && (
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-2">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-text-secondary dark:text-dark-text-secondary text-sm mb-3">
              {description}
            </p>
          )}
          {footer}
        </div>
      )}
    </Card>
  );
};

// 통계 카드 컴포넌트
export interface StatCardProps extends Omit<CardProps, 'children'> {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  description,
  ...cardProps
}) => {
  const changeColors = {
    increase: 'text-green-600 dark:text-green-400',
    decrease: 'text-red-600 dark:text-red-400',
    neutral: 'text-text-secondary dark:text-dark-text-secondary'
  };

  return (
    <Card {...cardProps}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
            {value}
          </p>
          {change && (
            <p className={classNames('text-sm mt-1', changeColors[change.type])}>
              {change.type === 'increase' && '+'}
              {change.value}
              {change.type === 'increase' && ' ↗'}
              {change.type === 'decrease' && ' ↘'}
            </p>
          )}
          {description && (
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-2">
              {description}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-3">
            <div className="w-8 h-8 text-brand-mint">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// 리스트 카드 컴포넌트
export interface ListCardProps extends Omit<CardProps, 'children'> {
  title?: string;
  items: Array<{
    id: string;
    primary: string;
    secondary?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
  }>;
  onItemClick?: (id: string) => void;
}

export const ListCard: React.FC<ListCardProps> = ({
  title,
  items,
  onItemClick,
  ...cardProps
}) => {
  return (
    <Card {...cardProps} padding={false}>
      {title && (
        <div className="px-4 py-3 border-b border-border-light dark:border-dark-border-light">
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            {title}
          </h3>
        </div>
      )}
      <div className="divide-y divide-border-light dark:divide-dark-border-light">
        {items.map((item) => (
          <div
            key={item.id}
            className={classNames(
              'px-4 py-3 flex items-center justify-between',
              onItemClick && 'hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100 cursor-pointer transition-colors'
            )}
            onClick={() => onItemClick?.(item.id)}
          >
            <div className="flex items-center flex-1 min-w-0">
              {item.icon && (
                <div className="flex-shrink-0 mr-3 w-5 h-5 text-text-secondary dark:text-dark-text-secondary">
                  {item.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">
                  {item.primary}
                </p>
                {item.secondary && (
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary truncate">
                    {item.secondary}
                  </p>
                )}
              </div>
            </div>
            {item.action && (
              <div className="flex-shrink-0 ml-3">
                {item.action}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default Card;