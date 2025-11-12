/**
 * 마이크로 인터랙션 훅
 * 사용자 경험 향상을 위한 섬세한 애니메이션과 피드백
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 호버 애니메이션을 위한 훅
 */
export function useHoverAnimation(scale: number = 1.05, duration: number = 200) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => {
      setIsHovered(false);
      setIsPressed(false);
    },
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    style: {
      transform: isPressed 
        ? `scale(${scale * 0.95})` 
        : isHovered 
          ? `scale(${scale})` 
          : 'scale(1)',
      transition: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      cursor: 'pointer'
    }
  };

  return { isHovered, isPressed, hoverProps };
}

/**
 * 클릭 시 파동 효과를 위한 훅
 */
export function useRippleEffect() {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const nextRippleId = useRef(0);

  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newRipple = {
      id: nextRippleId.current++,
      x,
      y
    };

    setRipples(prev => [...prev, newRipple]);

    // 애니메이션 후 ripple 제거
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  }, []);

  // CSS 애니메이션을 위한 스타일 정의
  const rippleStyles: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: 'scale(0)',
    animation: 'rippleEffect 0.6s linear',
  };

  // 전역 CSS에 애니메이션이 정의되어 있어야 함
  // 또는 컴포넌트에서 인라인으로 처리
  const RippleContainer = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    React.useEffect(() => {
      // 애니메이션 키프레임을 동적으로 추가
      const styleId = 'ripple-effect-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes rippleEffect {
            to {
              transform: scale(4);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }, []);

    return (
      <div 
        className={`relative overflow-hidden ${className}`}
        onClick={createRipple}
      >
        {children}
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            style={{
              ...rippleStyles,
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
            }}
          />
        ))}
      </div>
    );
  };

  return { createRipple, RippleContainer };
}

/**
 * 스크롤 기반 애니메이션을 위한 훅
 */
export function useScrollAnimation(threshold: number = 0.1, rootMargin: string = '0px') {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { isVisible, elementRef };
}

/**
 * 카운터 애니메이션을 위한 훅
 */
export function useCounterAnimation(
  targetValue: number, 
  duration: number = 1000,
  startDelay: number = 0
) {
  const [currentValue, setCurrentValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (targetValue === 0) {
      setCurrentValue(0);
      return;
    }

    const startAnimation = () => {
      setIsAnimating(true);
      const startTime = Date.now();
      const startValue = currentValue;
      const difference = targetValue - startValue;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const newValue = Math.round(startValue + difference * easeOutQuart);
        
        setCurrentValue(newValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    };

    const timer = setTimeout(startAnimation, startDelay);
    return () => clearTimeout(timer);
  }, [targetValue, duration, startDelay, currentValue]);

  return { currentValue, isAnimating };
}

/**
 * 로딩 상태 마이크로 애니메이션을 위한 훅
 */
export function useLoadingAnimation() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const LoadingSpinner = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
    <div 
      className="inline-block animate-spin"
      style={{
        width: size,
        height: size,
        border: `2px solid transparent`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%'
      }}
    />
  );

  const PulsingDot = ({ delay = 0 }: { delay?: number }) => (
    <div 
      className="inline-block w-2 h-2 bg-current rounded-full animate-pulse"
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: '1.5s'
      }}
    />
  );

  return { dots, LoadingSpinner, PulsingDot };
}

/**
 * 토스트 알림 애니메이션을 위한 훅
 */
export function useToastAnimation() {
  const [toasts, setToasts] = useState<Array<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
  }>>([]);

  const nextToastId = useRef(0);

  const showToast = useCallback((
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration: number = 3000
  ) => {
    const newToast = {
      id: nextToastId.current++,
      message,
      type,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-right-5 fade-in-0
            ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-500 text-black' : ''}
            ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
          `}
          onClick={() => removeToast(toast.id)}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button className="ml-2 text-sm opacity-70 hover:opacity-100">×</button>
          </div>
        </div>
      ))}
    </div>
  );

  return { showToast, removeToast, ToastContainer };
}

/**
 * 카드 플립 애니메이션을 위한 훅
 */
export function useCardFlip() {
  const [isFlipped, setIsFlipped] = useState(false);

  const flip = () => setIsFlipped(!isFlipped);

  const CardContainer = ({ 
    frontContent, 
    backContent, 
    className = '' 
  }: { 
    frontContent: React.ReactNode; 
    backContent: React.ReactNode; 
    className?: string;
  }) => (
    <div 
      className={`relative w-full h-full cursor-pointer ${className}`}
      onClick={flip}
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative w-full h-full transition-transform duration-600 preserve-3d"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {frontContent}
        </div>
        
        {/* Back */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {backContent}
        </div>
      </div>
    </div>
  );

  return { isFlipped, flip, CardContainer };
}

export default {
  useHoverAnimation,
  useRippleEffect,
  useScrollAnimation,
  useCounterAnimation,
  useLoadingAnimation,
  useToastAnimation,
  useCardFlip
};