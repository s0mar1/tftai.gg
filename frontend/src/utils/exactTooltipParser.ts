/**
 * 커뮤니티 드래곤 데이터를 정확히 파싱하는 툴팁 파서
 * 실제 브라움 데이터 구조를 기반으로 구현
 */

interface ParsedAbility {
  name: string;
  type: 'Active' | 'Passive';
  mana: { start: number; cost: number };
  description: string[];
  variables: AbilityVariable[];
}

interface AbilityVariable {
  key: string;
  label: string;
  values: [number, number, number]; // 1성, 2성, 3성
  isPercent: boolean;
  color: string;
}

/**
 * 브라움 스타일 변수명 매핑
 * 설명문의 플레이스홀더 → 실제 변수명
 */
const VARIABLE_MAPPING: Record<string, string> = {
  '@ModifiedDamage@': 'BaseSpellDamage',
  '@ModifiedAOEDamage@': 'AOEDamage', 
  '@ModifiedThrowDamage@': 'BaseThrowDamage',
  '@ExecuteThreshold@': 'ExecuteThresholdAP',
  '@Duration@': 'Duration'
};

/**
 * 변수명을 한글 라벨로 변환
 */
const VARIABLE_LABELS: Record<string, { label: string; color: string; isPercent: boolean }> = {
  'BaseSpellDamage': { label: '피해량', color: 'text-red-400', isPercent: false },
  'AOEDamage': { label: '피해량', color: 'text-red-400', isPercent: false }, // 광역도 "피해량"
  'BaseThrowDamage': { label: '던지기 피해량', color: 'text-orange-400', isPercent: false },
  'ExecuteThresholdAP': { label: '처형 기준값', color: 'text-purple-400', isPercent: true },
  'Duration': { label: '기절 시간', color: 'text-yellow-400', isPercent: false }
};

/**
 * 3성 이상값 정규화 (9001 → 720 같은 보정)
 */
function normalizeThirdStarValue(value: number, starTwoValue: number): number {
  // 3성 값이 비현실적으로 클 경우 2성 기준으로 계산
  if (value > starTwoValue * 3) {
    return Math.round(starTwoValue * 1.67); // 약 67% 증가
  }
  return value;
}

/**
 * HTML 태그와 특수 구문 제거
 */
function cleanDescription(desc: string): string {
  return desc
    // HTML 태그 제거
    .replace(/<[^>]*>/g, '')
    // &nbsp; 등 HTML 엔티티 제거  
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    // (%i:scaleAD%) 같은 스케일링 표기 제거
    .replace(/\(%i:[^)]+%\)/g, '')
    // 연속 공백 정리
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 설명을 의미있는 문단으로 분리
 */
function splitDescriptionIntoParagraphs(desc: string): string[] {
  // <br><br> 또는 이후로 문단 분리
  let paragraphs = desc.split(/(?:<br><br>|이후)/);
  
  // 첫 번째가 아닌 문단에 '이후' 다시 추가
  if (paragraphs.length > 1) {
    for (let i = 1; i < paragraphs.length; i++) {
      paragraphs[i] = '이후' + paragraphs[i];
    }
  }
  
  return paragraphs.map(p => cleanDescription(p)).filter(p => p.length > 0);
}

/**
 * 실제 커뮤니티 드래곤 데이터를 파싱
 */
export function parseExactCommunityDragonData(
  champion: any, 
  ability: any
): ParsedAbility | null {
  
  if (!ability || !ability.desc || !ability.variables) {
    return null;
  }

  // 1. 마나 정보 추출
  const manaInfo = {
    start: champion.stats?.initialMana || 0,
    cost: champion.stats?.mana || 0
  };

  // 2. 설명 분리 및 정리
  const paragraphs = splitDescriptionIntoParagraphs(ability.desc);

  // 3. 변수 정보 추출 및 매핑
  const variables: AbilityVariable[] = [];
  
  // 설명에 나타나는 순서대로 변수 처리
  const placeholdersInOrder = Array.from(
    ability.desc.matchAll(/@(\w+)@/g), 
    match => match[0]
  );

  // 중복 제거하면서 순서 유지
  const uniquePlaceholders = [...new Set(placeholdersInOrder)];

  uniquePlaceholders.forEach(placeholder => {
    // 매핑된 실제 변수명 찾기
    const actualVariableName = VARIABLE_MAPPING[placeholder];
    if (!actualVariableName) return;

    // 해당 변수 데이터 찾기
    const variableData = ability.variables.find((v: any) => 
      v.name === actualVariableName
    );
    if (!variableData || !variableData.value) return;

    // 라벨 정보 가져오기
    const labelInfo = VARIABLE_LABELS[actualVariableName];
    if (!labelInfo) return;

    // 1성, 2성, 3성 값 추출 (인덱스 1,2,3)
    const starValues: [number, number, number] = [
      variableData.value[1] || 0,
      variableData.value[2] || 0,
      variableData.value[3] || 0
    ];

    // 3성 값 정규화
    if (starValues[2] > 1000) {
      starValues[2] = normalizeThirdStarValue(starValues[2], starValues[1]);
    }

    // 백분율 값 처리
    if (labelInfo.isPercent) {
      starValues[0] = Math.round(starValues[0] * 100);
      starValues[1] = Math.round(starValues[1] * 100); 
      starValues[2] = Math.round(starValues[2] * 100);
    }

    variables.push({
      key: placeholder,
      label: labelInfo.label,
      values: starValues,
      isPercent: labelInfo.isPercent,
      color: labelInfo.color
    });
  });

  return {
    name: ability.name || '알 수 없는 스킬',
    type: ability.abilityType === 'passive' ? 'Passive' : 'Active',
    mana: manaInfo,
    description: paragraphs,
    variables
  };
}

/**
 * 설명문에서 플레이스홀더를 현재 별 레벨 값으로 교체
 */
export function replaceDescriptionPlaceholders(
  paragraphs: string[],
  variables: AbilityVariable[],
  currentStarLevel: number = 2
): string[] {
  
  return paragraphs.map(paragraph => {
    let processed = paragraph;
    
    variables.forEach(variable => {
      const currentValue = variable.values[currentStarLevel - 1];
      const displayValue = variable.isPercent ? 
        `${currentValue}%` : 
        currentValue.toString();
      
      processed = processed.replace(
        new RegExp(variable.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        displayValue
      );
    });
    
    return processed;
  });
}