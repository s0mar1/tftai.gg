// frontend/src/pages/summoner/components/Trait.jsx

import React from 'react';
import classNames from 'classnames';
import TraitHexIcon from './TraitHexIcon';

const Trait = ({ trait, showCount = true }) => {
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

  // 특성 아이콘 컨테이너 크기 (TraitHexIcon의 size prop과 일치)
  const traitIconSize = 32; // main.css의 trait-hexagon 기본 width와 일치

  // countBoxClassNames는 이제 사용되지 않으므로, 주석 처리합니다.
  // const countBoxClassNames = classNames(
  //   'trait-count-box',
  //   {
  //     [`trait-count-box--${trait.style}`]: trait.style && trait.style !== 'inactive',
  //     'trait-hexagon--inactive': trait.style === 'inactive', // 오타 수정
  //   }
  // );

  return (
    <div className="relative inline-flex items-center" title={`${trait.name} (${trait.tier_current})`}>
      {/* 육각형 배경과 특성 아이콘 */}
      <div style={{ 
          position: 'relative', 
          width: traitIconSize, 
          height: traitIconSize * (115 / 100),
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
      }}>
          <TraitHexIcon variant={hexVariant} size={traitIconSize} />
          {/* 특성 아이콘 이미지 */}
          <img 
            src={trait.image_url || trait.icon} 
            alt={trait.name} 
            className="trait-img" 
            style={{ 
              position: 'absolute', 
              zIndex: 3, 
              width: 20, 
              height: 20 
            }}
          />
      </div>

    </div>
  );
};

export default Trait;