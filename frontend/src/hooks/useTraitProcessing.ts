import { useMemo } from 'react';
import { useTFTData } from '../context/TFTDataContext';

interface StyleMap {
  [key: number]: string;
}

interface StyleOrder {
  [key: string]: number;
}

interface Palette {
  [key: string]: string;
}

interface ProcessedTrait {
  [key: string]: any;
  tier_current: number;
  currentThreshold: number;
  nextThreshold: number | null;
  style: string;
  styleOrder: number;
  isActive: boolean;
  color: string;
  iconFilter: string;
  image_url: string;
  name: string;
}

interface PlacedUnit {
  traits?: string[];
  [key: string]: any;
}

// 서머너 페이지와 동일한 스타일 매핑
const STYLE_MAP: StyleMap = {
  0: 'none',
  1: 'bronze', 
  3: 'silver',
  4: 'chromatic', // 5코스트 개인 시너지
  5: 'gold',
  6: 'prismatic'
};

const STYLE_ORDER: StyleOrder = { 
  prismatic: 6, 
  chromatic: 5, 
  gold: 4, 
  silver: 3, 
  bronze: 2, 
  none: 0 
};

const PALETTE: Palette = {
  bronze: '#C67A32',
  silver: '#BFC4CF',
  gold: '#FFD667',
  prismatic: '#CFF1F1',
  chromatic: '#FFA773',
  unique: '#FFA773',
  none: '#374151'
};

const getIconFilter = (color: string): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128 ? 'invert(1)' : 'none';
};

export const useTraitProcessing = (placedUnits: PlacedUnit[]) => {
  const tftDataResult = useTFTData();
  const { traits: allTraits = [] } = tftDataResult || {};

  // 특성별 유닛 개수 계산 (한국어 특성 이름 기준)
  const traitCount = useMemo(() => {
    const counts: { [key: string]: number } = {};
    if (!Array.isArray(placedUnits)) {
      return counts;
    }

    placedUnits.forEach((unit: PlacedUnit) => {
      if (unit.traits && Array.isArray(unit.traits)) {
        const uniqueTraits = new Set(unit.traits);
        uniqueTraits.forEach(koreanTraitName => {
          // 한국어 특성 이름을 그대로 키로 사용
          counts[koreanTraitName] = (counts[koreanTraitName] || 0) + 1;
        });
      }
    });
    
    return counts;
  }, [placedUnits]);

  // 특성 스타일 및 색상 계산 (한국어 특성 이름 기준)
  const processedTraits = useMemo((): ProcessedTrait[] => {
    if (!allTraits || allTraits.length === 0) {
      return [];
    }

    const calculatedTraits: ProcessedTrait[] = [];
    
    // traitCount의 한국어 특성 이름으로 순회
    for (const [koreanTraitName, count] of Object.entries(traitCount) as [string, number][]) {
      if (count === 0) continue;
      
      // allTraits에서 한국어 이름으로 특성 찾기
      const trait = allTraits.find(t => t.name === koreanTraitName);
      if (!trait) continue;

      const sortedEffects = [...trait.effects].sort((a, b) => a.minUnits - b.minUnits);
      
      let activeStyleKey = 'none';
      let currentThreshold = 0;
      let nextThreshold = null;

      for (const effect of sortedEffects) {
        if (count >= effect.minUnits) {
          currentThreshold = effect.minUnits;
          activeStyleKey = STYLE_MAP[effect.style] || 'bronze';
        } else if (nextThreshold === null) {
          nextThreshold = effect.minUnits;
        }
      }
      
      // 5코스트 개인 시너지 체크 (chromatic)
      const isUniqueChampionTrait = trait.apiName && (
        trait.apiName.toLowerCase().includes('uniquetrait') || 
        trait.apiName.toLowerCase().includes('overlord') ||
        trait.apiName.toLowerCase().includes('netgod') ||
        trait.apiName.toLowerCase().includes('virus') ||
        trait.apiName.toLowerCase().includes('viegouniquetrait')
      );
      
      if (isUniqueChampionTrait && count >= 1) {
        activeStyleKey = 'chromatic';
      }

      // 단일 effect이고 minUnits가 1인 경우 unique 처리
      if (sortedEffects.length === 1 && sortedEffects[0].minUnits === 1) {
        activeStyleKey = 'unique';
      }

      const isActive = count >= currentThreshold && currentThreshold > 0;
      const styleOrder = STYLE_ORDER[activeStyleKey] || 0;
      const color = PALETTE[activeStyleKey] || '#374151';

      // TraitHexIcon에서 사용하는 variant 형태로 변환
      const variant = activeStyleKey === 'unique' ? 'chromatic' : activeStyleKey;

      calculatedTraits.push({
        ...trait,
        tier_current: count,
        currentThreshold,
        nextThreshold,
        style: variant, // TraitHexIcon variant 형태
        styleOrder,
        isActive,
        color,
        iconFilter: getIconFilter(color),
        image_url: trait.icon, // Trait 컴포넌트에서 필요한 속성
        name: trait.name // 한국어 이름
      });
    }
    
    return calculatedTraits.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (b.styleOrder !== a.styleOrder) return b.styleOrder - a.styleOrder;
      return b.tier_current - a.tier_current;
    });
  }, [allTraits, traitCount]);

  return {
    processedTraits,
    traitCount
  };
};

export default useTraitProcessing;