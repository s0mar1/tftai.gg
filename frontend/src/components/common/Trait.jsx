// frontend/src/components/common/Trait.jsx

import React from 'react';
import TraitHexIcon from '../../pages/summoner/components/TraitHexIcon';

const Trait = ({ trait, size = 20 }) => {
  // 특성 스타일을 TraitHexIcon variant로 변환
  let hexVariant = trait.style;
  
  // 'unique' 스타일은 'chromatic'으로 변환
  if (hexVariant === 'unique') {
    hexVariant = 'chromatic';
  }
  
  // 'inactive' 스타일은 'none'으로 변환
  if (hexVariant === 'inactive') {
    hexVariant = 'none';
  }
  
  // 유효하지 않은 variant는 'none'으로 기본값 설정
  const validVariants = ['none', 'bronze', 'silver', 'gold', 'chromatic', 'prismatic'];
  if (!validVariants.includes(hexVariant)) {
    hexVariant = 'none';
  }

  return (
    <div title={`${trait.name} (${trait.count})`}>
      <div style={{ 
          position: 'relative', 
          width: size, 
          height: size * 1.15,
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
      }}>
          <TraitHexIcon 
            variant={hexVariant} 
            size={size} 
            uniqueId={trait.uniqueId} 
          />
          <img 
            src={trait.icon} 
            alt={trait.name} 
            style={{ 
              position: 'absolute', 
              zIndex: 3, 
              width: size * 0.7, 
              height: size * 0.7,
              filter: hexVariant === 'none' ? 'grayscale(1) brightness(0.5)' : 'none'
            }}
          />
      </div>
    </div>
  );
};

export default Trait;
