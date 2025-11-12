/**
 * 라이엇 원본 툴팁 데이터 파싱 유틸리티
 * HTML 태그, 변수 플레이스홀더, 조건부 텍스트를 처리하여 깔끔한 텍스트로 변환
 */

// 라이엇 원본 툴팁 데이터 파싱에 필요한 타입들만 정의

// HTML 태그와 변수 매핑 타입
interface ParsedTooltip {
  cleanDescription: string;
  skillType: 'active' | 'passive';
  manaInfo: {
    start: number;
    cost: number;
    display: string;
  } | null;
  variables: ParsedVariable[];
  conditionalEffects: ConditionalEffect[];
}

interface ParsedVariable {
  name: string;
  koreanLabel: string;
  rawValues: number[];
  scalingType: 'AP' | 'AD' | 'HP' | 'NONE';
  color: string;
}

interface ConditionalEffect {
  condition: string;
  description: string;
  isActive: boolean;
}

// HTML 태그별 처리 매핑
const HTML_TAG_MAPPING: Record<string, string> = {
  'scaleHealth': '', // 체력 스케일링 태그 제거
  'magicDamage': '', // 마법 피해 태그 제거 
  'physicalDamage': '', // 물리 피해 태그 제거
  'trueDamage': '', // 고정 피해 태그 제거
  'healing': '', // 회복 태그 제거
  'shield': '', // 보호막 태그 제거
  'br': '\n', // 줄바꿈 태그를 실제 줄바꿈으로
  'spellActive': '',
  'mainText': '',
  'TFTBonus': '',
  'ShowIf': '',
  'ShowIfNot': '',
};

// 변수명 한국어 매핑 (확장된 버전)
const VARIABLE_KOREAN_MAPPING: Record<string, { label: string; color: string }> = {
  'ModifiedHeal': { label: '체력 회복', color: 'text-green-400' },
  'ModifiedDamage': { label: '피해량', color: 'text-red-400' },
  'Damage': { label: '피해량', color: 'text-red-400' },
  'Heal': { label: '회복량', color: 'text-green-400' },
  'Shield': { label: '보호막', color: 'text-blue-400' },
  'Duration': { label: '지속시간', color: 'text-yellow-400' },
  'SlowPercent': { label: '둔화', color: 'text-purple-400' },
  'StunDuration': { label: '기절 시간', color: 'text-orange-400' },
  'AttackSpeed': { label: '공격속도', color: 'text-cyan-400' },
  'CritChance': { label: '치명타 확률', color: 'text-yellow-400' },
  'NumTargets': { label: '대상 수', color: 'text-gray-400' },
  'Range': { label: '사거리', color: 'text-gray-400' },
  'ManaRestore': { label: '마나 회복', color: 'text-blue-400' },
  'BonusResist': { label: '저항력 증가', color: 'text-purple-400' },
};

// TFT Set별 조건부 키워드 매핑
const CONDITIONAL_KEYWORDS: Record<string, string> = {
  'TFT15_BattleAcademia_IsActive': '배틀 아카데미아',
  'TFT15_BattleAcademia_CurrentPotential': '잠재력',
  'TFT15_BattleAcademia_Rakan': '라칸 특성',
};

/**
 * HTML 태그 제거 함수
 */
