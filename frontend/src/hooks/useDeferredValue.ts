/**
 * React 18 useDeferredValue Hook Wrapper
 * 성능 최적화를 위한 지연된 값 처리
 */

import { useDeferredValue as useReactDeferredValue } from 'react';

/**
 * useDeferredValue wrapper with fallback for React < 18
 * 검색, 필터링 등 빈번한 업데이트가 있는 상황에서 성능 최적화
 */
export function useDeferredValue<T>(value: T): T {
  // React 18의 useDeferredValue 사용
  // 낮은 우선순위로 값을 지연 처리하여 UI 반응성 향상
  try {
    return useReactDeferredValue(value);
  } catch (error) {
    // React 18이 아닌 경우 원본 값 반환
    console.warn('useDeferredValue not available, using original value');
    return value;
  }
}

/**
 * 검색어 지연 처리를 위한 커스텀 훅
 */
export function useDeferredSearchValue(searchValue: string): string {
  return useDeferredValue(searchValue);
}

/**
 * 필터 값 지연 처리를 위한 커스텀 훅
 */
export function useDeferredFilterValue<T>(filterValue: T): T {
  return useDeferredValue(filterValue);
}

export default useDeferredValue;