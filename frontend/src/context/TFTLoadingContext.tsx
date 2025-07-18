import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';

/**
 * TFT 로딩 상태 Context
 * - 전역 로딩 상태 관리
 * - 에러 상태 관리
 * - 재시도 기능
 */

interface LoadingState {
  [key: string]: boolean;
}

interface ErrorState {
  [key: string]: string | null;
}

// 컨텍스트 값 타입
interface TFTLoadingContextValue {
  loading: LoadingState;
  errors: ErrorState;
  isLoading: (key: string) => boolean;
  setLoading: (key: string, loading: boolean) => void;
  getError: (key: string) => string | null;
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  hasAnyLoading: boolean;
  hasAnyError: boolean;
}

// 기본값
const defaultLoadingValue: TFTLoadingContextValue = {
  loading: {},
  errors: {},
  isLoading: () => false,
  setLoading: () => {},
  getError: () => null,
  setError: () => {},
  clearError: () => {},
  clearAllErrors: () => {},
  hasAnyLoading: false,
  hasAnyError: false,
};

export const TFTLoadingContext = createContext<TFTLoadingContextValue>(defaultLoadingValue);

export const useTFTLoading = (): TFTLoadingContextValue => {
  const context = useContext(TFTLoadingContext);
  
  if (!context) {
    console.error('❌ useTFTLoading: context가 undefined입니다!');
    return defaultLoadingValue;
  }
  
  return context;
};

// 특정 기능별 로딩 상태를 위한 편의 훅들
export const useAPILoading = (apiKey: string) => {
  const { isLoading, setLoading, getError, setError, clearError } = useTFTLoading();
  
  return {
    loading: isLoading(apiKey),
    error: getError(apiKey),
    setLoading: (loading: boolean) => setLoading(apiKey, loading),
    setError: (error: string | null) => setError(apiKey, error),
    clearError: () => clearError(apiKey),
  };
};

interface TFTLoadingProviderProps {
  children: React.ReactNode;
}

export const TFTLoadingProvider: React.FC<TFTLoadingProviderProps> = ({ children }) => {
  const [loading, setLoadingState] = useState<LoadingState>({});
  const [errors, setErrorsState] = useState<ErrorState>({});

  // 개별 로딩 상태 확인
  const isLoading = useCallback((key: string): boolean => {
    return loading[key] || false;
  }, [loading]);

  // 개별 로딩 상태 설정
  const setLoading = useCallback((key: string, loadingState: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: loadingState
    }));
  }, []);

  // 개별 에러 상태 확인
  const getError = useCallback((key: string): string | null => {
    return errors[key] || null;
  }, [errors]);

  // 개별 에러 상태 설정
  const setError = useCallback((key: string, error: string | null) => {
    setErrorsState(prev => ({
      ...prev,
      [key]: error
    }));
  }, []);

  // 개별 에러 클리어
  const clearError = useCallback((key: string) => {
    setErrorsState(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  // 모든 에러 클리어
  const clearAllErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  // 전체 상태 요약
  const hasAnyLoading = useMemo(() => {
    return Object.values(loading).some(Boolean);
  }, [loading]);

  const hasAnyError = useMemo(() => {
    return Object.values(errors).some(error => error !== null);
  }, [errors]);

  const value = useMemo(() => ({
    loading,
    errors,
    isLoading,
    setLoading,
    getError,
    setError,
    clearError,
    clearAllErrors,
    hasAnyLoading,
    hasAnyError,
  }), [
    loading,
    errors,
    isLoading,
    setLoading,
    getError,
    setError,
    clearError,
    clearAllErrors,
    hasAnyLoading,
    hasAnyError,
  ]);

  return (
    <TFTLoadingContext.Provider value={value}>
      {children}
    </TFTLoadingContext.Provider>
  );
};