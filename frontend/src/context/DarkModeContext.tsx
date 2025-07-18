import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';

// DarkMode Context 타입 정의
interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

// Context 생성
const DarkModeContext = createContext<DarkModeContextType | null>(null);

// Provider Props 타입
interface DarkModeProviderProps {
  children: ReactNode;
}

// 초기값 계산 함수 (한 번만 실행)
const getInitialDarkMode = (): boolean => {
  try {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    
    // 저장된 설정이 없으면 시스템 설정 따르기
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    return false;
  } catch (error) {
    console.warn('DarkModeContext: localStorage 접근 실패, 기본값 사용');
    return false;
  }
};

// DarkMode Provider 컴포넌트 (성능 최적화)
export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({ children }) => {
  // localStorage에서 초기값 읽어오기 (최적화됨)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialDarkMode);

  // 다크모드 상태가 변경될 때마다 DOM과 localStorage 업데이트 (debounced)
  useEffect(() => {
    // DOM 업데이트
    const rootElement = document.documentElement;
    if (isDarkMode) {
      rootElement.classList.add('dark');
    } else {
      rootElement.classList.remove('dark');
    }
    
    // localStorage 업데이트 (비동기적으로 처리)
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('darkMode', isDarkMode.toString());
      } catch (error) {
        console.warn('DarkModeContext: localStorage 저장 실패');
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isDarkMode]);

  // 시스템 테마 변경 감지 (최적화됨)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // 사용자가 수동으로 설정한 값이 없을 때만 시스템 설정 따르기
      try {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === null) {
          setIsDarkMode(e.matches);
        }
      } catch (error) {
        console.warn('DarkModeContext: localStorage 접근 실패');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // 다크모드 토글 함수 (메모이제이션)
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // 다크모드 직접 설정 함수 (메모이제이션)
  const setDarkMode = useCallback((isDark: boolean) => {
    setIsDarkMode(isDark);
  }, []);

  // Context value 메모이제이션
  const value = useMemo((): DarkModeContextType => ({
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
  }), [isDarkMode, toggleDarkMode, setDarkMode]);

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
};

// useDarkMode Hook
export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  
  return context;
};

// Context 기본 export (다른 컴포넌트에서 직접 사용할 경우)
export default DarkModeContext;