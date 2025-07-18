import React, { forwardRef } from 'react';
import classNames from 'classnames';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}, ref) => {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-[0.98]'
  ];

  const variantClasses = {
    primary: [
      'bg-brand-mint text-white',
      'hover:bg-brand-mint/90',
      'focus:ring-brand-mint/50',
      'dark:bg-brand-mint dark:text-white',
      'dark:hover:bg-brand-mint/90',
      'dark:focus:ring-brand-mint/50'
    ],
    secondary: [
      'bg-panel-bg-secondary text-text-primary border border-border-light',
      'hover:bg-tft-gray-100',
      'focus:ring-tft-gray-200',
      'dark:bg-dark-panel-bg-secondary dark:text-dark-text-primary dark:border-dark-border-light',
      'dark:hover:bg-dark-tft-gray-100',
      'dark:focus:ring-dark-tft-gray-200'
    ],
    outline: [
      'bg-transparent text-text-primary border border-border-light',
      'hover:bg-tft-gray-100',
      'focus:ring-tft-gray-200',
      'dark:text-dark-text-primary dark:border-dark-border-light',
      'dark:hover:bg-dark-tft-gray-100',
      'dark:focus:ring-dark-tft-gray-200'
    ],
    ghost: [
      'bg-transparent text-text-primary',
      'hover:bg-tft-gray-100',
      'focus:ring-tft-gray-200',
      'dark:text-dark-text-primary',
      'dark:hover:bg-dark-tft-gray-100',
      'dark:focus:ring-dark-tft-gray-200'
    ],
    danger: [
      'bg-error-red text-white',
      'hover:bg-red-600',
      'focus:ring-error-red/50',
      'dark:bg-error-red dark:text-white',
      'dark:hover:bg-red-600',
      'dark:focus:ring-error-red/50'
    ]
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  const widthClasses = fullWidth ? 'w-full' : '';

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={classNames(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        widthClasses,
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// 아이콘 버튼 컴포넌트
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  size = 'md',
  ...props
}, ref) => {
  const iconSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  return (
    <Button
      ref={ref}
      size={size}
      className={classNames(iconSizeClasses[size], props.className)}
      {...props}
    >
      {icon}
    </Button>
  );
});

IconButton.displayName = 'IconButton';

// 버튼 그룹 컴포넌트
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  orientation = 'horizontal',
  size,
  variant
}) => {
  const groupClasses = classNames(
    'inline-flex',
    {
      'flex-row': orientation === 'horizontal',
      'flex-col': orientation === 'vertical'
    },
    className
  );

  const enhancedChildren = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child) && child.type === Button) {
      const isFirst = index === 0;
      const isLast = index === React.Children.count(children) - 1;
      
      const groupItemClasses = classNames({
        'rounded-r-none border-r-0': orientation === 'horizontal' && !isLast,
        'rounded-l-none': orientation === 'horizontal' && !isFirst,
        'rounded-b-none border-b-0': orientation === 'vertical' && !isLast,
        'rounded-t-none': orientation === 'vertical' && !isFirst,
      });

      return React.cloneElement(child, {
        size: size || child.props.size,
        variant: variant || child.props.variant,
        className: classNames(child.props.className, groupItemClasses)
      });
    }
    return child;
  });

  return (
    <div className={groupClasses}>
      {enhancedChildren}
    </div>
  );
};

export default Button;