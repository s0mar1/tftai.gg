export interface ParsedSkill {
  name: string;
  mana: string | null;
  description: string;
  stats: { key: string; value: string }[];
}

/**
 * TFT 챔피언 스킬 설명 문자열을 구조화된 객체로 파싱합니다.
 * @param rawDescription API에서 받은 원본 스킬 설명 문자열.
 * @returns 파싱된 스킬 정보를 담은 객체.
 */
export const parseSkillTooltip = (rawDescription: string | undefined | null): ParsedSkill | null => {
  if (!rawDescription) {
    return null;
  }

  // 여러 개의 빈 줄을 하나로 처리하고, 앞뒤 공백 제거
  const cleanedDescription = rawDescription.replace(/\n\s*\n/g, '\n').trim();
  const lines = cleanedDescription.split('\n');

  const result: ParsedSkill = {
    name: '',
    mana: null,
    description: '',
    stats: [],
  };

  // 첫 줄 처리 (스킬명, 마나)
  const firstLine = lines.shift() || '';
  const headerParts = firstLine.split('|');
  result.name = headerParts[0]?.trim() || 'Unnamed Skill';
  
  const manaPart = headerParts.find(part => part.includes('마나:'));
  if (manaPart) {
    result.mana = manaPart.split(':')[1]?.trim() || null;
  }

  // 나머지 라인 처리 (설명, 스탯)
  const descriptionLines: string[] = [];
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':');
      const value = valueParts.join(':').trim();
      // 스탯 값에 슬래시(/)가 포함되어 있으면 유효한 스탯으로 간주 (예: "80 / 120 / 999")
      // 또는 값이 숫자로 시작하거나, %로 끝나거나, 특정 키워드를 포함하는 경우
      const isStatLike = /\d/.test(value) || value.endsWith('%') || ['피해량', '공격 속도', '체력', '방어력'].some(k => key.includes(k));
      
      if (key && value && isStatLike) {
        result.stats.push({ key: key.trim(), value });
      } else {
        descriptionLines.push(trimmedLine);
      }
    } else if (trimmedLine) {
      descriptionLines.push(trimmedLine);
    }
  });

  result.description = descriptionLines.join(' ');

  return result;
};
