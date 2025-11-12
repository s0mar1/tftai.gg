/**
 * 스킬 설명 자연스러운 한국어 재구성 유틸리티
 * 파싱된 데이터를 바탕으로 롤체지지 스타일의 완전한 한국어 설명 생성
 */

import { Champion } from '../types';

// 스킬별 완전한 한국어 설명 템플릿
interface SkillTemplate {
  name: string;
  description: string;
  variables: Record<string, string>;
  conditionalEffects?: Record<string, string>;
}

// Set 15 주요 챔피언 스킬 템플릿 매핑
const SKILL_TEMPLATES: Record<string, SkillTemplate> = {
  // 가렌 - 용감한 정의의 검
  'Mighty Blade of Justice': {
    name: '용감한 정의의 검',
    description: '체력을 {TotalHealing} 회복하고 대상에게 {AdditionalDamage}의 물리 피해를 입힙니다.',
    variables: {
      'TotalHealing': '체력 회복',
      'AdditionalDamage': '물리 피해량'
    },
    conditionalEffects: {
      'TFT15_BattleAcademia_IsActive': '잠재력 ({TFT15_BattleAcademia_CurrentPotential}): 완전한 잠재력에 도달하면 추가 효과가 발동됩니다.'
    }
  },

  // 라칸 - 다들 날 바라봐
  'All Eyes On Me': {
    name: '다들 날 바라봐',
    description: '체력을 {ModifiedHeal} 회복하고 가장 가까운 적 3명에게 {ModifiedDamage}의 마법 피해를 입힙니다.',
    variables: {
      'ModifiedHeal': '체력 회복',
      'ModifiedDamage': '피해량'
    },
    conditionalEffects: {
      'TFT15_BattleAcademia_IsActive': '잠재력 ({TFT15_BattleAcademia_CurrentPotential}): 체력 비율이 가장 낮은 아군 2명의 체력을 {TFT15_BattleAcademia_Rakan} 회복합니다.'
    }
  },

  // 징크스 - 신나는데!
  'Get Excited!': {
    name: '신나는데!',
    description: '적을 처치하거나 어시스트를 올리면 {AttackSpeed}%의 공격 속도를 얻고 {MovementSpeed} 이동 속도를 얻습니다. 지속시간: {Duration}초',
    variables: {
      'AttackSpeed': '공격 속도 증가',
      'MovementSpeed': '이동 속도 증가',
      'Duration': '지속시간'
    }
  },

  // 갱플랭크 - 포격
  'Cannon Barrage': {
    name: '포격',
    description: '{Waves}파의 포탄이 {Radius} 범위에 떨어져 적들에게 {Damage}의 마법 피해를 입힙니다.',
    variables: {
      'Waves': '포탄 파수',
      'Radius': '범위',
      'Damage': '피해량'
    }
  },

  // 아무무 - 슬픈 미라의 저주
  'Curse of the Sad Mummy': {
    name: '슬픈 미라의 저주',
    description: '주변 적들을 {StunDuration}초 동안 기절시키고 {Damage}의 마법 피해를 입힙니다.',
    variables: {
      'StunDuration': '기절 시간',
      'Damage': '피해량'
    }
  },

  // 애니비아 - 혹한의 폭풍
  'Glacial Storm': {
    name: '혹한의 폭풍',
    description: '지속 시전: 대상 지역에 폭풍을 일으켜 매초 {DamagePerSecond}의 마법 피해를 입히고 {SlowPercent}% 둔화시킵니다.',
    variables: {
      'DamagePerSecond': '초당 피해량',
      'SlowPercent': '둔화율'
    }
  },

  // 브라움 - 브라움 뒤로!
  'Stand Behind Braum': {
    name: '브라움 뒤로!',
    description: '방향을 바라보며 {Shield} 보호막을 얻고, 전방의 아군들에게 {AllyShield} 보호막을 제공합니다. 지속시간: {Duration}초',
    variables: {
      'Shield': '자신 보호막',
      'AllyShield': '아군 보호막',
      'Duration': '지속시간'
    }
  }
};

// 일반적인 스킬 효과 키워드 번역
const EFFECT_TRANSLATIONS: Record<string, string> = {
  'damage': '피해를 입힙니다',
  'heal': '회복합니다',
  'shield': '보호막을 얻습니다',
  'stun': '기절시킵니다',
  'slow': '둔화시킵니다',
  'magic damage': '마법 피해',
  'physical damage': '물리 피해',
  'true damage': '고정 피해',
  'health': '체력',
  'mana': '마나',
  'attack speed': '공격 속도',
  'movement speed': '이동 속도',
  'critical strike': '치명타',
  'armor': '방어력',
  'magic resist': '마법 저항력',
  'nearest': '가장 가까운',
  'enemies': '적들',
  'allies': '아군들',
  'seconds': '초',
  'range': '사거리',
  'radius': '범위',
  'for': '동안',
  'and': '그리고',
  'to': '에게',
  'deals': '입힙니다',
  'restores': '회복시킵니다',
  'grants': '제공합니다',
  'increases': '증가시킵니다',
  'reduces': '감소시킵니다'
};

