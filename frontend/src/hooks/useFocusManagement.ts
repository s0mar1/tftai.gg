import { useRef, useCallback, useEffect } from 'react';

/**
 * 포커스 관리 훅
 * 컴포넌트의 포커스 상태를 관리하고 접근성을 향상시키는 유틸리티
 */
interface UseFocusManagementOptions {
  /** 컴포넌트가 마운트될 때 자동으로 포커스할지 여부 */
  autoFocus?: boolean;
  /** 포커스를 복원할 요소 */
  restoreFocus?: boolean;
  /** 초기 포커스할 요소의 CSS 선택자 */
  initialFocusSelector?: string;
}

export const useFocusManagement = ({
  autoFocus = false,
  restoreFocus = false,
  initialFocusSelector
}: UseFocusManagementOptions = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // 포커스 가능한 요소들을 찾는 함수
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
  }, []);

  // 첫 번째 포커스 가능한 요소에 포커스
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    focusableElements[0]?.focus();
  }, [getFocusableElements]);

  // 마지막 포커스 가능한 요소에 포커스
  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    const lastElement = focusableElements[focusableElements.length - 1];
    lastElement?.focus();
  }, [getFocusableElements]);

  // 특정 요소에 포커스
  const focusElement = useCallback((selector: string) => {
    if (!containerRef.current) return false;
    
    const element = containerRef.current.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }, []);

  // 다음 포커스 가능한 요소로 이동
  const focusNext = useCallback(() => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    } else {
      focusableElements[0]?.focus(); // 순환
    }
  }, [getFocusableElements]);

  // 이전 포커스 가능한 요소로 이동
  const focusPrevious = useCallback(() => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
    } else {
      focusableElements[focusableElements.length - 1]?.focus(); // 순환
    }
  }, [getFocusableElements]);

  // 포커스가 컨테이너 내부에 있는지 확인
  const isFocusWithin = useCallback((): boolean => {
    if (!containerRef.current) return false;
    return containerRef.current.contains(document.activeElement);
  }, []);

  // 포커스가 컨테이너를 벗어났을 때 콜백
  const onFocusLeave = useCallback((callback: () => void) => {
    const handleFocusOut = (event: FocusEvent) => {
      if (!containerRef.current) return;
      
      // 포커스가 컨테이너 외부로 이동했는지 확인
      const newFocusTarget = event.relatedTarget as Node;
      if (!newFocusTarget || !containerRef.current.contains(newFocusTarget)) {
        callback();
      }
    };

    if (containerRef.current) {
      containerRef.current.addEventListener('focusout', handleFocusOut);
      return () => {
        containerRef.current?.removeEventListener('focusout', handleFocusOut);
      };
    }
  }, []);

  // 초기 포커스 설정
  useEffect(() => {
    if (autoFocus) {
      if (restoreFocus) {
        previousActiveElement.current = document.activeElement;
      }

      if (initialFocusSelector) {
        const success = focusElement(initialFocusSelector);
        if (!success) {
          focusFirst();
        }
      } else {
        focusFirst();
      }
    }

    return () => {
      if (restoreFocus && previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus();
      }
    };
  }, [autoFocus, restoreFocus, initialFocusSelector, focusElement, focusFirst]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusElement,
    focusNext,
    focusPrevious,
    getFocusableElements,
    isFocusWithin,
    onFocusLeave
  };
};