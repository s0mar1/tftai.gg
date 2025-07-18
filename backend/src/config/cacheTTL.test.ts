// backend/src/config/cacheTTL.test.ts
import { validateTTL} from './cacheTTL';

describe('validateTTL', () => {
  // 1. 유효한 TTL 값이 주어졌을 때, 그 값을 그대로 반환해야 한다.
  test('should return the TTL itself if it is a valid number', () => {
    expect(validateTTL(60)).toBe(60);
    expect(validateTTL(3600)).toBe(3600);
  });

  // 2. TTL 값이 0이거나 음수일 때, 기본 TTL 값을 반환해야 한다.
  test('should return the default TTL if the TTL is 0 or negative', () => {
    expect(validateTTL(0)).toBe(CACHE_TTL.DEFAULT);
    expect(validateTTL(-100)).toBe(CACHE_TTL.DEFAULT);
  });

  // 3. TTL 값이 숫자가 아닐 때 (null, undefined), 기본 TTL 값을 반환해야 한다.
  test('should return the default TTL if the TTL is not a number', () => {
    expect(validateTTL(null)).toBe(CACHE_TTL.DEFAULT);
    expect(validateTTL(undefined)).toBe(CACHE_TTL.DEFAULT);
  });

  // 4. TTL 값이 너무 클 때, 최대 TTL 값으로 제한해야 한다.
  test('should return the MAX_TTL if the TTL is too large', () => {
    const veryLargeTTL = 3600 * 24 * 31; // 31일
    const MAX_TTL = 3600 * 24 * 30; // 30일
    expect(validateTTL(veryLargeTTL)).toBe(MAX_TTL);
  });

  // 5. TTL 값이 주어지지 않았을 때, 기본 TTL 값을 반환해야 한다.
  test('should return the default TTL if no TTL is provided', () => {
    // @ts-ignore - 테스트를 위해 의도적으로 undefined 전달
    expect(validateTTL()).toBe(CACHE_TTL.DEFAULT);
  });
});
