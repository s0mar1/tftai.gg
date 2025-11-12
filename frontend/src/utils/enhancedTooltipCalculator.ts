/**
 * 개선된 툴팁 수치 계산기
 * 롤체지지 스타일의 정확한 수치 표시 및 스킬 타입 결정
 */

import { Champion, Item } from '../types';

// 정확한 TFT Set 15 별 레벨 배율
const STAR_MULTIPLIERS = {
  health: [1.0, 1.8, 3.24],     // 체력 배율
  damage: [1.0, 1.8, 3.24],    // 공격력 배율
  ability: [1.0, 1.65, 2.5],   // 스킬 배율 (일반적)
  mana: [1.0, 1.0, 1.0]        // 마나는 별 레벨과 무관
};

// 개선된 전투 스탯 인터페이스
interface EnhancedCombatStats {
  // 기본 스탯
  health: number;
  mana: number;
  armor: number;
  magicResist: number;
  attackDamage: number;
  attackSpeed: number;
  abilityPower: number;
  critChance: number;
  critDamage: number;
  
  // 파생 스탯
  effectiveHealth: number;      // 유효 체력 (방어력 포함)
  dps: number;                 // 기본 DPS
  burstPotential: number;      // 스킬 버스트 잠재력
  
  // 메타 정보
  starLevel: number;
  itemCount: number;
  hasAP: boolean;              // AP 아이템 보유 여부
  hasAD: boolean;              // AD 아이템 보유 여부
  hasTank: boolean;            // 탱킹 아이템 보유 여부
}

// 스킬 수치 계산 결과
interface SkillCalculation {
  baseValues: number[];        // [1성, 2성, 3성] 기본 수치
  scaledValues: number[];      // 스케일링 적용된 수치 
  currentValue: number;        // 현재 별 레벨의 최종 수치
  scalingInfo: {
    type: 'AP' | 'AD' | 'HP' | 'HYBRID' | 'NONE';
    coefficient: number;       // 스케일링 계수
    bonus: number;            // 추가 스케일링 수치
  };
  displayFormat: {
    main: string;             // 메인 표시 수치 "350"
    breakdown: string;        // 전체 레벨별 "[350 / 400 / 625]" 
    withScaling: string;      // 스케일링 포함 "350 (+25)"
  };
}

/**
 * 개선된 전투 스탯 계산
 */
export function calculateEnhancedCombatStats(
  champion: Champion,
  items: Item[] = [],
  starLevel: number = 2
): EnhancedCombatStats {
  const starIndex = Math.max(0, Math.min(2, starLevel - 1));
  
  // 기본 스탯 계산
  const baseHealth = (champion.stats?.health || 0) * STAR_MULTIPLIERS.health[starIndex];
  const baseDamage = (champion.stats?.damage || 0) * STAR_MULTIPLIERS.damage[starIndex];
  
  // 아이템 효과 계산
  const itemStats = calculateItemEffects(items);
  
  // 최종 스탯
  const finalStats = {
    health: Math.round(baseHealth + itemStats.health),
    mana: champion.stats?.mana || 0,
    armor: (champion.stats?.armor || 0) + itemStats.armor,
    magicResist: (champion.stats?.magicResist || 0) + itemStats.magicResist,
    attackDamage: Math.round(baseDamage + itemStats.attackDamage),
    attackSpeed: (champion.stats?.attackSpeed || 0.6) + itemStats.attackSpeed,
    abilityPower: itemStats.abilityPower,
    critChance: (champion.stats?.critChance || 0.25) + itemStats.critChance,
    critDamage: (champion.stats?.critDamage || 1.5) + itemStats.critDamage,
  };
  
  // 파생 스탯 계산
  const effectiveHealth = calculateEffectiveHealth(finalStats.health, finalStats.armor);
  const dps = calculateBasicDPS(finalStats.attackDamage, finalStats.attackSpeed, finalStats.critChance, finalStats.critDamage);
  const burstPotential = estimateBurstPotential(champion, finalStats.abilityPower);
  
  return {
    ...finalStats,
    effectiveHealth,
    dps,
    burstPotential,
    starLevel,
    itemCount: items.length,
    hasAP: itemStats.abilityPower > 0,
    hasAD: itemStats.attackDamage > 0 || itemStats.attackSpeed > 0,
    hasTank: itemStats.health > 0 || itemStats.armor > 0
  };
}

/**
 * 아이템 효과 계산
 */
