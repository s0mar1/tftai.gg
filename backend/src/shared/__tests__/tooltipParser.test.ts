// shared/src/__tests__/tooltipParser.test.ts

import {
  buildVariableMap,
  formatValuesByStar,
  replacePlaceholders,
  getStructuredValues
} from '../tooltipParser';

// 테스트용 타입 정의
interface Variable {
  name: string;
  value: number[];
}

interface ChampionStats {
  health: number;
  damage: number;
  ap: number;
  armor: number;
  attackSpeed: number;
  mana: number;
  [key: string]: number;
}

describe('TooltipParser', () => {
  describe('buildVariableMap', () => {
    it('should build variable map correctly', () => {
      const variables: Variable[] = [
        { name: '@Damage@', value: [0, 100, 150, 200] },
        { name: '@Heal@', value: [0, 50, 75, 100] },
        { name: '@Duration@', value: [0, 2, 2.5, 3] }
      ];

      const map = buildVariableMap(variables);

      expect(map.size).toBe(3);
      expect(map.has('damage')).toBe(true);
      expect(map.has('heal')).toBe(true);
      expect(map.has('duration')).toBe(true);
      expect(map.get('damage')?.value).toEqual([0, 100, 150, 200]);
    });

    it('should handle empty variables array', () => {
      const map = buildVariableMap([]);
      expect(map.size).toBe(0);
    });

    it('should handle undefined variables', () => {
      const map = buildVariableMap(undefined as any);
      expect(map.size).toBe(0);
    });

    it('should convert variable names to lowercase', () => {
      const variables: Variable[] = [
        { name: '@DAMAGE@', value: [0, 100, 150, 200] },
        { name: '@HeAlDaMaGe@', value: [0, 50, 75, 100] }
      ];

      const map = buildVariableMap(variables);

      expect(map.has('damage')).toBe(true);
      expect(map.has('healdamage')).toBe(true);
      expect(map.has('DAMAGE')).toBe(false);
    });
  });

  describe('formatValuesByStar', () => {
    it('should format values correctly for star levels', () => {
      const values = [0, 100, 150, 200];
      const result = formatValuesByStar(values, false);
      expect(result).toBe('100 / 150 / 200');
    });

    it('should format percentage values correctly', () => {
      const values = [0, 0.1, 0.15, 0.2];
      const result = formatValuesByStar(values, true);
      expect(result).toBe('0.1% / 0.15% / 0.2%');
    });

    it('should handle single value array', () => {
      const values = [100];
      const result = formatValuesByStar(values, false);
      expect(result).toBe('');
    });

    it('should handle empty array', () => {
      const values: number[] = [];
      const result = formatValuesByStar(values, false);
      expect(result).toBe('0');
    });

    it('should handle percentage empty array', () => {
      const values: number[] = [];
      const result = formatValuesByStar(values, true);
      expect(result).toBe('0%');
    });

    it('should round values correctly', () => {
      const values = [0, 100.666, 150.333, 200.999];
      const result = formatValuesByStar(values, false);
      expect(result).toBe('100.67 / 150.33 / 201');
    });
  });

  describe('replacePlaceholders', () => {
    const mockChampionStats: ChampionStats = {
      health: 800,
      damage: 60,
      ap: 0,
      armor: 40,
      attackSpeed: 0.7,
      mana: 100
    };

    it('should replace single placeholder correctly', () => {
      const variables: Variable[] = [
        { name: '@Damage@', value: [0, 100, 150, 200] }
      ];
      const varMap = buildVariableMap(variables);
      const description = 'Deals @Damage@ magic damage.';

      const result = replacePlaceholders(description, varMap, mockChampionStats);
      expect(result).toBe('Deals 100 / 150 / 200 magic damage.');
    });

    it('should replace multiple placeholders correctly', () => {
      const variables: Variable[] = [
        { name: '@Damage@', value: [0, 100, 150, 200] },
        { name: '@Heal@', value: [0, 50, 75, 100] }
      ];
      const varMap = buildVariableMap(variables);
      const description = 'Deals @Damage@ damage and heals @Heal@.';

      const result = replacePlaceholders(description, varMap, mockChampionStats);
      expect(result).toBe('Deals 100 / 150 / 200 damage and heals 50 / 75 / 100.');
    });

    it('should handle percentage variables', () => {
      const variables: Variable[] = [
        { name: '@DamagePercent@', value: [0, 0.1, 0.15, 0.2] }
      ];
      const varMap = buildVariableMap(variables);
      const description = 'Deals @DamagePercent@ of target health.';

      const result = replacePlaceholders(description, varMap, mockChampionStats);
      expect(result).toBe('Deals 0.1% / 0.15% / 0.2% of target health.');
    });

    it('should handle missing variables gracefully', () => {
      const variables: Variable[] = [
        { name: '@Damage@', value: [0, 100, 150, 200] }
      ];
      const varMap = buildVariableMap(variables);
      const description = 'Deals @Damage@ damage and @MissingVar@.';

      const result = replacePlaceholders(description, varMap, mockChampionStats);
      expect(result).toBe('Deals 100 / 150 / 200 damage and [?].');
    });

    it('should handle different placeholder formats', () => {
      const variables: Variable[] = [
        { name: '@Damage@', value: [0, 100, 150, 200] }
      ];
      const varMap = buildVariableMap(variables);
      const description = 'Deals {@Damage@} or @Damage@ damage.';

      const result = replacePlaceholders(description, varMap, mockChampionStats);
      expect(result).toBe('Deals 100 / 150 / 200 or 100 / 150 / 200 damage.');
    });

    it('should handle empty description', () => {
      const varMap = new Map();
      const result = replacePlaceholders('', varMap, mockChampionStats);
      expect(result).toBe('');
    });
  });

  describe('getStructuredValues', () => {
    it('should extract structured values correctly', () => {
      const variables: Variable[] = [
        { name: '@Damage@', value: [0, 100, 150, 200] },
        { name: '@Heal@', value: [0, 50, 75, 100] },
        { name: '@UnusedVar@', value: [0, 10, 20, 30] } // 설명에 사용되지 않음
      ];
      const description = 'Deals @Damage@ magic damage and heals @Heal@ health.';

      const result = getStructuredValues(variables, description);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: '피해량',
        value: '100 / 150 / 200',
        scaling: null
      });
      expect(result[1]).toEqual({
        label: '체력 회복량',
        value: '50 / 75 / 100',
        scaling: null
      });
    });

    it('should detect scaling types correctly', () => {
      const variables: Variable[] = [
        { name: '@APRatio@', value: [0, 0.5, 0.75, 1.0] },
        { name: '@ADDamage@', value: [0, 100, 150, 200] }
      ];
      const description = 'Deals @APRatio@ and @ADDamage@ damage.';

      const result = getStructuredValues(variables, description);

      expect(result).toHaveLength(2);
      expect(result[0]?.scaling).toBe('AP');
      expect(result[1]?.scaling).toBe('AD');
    });

    it('should handle percentage variables in structured values', () => {
      const variables: Variable[] = [
        { name: '@DamagePercent@', value: [0, 0.1, 0.15, 0.2] }
      ];
      const description = 'Deals @DamagePercent@ of target health.';

      const result = getStructuredValues(variables, description);

      expect(result).toHaveLength(1);
      expect(result[0]?.value).toBe('0.1% / 0.15% / 0.2%');
    });

    it('should use custom labels when available', () => {
      const variables: Variable[] = [
        { name: '@Duration@', value: [0, 2, 2.5, 3] },
        { name: '@CustomVar@', value: [0, 100, 150, 200] }
      ];
      const description = 'Lasts @Duration@ and has @CustomVar@ effect.';

      const result = getStructuredValues(variables, description);

      expect(result).toHaveLength(2);
      expect(result[0]?.label).toBe('지속 시간');
      expect(result[1]?.label).toBe('CustomVar'); // 미정의 라벨은 변수명 사용
    });

    it('should handle empty variables array', () => {
      const result = getStructuredValues([], 'Some description');
      expect(result).toHaveLength(0);
    });

    it('should handle undefined variables', () => {
      const result = getStructuredValues(undefined as any, 'Some description');
      expect(result).toHaveLength(0);
    });
  });
});