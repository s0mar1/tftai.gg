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

  // 특성별 유닛 개수 계산 (영어 API 이름과 한국어 이름 모두 지원)
  const traitCount = useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    console.log('🔍 useTraitProcessing: 입력 데이터:', { 
      placedUnits, 
      isArray: Array.isArray(placedUnits),
      length: Array.isArray(placedUnits) ? placedUnits.length : 'not array',
      allTraitsCount: allTraits.length,
      sampleTraits: allTraits.slice(0, 5).map(t => ({ 
        apiName: t.apiName, 
        name: t.name, 
        type: t.type 
      })),
      allTraitsTypes: allTraits.map(t => t.type).filter((type, index, arr) => arr.indexOf(type) === index),
      originTraits: allTraits.filter(t => t.type === 'origin').slice(0, 3).map(t => ({ apiName: t.apiName, name: t.name })),
      classTraits: allTraits.filter(t => t.type === 'class').slice(0, 3).map(t => ({ apiName: t.apiName, name: t.name }))
    });
    
    if (!Array.isArray(placedUnits)) {
      console.log('useTraitProcessing: placedUnits가 배열이 아님');
      return counts;
    }

    // 한국어 특성 이름 검증 (이제 챔피언 traits가 이미 한국어로 변환되어 옴)
    const getKoreanTraitName = (traitName: string): string | null => {
      // 단순히 allTraits에서 해당 한국어 이름이 존재하는지 확인
      const foundTrait = allTraits.find(t => t.name === traitName);
      if (foundTrait) {
        return foundTrait.name;
      }
      
      console.warn(`⚠️ 특성을 찾을 수 없음: "${traitName}"`);
      return null;
    };

    placedUnits.forEach((unit: PlacedUnit) => {
      console.log('🔍 useTraitProcessing: 유닛 처리 중:', { 
        name: unit.name, 
        apiName: unit.apiName,
        traits: unit.traits,
        traitsType: typeof unit.traits,
        traitsIsArray: Array.isArray(unit.traits),
        traitsCount: unit.traits?.length || 0
      });
      
      if (unit.traits && Array.isArray(unit.traits)) {
        const uniqueTraits = new Set(unit.traits);
        console.log(`📊 ${unit.name}의 특성 목록:`, Array.from(uniqueTraits));
        
        uniqueTraits.forEach(traitName => {
          const koreanTraitName = getKoreanTraitName(traitName);
          
          if (koreanTraitName) {
            counts[koreanTraitName] = (counts[koreanTraitName] || 0) + 1;
            console.log('✅ useTraitProcessing: 특성 카운트 증가:', { 
              traitName: koreanTraitName, 
              count: counts[koreanTraitName] 
            });
          }
        });
      } else {
        console.warn('⚠️ useTraitProcessing: 유닛에 특성이 없거나 배열이 아님:', unit.name);
      }
    });
    
    console.log('useTraitProcessing: 최종 특성 카운트:', counts);
    return counts;
  }, [placedUnits, allTraits]);

  // 특성 스타일 및 색상 계산 (한국어 특성 이름 기준)
  const processedTraits = useMemo((): ProcessedTrait[] => {
    console.log('processedTraits 계산 시작:', { 
      allTraitsCount: allTraits.length,
      traitCount,
      traitCountKeys: Object.keys(traitCount)
    });
    
    if (!allTraits || allTraits.length === 0) {
      console.log('processedTraits: allTraits가 없음');
      return [];
    }

    const calculatedTraits: ProcessedTrait[] = [];
    
    // traitCount의 한국어 특성 이름으로 순회
    for (const [koreanTraitName, count] of Object.entries(traitCount) as [string, number][]) {
      console.log('processedTraits: 특성 처리 중:', { koreanTraitName, count });
      
      // 카운트가 0인 특성도 비활성 상태로 표시하기 위해 continue 제거
      // if (count === 0) continue;
      
      // allTraits에서 한국어 이름으로 특성 찾기
      const trait = allTraits.find(t => t.name === koreanTraitName);
      
      console.log('processedTraits: 특성 찾기 결과:', { 
        koreanTraitName, 
        found: !!trait,
        traitApiName: trait?.apiName 
      });
      
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
    
    const sortedTraits = calculatedTraits.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (b.styleOrder !== a.styleOrder) return b.styleOrder - a.styleOrder;
      return b.tier_current - a.tier_current;
    });
    
    console.log('processedTraits 계산 완료:', { 
      calculatedTraitsCount: calculatedTraits.length,
      activeTraitsCount: calculatedTraits.filter(t => t.isActive).length,
      traits: calculatedTraits.map(t => ({ 
        name: t.name, 
        count: t.tier_current, 
        isActive: t.isActive,
        style: t.style 
      }))
    });
    
    return sortedTraits;
  }, [allTraits, traitCount]);

  return {
    processedTraits,
    traitCount
  };
};

export default useTraitProcessing;