function calculateItemEffects(items: Item[]) {
  const stats = {
    health: 0,
    attackDamage: 0,
    abilityPower: 0,
    armor: 0,
    magicResist: 0,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0
  };
  
  items.forEach(item => {
    // 아이템별 스탯 보너스 (실제 TFT 데이터 기반으로 조정 필요)
    if (item.stats) {
      stats.health += item.stats.health || 0;
      stats.attackDamage += item.stats.damage || 0;
      stats.abilityPower += item.stats.abilityPower || 0;
      stats.armor += item.stats.armor || 0;
      stats.magicResist += item.stats.magicResist || 0;
      stats.attackSpeed += item.stats.attackSpeed || 0;
      stats.critChance += item.stats.critChance || 0;
      stats.critDamage += item.stats.critDamage || 0;
    }
  });
  
  return stats;
}

/**
 * 유효 체력 계산 (방어력 적용)
 */
function calculateEffectiveHealth(health: number, armor: number): number {
  return Math.round(health * (1 + armor / 100));
}

/**
 * 기본 DPS 계산
 */
function calculateBasicDPS(damage: number, attackSpeed: number, critChance: number, critDamage: number): number {
  const avgDamage = damage * (1 + critChance * (critDamage - 1));
  return Math.round(avgDamage * attackSpeed);
}

/**
 * 스킬 버스트 잠재력 추정
 */
function estimateBurstPotential(champion: Champion, abilityPower: number): number {
  const ability = champion.ability;
  if (!ability || !ability.variables) return 0;
  
  // 주요 피해 변수 찾기
  const damageVars = Object.entries(ability.variables).filter(([key]) => 
    key.toLowerCase().includes('damage') || key.toLowerCase().includes('heal')
  );
  
  let totalPotential = 0;
  damageVars.forEach(([, values]) => {
    if (Array.isArray(values) && values.length > 0) {
      const baseValue = values[1] || values[0] || 0; // 2성 기준
      const scaledValue = baseValue + (abilityPower * 0.5); // 대략적인 AP 계수
      totalPotential += scaledValue;
    }
  });
  
  return Math.round(totalPotential);
}

/**
 * 스킬 수치 상세 계산
 */
export function calculateSkillValue(
  variableName: string,
  variableValues: number[],
  combatStats: EnhancedCombatStats,
  scalingType?: 'AP' | 'AD' | 'HP' | 'HYBRID' | 'NONE'
): SkillCalculation {
  const baseValues = [...variableValues];
  
  // 스케일링 타입 자동 결정
  const detectedScalingType = scalingType || detectScalingType(variableName);
  
  // 스케일링 계수 계산
  const coefficient = getScalingCoefficient(variableName, detectedScalingType);
  
  // 스케일링 적용
  const scaledValues = baseValues.map(baseValue => {
    let bonus = 0;
    
    switch (detectedScalingType) {
      case 'AP':
        bonus = combatStats.abilityPower * coefficient;
        break;
      case 'AD':
        bonus = combatStats.attackDamage * coefficient;
        break;
      case 'HP':
        bonus = combatStats.health * coefficient;
        break;
      case 'HYBRID':
        bonus = Math.max(combatStats.abilityPower, combatStats.attackDamage) * coefficient;
        break;
      default:
        bonus = 0;
    }
    
    return Math.round(baseValue + bonus);
  });
  
  const currentValue = scaledValues[combatStats.starLevel - 1] || scaledValues[0] || 0;
  const bonus = currentValue - baseValues[combatStats.starLevel - 1];
  
  return {
    baseValues,
    scaledValues,
    currentValue,
    scalingInfo: {
      type: detectedScalingType,
      coefficient,
      bonus
    },
    displayFormat: {
      main: currentValue.toString(),
      breakdown: baseValues.join(' / '),
      withScaling: bonus > 0 ? `${currentValue} (+${bonus})` : currentValue.toString()
    }
  };
}

/**
 * 스케일링 타입 자동 검출
 */
function detectScalingType(variableName: string): 'AP' | 'AD' | 'HP' | 'HYBRID' | 'NONE' {
  const name = variableName.toLowerCase();
  
  // 명확한 AP 스케일링
  if (name.includes('magic') || name.includes('spell') || name.includes('heal') || 
      name.includes('shield') || name.includes('modifieddamage') || name.includes('modifiedheal')) {
    return 'AP';
  }
  
  // 명확한 AD 스케일링
  if (name.includes('physical') || name.includes('attack') || name.includes('crit')) {
    return 'AD';
  }
  
  // 체력 스케일링
  if (name.includes('health') || name.includes('maxhealth')) {
    return 'HP';
  }
  
  // 피해 관련은 대부분 AP
  if (name.includes('damage')) {
    return 'AP';
  }
  
  return 'NONE';
}

/**
 * 스케일링 계수 반환
 */
