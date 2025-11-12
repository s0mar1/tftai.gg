/**
 * 툴팁 실제 수치 계산기
 * 챔피언의 실제 스탯과 아이템을 기반으로 정확한 수치 계산
 */

import { Champion, Item } from '../types';

interface CalculatedValue {
  base: number[];  // 별 레벨별 기본 수치 [1성, 2성, 3성]
  bonus: number;   // 추가 수치 (AP/AD 계수 등)
  total: number[]; // 최종 계산된 수치
  formula: string; // 계산 공식 표시
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
 * 챔피언의 실제 전투 스탯 계산 (아이템 포함)
 */
export function calculateCombatStats(
  champion: Champion,
  items: Item[] = [],
  starLevel: number = 2
): ChampionCombatStats {
  // 별 레벨에 따른 기본 스탯 배율
  const starMultipliers = [1, 1.8, 3.24]; // 1성, 2성, 3성
  const multiplier = starMultipliers[starLevel - 1];
  
  // 기본 스탯
  const baseStats = {
    health: (champion.stats?.health || 0) * multiplier,
    mana: champion.stats?.mana || 0,
    armor: champion.stats?.armor || 0,
    magicResist: champion.stats?.magicResist || 0,
    attackDamage: (champion.stats?.damage || 0) * multiplier,
    attackSpeed: champion.stats?.attackSpeed || 0,
    abilityPower: 0, // 기본 AP는 0
    critChance: champion.stats?.critChance || 0.25,
    critDamage: champion.stats?.critDamage || 1.5
  };
  
  // 아이템 스탯 합산
  items.forEach(item => {
    if (item.stats) {
      baseStats.health += item.stats.health || 0;
      baseStats.mana += item.stats.mana || 0;
      baseStats.armor += item.stats.armor || 0;
      baseStats.magicResist += item.stats.magicResist || 0;
      baseStats.attackDamage += item.stats.AD || 0;
      baseStats.attackSpeed += item.stats.AS || 0;
      baseStats.abilityPower += item.stats.AP || 0;
      baseStats.critChance += item.stats.critChance || 0;
      baseStats.critDamage += item.stats.critDamage || 0;
    }
  });
  
  return baseStats;
}

/**
 * 스킬 변수의 실제 값 계산
 */
export function calculateSkillValue(
  variable: any,
  combatStats: ChampionCombatStats,
  starLevel: number = 2
): CalculatedValue {
  const varName = variable.name.replace(/@/g, '').toLowerCase();
  const baseValues = variable.value || [0, 0, 0, 0];
  
  // 별 레벨별 기본값 (인덱스 1,2,3이 1성,2성,3성)
  const base = [
    baseValues[1] || 0,
    baseValues[2] || 0,
    baseValues[3] || 0
  ];
  
  let bonus = 0;
  let formula = '';
  
  // AP 계수 확인
  if (varName.includes('ap') || varName.includes('spell')) {
    const apRatio = extractRatio(varName, variable);
    bonus = combatStats.abilityPower * apRatio;
    formula = `${base[starLevel-1]} + (${combatStats.abilityPower} AP × ${(apRatio * 100).toFixed(0)}%)`;
  }
  // AD 계수 확인
  else if (varName.includes('ad') || varName.includes('attack')) {
    const adRatio = extractRatio(varName, variable);
    bonus = combatStats.attackDamage * adRatio;
    formula = `${base[starLevel-1]} + (${combatStats.attackDamage.toFixed(0)} AD × ${(adRatio * 100).toFixed(0)}%)`;
  }
  // 체력 계수 확인
  else if (varName.includes('health') || varName.includes('hp')) {
    const hpRatio = extractRatio(varName, variable);
    bonus = combatStats.health * hpRatio;
    formula = `${base[starLevel-1]} + (${combatStats.health.toFixed(0)} HP × ${(hpRatio * 100).toFixed(0)}%)`;
  }
  // 기본값만 사용
  else {
    formula = `${base.join(' / ')}`;
  }
  
  // 최종 계산
  const total = base.map(val => Math.round(val + bonus));
  
  return {
    base,
    bonus: Math.round(bonus),
    total,
    formula
  };
}

/**
 * 변수명에서 계수 추출
 */
function extractRatio(varName: string, variable: any): number {
  // 변수명에서 계수 찾기 (예: "DamageAPRatio", "HealAP")
  const ratioMatch = varName.match(/ratio(\d+)?|ap(\d+)?|ad(\d+)?/i);
  if (ratioMatch) {
    const numStr = ratioMatch[1] || ratioMatch[2] || ratioMatch[3];
    if (numStr) {
      return parseInt(numStr) / 100;
    }
  }
  
  // 기본 계수값 확인
  if (variable.value && variable.value[0] !== undefined) {
    // 첫 번째 값이 계수인 경우가 많음 (보통 0.x 형태)
    const firstVal = variable.value[0];
    if (firstVal > 0 && firstVal < 10) {
      return firstVal;
    }
  }
  
  // 기본값
  return 0.5; // 50% 기본 계수
}

/**
 * 스킬 설명문의 플레이스홀더를 실제 계산된 값으로 교체
 */
export function replaceWithCalculatedValues(
  description: string,
  variables: any[],
  combatStats: ChampionCombatStats,
  starLevel: number = 2,
  showFormula: boolean = false
): string {
  let processedDesc = description;
  
  variables.forEach(variable => {
    const varName = variable.name;
    const placeholder = new RegExp(`@${varName.replace(/@/g, '')}@`, 'g');
    
    if (processedDesc.includes(varName)) {
      const calculated = calculateSkillValue(variable, combatStats, starLevel);
      
      // 별 레벨별 표시
      const displayValue = calculated.total.join('/');
      
      // 공식 표시 옵션
      let replacement = displayValue;
      if (showFormula && calculated.bonus > 0) {
        replacement = `${displayValue} (${calculated.formula})`;
      }
      
      processedDesc = processedDesc.replace(placeholder, replacement);
    }
  });
  
  return processedDesc;
}

/**
 * 스킬의 실제 DPS 계산
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
  // 스킬 데미지 변수 찾기
  const damageVar = ability.variables?.find((v: any) => 
    v.name.toLowerCase().includes('damage')
  );
  
  if (!damageVar) {
    return { damage: 0, dps: 0, castTime: 0 };
  }
  
  const calculated = calculateSkillValue(damageVar, combatStats, starLevel);
  const damage = calculated.total[starLevel - 1];
  
  // 캐스팅 시간 계산 (마나 기반)
  const manaPerAttack = 10; // 기본 공격당 마나 획득
  const attacksNeeded = Math.ceil((ability.manaCost - ability.manaStart) / manaPerAttack);
  const castTime = attacksNeeded / combatStats.attackSpeed;
  
  const dps = damage / castTime;
  
  return {
    damage,
    dps: Math.round(dps),
    castTime: Math.round(castTime * 10) / 10
  };
}

/**
 * 방어 관통 계산
 */
export function calculateEffectiveDamage(
  damage: number,
  damageType: 'physical' | 'magic',
  targetArmor: number = 50,
  targetMR: number = 50
): number {
  const resistance = damageType === 'physical' ? targetArmor : targetMR;
  const damageReduction = resistance / (100 + resistance);
  return Math.round(damage * (1 - damageReduction));
}