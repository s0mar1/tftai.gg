import { Champion, ChampionAbility } from '../types';

interface ParsedSkill {
  name: string;
  mana: string | null;
  description: string;
  stats: { key: string; value: string }[];
}

/**
 * 비정형 스킬 설명 문자열을 파싱하여 구조화된 객체로 변환합니다.
 * @param rawDescription 가공되지 않은 스킬 설명
 * @returns 파싱된 스킬 정보 객체 또는 null
 */
const parseUnstructuredSkill = (rawDescription: string | undefined | null): ParsedSkill | null => {
  if (!rawDescription) {
    return null;
  }

  const cleanedDescription = rawDescription.replace(/<br>/g, '\n').replace(/\n\s*\n/g, '\n').trim();
  const lines = cleanedDescription.split('\n');
  const result: ParsedSkill = { name: '', mana: null, description: '', stats: [] };

  const firstLine = lines.shift() || '';
  const headerParts = firstLine.split('|');
  result.name = headerParts[0]?.trim() || 'Unnamed Skill';
  
  const manaPart = headerParts.find(part => part.toLowerCase().includes('mana:') || part.includes('마나:'));
  if (manaPart) {
    result.mana = manaPart.split(':')[1]?.trim() || null;
  }

  const descriptionLines: string[] = [];
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':');
      const value = valueParts.join(':').trim();
      if (key && value && (/\d/.test(value) || value.includes('%'))) {
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

/**
 * 개별 챔피언 데이터를 받아 스킬 정보를 표준화된 형식으로 정제합니다.
 * @param champion 원본 챔피언 데이터 객체
 * @returns 스킬 정보가 정제된 챔피언 데이터 객체
 */
export const processChampionData = (champion: Champion): Champion => {
  const ability = champion.ability;
  if (!ability) {
    return champion;
  }

  const rawDesc = ability.desc || '';
  
  // `variables`가 없거나 비어있고, `desc`에 특정 구분자가 있을 때 비정형 데이터로 판단
  const hasNoVariables = !ability.variables || Object.keys(ability.variables).length === 0;
  const isUnstructured = hasNoVariables && 
    (rawDesc.includes('|') || rawDesc.split('\n').some(line => line.includes(':')));

  if (isUnstructured) {
    const parsedSkill = parseUnstructuredSkill(rawDesc);
    if (parsedSkill) {
      // 새로운 ability 객체를 생성하여 불변성을 유지
      const variablesObject: Record<string, number | string | boolean> = {};
      
      // 파싱된 스탯 정보를 variables 객체에 추가
      parsedSkill.stats.forEach(stat => {
        variablesObject[stat.key] = stat.value;
      });
      
      // 마나 정보가 있으면 추가
      if (parsedSkill.mana) {
        const manaParts = parsedSkill.mana.split('/');
        if (manaParts.length >= 2) {
          variablesObject.manaStart = parseInt(manaParts[0], 10) || 0;
          variablesObject.manaCost = parseInt(manaParts[1], 10) || 0;
        }
      }

      const newAbility: ChampionAbility = {
        ...ability,
        name: parsedSkill.name,
        desc: parsedSkill.description,
        variables: variablesObject
      };

      // 챔피언 객체에 새로운 ability 정보로 교체
      return {
        ...champion,
        ability: newAbility
      };
    }
  }

  return champion;
};