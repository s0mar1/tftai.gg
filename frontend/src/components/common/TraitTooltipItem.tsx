import React, { useMemo } from 'react';
import { useTFTData } from '../../context/TFTDataContext';
import TraitHexIcon from '../../pages/summoner/components/TraitHexIcon';
import { processTraitImageUrl, createImageErrorHandler } from '../../utils/imageUtils';

interface TraitTooltipItemProps {
  traitName: string;
}

interface TraitDataWithDisplay {
  apiName: string;
  icon: string;
  displayName: string;
}

const TraitTooltipItem: React.FC<TraitTooltipItemProps> = ({ traitName }) => {
  const { traits, krNameMap } = useTFTData();

  const traitData = useMemo((): TraitDataWithDisplay | null => {
    if (!traits || !traitName) return null;

    // 1. 먼저 traits 배열에서 직접 한국어 이름으로 찾기
    let trait = traits.find(t => t.name === traitName);
    
    // 2. 찾지 못한 경우 API명으로 찾기 시도
    if (!trait) {
      trait = traits.find(t => t.apiName === traitName);
    }
    
    // 3. 여전히 찾지 못한 경우 krNameMap 사용
    if (!trait && krNameMap) {
      let apiName: string | null = null;
      
      // krNameMap에서 역방향 검색 (한국어 → API명)
      const entries = krNameMap instanceof Map ? krNameMap.entries() : Object.entries(krNameMap);
      for (const [key, value] of entries) {
        if (value === traitName) {
          apiName = key;
          break;
        }
      }
      
      if (apiName) {
        trait = traits.find(t => t.apiName === apiName);
      }
    }

    if (!trait) return null;

    return {
      ...trait,
      displayName: traitName // 한국어 이름 사용
    };
  }, [traitName, traits, krNameMap]);

  if (!traitData) {
    // 매핑 실패 시 단순 텍스트로 표시
    return (
      <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
        {traitName}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div style={{ 
        position: 'relative', 
        width: 16, 
        height: 16 * (115 / 100),
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <TraitHexIcon variant="bronze" size={16} />
        <img 
          src={(() => {
            const imageUrl = traitData.icon || processTraitImageUrl(traitData.apiName || traitData.displayName);
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 TraitTooltipItem image URL:', imageUrl, 'for trait:', traitData.displayName, 'apiName:', traitData.apiName);
            }
            return imageUrl;
          })()} 
          alt={traitData.displayName} 
          style={{ 
            position: 'absolute', 
            zIndex: 3, 
            width: 10, 
            height: 10 
          }} 
          onError={createImageErrorHandler('trait')}
        />
      </div>
      <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
        {traitData.displayName}
      </span>
    </div>
  );
};

export default TraitTooltipItem;