// 변수 값 포맷팅 함수
function formatVariableValue(value: number | string, variableName: string): string {
  const name = variableName.toLowerCase();
  
  // 퍼센트 값들
  if (name.includes('percent') || name.includes('rate') || name.includes('chance')) {
    return `${value}%`;
  }
  
  // 시간 값들
  if (name.includes('duration') || name.includes('time')) {
    return `${value}초`;
  }
  
  // 거리/범위 값들  
  if (name.includes('range') || name.includes('radius') || name.includes('distance')) {
    return `${value} 범위`;
  }
  
  return value.toString();
}

// 조건부 효과 번역 함수
function translateConditionalEffect(condition: string, description: string): string {
  const conditionMap: Record<string, string> = {
    'TFT15_BattleAcademia_IsActive': '배틀 아카데미아',
    'TFT15_BattleAcademia_CurrentPotential': '잠재력',
    'TFT15_Punk': '반항자',
    'TFT15_Jazz': '재즈',
    'TFT15_Country': '컨트리',
    'TFT15_Disco': '디스코',
    'TFT15_Headliner': '헤드라이너',
  };
  
  const translatedCondition = conditionMap[condition] || condition;
  return `${translatedCondition}: ${description}`;
}

// 메인 설명 구성 함수
function buildSkillDescription(
  skillName: string, 
  ability: any, 
  variables: Record<string, number[]>
): { 
  description: string; 
  conditionalEffects: string[]; 
  formattedVariables: Array<{ label: string; values: string; color: string }>
} {
  console.log('🔍 buildSkillDescription - inputs:', {
    skillName,
    abilityName: ability?.name,
    variables,
    variableKeys: Object.keys(variables || {}),
    templateExists: !!(SKILL_TEMPLATES[ability.name] || SKILL_TEMPLATES[skillName])
  });
  
  const template = SKILL_TEMPLATES[ability.name] || SKILL_TEMPLATES[skillName];
  
  if (template) {
    console.log('✅ Using template:', template.name);
    // 템플릿 기반 설명 생성
    let description = template.description;
    const formattedVariables: Array<{ label: string; values: string; color: string }> = [];
    
    console.log('🔄 Original description:', description);
    
    // 변수 교체
    Object.entries(variables).forEach(([varName, values]) => {
      const cleanVarName = varName.replace(/@/g, '');
      const placeholder = `{${cleanVarName}}`;
      
      console.log('🔄 Processing variable:', { varName, cleanVarName, placeholder, values });
      
      if (description.includes(placeholder)) {
        const currentValue = values[1] || values[0] || 0; // 2성 기준
        const formattedValue = formatVariableValue(currentValue, cleanVarName);
        console.log('✅ Replacing:', placeholder, '→', formattedValue);
        description = description.replace(placeholder, `**${formattedValue}**`);
        
        // 변수 상세 정보 추가
        const koreanLabel = template.variables[cleanVarName] || cleanVarName;
        formattedVariables.push({
          label: koreanLabel,
          values: values.length > 1 
            ? `${currentValue} [${values.join(' / ')}]`
            : currentValue.toString(),
          color: getVariableColor(cleanVarName)
        });
      } else {
        console.log('❌ Placeholder not found:', placeholder, 'in description');
      }
    });
    
    console.log('🔄 Final description:', description);
    
    // 조건부 효과 처리
    const conditionalEffects: string[] = [];
    if (template.conditionalEffects) {
      Object.entries(template.conditionalEffects).forEach(([condition, effectDesc]) => {
        let processedEffect = effectDesc;
        
        // 조건부 효과의 변수도 교체
        Object.entries(variables).forEach(([varName, values]) => {
          const cleanVarName = varName.replace(/@/g, '');
          const placeholder = `{${cleanVarName}}`;
          
          if (processedEffect.includes(placeholder)) {
            const currentValue = values[1] || values[0] || 0;
            const formattedValue = formatVariableValue(currentValue, cleanVarName);
            processedEffect = processedEffect.replace(placeholder, formattedValue);
          }
        });
        
        conditionalEffects.push(translateConditionalEffect(condition, processedEffect));
      });
    }
    
    return {
      description,
      conditionalEffects,
      formattedVariables
    };
  }
  
  console.log('❌ No template found, using generic description');
  // 템플릿이 없는 경우 기본 파싱 로직 사용
  return buildGenericDescription(ability, variables);
}

