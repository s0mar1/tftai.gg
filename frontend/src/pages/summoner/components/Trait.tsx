import React from 'react';
import classNames from 'classnames';
import TraitHexIcon from './TraitHexIcon';
import { processTraitImageUrl, createImageErrorHandler } from '../../../utils/imageUtils';

interface TraitData {
  name: string;
  apiName?: string;
  style: string | number;
  tier_current: number;
  image_url?: string;
  icon?: string;
}

interface TraitProps {
  trait: TraitData;
  showCount?: boolean;
}

type HexVariant = 'none' | 'bronze' | 'silver' | 'gold' | 'chromatic' | 'prismatic';

const Trait: React.FC<TraitProps> = ({ trait, showCount = true }) => {
  // 디버깅을 위한 로그
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Trait component received:', {
      name: trait.name,
      style: trait.style,
      tier_current: trait.tier_current,
      image_url: trait.image_url,
      icon: trait.icon
    });
  }
  
  // 숫자와 문자열 스타일 모두 처리
  const STYLE_MAP: Record<number, HexVariant> = {
    0: 'none',
    1: 'bronze',
    2: 'bronze',
    3: 'silver',
    4: 'chromatic',
    5: 'gold',
    6: 'prismatic'
  };
  
  // 특성 스타일을 TraitHexIcon variant로 변환
  let hexVariant: HexVariant;
  
  if (typeof trait.style === 'number') {
    // 숫자인 경우 매핑 테이블 사용
    hexVariant = STYLE_MAP[trait.style] || 'none';
  } else {
    // 문자열인 경우 직접 변환
    hexVariant = trait.style as HexVariant;
    
    // 'unique' 스타일은 'chromatic'으로 변환
    if (hexVariant === 'unique' as any) {
      hexVariant = 'chromatic';
    }
    
    // 'inactive' 스타일은 'none'으로 변환
    if (hexVariant === 'inactive' as any) {
      hexVariant = 'none';
    }
    
    // 유효하지 않은 variant는 'none'으로 기본값 설정
    const validVariants: HexVariant[] = ['none', 'bronze', 'silver', 'gold', 'chromatic', 'prismatic'];
    if (!validVariants.includes(hexVariant)) {
      hexVariant = 'none';
    }
  }

  // 특성 아이콘 컨테이너 크기 (TraitHexIcon의 size prop과 일치)
  const traitIconSize: number = 32; // main.css의 trait-hexagon 기본 width와 일치

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
            src={(() => {
              // apiName이 있으면 사용, 없으면 name 사용
              const traitKey = trait.apiName || trait.name;
              const imageUrl = trait.image_url || processTraitImageUrl(traitKey);
              if (process.env.NODE_ENV === 'development') {
                console.log('🔍 Trait image URL:', imageUrl, 'for trait:', trait.name, 'apiName:', trait.apiName);
              }
              return imageUrl;
            })()} 
            alt={trait.name} 
            className="trait-img" 
            style={{ 
              position: 'absolute', 
              zIndex: 3, 
              width: 20, 
              height: 20 
            }}
            onError={createImageErrorHandler('trait')}
          />
      </div>

    </div>
  );
};

export default Trait;