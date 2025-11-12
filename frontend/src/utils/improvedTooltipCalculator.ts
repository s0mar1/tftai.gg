/**
 * 개선된 툴팁 실제 수치 계산기
 * Community Dragon API의 변수 구조를 더 정확히 분석하여 계산
 */

import { Champion, Item } from '../types';

interface CalculatedValue {
  base: number[];  // 별 레벨별 기본 수치 [1성, 2성, 3성]
  bonus: number;   // 추가 수치 (AP/AD 계수 등)
  total: number[]; // 최종 계산된 수치
  formula: string; // 계산 공식 표시
  scalingType: 'AP' | 'AD' | 'HP' | 'NONE'; // 어떤 스탯으로 스케일링하는지
}

interface ChampionCombatStats {
  health: number;
  mana: number;
  armor: number;
  magicResist: number;
  attackDamage: number;
  attackSpeed: number;
  abilityPower: number;
  critChance: number;
  critDamage: number;
}

/**
 * 챔피언의 실제 전투 스탯 계산 (개선된 버전)
 */
export function calculateCombatStats(
  champion: Champion,
  items: Item[] = [],
  starLevel: number = 2
): ChampionCombatStats {
  // TFT Set 15 별 레벨 배율 (정확한 수치)
  const starMultipliers = [1.0, 1.8, 3.24]; // 1성, 2성, 3성
  const multiplier = starMultipliers[starLevel - 1] || 1;
  
  // 기본 스탯 계산
  const baseStats = {
    health: Math.round((champion.stats?.health || 0) * multiplier),
    mana: champion.stats?.mana || 0,
    armor: champion.stats?.armor || 0,
    magicResist: champion.stats?.magicResist || 0,
    attackDamage: Math.round((champion.stats?.damage || 0) * multiplier),
    attackSpeed: champion.stats?.attackSpeed || 0.6,
    abilityPower: 0, // 기본 AP는 0
    critChance: champion.stats?.critChance || 0.25,
    critDamage: champion.stats?.critDamage || 1.5
  };
  
  // 아이템 스탯 합산 (개선된 필드 매핑)
  items.forEach(item => {
    if (item.stats) {
      baseStats.health += item.stats.health || item.stats.HP || 0;
      baseStats.mana += item.stats.mana || item.stats.MP || 0;
      baseStats.armor += item.stats.armor || item.stats.Armor || 0;
      baseStats.magicResist += item.stats.magicResist || item.stats.MR || 0;
      baseStats.attackDamage += item.stats.AD || item.stats.damage || 0;
      baseStats.attackSpeed += item.stats.AS || item.stats.attackSpeed || 0;
      baseStats.abilityPower += item.stats.AP || item.stats.abilityPower || 0;
      baseStats.critChance += item.stats.critChance || item.stats.crit || 0;
      baseStats.critDamage += item.stats.critDamage || 0;
    }
  });
  
  return baseStats;
}

/**
 * 개선된 스킬 변수 값 계산
 */
