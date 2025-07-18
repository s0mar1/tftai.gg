import React, { useEffect, useRef } from 'react';

/**
 * 포커스 트랩 컴포넌트
 * 모달이나 다이얼로그에서 키보드 포커스가 외부로 벗어나지 않도록 제한
 */
interface FocusTrapProps {
  /** 트랩할 콘텐츠 */
  children: React.ReactNode;
  /** 포커스 트랩 활성화 여부 */
  isActive?: boolean;
  /** 초기 포커스할 요소의 CSS 선택자 */
  initialFocus?: string;
  /** 트랩에서 벗어날 때 호출되는 콜백 */
  onEscape?: () => void;
}

const FocusTrap: React.FC<FocusTrapProps> = ({ 
  children, 
  isActive = true,
  initialFocus,
  onEscape
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // 현재 포커스된 요소 저장
    previousActiveElement.current = document.activeElement;

    // 초기 포커스 설정
    if (initialFocus) {
      const element = containerRef.current?.querySelector(initialFocus) as HTMLElement;
      element?.focus();
    } else {
      // 첫 번째 포커스 가능한 요소에 포커스
      const focusableElements = getFocusableElements();
      focusableElements[0]?.focus();
    }

    // 키보드 이벤트 리스너 추가
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 이전에 포커스된 요소로 복귀
      if (previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus();
      }
    };
  }, [isActive, initialFocus]);

  const getFocusableElements = (): HTMLElement[] => {
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
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive) return;

    if (event.key === 'Escape' && onEscape) {
      onEscape();
      return;
    }

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: 역방향 이동
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: 정방향 이동
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  };

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} role="presentation">
      {children}
    </div>
  );
};

export default FocusTrap;