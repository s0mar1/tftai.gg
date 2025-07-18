import React, { forwardRef, useState } from 'react';
import classNames from 'classnames';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'unstyled';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  variant?: InputVariant;
  error?: boolean;
  helperText?: string;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = 'md',
  variant = 'default',
  error = false,
  helperText,
  label,
  leftIcon,
  rightIcon,
  leftAddon,
  rightAddon,
  wrapperClassName,
  className,
  disabled,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const baseClasses = [
    'w-full transition-all duration-200',
    'focus:outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'placeholder:text-text-secondary dark:placeholder:text-dark-text-secondary'
  ];

  const variantClasses = {
    default: [
      'border rounded-lg',
      'bg-background-card text-text-primary',
      'dark:bg-dark-background-card dark:text-dark-text-primary',
      error ? [
        'border-error-red',
        'focus:border-error-red focus:ring-2 focus:ring-error-red/20'
      ] : [
        'border-border-light dark:border-dark-border-light',
        'focus:border-brand-mint focus:ring-2 focus:ring-brand-mint/20',
        'dark:focus:border-brand-mint dark:focus:ring-brand-mint/20'
      ]
    ],
    filled: [
      'border-0 rounded-lg',
      'bg-tft-gray-100 text-text-primary',
      'dark:bg-dark-tft-gray-100 dark:text-dark-text-primary',
      error ? [
        'ring-2 ring-error-red/50',
        'focus:ring-error-red'
      ] : [
        'focus:ring-2 focus:ring-brand-mint/50',
        'dark:focus:ring-brand-mint/50'
      ]
    ],
    unstyled: [
      'border-0 bg-transparent text-text-primary',
      'dark:text-dark-text-primary',
      error ? 'text-error-red' : ''
    ]
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5'
  };

  const iconContainerClasses = 'absolute inset-y-0 flex items-center pointer-events-none text-text-secondary dark:text-dark-text-secondary';

  const inputPaddingClasses = classNames({
    'pl-10': leftIcon && size === 'sm',
    'pl-11': leftIcon && size === 'md',
    'pl-12': leftIcon && size === 'lg',
    'pr-10': rightIcon && size === 'sm',
    'pr-11': rightIcon && size === 'md',
    'pr-12': rightIcon && size === 'lg',
    'pl-0': leftAddon,
    'pr-0': rightAddon,
  });

  const inputClasses = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    inputPaddingClasses,
    className
  );

  const wrapperClasses = classNames('relative', wrapperClassName);

  const inputElement = (
    <input
      ref={ref}
      className={inputClasses}
      disabled={disabled}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        props.onBlur?.(e);
      }}
      {...props}
    />
  );

  const renderInput = () => {
    if (leftAddon || rightAddon) {
      return (
        <div className={classNames(
          'flex items-center rounded-lg overflow-hidden',
          'border border-border-light dark:border-dark-border-light',
          error ? 'border-error-red' : isFocused && 'border-brand-mint ring-2 ring-brand-mint/20'
        )}>
          {leftAddon && (
            <div className="px-3 py-2.5 bg-tft-gray-100 dark:bg-dark-tft-gray-100 text-text-secondary dark:text-dark-text-secondary text-sm border-r border-border-light dark:border-dark-border-light">
              {leftAddon}
            </div>
          )}
          <div className="relative flex-1">
            {inputElement}
            {leftIcon && (
              <div className={classNames(iconContainerClasses, 'left-0 pl-3')}>
                <span className={iconSizeClasses[size]}>{leftIcon}</span>
              </div>
            )}
            {rightIcon && (
              <div className={classNames(iconContainerClasses, 'right-0 pr-3')}>
                <span className={iconSizeClasses[size]}>{rightIcon}</span>
              </div>
            )}
          </div>
          {rightAddon && (
            <div className="px-3 py-2.5 bg-tft-gray-100 dark:bg-dark-tft-gray-100 text-text-secondary dark:text-dark-text-secondary text-sm border-l border-border-light dark:border-dark-border-light">
              {rightAddon}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        {inputElement}
        {leftIcon && (
          <div className={classNames(iconContainerClasses, 'left-0 pl-3')}>
            <span className={iconSizeClasses[size]}>{leftIcon}</span>
          </div>
        )}
        {rightIcon && (
          <div className={classNames(iconContainerClasses, 'right-0 pr-3')}>
            <span className={iconSizeClasses[size]}>{rightIcon}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={wrapperClasses}>
      {label && (
        <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
          {label}
        </label>
      )}
      {renderInput()}
      {helperText && (
        <p className={classNames(
          'mt-2 text-sm',
          error ? 'text-error-red' : 'text-text-secondary dark:text-dark-text-secondary'
        )}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// 검색 입력 컴포넌트
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  onSearch,
  onClear,
  showClearButton = true,
  value,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const currentValue = value !== undefined ? value : internalValue;

  const SearchIcon = () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );

  const ClearIcon = () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(currentValue as string);
    }
    props.onKeyDown?.(e);
  };

  const handleClear = () => {
    if (value === undefined) {
      setInternalValue('');
    }
    onClear?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    props.onChange?.(e);
  };

  return (
    <Input
      ref={ref}
      type="search"
      leftIcon={<SearchIcon />}
      rightIcon={showClearButton && currentValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary pointer-events-auto"
        >
          <ClearIcon />
        </button>
      ) : undefined}
      value={currentValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

// 패스워드 입력 컴포넌트
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({
  showToggle = true,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const EyeIcon = () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  );

  return (
    <Input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      rightIcon={showToggle ? (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary pointer-events-auto"
          aria-label={showPassword ? '패스워드 숨기기' : '패스워드 보기'}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      ) : undefined}
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

export default Input;