import React, { useMemo } from 'react';
import { useTFTData } from '../../context/TFTDataContext';
import TraitHexIcon from '../../pages/summoner/components/TraitHexIcon';

const TraitTooltipItem = ({ traitName }) => {
  const { traits, krNameMap } = useTFTData();

  const traitData = useMemo(() => {
    if (!traits || !krNameMap || !traitName) return null;

    // 1. 한국어 특성명 → API명 변환
    let apiName = null;
    
    // krNameMap에서 역방향 검색 (한국어 → API명)
    const entries = krNameMap instanceof Map ? krNameMap.entries() : Object.entries(krNameMap);
    for (const [key, value] of entries) {
      if (value === traitName) {
        apiName = key;
        break;
      }
    }

    // API명을 찾지 못한 경우 원본 이름으로 시도
    if (!apiName) {
      apiName = traitName;
    }

    // 2. API명으로 특성 데이터 조회
    const trait = traits.find(t => t.apiName === apiName);
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
          src={traitData.icon} 
          alt={traitData.displayName} 
          style={{ 
            position: 'absolute', 
            zIndex: 3, 
            width: 10, 
            height: 10 
          }} 
        />
      </div>
      <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
        {traitData.displayName}
      </span>
    </div>
  );
};

export default TraitTooltipItem;