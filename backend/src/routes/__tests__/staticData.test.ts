import { describe, test, expect } from '@jest/globals';

describe('Static Data API', () => {test('기본 테스트 - 정규화 함수 테스트', () => {
    const normalizeName = (name: string | null): string => {
      return (name || '').toLowerCase().replace(/[\s.'']/g, '');
    };

    expect(normalizeName('Test Item')).toBe('testitem');
    expect(normalizeName("Hunter's Edge")).toBe('huntersedge');
    expect(normalizeName('B.F. Sword')).toBe('bfsword');
    expect(normalizeName('')).toBe('');
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });
});