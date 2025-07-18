import React from 'react';

interface PageErrorMessageProps {
  title?: string;
  message: string;
  showRetry?: boolean;
  onRetry?: () => void;
  variant?: 'default' | 'compact' | 'inline';
}

const PageErrorMessage: React.FC<PageErrorMessageProps> = ({
  title = '오류가 발생했습니다',
  message,
  showRetry = false,
  onRetry,
  variant = 'default'
}) => {
  const baseClasses = "rounded-lg border border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100";
  
  if (variant === 'inline') {
    return (
      <div className={`${baseClasses} px-3 py-2 text-sm`}>
        <div className="flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <span>{message}</span>
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              재시도
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`${baseClasses} p-4 text-center`}>
        <div className="text-red-500 text-2xl mb-2">⚠️</div>
        <p className="font-medium mb-2">{title}</p>
        <p className="text-sm mb-3">{message}</p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-sm font-medium"
          >
            재시도
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} p-6 text-center max-w-md mx-auto`}>
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm mb-4 text-red-800 dark:text-red-200">{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 font-medium transition-colors"
        >
          재시도
        </button>
      )}
    </div>
  );
};

export default PageErrorMessage;