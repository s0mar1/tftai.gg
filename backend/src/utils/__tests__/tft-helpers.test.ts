import { describe, test, expect } from '@jest/globals';
import { getTraitStyleInfo } from '../tft-helpers';

interface MockTftStaticData {
  traitMap: Map<string, {
    name: string;
    icon: string;
    effects: Array<{
      minUnits: number;
      style: number;
    }>;
  }>;
}

describe('getTraitStyleInfo', () => {
  const mockTftStaticData: MockTftStaticData = {
    traitMap: new Map([
      ['scholar', {
        name: '학자',
        icon: 'scholar.png',
        effects: [
          { minUnits: 2, style: 1 }, // bronze
          { minUnits: 4, style: 3 }, // silver
          { minUnits: 6, style: 5 }, // gold
        ]
      }],
      ['warrior', {
        name: '전사',
        icon: 'warrior.png',
        effects: [
          { minUnits: 2, style: 1 }, // bronze
          { minUnits: 4, style: 3 }, // silver
          { minUnits: 6, style: 5 }, // gold
          { minUnits: 8, style: 6 }, // prismatic
        ]
      }]
    ])
  };

  test('유효한 특성과 유닛 수로 올바른 스타일 정보를 반환해야 함', () => {
    const result = getTraitStyleInfo('scholar', 4, mockTftStaticData);
    
    expect(result).toEqual({
      name: '학자',
      apiName: 'scholar',
      image_url: 'scholar.png',
      tier_current: 4,
      style: 'silver',
      styleOrder: 3
    });
  });

  test('유닛 수가 최소 요구량 미만일 때 inactive를 반환해야 함', () => {
    const result = getTraitStyleInfo('scholar', 1, mockTftStaticData);
    
    expect(result).toEqual({
      name: '학자',
      apiName: 'scholar',
      image_url: 'scholar.png',
      tier_current: 1,
      style: 'inactive',
      styleOrder: 0
    });
  });

  test('최고 티어에 도달했을 때 올바른 스타일을 반환해야 함', () => {
    const result = getTraitStyleInfo('warrior', 8, mockTftStaticData);
    
    expect(result).toEqual({
      name: '전사',
      apiName: 'warrior',
      image_url: 'warrior.png',
      tier_current: 8,
      style: 'prismatic',
      styleOrder: 6
    });
  });

  test('존재하지 않는 특성에 대해 null을 반환해야 함', () => {
    const result = getTraitStyleInfo('nonexistent', 5, mockTftStaticData);
    expect(result).toBeNull();
  });

  test('tftStaticData가 없을 때 null을 반환해야 함', () => {
    const result = getTraitStyleInfo('scholar', 4, null);
    expect(result).toBeNull();
  });

  test('traitMap이 없을 때 null을 반환해야 함', () => {
    const result = getTraitStyleInfo('scholar', 4, {});
    expect(result).toBeNull();
  });

  test('대소문자 구분 없이 동작해야 함', () => {
    const result = getTraitStyleInfo('SCHOLAR', 6, mockTftStaticData);
    
    expect(result).toEqual({
      name: '학자',
      apiName: 'SCHOLAR',
      image_url: 'scholar.png',
      tier_current: 6,
      style: 'gold',
      styleOrder: 4
    });
  });
});