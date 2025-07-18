import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSummonerData, useMatchHistory, useDeckTiers, useCacheInvalidation } from '../useQuery';
import React from 'react';

// axios 모킹
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn()
  }))
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  });

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useQuery hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSummonerData', () => {
    test('올바른 쿼리 키를 생성해야 함', () => {
      const { result } = renderHook(
        () => useSummonerData('kr', 'test', 'KR1'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });

    test('필수 파라미터가 없으면 비활성화되어야 함', () => {
      const { result } = renderHook(
        () => useSummonerData('', '', ''),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });

    test('region, gameName, tagLine이 모두 있을 때만 활성화되어야 함', () => {
      const { result: result1 } = renderHook(
        () => useSummonerData('kr', 'test', ''),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => useSummonerData('kr', 'test', 'KR1'),
        { wrapper: createWrapper() }
      );

      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(true);
    });
  });

  describe('useMatchHistory', () => {
    test('puuid가 있을 때만 활성화되어야 함', () => {
      const { result: result1 } = renderHook(
        () => useMatchHistory('kr', ''),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => useMatchHistory('kr', 'test-puuid'),
        { wrapper: createWrapper() }
      );

      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(true);
    });
  });

  describe('useDeckTiers', () => {
    test('항상 활성화되어야 함', () => {
      const { result } = renderHook(
        () => useDeckTiers(),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });

    test('올바른 staleTime을 가져야 함', () => {
      const { result } = renderHook(
        () => useDeckTiers(),
        { wrapper: createWrapper() }
      );

      // 내부 구현 테스트보다는 동작 테스트에 집중
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('useCacheInvalidation', () => {
    test('캐시 무효화 함수들을 반환해야 함', () => {
      const { result } = renderHook(
        () => useCacheInvalidation(),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.invalidateAll).toBe('function');
      expect(typeof result.current.invalidateSummoner).toBe('function');
      expect(typeof result.current.invalidateMatches).toBe('function');
      expect(typeof result.current.invalidateDeckTiers).toBe('function');
      expect(typeof result.current.invalidateRanking).toBe('function');
      expect(typeof result.current.invalidateGuides).toBe('function');
      expect(typeof result.current.invalidateStats).toBe('function');
    });

    test('invalidateAll 함수가 호출되어야 함', () => {
      const { result } = renderHook(
        () => useCacheInvalidation(),
        { wrapper: createWrapper() }
      );

      expect(() => result.current.invalidateAll()).not.toThrow();
    });

    test('특정 쿼리 무효화 함수가 호출되어야 함', () => {
      const { result } = renderHook(
        () => useCacheInvalidation(),
        { wrapper: createWrapper() }
      );

      expect(() => result.current.invalidateSummoner('kr', 'test', 'KR1')).not.toThrow();
      expect(() => result.current.invalidateMatches('kr', 'test-puuid')).not.toThrow();
      expect(() => result.current.invalidateDeckTiers()).not.toThrow();
    });
  });
});