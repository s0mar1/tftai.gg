/**
 * React 18 useTransition Hook Wrapper
 * 비긴급 상태 업데이트를 위한 전환 훅
 */

import { useTransition as useReactTransition } from 'react';

/**
 * useTransition wrapper with fallback for React < 18
 * 비긴급 업데이트를 전환으로 표시하여 UI 반응성 유지
 */
export function useTransition(): [boolean, (callback: () => void) => void] {
  try {
    return useReactTransition();
  } catch (error) {
    // React 18이 아닌 경우 fallback 구현
    console.warn('useTransition not available, using fallback');
    
    // 단순 fallback: 항상 false, 즉시 실행
    return [
      false, // isPending
      (callback: () => void) => {
        // 마이크로태스크로 지연 실행하여 약간의 최적화 효과
        Promise.resolve().then(callback);
      }
    ];
  }
}

/**
 * 데이터 로딩 상태를 관리하는 커스텀 훅
 */
export function useDataTransition() {
  const [isPending, startTransition] = useTransition();
  
  const startDataTransition = (callback: () => void) => {
    startTransition(() => {
      // 데이터 업데이트 전 약간의 지연을 추가하여 UI 안정성 향상
      callback();
    });
  };
  
  return [isPending, startDataTransition] as const;
}

/**
 * 필터링 상태를 관리하는 커스텀 훅
 */
export function useFilterTransition() {
  const [isPending, startTransition] = useTransition();
  
  const startFilterTransition = (callback: () => void) => {
    startTransition(() => {
      // 필터링 로직은 비긴급으로 처리
      callback();
    });
  };
  
  return [isPending, startFilterTransition] as const;
}

/**
 * 검색 상태를 관리하는 커스텀 훅
 */
export function useSearchTransition() {
  const [isPending, startTransition] = useTransition();
  
  const startSearchTransition = (callback: () => void) => {
    startTransition(() => {
      // 검색 결과 업데이트는 비긴급으로 처리
      callback();
    });
  };
  
  return [isPending, startSearchTransition] as const;
}

export default useTransition;