function getScalingCoefficient(variableName: string, scalingType: string): number {
  // TFT의 일반적인 스케일링 계수
  const coefficients: Record<string, number> = {
    'AP': 0.01,      // 1% AP per point (일반적)
    'AD': 0.01,      // 1% AD per point
    'HP': 0.0001,    // 0.01% HP per point
    'HYBRID': 0.01,  // 1% better stat per point
    'NONE': 0
  };
  
  // 특정 변수별 커스텀 계수
  const customCoefficients: Record<string, number> = {
    'ModifiedDamage': 0.015,  // 1.5% AP
    'ModifiedHeal': 0.015,    // 1.5% AP
    'Damage': 0.01,           // 1% AP
    'Heal': 0.015,            // 1.5% AP
    'Shield': 0.012,          // 1.2% AP
  };
  
  return customCoefficients[variableName] || coefficients[scalingType] || 0;
}

/**
 * 정확한 스킬 타입 판정
 */
export function determineAccurateSkillType(ability: any): {
  type: 'active' | 'passive';
  manaInfo: { start: number; cost: number; display: string } | null;
  confidence: number; // 판정 신뢰도 (0-1)
} {
  let confidence = 0.5; // 기본 신뢰도
  
  // 1. 마나 정보로 우선 판정
  if (typeof ability.manaStart === 'number' && typeof ability.manaCost === 'number') {
    if (ability.manaStart >= 0 && ability.manaCost > 0) {
      return {
        type: 'active',
        manaInfo: {
          start: ability.manaStart,
          cost: ability.manaCost,
          display: `${ability.manaStart}/${ability.manaCost}`
        },
        confidence: 0.95 // 매우 높은 신뢰도
      };
    }
  }
  
  // 2. 스킬명으로 판정
  const skillName = ability.name?.toLowerCase() || '';
  if (skillName.includes('passive') || skillName.includes('패시브')) {
    confidence = Math.max(confidence, 0.8);
    return {
      type: 'passive',
      manaInfo: null,
      confidence
    };
  }
  
  // 3. 설명 키워드로 판정
  const description = ability.desc?.toLowerCase() || '';
  if (description.includes('passive') || description.includes('패시브') || 
      description.includes('constantly') || description.includes('always')) {
    confidence = Math.max(confidence, 0.7);
    return {
      type: 'passive',
      manaInfo: null,
      confidence
    };
  }
  
  // 4. 액티브 스킬 키워드
  if (description.includes('cast') || description.includes('activate') || 
      description.includes('channel') || description.includes('시전')) {
    confidence = Math.max(confidence, 0.7);
    return {
      type: 'active',
      manaInfo: null,
      confidence
    };
  }
  
  // 5. 기본값은 패시브 (신뢰도 낮음)
  return {
    type: 'passive',
    manaInfo: null,
    confidence: 0.3
  };
}

/**
 * 무의미한 변수 필터링
 */
export function filterMeaninglessVariables(variables: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {};
  
  Object.entries(variables).forEach(([key, value]) => {
    // 배열인 경우
    if (Array.isArray(value)) {
      // 모두 0이거나 모두 같은 값인 경우 제외
      const allZero = value.every(v => v === 0);
      const allSame = value.every(v => v === value[0]);
      const hasValidValues = value.some(v => typeof v === 'number' && v > 0);
      
      if (!allZero && hasValidValues && (!allSame || value[0] > 0)) {
        filtered[key] = value;
      }
    }
    // 단일 값인 경우
    else if (typeof value === 'number' && value > 0) {
      filtered[key] = value;
    }
  });
  
  return filtered;
}

/**
 * 롤체지지 스타일 수치 포맷터
 */
export function formatForLolchess(
  calculation: SkillCalculation,
  starLevel: number
): {
  current: string;       // "350"
  withBonus: string;     // "350 (+25)" 
  fullRange: string;     // "[350 / 400 / 625]"
  display: string;       // "350 (+25) [350 / 400 / 625]"
} {
  const { currentValue, baseValues, scalingInfo } = calculation;
  const baseValue = baseValues[starLevel - 1] || baseValues[0] || 0;
  const bonus = scalingInfo.bonus;
  
  return {
    current: currentValue.toString(),
    withBonus: bonus > 0 ? `${currentValue} (+${Math.round(bonus)})` : currentValue.toString(),
    fullRange: `[${baseValues.join(' / ')}]`,
    display: bonus > 0 
      ? `${currentValue} (+${Math.round(bonus)}) [${baseValues.join(' / ')}]`
      : `${currentValue} [${baseValues.join(' / ')}]`
  };
}