import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className, 
  placeholder = '/images/loading-placeholder.svg',
  fallback = '/images/error-placeholder.svg',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const currentRef = imgRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // 뷰포트 50px 전에 로딩 시작
      }
    );

    observer.observe(currentRef);

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  const handleLoad = (): void => {
    setIsLoaded(true);
    setIsError(false);
  };

  const handleError = (): void => {
    setIsError(true);
    setIsLoaded(false);
  };

  return (
    <div
      ref={imgRef}
      className={classNames(
        'relative overflow-hidden bg-gray-200 dark:bg-gray-700',
        className
      )}
      {...props}
    >
      {!isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse bg-gray-300 dark:bg-gray-600 rounded w-full h-full"></div>
        </div>
      )}
      
      {isInView && (
        <>
          <img
            src={isError ? fallback : src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={classNames(
              'transition-opacity duration-300 w-full h-full object-cover',
              {
                'opacity-0': !isLoaded && !isError,
                'opacity-100': isLoaded || isError,
              }
            )}
            loading="lazy"
          />
          
          {!isLoaded && !isError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LazyImage;