export function calculateSkillValue(
  variable: any,
  combatStats: ChampionCombatStats,
  starLevel: number = 2
): CalculatedValue {
  const varName = variable.name?.replace(/@/g, '').toLowerCase() || '';
  const baseValues = variable.value || variable.values || [0, 0, 0, 0];
  
  // Community Dragon은 보통 인덱스 1,2,3을 1성,2성,3성으로 사용
  const base = [
    parseFloat(baseValues[1]) || 0,
    parseFloat(baseValues[2]) || 0,  
    parseFloat(baseValues[3]) || 0
  ];
  
  let bonus = 0;
  let formula = '';
  let scalingType: 'AP' | 'AD' | 'HP' | 'NONE' = 'NONE';
  
  // 개선된 스케일링 타입 분석
  const scalingInfo = analyzeScalingType(varName, variable);
  scalingType = scalingInfo.type;
  
  if (scalingInfo.ratio > 0) {
    switch (scalingType) {
      case 'AP':
        bonus = combatStats.abilityPower * scalingInfo.ratio;
        formula = `${base[starLevel-1]} + (${combatStats.abilityPower} AP × ${(scalingInfo.ratio * 100).toFixed(0)}%)`;
        break;
      case 'AD':
        bonus = combatStats.attackDamage * scalingInfo.ratio;
        formula = `${base[starLevel-1]} + (${combatStats.attackDamage.toFixed(0)} AD × ${(scalingInfo.ratio * 100).toFixed(0)}%)`;
        break;
      case 'HP':
        bonus = combatStats.health * scalingInfo.ratio;
        formula = `${base[starLevel-1]} + (${combatStats.health.toFixed(0)} HP × ${(scalingInfo.ratio * 100).toFixed(0)}%)`;
        break;
      default:
        formula = `${base.join(' / ')}`;
    }
  } else {
    formula = `${base.join(' / ')}`;
  }
  
  // 최종 계산 (더 정확한 반올림)
  const total = base.map(val => Math.round((val + bonus) * 100) / 100);
  
  return {
    base,
    bonus: Math.round(bonus * 100) / 100,
    total,
    formula,
    scalingType
  };
}

/**
 * 개선된 스케일링 타입 분석
 */
function analyzeScalingType(varName: string, variable: any): { type: 'AP' | 'AD' | 'HP' | 'NONE', ratio: number } {
  const cleanVarName = varName.toLowerCase();
  
  // 1. 명시적인 스케일링 타입 키워드 확인
  if (cleanVarName.includes('apratio') || cleanVarName.includes('spelldamage') || cleanVarName.includes('magic')) {
    const ratio = extractRatioFromVariable(variable, 'ap');
    return { type: 'AP', ratio };
  }
  
  if (cleanVarName.includes('adratio') || cleanVarName.includes('attackdamage') || cleanVarName.includes('physical')) {
    const ratio = extractRatioFromVariable(variable, 'ad');
    return { type: 'AD', ratio };
  }
  
  if (cleanVarName.includes('hpratio') || cleanVarName.includes('healthratio') || cleanVarName.includes('maxhealth')) {
    const ratio = extractRatioFromVariable(variable, 'hp');
    return { type: 'HP', ratio };
  }
  
  // 2. Community Dragon 특정 패턴 확인
  if (cleanVarName.includes('spell') || cleanVarName.endsWith('ap') || cleanVarName.includes('magic')) {
    const ratio = extractRatioFromVariable(variable, 'ap');
    return { type: 'AP', ratio };
  }
  
  if (cleanVarName.includes('attack') || cleanVarName.endsWith('ad') || cleanVarName.includes('physical')) {
    const ratio = extractRatioFromVariable(variable, 'ad');
    return { type: 'AD', ratio };
  }
  
  // 3. 기본값은 스케일링 없음
  return { type: 'NONE', ratio: 0 };
}

/**
 * 개선된 계수 추출 함수
 */
function extractRatioFromVariable(variable: any, scalingType: string): number {
  // 1. 변수명에서 직접 계수 추출
  const varName = variable.name?.toLowerCase() || '';
  
  // 패턴 매칭 (예: "DamageAP75", "HealRatio50" 등)
  const ratioPattern = /(\d+\.?\d*)$/;
  const match = varName.match(ratioPattern);
  if (match) {
    const num = parseFloat(match[1]);
    // 100 이상이면 퍼센트, 10 이하면 소수점 계수로 해석
    return num >= 100 ? num / 100 : num >= 10 ? num / 100 : num;
  }
  
  // 2. value 배열의 첫 번째 값이 계수인지 확인
  const values = variable.value || variable.values;
  if (Array.isArray(values) && values[0] !== undefined) {
    const firstVal = parseFloat(values[0]);
    // 0.1 ~ 10 범위면 계수로 간주
    if (firstVal > 0.05 && firstVal <= 10) {
      return firstVal;
    }
  }
  
  // 3. 기본 계수값 (스케일링 타입별)
  const defaultRatios = {
    'ap': 0.6,  // 60% AP 스케일링
    'ad': 1.0,  // 100% AD 스케일링  
    'hp': 0.05  // 5% HP 스케일링
  };
  
  return defaultRatios[scalingType as keyof typeof defaultRatios] || 0;
}

