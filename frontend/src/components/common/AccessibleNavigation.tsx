import React, { useRef, useEffect, useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import { 
  useResponsiveInfo,
  usePrefersReducedMotion 
} from '../../utils/responsiveEnhancements';

// 네비게이션 아이템 타입
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  ariaLabel?: string;
  shortcut?: string;
  disabled?: boolean;
}

export interface AccessibleNavigationProps {
  items: NavigationItem[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  enableKeyboardNavigation?: boolean;
  enableShortcuts?: boolean;
  enableFocusTrapping?: boolean;
  onItemSelect?: (item: NavigationItem) => void;
  ariaLabel?: string;
}

const AccessibleNavigation: React.FC<AccessibleNavigationProps> = ({
  items,
  className,
  orientation = 'horizontal',
  enableKeyboardNavigation = true,
  enableShortcuts = true,
  enableFocusTrapping = false,
  onItemSelect,
  ariaLabel = '메인 네비게이션',
}) => {
  const { isTouchDevice } = useResponsiveInfo();
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // 키보드 네비게이션 핸들러
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardNavigation || items.length === 0) return;

    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (event.key) {
      case nextKey:
        event.preventDefault();
        setIsNavigating(true);
        const nextIndex = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
        break;

      case prevKey:
        event.preventDefault();
        setIsNavigating(true);
        const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : items.length - 1;
        setFocusedIndex(prevIndex);
        itemRefs.current[prevIndex]?.focus();
        break;

      case 'Home':
        event.preventDefault();
        setIsNavigating(true);
        setFocusedIndex(0);
        itemRefs.current[0]?.focus();
        break;

      case 'End':
        event.preventDefault();
        setIsNavigating(true);
        const lastIndex = items.length - 1;
        setFocusedIndex(lastIndex);
        itemRefs.current[lastIndex]?.focus();
        break;

      case 'Enter':
      case ' ':
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          event.preventDefault();
          const item = items[focusedIndex];
          if (!item.disabled) {
            onItemSelect?.(item);
            itemRefs.current[focusedIndex]?.click();
          }
        }
        break;

