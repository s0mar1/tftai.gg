/**
 * Accessibility 유틸리티 훅
 * 웹 접근성 향상을 위한 커스텀 훅들
 */

import { useEffect, useRef, useState } from 'react';

/**
 * 키보드 네비게이션을 위한 훅
 */
export function useKeyboardNavigation(
  items: any[],
  onSelect?: (index: number) => void,
  onEscape?: () => void
) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current || items.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && onSelect) {
            onSelect(focusedIndex);
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (onEscape) {
            onEscape();
          }
          break;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [items.length, focusedIndex, onSelect, onEscape]);

  return { focusedIndex, setFocusedIndex, containerRef };
}

/**
 * ARIA 라이브 영역을 위한 훅
 */
export function useAriaLive() {
  const [announcement, setAnnouncement] = useState<string>('');

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(''); // 기존 메시지 제거
    setTimeout(() => setAnnouncement(message), 10); // 새 메시지 설정
  };

  return { announcement, announce };
}

/**
 * 포커스 관리를 위한 훅
 */
export function useFocusManagement() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  };

  const trapFocus = (containerRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      };

      container.addEventListener('keydown', handleTabKey);
      return () => container.removeEventListener('keydown', handleTabKey);
    }, [containerRef]);
  };

  return { saveFocus, restoreFocus, trapFocus };
}

/**
 * 화면 리더 친화적 텍스트 생성
 */
export function useScreenReaderText() {
  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}퍼센트`;
  };

  const formatWinRate = (winRate: number): string => {
    return `승률 ${formatPercentage(winRate)}`;
  };

  const formatPlacement = (placement: number): string => {
    const ordinals = ['', '1등', '2등', '3등', '4등', '5등', '6등', '7등', '8등'];
    return ordinals[placement] || `${placement}등`;
  };

  const formatTrait = (trait: string, level: number): string => {
    return `${trait} ${level}단계`;
  };

  const formatChampion = (name: string, cost: number, stars: number = 1): string => {
    const starText = stars === 1 ? '1성' : stars === 2 ? '2성' : '3성';
    return `${cost}코스트 ${name} ${starText}`;
  };

  return {
    formatNumber,
    formatPercentage,
    formatWinRate,
    formatPlacement,
    formatTrait,
    formatChampion
  };
}

/**
 * 다크모드 접근성 훅
 */
export function useDarkModeAccessibility() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    // 시스템 고대비 모드 감지
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const getContrastClass = (baseClass: string): string => {
    if (highContrast) {
      return `${baseClass} contrast-more:border-2 contrast-more:border-white`;
    }
    return baseClass;
  };

  return { highContrast, getContrastClass };
}

/**
 * 애니메이션 감소 설정 감지
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const getAnimationClass = (animatedClass: string, staticClass: string = ''): string => {
    return prefersReducedMotion ? staticClass : animatedClass;
  };

  return { prefersReducedMotion, getAnimationClass };
}

export default {
  useKeyboardNavigation,
  useAriaLive,
  useFocusManagement,
  useScreenReaderText,
  useDarkModeAccessibility,
  useReducedMotion
};