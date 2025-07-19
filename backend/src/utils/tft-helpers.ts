// backend/src/utils/tft-helpers.ts
import logger from '../config/logger';
import { Trait} from '../types/index';

// TFT API의 실제 스타일 번호 매핑
// Style 1 = Bronze, Style 3 = Silver, Style 4 = Chromatic (5코스트 개인시너지), Style 5 = Gold, Style 6 = Prismatic
const STYLE_MAP: Record<number, string> = {
  0: 'inactive',
  1: 'bronze',
  3: 'silver',
  4: 'chromatic', // 5코스트 개인 시너지
  5: 'gold',
  6: 'prismatic'
};

const STYLE_ORDER: Record<string, number> = { 
  prismatic: 6, 
  chromatic: 5, // 5코스트 개인 시너지
  gold: 4, 
  silver: 3, 
  bronze: 2, 
  inactive: 0 
};

interface TFTStaticData {
  traitMap?: Map<string, Trait>;
}

interface TraitStyleInfo {
  name: string;
  apiName: string;
  image_url: string;
  tier_current: number;
  style: string;
  styleOrder: number;
}

export const getTraitStyleInfo = (
  traitApiName: string, 
  currentUnitCount: number, 
  tftStaticData: TFTStaticData
): TraitStyleInfo | null => {
  if (!tftStaticData || !tftStaticData.traitMap) {
    logger.warn(`[getTraitStyleInfo] tftStaticData or traitMap is missing.`);
    return null;
  }
  
  const meta = tftStaticData.traitMap.get(traitApiName.toLowerCase());
  if (!meta) return null;

  let styleKey = 'inactive';
  let styleOrder = 0;
  
  // minUnits 기준으로 오름차순 정렬
  const sortedEffects = [...(meta.effects || [])].sort((a, b) => a.minUnits - b.minUnits);

  for (const effect of sortedEffects) {
    if (currentUnitCount >= effect.minUnits) {
      styleKey = STYLE_MAP[effect.style as number] || 'bronze';
      styleOrder = STYLE_ORDER[styleKey] || 0;
    } else {
      // 현재 유닛 수보다 높은 등급을 만나면 더 이상 순회할 필요가 없음
      break;
    }
  }

  // 5코스트 개인 시너지 체크 (chromatic)
  // 실제 API 이름 패턴을 기반으로 고유 특성 감지
  const isUniqueChampionTrait = meta.apiName && (
    meta.apiName.toLowerCase().includes('uniquetrait') || 
    meta.apiName.toLowerCase().includes('overlord') ||
    meta.apiName.toLowerCase().includes('netgod') ||
    meta.apiName.toLowerCase().includes('virus') ||
    meta.apiName.toLowerCase().includes('viegouniquetrait')
  );
  
  if (isUniqueChampionTrait && currentUnitCount >= 1) {
    styleKey = 'chromatic';
    styleOrder = STYLE_ORDER['chromatic'] || 5;
  }
  
  return {
    name: meta.name,
    apiName: traitApiName || meta.apiName || meta.name || 'unknown',
    image_url: meta.icon || '',
    tier_current: currentUnitCount,
    style: styleKey,
    styleOrder: styleOrder,
  };
};