      case 'Escape':
        if (enableFocusTrapping) {
          event.preventDefault();
          setFocusedIndex(-1);
          navRef.current?.blur();
        }
        break;
    }
  }, [enableKeyboardNavigation, items, orientation, focusedIndex, enableFocusTrapping, onItemSelect]);

  // 단축키 핸들러
  const handleShortcuts = useCallback((event: KeyboardEvent) => {
    if (!enableShortcuts) return;

    // Alt + 숫자 단축키
    if (event.altKey && event.key >= '1' && event.key <= '9') {
      const index = parseInt(event.key) - 1;
      if (index < items.length && !items[index].disabled) {
        event.preventDefault();
        onItemSelect?.(items[index]);
        itemRefs.current[index]?.click();
      }
    }

    // 개별 아이템 단축키
    items.forEach((item, index) => {
      if (item.shortcut && event.key.toLowerCase() === item.shortcut.toLowerCase() && event.altKey) {
        if (!item.disabled) {
          event.preventDefault();
          onItemSelect?.(item);
          itemRefs.current[index]?.click();
        }
      }
    });
  }, [enableShortcuts, items, onItemSelect]);

  // 이벤트 리스너 등록
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    nav.addEventListener('keydown', handleKeyDown);
    
    if (enableShortcuts) {
      document.addEventListener('keydown', handleShortcuts);
    }

    return () => {
      nav.removeEventListener('keydown', handleKeyDown);
      if (enableShortcuts) {
        document.removeEventListener('keydown', handleShortcuts);
      }
    };
  }, [handleKeyDown, handleShortcuts, enableShortcuts]);

  // 포커스 관리
  const handleItemFocus = useCallback((index: number) => {
    if (!isNavigating) {
      setFocusedIndex(index);
    }
  }, [isNavigating]);

  const handleItemBlur = useCallback(() => {
    // 약간의 지연을 두어 다른 네비게이션 아이템으로 포커스가 이동하는지 확인
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isStillInNav = navRef.current?.contains(activeElement);
      
      if (!isStillInNav) {
        setFocusedIndex(-1);
        setIsNavigating(false);
      }
    }, 0);
  }, []);

  // 마우스 상호작용
  const handleMouseEnter = useCallback(() => {
    setIsNavigating(false);
  }, []);

  // 네비게이션 링크 렌더링
  const renderNavItem = (item: NavigationItem, index: number) => {
    const isFocused = focusedIndex === index;
    const IconComponent = item.icon;

    return (
      <NavLink
        key={item.id}
        ref={(el) => (itemRefs.current[index] = el)}
        to={item.href}
        className={({ isActive }) =>
          classNames(
            // 기본 스타일
            'relative px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2',
            
            // 상태별 스타일
            {
              // 활성 상태
              'text-brand-mint bg-brand-mint/10': isActive,
              'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary': !isActive,
              
              // 비활성화 상태
              'opacity-50 cursor-not-allowed pointer-events-none': item.disabled,
              
              // 터치 최적화
              'min-h-[44px] min-w-[44px] flex items-center justify-center': isTouchDevice,
              
              // 포커스 스타일
              'ring-2 ring-brand-mint ring-offset-2': isFocused && enableKeyboardNavigation,
              
              // 모션 감소
              'transition-none': prefersReducedMotion,
              
              // 호버 효과
              'hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100': !item.disabled,
            }
          )
        }
        tabIndex={enableKeyboardNavigation ? (index === 0 ? 0 : -1) : 0}
        role="menuitem"
        aria-label={item.ariaLabel || item.label}
        aria-disabled={item.disabled}
        onFocus={() => handleItemFocus(index)}
        onBlur={handleItemBlur}
        onMouseEnter={handleMouseEnter}
        onClick={(e) => {
          if (item.disabled) {
            e.preventDefault();
            return;
          }
          onItemSelect?.(item);
        }}
      >
        <span className="flex items-center gap-2">
          {IconComponent && (
            <IconComponent 
              className={classNames(
                'w-4 h-4 flex-shrink-0',
                {
                  'w-5 h-5': isTouchDevice,
                }
              )}
              aria-hidden="true"
            />
          )}
          <span className={classNames(
            'truncate',
            {
              'sr-only': isTouchDevice && IconComponent, // 터치 디바이스에서 아이콘만 표시
            }
          )}>
            {item.label}
          </span>
          
          {/* 단축키 표시 */}
          {item.shortcut && !isTouchDevice && (
            <kbd className="ml-auto text-xs bg-tft-gray-200 dark:bg-dark-tft-gray-200 px-1.5 py-0.5 rounded">
              Alt+{item.shortcut}
            </kbd>
          )}
        </span>

        {/* 포커스 인디케이터 */}
        {isFocused && enableKeyboardNavigation && (
          <span 
            className={classNames(
              'absolute inset-0 border-2 border-brand-mint rounded-md pointer-events-none',
              {
                'transition-none': prefersReducedMotion,
                'transition-all duration-200': !prefersReducedMotion,
              }
            )}
            aria-hidden="true"
          />
        )}
      </NavLink>
    );
  };

  return (
    <nav
      ref={navRef}
      className={classNames(
        'focus:outline-none',
        {
          'flex flex-wrap gap-1': orientation === 'horizontal',
          'flex flex-col space-y-1': orientation === 'vertical',
        },
        className
      )}
      role="menubar"
      aria-label={ariaLabel}
      aria-orientation={orientation}
    >
      {items.map((item, index) => renderNavItem(item, index))}
      
      {/* 스크린 리더용 단축키 안내 */}
      <div className="sr-only">
        <p>키보드 네비게이션: 화살표 키로 이동, Enter 또는 Space로 선택</p>
        {enableShortcuts && (
          <p>단축키: Alt + 숫자 키 또는 Alt + 문자 키로 빠른 이동</p>
        )}
      </div>
    </nav>
  );
};

// Skip Link 컴포넌트 (접근성 향상)
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ 
  href, 
  children, 
  className 
}) => {
  return (
    <a
      href={href}
      className={classNames(
        // 기본적으로 숨김, 포커스 시에만 표시
        'sr-only focus:not-sr-only',
        'absolute top-0 left-0 z-50',
        'bg-brand-mint text-white px-4 py-2 rounded-br-md',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
        'transition-all duration-200',
        className
      )}
      tabIndex={0}
    >
      {children}
    </a>
  );
};

// 포커스 트랩 컴포넌트
interface FocusTrapProps {
  children: React.ReactNode;
  enabled?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  returnFocus?: React.RefObject<HTMLElement>;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  enabled = true,
  initialFocus,
  returnFocus,
}) => {
  const trapRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !trapRef.current) return;

    const trap = trapRef.current;
    const focusableElements = trap.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // 이전 포커스 저장
    previousFocus.current = document.activeElement as HTMLElement;

    // 초기 포커스 설정
    if (initialFocus?.current) {
      initialFocus.current.focus();
    } else if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    trap.addEventListener('keydown', handleTabKey);

    return () => {
      trap.removeEventListener('keydown', handleTabKey);
      
      // 포커스 복원
      if (returnFocus?.current) {
        returnFocus.current.focus();
      } else if (previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [enabled, initialFocus, returnFocus]);

  return (
    <div 
      ref={trapRef}
      className="focus-trap"
    >
      {children}
    </div>
  );
};

export default AccessibleNavigation;