function stripHtmlTags(text: string): string {
  // 1. 조건부 태그 먼저 처리
  let cleaned = text;
  
  // ShowIf/ShowIfNot 태그와 내용 제거
  cleaned = cleaned.replace(/<ShowIf[^>]*>.*?<\/ShowIf[^>]*>/gi, '');
  cleaned = cleaned.replace(/<ShowIfNot[^>]*>.*?<\/ShowIfNot[^>]*>/gi, '');
  
  // 2. 일반 HTML 태그 제거 (내용은 유지)
  cleaned = cleaned.replace(/<([^>]+)>/g, (match, tag) => {
    const tagName = tag.split(' ')[0].toLowerCase();
    return HTML_TAG_MAPPING[tagName] || '';
  });
  
  // 3. 여러 공백, 줄바꿈 정리
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * 변수 플레이스홀더 파싱
 */
function parseVariablePlaceholders(text: string): { text: string; variables: string[] } {
  const variables: string[] = [];
  const variableRegex = /@([A-Za-z0-9_.]+)/g;
  
  let match;
  while ((match = variableRegex.exec(text)) !== null) {
    variables.push(match[1]);
  }
  
  // 변수를 임시 플레이스홀더로 교체
  const cleanText = text.replace(variableRegex, '{$1}');
  
  return { text: cleanText, variables };
}

/**
 * 조건부 효과 파싱
 */
function parseConditionalEffects(originalText: string): ConditionalEffect[] {
  const effects: ConditionalEffect[] = [];
  
  // enabled= 속성이 있는 태그 찾기
  const conditionalRegex = /<([^>]+enabled\s*=\s*([^>\s]+)[^>]*)>(.*?)<\/[^>]+>/gi;
  
  let match;
  while ((match = conditionalRegex.exec(originalText)) !== null) {
    const [, , condition, content] = match;
    
    effects.push({
      condition: CONDITIONAL_KEYWORDS[condition || ''] || condition || '',
      description: stripHtmlTags(content || ''),
      isActive: false // 실제 게임 상태에 따라 결정됨
    });
  }
  
  return effects;
}

/**
 * 스킬 타입 결정 (액티브/패시브)
 */
function determineSkillType(ability: any): 'active' | 'passive' {
  // manaStart와 manaCost가 둘 다 있으면 액티브
  if ('manaStart' in ability && 'manaCost' in ability && 
      typeof ability.manaStart === 'number' && typeof ability.manaCost === 'number') {
    return 'active';
  }
  
  // 스킬 설명에서 패시브 키워드 체크
  const description = ability.desc?.toLowerCase() || '';
  if (description.includes('passive') || description.includes('패시브')) {
    return 'passive';
  }
  
  return 'passive'; // 기본값은 패시브
}

/**
 * 마나 정보 파싱
 */
function parseManaInfo(ability: any): ParsedTooltip['manaInfo'] {
  if ('manaStart' in ability && 'manaCost' in ability && 
      typeof ability.manaStart === 'number' && typeof ability.manaCost === 'number') {
    return {
      start: ability.manaStart,
      cost: ability.manaCost,
      display: `${ability.manaStart}/${ability.manaCost}`
    };
  }
  return null;
}

/**
 * 변수 데이터 파싱 및 한국어 라벨 매핑
 */
function parseVariables(variables: Record<string, any>): ParsedVariable[] {
  const parsed: ParsedVariable[] = [];
  
  Object.entries(variables).forEach(([key, value]) => {
    const cleanKey = key.replace(/@/g, '');
    const mapping = VARIABLE_KOREAN_MAPPING[cleanKey];
    
    if (mapping && Array.isArray(value)) {
      parsed.push({
        name: cleanKey,
        koreanLabel: mapping.label,
        rawValues: value,
        scalingType: determineScalingType(cleanKey),
        color: mapping.color
      });
    }
  });
  
  return parsed;
}

/**
 * 변수의 스케일링 타입 결정
 */
function determineScalingType(variableName: string): 'AP' | 'AD' | 'HP' | 'NONE' {
  const name = variableName.toLowerCase();
  
  if (name.includes('damage') || name.includes('heal')) {
    return 'AP'; // 대부분의 피해/회복은 AP 스케일링
  }
  
  if (name.includes('health') || name.includes('shield')) {
    return 'HP';
  }
  
  if (name.includes('attack') || name.includes('physical')) {
    return 'AD';
  }
  
  return 'NONE';
}

/**
 * 자연스러운 한국어 설명 생성
 */
function buildNaturalDescription(cleanText: string, variables: ParsedVariable[]): string {
  let description = cleanText;
  
  // 변수 플레이스홀더를 실제 값으로 교체
  variables.forEach(variable => {
    const placeholder = `{${variable.name}}`;
    const currentValue = variable.rawValues[1] || variable.rawValues[0] || 0; // 2성 기준
    description = description.replace(placeholder, `**${currentValue}**`);
  });
  
  // 영어 단어를 한국어로 교체
  const englishToKorean: Record<string, string> = {
    'and': '그리고',
    'magic': '마법',
    'damage': '피해를',
    'to the': '을',
    'nearest': '가장 가까운',
    'enemies': '적들에게',
    'heals': '회복하고',
    'restores': '회복시킵니다',
    'for': '동안',
    'seconds': '초',
    'Potential': '잠재력',
    'Current': '현재',
  };
  
  Object.entries(englishToKorean).forEach(([english, korean]) => {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    description = description.replace(regex, korean);
  });
  
  return description.trim();
}

/**
 * 메인 파싱 함수
 */
export function parseRiotTooltip(ability: any): ParsedTooltip {
  if (!ability || !ability.desc) {
    return {
      cleanDescription: '스킬 정보를 불러올 수 없습니다.',
      skillType: 'passive',
      manaInfo: null,
      variables: [],
      conditionalEffects: []
    };
  }
  
  const originalDesc = ability.desc;
  
  // 1. 조건부 효과 먼저 추출
  const conditionalEffects = parseConditionalEffects(originalDesc);
  
  // 2. HTML 태그 제거
  const strippedText = stripHtmlTags(originalDesc);
  
  // 3. 변수 플레이스홀더 파싱
  const { text: cleanText } = parseVariablePlaceholders(strippedText);
  
  // 4. 변수 데이터 파싱
  const variables = parseVariables(ability.variables || {});
  
  // 5. 자연스러운 한국어 설명 생성
  const naturalDescription = buildNaturalDescription(cleanText, variables);
  
  return {
    cleanDescription: naturalDescription,
    skillType: determineSkillType(ability),
    manaInfo: parseManaInfo(ability),
    variables,
    conditionalEffects
  };
}

/**
 * 롤체지지 스타일 포맷팅
 */
export function formatAsLolchessStyle(parsedTooltip: ParsedTooltip, skillName: string): {
  header: string;
  description: string;
  variables: Array<{ label: string; values: string; color: string }>;
  conditionalEffects: string[];
} {
  const { skillType, manaInfo, cleanDescription, variables, conditionalEffects } = parsedTooltip;
  
  // 헤더 구성: "스킬명 | 액티브 | mp 마나: 25/75"
  let header = skillName;
  header += ` | ${skillType === 'active' ? '액티브' : '패시브'}`;
  
  if (manaInfo && skillType === 'active') {
    header += ` | mp 마나: ${manaInfo.display}`;
  }
  
  // 변수 포맷팅: "피해량: 350 (350 / 400 / 625)"
  const formattedVariables = variables.map(variable => ({
    label: variable.koreanLabel,
    values: variable.rawValues.length > 1 
      ? `${variable.rawValues[1]} [${variable.rawValues.join(' / ')}]`
      : variable.rawValues[0]?.toString() || '0',
    color: variable.color
  }));
  
  // 조건부 효과 포맷팅
  const formattedConditionalEffects = conditionalEffects.map(effect => 
    `${effect.condition}: ${effect.description}`
  );
  
  return {
    header,
    description: cleanDescription,
    variables: formattedVariables,
    conditionalEffects: formattedConditionalEffects
  };
}

// 테스트용 예제
export function testRiotTooltipParser() {
  const testAbility: any = {
    name: "All Eyes On Me",
    desc: "회복 <scaleHealth>@ModifiedHeal (%i:scaleAP%)</scaleHealth> and 입힘 <magicDamage>@ModifiedDamage (%i:scaleAP%)</magicDamage> magic 피해 to the 3 가장 가까운 적들.<br><mainText enabled=TFT15_BattleAcademia_IsActive alternate=rules><spellActive enabled=TFT15_BattleAcademia_IsActive alternate=rules>Potential (@TFTUnitProperty.:TFT15_BattleAcademia_CurrentPotential)</spellActive>: 체력 비율이 가장 낮은 아군 2명의 체력을 @TFTUnitProperty.:TFT15_BattleAcademia_Rakan 회복합니다.</mainText>",
    variables: {
      'ModifiedHeal': [350, 400, 625],
      'ModifiedDamage': [80, 120, 180],
      'TFT15_BattleAcademia_Rakan': [55, 65, 85]
    },
    manaStart: 25,
    manaCost: 75
  };
  
  const parsed = parseRiotTooltip(testAbility);
  const formatted = formatAsLolchessStyle(parsed, "다들 날 바라봐");
  
  console.log('=== 파싱 결과 ===');
  console.log('헤더:', formatted.header);
  console.log('설명:', formatted.description);
  console.log('변수들:', formatted.variables);
  console.log('조건부 효과:', formatted.conditionalEffects);
  
  return formatted;
}