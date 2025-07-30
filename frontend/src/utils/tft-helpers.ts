// frontend/src/utils/tft-helpers.ts

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

interface TraitStyleInfo {
  name: string;
  apiName: string;
  image_url: string;
  tier_current: number;
  style: number;
  styleOrder: number;
}

/**
 * 특성의 스타일 정보를 반환하는 헬퍼 함수
 * GraphQL 버전에서는 TFT 정적 데이터 없이 단순화된 버전 사용
 */
export const getTraitStyleInfo = (
  traitName: string, 
  level: number
): TraitStyleInfo => {
  // 레벨에 따른 스타일 결정
  let style = 0;
  if (level >= 9) style = 6; // prismatic
  else if (level >= 6) style = 5; // gold
  else if (level >= 4) style = 3; // silver
  else if (level >= 2) style = 1; // bronze
  else if (level > 0) style = 1; // bronze
  
  const styleVariant = STYLE_MAP[style] || 'inactive';
  
  return {
    name: traitName,
    apiName: traitName,
    image_url: `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_${traitName.toLowerCase()}.png`,
    tier_current: level,
    style: style,
    styleOrder: STYLE_ORDER[styleVariant] || 0
  };
};

// 이미지 처리는 imageUtils로 이전되었습니다.
// 하위 호환성을 위해 re-export
import { fixChampionImageUrl as _fixChampionImageUrl } from './imageUtils';

/**
 * 챔피언 이미지 URL을 수정하는 헬퍼 함수
 * @deprecated imageUtils.fixChampionImageUrl 사용을 권장합니다
 */
export const fixChampionImageUrl = _fixChampionImageUrl;