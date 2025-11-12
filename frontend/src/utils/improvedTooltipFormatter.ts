/**
 * 개선된 툴팁 포맷터 - 사용자 친화적인 문장 구성
 */

import { Champion } from '../types';

interface TooltipOptions {
  currentStar?: number;
  showAllStars?: boolean;
  language?: string;
}

interface FormattedTooltip {
  mainDescription: string;
  details: DetailedInfo[];
  tags?: string[];
}

interface DetailedInfo {
  icon?: string;
  label: string;
  value: string;
  scaling?: string;
  description?: string;
}

/**
 * 별 레벨에 따른 값을 더 읽기 쉽게 포맷팅
 */
export function formatStarValues(
  values: number[], 
  currentStar: number = 2,
  showAll: boolean = false
): string {
  if (!values || values.length === 0) return '0';
  
  // 0번 인덱스는 0성이므로 1부터 시작
  const relevantValues = values.slice(1, 4);
  
  if (showAll) {
    // 모든 별 레벨 표시: "100 (★), 150 (★★), 200 (★★★)"
    return relevantValues
      .map((val, idx) => `${val} (${'★'.repeat(idx + 1)})`)
      .join(', ');
  } else {
    // 현재 별 레벨만 표시
    return String(relevantValues[currentStar - 1] || relevantValues[0]);
  }
}

/**
 * 플레이스홀더를 단계별로 처리하여 읽기 쉬운 문장 생성
 */
export function createReadableDescription(
  rawDescription: string,
  variables: any[],
  champion: Champion,
  options: TooltipOptions = {}
): FormattedTooltip {
  const { currentStar = 2, language = 'ko' } = options;
  
  // 1. 기본 정보 추출
  const details: DetailedInfo[] = [];
  let processedDesc = rawDescription;
  
  // 2. 주요 수치들을 별도로 추출
  variables.forEach(variable => {
    const varName = variable.name.replace(/@/g, '');
    const placeholder = new RegExp(`@${varName}@`, 'g');
    
    if (processedDesc.includes(`@${varName}@`)) {
      const values = variable.value;
      const formattedValue = formatStarValues(values, currentStar, false);
      
      // 변수 타입에 따른 라벨 설정
      let label = '';
      let icon = '';
      
      if (varName.toLowerCase().includes('damage')) {
        label = '피해량';
        icon = '⚔️';
      } else if (varName.toLowerCase().includes('heal')) {
        label = '회복량';
        icon = '💚';
      } else if (varName.toLowerCase().includes('shield')) {
        label = '보호막';
        icon = '🛡️';
      } else if (varName.toLowerCase().includes('duration')) {
        label = '지속시간';
        icon = '⏱️';
      } else if (varName.toLowerCase().includes('slow')) {
        label = '둔화';
        icon = '🐌';
      } else if (varName.toLowerCase().includes('stun')) {
        label = '기절';
        icon = '😵';
      }
      
      // 계수 정보 추출
      let scaling = '';
      if (varName.toLowerCase().includes('ap')) {
        scaling = 'AP';
      } else if (varName.toLowerCase().includes('ad')) {
        scaling = 'AD';
      }
      
      details.push({
        icon,
        label: label || varName,
        value: formattedValue,
        scaling,
        description: `${label}: ${formattedValue}${scaling ? ` (+${scaling})` : ''}`
      });
      
      // 본문에서는 간단하게 대체
      processedDesc = processedDesc.replace(placeholder, formattedValue);
    }
  });
  
  // 3. 문장을 더 자연스럽게 재구성
  processedDesc = improveReadability(processedDesc, language);
  
  // 4. 태그 추출 (스킬 특성)
  const tags = extractSkillTags(rawDescription, variables);
  
  return {
    mainDescription: processedDesc,
    details,
    tags
  };
}

/**
 * 문장 가독성 개선
 */
function improveReadability(text: string, language: string): string {
  if (language === 'ko') {
    // 한국어 개선
    text = text
      // 숫자 나열 정리
      .replace(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/g, '$2')  // 중간값만 표시
      // 문장 구조 개선
      .replace(/적을 (.+) 피해로 공격/g, '$1의 피해를 입힘')
      .replace(/(\d+)초 동안/g, '$1초간')
      .replace(/(\d+)% 둔화/g, '이동 속도 $1% 감소')
      // 더 자연스러운 표현
      .replace(/시전 시/g, '사용하면')
      .replace(/대상에게/g, '적에게');
  }
  
  return text;
}

/**
 * 스킬 특성 태그 추출
 */
function extractSkillTags(description: string, variables: any[]): string[] {
  const tags: string[] = [];
  
  // 범위 공격 여부
  if (description.includes('범위') || description.includes('주변')) {
    tags.push('광역');
  }
  
  // CC 효과
  if (description.includes('기절') || description.includes('스턴')) {
    tags.push('하드CC');
  }
  if (description.includes('둔화') || description.includes('감소')) {
    tags.push('소프트CC');
  }
  
  // 지속 효과
  if (description.includes('지속') || description.includes('동안')) {
    tags.push('지속효과');
  }
  
  // 회복/보호막
  if (description.includes('회복') || description.includes('치유')) {
    tags.push('회복');
  }
  if (description.includes('보호막') || description.includes('실드')) {
    tags.push('보호막');
  }
  
  return tags;
}

/**
 * 툴팁 섹션별 구성
 */
export function formatTooltipSections(
  champion: Champion,
  ability: any,
  options: TooltipOptions = {}
): {
  summary: string;
  mechanics: string[];
  details: DetailedInfo[];
  tips?: string[];
} {
  const formattedTooltip = createReadableDescription(
    ability.desc,
    ability.variables || [],
    champion,
    options
  );
  
  // 스킬 메커니즘 설명
  const mechanics: string[] = [];
  
  // 타겟팅 정보
  if (ability.targetingType) {
    const targetMap: Record<string, string> = {
      'single': '단일 대상',
      'aoe': '범위 공격',
      'line': '직선 범위',
      'cone': '원뿔 범위',
      'self': '자신'
    };
    mechanics.push(`대상: ${targetMap[ability.targetingType] || ability.targetingType}`);
  }
  
  // 사거리
  if (ability.range) {
    mechanics.push(`사거리: ${ability.range}칸`);
  }
  
  // 쿨다운
  if (ability.cooldown) {
    mechanics.push(`재사용 대기시간: ${ability.cooldown}초`);
  }
  
  return {
    summary: formattedTooltip.mainDescription,
    mechanics,
    details: formattedTooltip.details,
    tips: generateTips(champion, ability)
  };
}

/**
 * 스킬 사용 팁 생성
 */
function generateTips(champion: Champion, ability: any): string[] {
  const tips: string[] = [];
  
  // AP/AD 계수에 따른 아이템 추천
  const hasAP = ability.variables?.some((v: any) => 
    v.name.toLowerCase().includes('ap')
  );
  const hasAD = ability.variables?.some((v: any) => 
    v.name.toLowerCase().includes('ad')
  );
  
  if (hasAP) {
    tips.push('💡 주문력 아이템 추천');
  }
  if (hasAD) {
    tips.push('💡 공격력 아이템 추천');
  }
  
  // 마나 코스트에 따른 팁
  if (ability.manaCost > 100) {
    tips.push('💡 마나 아이템으로 스킬 사용 빈도 증가');
  }
  
  return tips;
}

export default {
  formatStarValues,
  createReadableDescription,
  formatTooltipSections
};