// 일반적인 설명 생성 함수 (템플릿이 없는 스킬용)
function buildGenericDescription(
  ability: any, 
  variables: Record<string, number[]>
): { 
  description: string; 
  conditionalEffects: string[]; 
  formattedVariables: Array<{ label: string; values: string; color: string }>
} {
  let description = ability.desc || '';
  const formattedVariables: Array<{ label: string; values: string; color: string }> = [];
  
  // HTML 태그 제거
  description = description.replace(/<[^>]+>/g, '');
  
  // 변수 교체
  Object.entries(variables).forEach(([varName, values]) => {
    const cleanVarName = varName.replace(/@/g, '');
    const variableRegex = new RegExp(`@${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    
    const currentValue = values[1] || values[0] || 0; // 2성 기준
    description = description.replace(variableRegex, currentValue.toString());
    
    formattedVariables.push({
      label: getKoreanVariableLabel(cleanVarName),
      values: values.length > 1 
        ? `${currentValue} [${values.join(' / ')}]`
        : currentValue.toString(),
      color: getVariableColor(cleanVarName)
    });
  });
  
  // 영어 키워드를 한국어로 번역
  Object.entries(EFFECT_TRANSLATIONS).forEach(([english, korean]) => {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    description = description.replace(regex, korean);
  });
  
  return {
    description: description.trim(),
    conditionalEffects: [],
    formattedVariables
  };
}

// 변수 이름의 한국어 라벨 반환
function getKoreanVariableLabel(variableName: string): string {
  const labelMap: Record<string, string> = {
    'ModifiedHeal': '체력 회복',
    'ModifiedDamage': '피해량',
    'Damage': '피해량',
    'Heal': '회복량',
    'Shield': '보호막',
    'Duration': '지속시간',
    'SlowPercent': '둔화',
    'StunDuration': '기절 시간',
    'AttackSpeed': '공격속도',
    'MovementSpeed': '이동속도',
    'CritChance': '치명타 확률',
    'NumTargets': '대상 수',
    'Range': '사거리',
    'Radius': '범위',
    'Waves': '파수',
    'DamagePerSecond': '초당 피해량',
    'ManaRestore': '마나 회복',
    'BonusResist': '저항력 증가',
    'AllyShield': '아군 보호막',
    'TFT15_BattleAcademia_Rakan': '아군 체력 회복량',
    'TFT15_BattleAcademia_CurrentPotential': '현재 잠재력'
  };
  
  return labelMap[variableName] || variableName;
}

// 변수 색상 반환
function getVariableColor(variableName: string): string {
  const colorMap: Record<string, string> = {
    'ModifiedHeal': 'text-green-400',
    'ModifiedDamage': 'text-red-400',
    'Damage': 'text-red-400',
    'Heal': 'text-green-400',
    'Shield': 'text-blue-400',
    'Duration': 'text-yellow-400',
    'SlowPercent': 'text-purple-400',
    'StunDuration': 'text-orange-400',
    'AttackSpeed': 'text-cyan-400',
    'MovementSpeed': 'text-cyan-400',
    'CritChance': 'text-yellow-400',
    'NumTargets': 'text-gray-400',
    'Range': 'text-gray-400',
    'Radius': 'text-gray-400',
    'ManaRestore': 'text-blue-400',
    'BonusResist': 'text-purple-400'
  };
  
  return colorMap[variableName] || 'text-gray-300';
}

// 스킬 타입과 마나 정보 결정
function getSkillTypeAndMana(ability: any): {
  type: 'active' | 'passive';
  manaDisplay: string | null;
} {
  // manaStart와 manaCost가 정의된 숫자면 액티브 스킬
  const hasValidMana = 
    typeof ability.manaStart === 'number' && 
    typeof ability.manaCost === 'number' &&
    ability.manaStart >= 0 && ability.manaCost > 0;
  
  if (hasValidMana) {
    return {
      type: 'active',
      manaDisplay: `${ability.manaStart}/${ability.manaCost}`
    };
  }
  
  return {
    type: 'passive',
    manaDisplay: null
  };
}

// 메인 Export 함수
export function buildLolchessStyleTooltip(
  champion: Champion,
  skillNameOverride?: string
): {
  skillName: string;
  header: string;
  description: string;
  variables: Array<{ label: string; values: string; color: string }>;
  conditionalEffects: string[];
} {
  const ability = champion.ability;
  
  if (!ability) {
    return {
      skillName: '알 수 없는 스킬',
      header: '알 수 없는 스킬 | 패시브',
      description: '스킬 정보를 불러올 수 없습니다.',
      variables: [],
      conditionalEffects: []
    };
  }
  
  // 스킬 이름 결정
  const skillName = skillNameOverride || 
    SKILL_TEMPLATES[ability.name]?.name || 
    ability.name || 
    '알 수 없는 스킬';
  
  // 스킬 타입과 마나 정보
  const { type, manaDisplay } = getSkillTypeAndMana(ability);
  
  // 헤더 구성
  let header = `${skillName} | ${type === 'active' ? '액티브' : '패시브'}`;
  if (manaDisplay && type === 'active') {
    header += ` | mp 마나: ${manaDisplay}`;
  }
  
  // 설명과 변수 구성
  const variables = ability.variables || {};
  const { description, conditionalEffects, formattedVariables } = 
    buildSkillDescription(skillName, ability, variables);
  
  return {
    skillName,
    header,
    description,
    variables: formattedVariables,
    conditionalEffects
  };
}

// 한국어 이름 매핑 확장 함수
export function addSkillTemplate(
  originalName: string, 
  template: SkillTemplate
): void {
  SKILL_TEMPLATES[originalName] = template;
}

// 현재 등록된 템플릿 목록 반환
export function getAvailableTemplates(): string[] {
  return Object.keys(SKILL_TEMPLATES);
}