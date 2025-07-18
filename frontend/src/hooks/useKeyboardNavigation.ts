import { useEffect, useCallback } from 'react';

/**
 * 키보드 네비게이션 훅
 * 화살표 키를 사용한 네비게이션을 쉽게 구현할 수 있도록 도움
 */
interface UseKeyboardNavigationOptions {
  /** 네비게이션할 요소들의 CSS 선택자 */
  itemSelector: string;
  /** 컨테이너 요소의 ref 또는 CSS 선택자 */
  containerSelector?: string;
  /** 세로 네비게이션 활성화 */
  enableVertical?: boolean;
  /** 가로 네비게이션 활성화 */
  enableHorizontal?: boolean;
  /** 순환 네비게이션 (끝에서 처음으로) */
  wrap?: boolean;
  /** Escape 키 처리 */
  onEscape?: () => void;
  /** Enter 키 처리 */
  onEnter?: (activeElement: HTMLElement) => void;
}

export const useKeyboardNavigation = ({
  itemSelector,
  containerSelector,
  enableVertical = true,
  enableHorizontal = true,
  wrap = true,
  onEscape,
  onEnter
}: UseKeyboardNavigationOptions) => {
  
  const getContainer = useCallback(() => {
    if (!containerSelector) return document;
    return document.querySelector(containerSelector) || document;
  }, [containerSelector]);

  const getItems = useCallback((): HTMLElement[] => {
    const container = getContainer();
    return Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
  }, [itemSelector, getContainer]);

  const getCurrentIndex = useCallback((): number => {
    const items = getItems();
    const activeElement = document.activeElement as HTMLElement;
    return items.indexOf(activeElement);
  }, [getItems]);

  const focusItem = useCallback((index: number) => {
    const items = getItems();
    if (items[index]) {
      items[index].focus();
    }
  }, [getItems]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const items = getItems();
    if (items.length === 0) return;

    const currentIndex = getCurrentIndex();
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    let shouldPreventDefault = false;

    switch (event.key) {
      case 'ArrowUp':
        if (enableVertical) {
          nextIndex = currentIndex - 1;
          if (nextIndex < 0 && wrap) {
            nextIndex = items.length - 1;
          }
          shouldPreventDefault = true;
        }
        break;

      case 'ArrowDown':
        if (enableVertical) {
          nextIndex = currentIndex + 1;
          if (nextIndex >= items.length && wrap) {
            nextIndex = 0;
          }
          shouldPreventDefault = true;
        }
        break;

      case 'ArrowLeft':
        if (enableHorizontal) {
          nextIndex = currentIndex - 1;
          if (nextIndex < 0 && wrap) {
            nextIndex = items.length - 1;
          }
          shouldPreventDefault = true;
        }
        break;

      case 'ArrowRight':
        if (enableHorizontal) {
          nextIndex = currentIndex + 1;
          if (nextIndex >= items.length && wrap) {
            nextIndex = 0;
          }
          shouldPreventDefault = true;
        }
        break;

      case 'Home':
        nextIndex = 0;
        shouldPreventDefault = true;
        break;

      case 'End':
        nextIndex = items.length - 1;
        shouldPreventDefault = true;
        break;

      case 'Escape':
        if (onEscape) {
          onEscape();
          shouldPreventDefault = true;
        }
        break;

      case 'Enter':
      case ' ':
        if (onEnter) {
          const activeElement = items[currentIndex];
          onEnter(activeElement);
          shouldPreventDefault = true;
        }
        break;
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    // 유효한 인덱스로 포커스 이동
    if (nextIndex >= 0 && nextIndex < items.length && nextIndex !== currentIndex) {
      focusItem(nextIndex);
    }
  }, [
    getItems, 
    getCurrentIndex, 
    focusItem, 
    enableVertical, 
    enableHorizontal, 
    wrap, 
    onEscape, 
    onEnter
  ]);

  useEffect(() => {
    const container = getContainer();
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, getContainer]);

  return {
    focusFirst: () => focusItem(0),
    focusLast: () => focusItem(getItems().length - 1),
    focusItem,
    getCurrentIndex,
    getItems
  };
};