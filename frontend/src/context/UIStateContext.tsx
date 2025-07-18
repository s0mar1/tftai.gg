import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useReducer } from 'react';

// UI State 타입 정의
interface UIState {
  showPerformanceDashboard: boolean;
  showDebugInfo: boolean;
  sidebarCollapsed: boolean;
  notifications: Array<{ id: string; message: string; type: 'info' | 'warning' | 'error' }>;
}

// UI State Action 타입
type UIStateAction = 
  | { type: 'TOGGLE_PERFORMANCE_DASHBOARD' }
  | { type: 'SET_PERFORMANCE_DASHBOARD'; payload: boolean }
  | { type: 'TOGGLE_DEBUG_INFO' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<UIState['notifications'][0], 'id'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

// UI State Context 타입
interface UIStateContextType {
  uiState: UIState;
  togglePerformanceDashboard: () => void;
  setPerformanceDashboard: (show: boolean) => void;
  toggleDebugInfo: () => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// 초기 상태 생성 함수
const createInitialState = (): UIState => {
  const isDevMode = import.meta.env.MODE === 'development';
  
  try {
    const savedPerformanceDashboard = localStorage.getItem('showPerformanceDashboard');
    const savedDebugInfo = localStorage.getItem('showDebugInfo');
    const savedSidebarCollapsed = localStorage.getItem('sidebarCollapsed');
    
    return {
      showPerformanceDashboard: isDevMode && savedPerformanceDashboard === 'true',
      showDebugInfo: isDevMode && savedDebugInfo === 'true',
      sidebarCollapsed: savedSidebarCollapsed === 'true',
      notifications: [],
    };
  } catch (error) {
    console.warn('UIStateContext: localStorage 접근 실패, 기본값 사용');
    return {
      showPerformanceDashboard: false,
      showDebugInfo: false,
      sidebarCollapsed: false,
      notifications: [],
    };
  }
};

// UI State Reducer (성능 최적화)
const uiStateReducer = (state: UIState, action: UIStateAction): UIState => {
  switch (action.type) {
    case 'TOGGLE_PERFORMANCE_DASHBOARD':
      return {
        ...state,
        showPerformanceDashboard: !state.showPerformanceDashboard,
      };
    
    case 'SET_PERFORMANCE_DASHBOARD':
      return {
        ...state,
        showPerformanceDashboard: action.payload,
      };
    
    case 'TOGGLE_DEBUG_INFO':
      return {
        ...state,
        showDebugInfo: !state.showDebugInfo,
      };
    
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };
    
    case 'ADD_NOTIFICATION':
      const newNotification = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      return {
        ...state,
        notifications: [...state.notifications, newNotification],
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    
    default:
      return state;
  }
};

// Context 생성
const UIStateContext = createContext<UIStateContextType | null>(null);

// Provider Props 타입
interface UIStateProviderProps {
  children: ReactNode;
}

// UI State Provider 컴포넌트 (성능 최적화)
export const UIStateProvider: React.FC<UIStateProviderProps> = ({ children }) => {
  // useReducer로 상태 관리 최적화
  const [uiState, dispatch] = useReducer(uiStateReducer, null, createInitialState);

  // Performance Dashboard 키보드 단축키 설정 (메모이제이션)
  const togglePerformanceDashboard = useCallback(() => {
    dispatch({ type: 'TOGGLE_PERFORMANCE_DASHBOARD' });
  }, []);

  useEffect(() => {
    if (import.meta.env.MODE !== 'development') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        togglePerformanceDashboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePerformanceDashboard]);

  // localStorage 업데이트 (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('showPerformanceDashboard', uiState.showPerformanceDashboard.toString());
        localStorage.setItem('showDebugInfo', uiState.showDebugInfo.toString());
        localStorage.setItem('sidebarCollapsed', uiState.sidebarCollapsed.toString());
      } catch (error) {
        console.warn('UIStateContext: localStorage 저장 실패');
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [uiState.showPerformanceDashboard, uiState.showDebugInfo, uiState.sidebarCollapsed]);

  // 메모이제이션된 액션 함수들
  const setPerformanceDashboard = useCallback((show: boolean) => {
    dispatch({ type: 'SET_PERFORMANCE_DASHBOARD', payload: show });
  }, []);

  const toggleDebugInfo = useCallback(() => {
    dispatch({ type: 'TOGGLE_DEBUG_INFO' });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const addNotification = useCallback((notification: Omit<UIState['notifications'][0], 'id'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  // Context value 메모이제이션
  const value = useMemo((): UIStateContextType => ({
    uiState,
    togglePerformanceDashboard,
    setPerformanceDashboard,
    toggleDebugInfo,
    toggleSidebar,
    addNotification,
    removeNotification,
    clearNotifications,
  }), [
    uiState,
    togglePerformanceDashboard,
    setPerformanceDashboard,
    toggleDebugInfo,
    toggleSidebar,
    addNotification,
    removeNotification,
    clearNotifications,
  ]);

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
};

// useUIState Hook
export const useUIState = (): UIStateContextType => {
  const context = useContext(UIStateContext);
  
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  
  return context;
};

// 개별 상태를 위한 편의 hooks
export const usePerformanceDashboard = () => {
  const { uiState, togglePerformanceDashboard, setPerformanceDashboard } = useUIState();
  return {
    showPerformanceDashboard: uiState.showPerformanceDashboard,
    togglePerformanceDashboard,
    setPerformanceDashboard,
  };
};

export const useNotifications = () => {
  const { uiState, addNotification, removeNotification } = useUIState();
  return {
    notifications: uiState.notifications || [],
    addNotification,
    removeNotification,
  };
};

// Context 기본 export
export default UIStateContext;