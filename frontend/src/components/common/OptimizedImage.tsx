import React, { useState, useRef, useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { 
  useResponsiveInfo,
  getOptimizedImageSrc 
} from '../../utils/responsiveEnhancements';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  
  // 반응형 이미지 설정
  sizes?: string;
  srcSet?: string;
  enableWebP?: boolean;
  enableAVIF?: boolean;
  
  // 로딩 최적화
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  
  // 성능 최적화
  enableBlurHash?: boolean;
  blurDataURL?: string;
  showLoadingSkeleton?: boolean;
  
  // 접근성
  role?: string;
  ariaLabel?: string;
  
  // 오류 처리
  fallbackSrc?: string;
  onLoadError?: (error: Event) => void;
  
  // 레이아웃
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  objectPosition?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  sizes,
  srcSet,
  enableWebP = true,
  enableAVIF = true,
  loading = 'lazy',
  fetchPriority = 'auto',
  enableBlurHash = false,
  blurDataURL,
  showLoadingSkeleton = true,
  role,
  ariaLabel,
  fallbackSrc,
  onLoadError,
  aspectRatio,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  ...props
}) => {
  const { viewport, browserSupport, networkStatus } = useResponsiveInfo();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);

  // 최적화된 이미지 소스 생성
  const optimizedSrc = useMemo(() => {
    if (!src) return '';
    
    // 네트워크 상태에 따른 품질 조정
    if (networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g') {
      // 저속 네트워크에서는 원본 이미지 사용
      return src;
    }
    
    return getOptimizedImageSrc(src, viewport, browserSupport);
  }, [src, viewport, browserSupport, networkStatus.effectiveType]);

  // srcSet 생성 (반응형 이미지)
  const generatedSrcSet = useMemo(() => {
    if (srcSet) return srcSet;
    if (!src) return '';

    // 다양한 해상도용 srcSet 생성
    const densities = [1, 1.5, 2, 3];
    const srcSetArray = densities.map(density => {
      const baseName = src.substring(0, src.lastIndexOf('.'));
      const extension = src.substring(src.lastIndexOf('.') + 1);
      
      let format = extension;
      if (enableAVIF && browserSupport.avif) {
        format = 'avif';
      } else if (enableWebP && browserSupport.webp) {
        format = 'webp';
      }
      
      const densitySuffix = density > 1 ? `@${density}x` : '';
      return `${baseName}${densitySuffix}.${format} ${density}x`;
    });

    return srcSetArray.join(', ');
  }, [src, srcSet, enableAVIF, enableWebP, browserSupport.avif, browserSupport.webp]);

  // 이미지 로드 처리
  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(event);
  };

  // 이미지 오류 처리
  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onLoadError?.(event.nativeEvent);
    onError?.(event);
    
    // 폴백 이미지 시도
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    
    // WebP/AVIF 실패 시 원본 이미지로 폴백
    if (currentSrc !== src) {
      setCurrentSrc(src);
    }
  };

  // 초기 소스 설정
  useEffect(() => {
    setCurrentSrc(optimizedSrc || src);
  }, [optimizedSrc, src]);

  // Intersection Observer를 통한 지연 로딩
  useEffect(() => {
    if (loading !== 'lazy' || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      },
      { 
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  // 컨테이너 스타일
  const containerStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    
    if (aspectRatio) {
      if (browserSupport.aspectRatio) {
        styles.aspectRatio = aspectRatio;
      } else {
        // 폴백: padding-top 방식
        const [width, height] = aspectRatio.split('/').map(Number);
        styles.paddingTop = `${(height / width) * 100}%`;
        styles.position = 'relative';
      }
    }
    
    return styles;
  }, [aspectRatio, browserSupport.aspectRatio]);

  // 이미지 스타일
  const imageStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    
    if (objectFit && browserSupport.aspectRatio) {
      styles.objectFit = objectFit;
      styles.objectPosition = objectPosition;
    }
    
    if (!browserSupport.aspectRatio && aspectRatio) {
      styles.position = 'absolute';
      styles.top = '0';
      styles.left = '0';
      styles.width = '100%';
      styles.height = '100%';
    }
    
    return styles;
  }, [objectFit, objectPosition, aspectRatio, browserSupport.aspectRatio]);

  // 클래스명 조합
  const containerClasses = classNames(
    'relative overflow-hidden',
    {
      'bg-gray-200 dark:bg-gray-700': showLoadingSkeleton && !isLoaded,
    },
    className
  );

  const imageClasses = classNames(
    'transition-opacity duration-300',
    {
      'opacity-0': !isLoaded && !hasError,
      'opacity-100': isLoaded || hasError,
      'object-fit-fallback': !browserSupport.aspectRatio && objectFit,
    }
  );

  // Picture 엘리먼트 사용 (최신 브라우저)
  const renderPictureElement = () => {
    if (!enableAVIF && !enableWebP) {
      return null;
    }

    const sources = [];
    
    // AVIF 소스
    if (enableAVIF && browserSupport.avif) {
      const avifSrc = src.replace(/\.(jpg|jpeg|png|webp)$/i, '.avif');
      sources.push(
        <source
          key="avif"
          srcSet={avifSrc}
          type="image/avif"
          sizes={sizes}
        />
      );
    }
    
    // WebP 소스
    if (enableWebP && browserSupport.webp) {
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      sources.push(
        <source
          key="webp"
          srcSet={webpSrc}
          type="image/webp"
          sizes={sizes}
        />
      );
    }

    return sources.length > 0 ? sources : null;
  };

  // 로딩 스켈레톤
  const LoadingSkeleton = () => (
    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
      <svg 
        className="w-8 h-8 text-gray-400" 
        fill="currentColor" 
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
      </svg>
    </div>
  );

  // 오류 상태 표시
  const ErrorFallback = () => (
    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <svg 
          className="w-8 h-8 mx-auto mb-2" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zM5 8a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 4a1 1 0 100 2h8a1 1 0 100-2H6z" />
        </svg>
        <span className="text-xs">이미지를 불러올 수 없습니다</span>
      </div>
    </div>
  );

  // 접근성 속성
  const accessibilityProps = {
    alt,
    role,
    'aria-label': ariaLabel || alt,
  };

  return (
    <div 
      className={containerClasses} 
      style={containerStyles}
    >
      {/* 블러 해시 배경 */}
      {enableBlurHash && blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* 로딩 스켈레톤 */}
      {showLoadingSkeleton && !isLoaded && !hasError && <LoadingSkeleton />}

      {/* 오류 폴백 */}
      {hasError && <ErrorFallback />}

      {/* 메인 이미지 */}
      {browserSupport.aspectRatio ? (
        <picture>
          {renderPictureElement()}
          <img
            ref={imgRef}
            src={loading === 'lazy' ? undefined : currentSrc}
            data-src={loading === 'lazy' ? currentSrc : undefined}
            srcSet={generatedSrcSet}
            sizes={sizes}
            className={imageClasses}
            style={imageStyles}
            loading={loading}
            fetchPriority={fetchPriority}
            onLoad={handleLoad}
            onError={handleError}
            {...accessibilityProps}
            {...props}
          />
        </picture>
      ) : (
        // 레거시 브라우저 폴백
        <img
          ref={imgRef}
          src={loading === 'lazy' ? undefined : currentSrc}
          data-src={loading === 'lazy' ? currentSrc : undefined}
          className={imageClasses}
          style={imageStyles}
          onLoad={handleLoad}
          onError={handleError}
          {...accessibilityProps}
          {...props}
        />
      )}
    </div>
  );
};

export default OptimizedImage;