/**
 * 개선된 설명문 플레이스홀더 교체
 */
export function replaceWithCalculatedValues(
  description: string,
  variables: any[],
  combatStats: ChampionCombatStats,
  starLevel: number = 2,
  showFormula: boolean = false
): string {
  let processedDesc = description;
  
  if (!description || !Array.isArray(variables)) {
    return description || '';
  }
  
  variables.forEach(variable => {
    const varName = variable.name?.replace(/@/g, '') || '';
    
    // Community Dragon 특화 플레이스홀더 패턴들
    const patterns = [
      new RegExp(`@${varName}@`, 'gi'),
      new RegExp(`@${varName.toLowerCase()}@`, 'gi'),
      new RegExp(`{${varName}}`, 'gi'),
      new RegExp(`\\*${varName}\\*`, 'gi'),
      new RegExp(`\\(${varName}\\)`, 'gi'),
      new RegExp(`\\b${varName}\\b`, 'gi') // 단어 경계 매칭
    ];
    
    const calculated = calculateSkillValue(variable, combatStats, starLevel);
    
    // 세라핀 예시처럼 값만 깔끔하게 표시
    const currentValue = calculated.total[starLevel - 1];
    let displayValue = formatNumber(currentValue);
    
    // 괄호 안의 수치는 더 간결하게 (보너스만 표시)
    if (calculated.bonus > 0 && showFormula) {
      displayValue += `(${formatNumber(calculated.bonus)})`;
    }
    
    // 각 패턴에 대해 교체 시도
    patterns.forEach(pattern => {
      if (processedDesc.match(pattern)) {
        processedDesc = processedDesc.replace(pattern, displayValue);
      }
    });
  });
  
  // 빈 괄호 정리 (예: "()" -> "")
  processedDesc = processedDesc
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\{\s*\}/g, '');
  
  return processedDesc;
}

/**
 * 숫자 포맷팅 (소수점 정리)
 */
function formatNumber(num: number): string {
  if (Math.abs(num - Math.round(num)) < 0.01) {
    return Math.round(num).toString();
  } else {
    return num.toFixed(1);
  }
}

/**
 * 개선된 DPS 계산
 */
export function calculateSkillDPS(
  ability: any,
  combatStats: ChampionCombatStats,
  starLevel: number = 2
): {
  damage: number;
  dps: number;
  castTime: number;
} {
  if (!ability || !ability.variables) {
    return { damage: 0, dps: 0, castTime: 0 };
  }
  
  // 더 정확한 데미지 변수 찾기
  const damageVar = ability.variables.find((v: any) => {
    const name = v.name?.toLowerCase() || '';
    return name.includes('damage') || name.includes('총피해') || name.includes('totaldamage');
  });
  
  if (!damageVar) {
    return { damage: 0, dps: 0, castTime: 0 };
  }
  
  const calculated = calculateSkillValue(damageVar, combatStats, starLevel);
  const damage = calculated.total[starLevel - 1];
  
  // 개선된 캐스팅 시간 계산
  const manaStart = ability.manaStart || 0;
  const manaCost = ability.manaCost || 50;
  const manaPerAttack = 10; // TFT 기본값
  
  if (manaCost <= manaStart) {
    // 패시브 스킬이거나 즉시 사용 가능
    return { damage, dps: damage, castTime: 0 };
  }
  
  const attacksNeeded = Math.ceil((manaCost - manaStart) / manaPerAttack);
  const castTime = attacksNeeded / (combatStats.attackSpeed || 0.6);
  const dps = castTime > 0 ? damage / castTime : damage;
  
  return {
    damage: Math.round(damage),
    dps: Math.round(dps),
    castTime: Math.round(castTime * 10) / 10
  };
}

// 기존 함수들도 export (호환성)
export { calculateCombatStats as calculateCombatStatsImproved };