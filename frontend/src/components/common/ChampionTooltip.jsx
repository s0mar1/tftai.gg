import React, { useEffect } from 'react'; // useEffect 임포트
// PropTypes 제거 (TypeScript 전환 시 불필요)
import { useTFTData } from '../../context/TFTDataContext';
import TraitTooltipItem from './TraitTooltipItem';
// generateTooltip을 정적으로 로드하여 성능 향상
import { generateTooltip } from '../../utils/abilityTemplates';

// 이미지 캐시 Map을 모듈 스코프에서 관리하여 성능 최적화
const imageCache = new Map();

// 이미지 프리로딩 함수
const preloadImage = (url) => {
  if (imageCache.has(url)) {
    return imageCache.get(url);
  }
  
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => resolve(url); // 오류 발생 시에도 resolve
    img.src = url;
  });
  
  imageCache.set(url, promise);
  return promise;
};

// 챔피언의 스킬 아이콘 경로를 생성합니다.
const getAbilityIconUrl = (iconPath) => {
  if (!iconPath) return '';

  let cleanedPath = iconPath.toLowerCase().replace('.dds', '.png');

  // 1. 잘못된 전체 URL 접두사를 제거합니다.
  const incorrectPrefix = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/';
  if (cleanedPath.startsWith(incorrectPrefix)) {
    cleanedPath = cleanedPath.substring(incorrectPrefix.length);
  }

  // 2. 경로가 'assets/characters/'로 시작하는지 확인하고, 그렇지 않다면 올바른 구조를 만듭니다.
  if (!cleanedPath.startsWith('assets/characters/')) {
    let championName = '';
    // 경로에서 챔피언 이름 (예: tft14_renekton)을 추출합니다.
    const championNameMatch = cleanedPath.match(/(tft\d+_[a-zA-Z]+)/);
    if (championNameMatch && championNameMatch[1]) {
      championName = championNameMatch[1];
    } else {
      // 챔피언 이름을 추출할 수 없는 경우 경고를 출력하고 빈 문자열을 반환합니다.
      return ''; 
    }

    if (championName) {
      cleanedPath = `assets/characters/${championName}/hud/icons2d/${cleanedPath}`;
    }
  }

  const finalUrl = `https://raw.communitydragon.org/latest/game/${cleanedPath}`;
  
  // 이미지 프리로딩 시작
  preloadImage(finalUrl);
  
  return finalUrl;
};

const costColors = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getCostColor = cost => costColors[cost] || costColors[1];

const TraitInfo = ({ traitData }) => {
  if (!traitData || !traitData.icon) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 bg-background-card dark:bg-dark-background-card flex items-center justify-center rounded-full">
         <img src={traitData.icon} alt={traitData.name} className="w-4 h-4" />
      </div>
      <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{traitData.name}</span>
    </div>
  );
};

const ChampionTooltip = React.memo(function ChampionTooltip({ champion, position }) {
  const tftDataResult = useTFTData();
  const { hideTooltip } = tftDataResult || {}; // hideTooltip 가져오기

  if (!champion) return null;

  const { name = '', cost = 1, traits = [], stats = {}, recommendedItems = [] } = champion;
  const ability = champion.ability || champion.abilities?.[0];

  if (!name) return null;
  
  // 특성 이름을 직접 사용
  const displayTraits = traits.filter(Boolean); // null 또는 undefined 특성 제거
  
  // 툴팁 데이터를 즉시 생성 (로딩 지연 제거)
  const tooltipData = React.useMemo(() => {
    try {
      return generateTooltip(champion);
    } catch (error) {
      console.error('Failed to generate tooltip:', error);
      return {
        name: champion.ability?.name || 'Unknown Ability',
        mana: 'N/A',
        description: champion.ability?.desc || 'No description available',
        values: []
      };
    }
  }, [champion]);
    
  return (
    <div
      className="fixed z-50 w-80 p-4 bg-background-card dark:bg-dark-background-card bg-opacity-95 border border-gray-700 rounded-lg shadow-2xl text-white pointer-events-none fixed-overlay"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="flex items-start gap-3 pb-3">
        <div className="w-12 h-12 rounded" style={{ border: `2px solid ${getCostColor(cost)}` }}>
          <img src={champion.tileIcon} alt={name} className="w-full h-full object-cover rounded-sm" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-base" style={{ color: getCostColor(cost) }}>{name}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-1">
            {displayTraits.map((traitName, index) => (
              <TraitTooltipItem key={index} traitName={traitName} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 text-brand-mint font-bold">
            <span>{cost}</span>
            <div className="w-4 h-4 bg-brand-mint rounded-full" />
        </div>
      </div>

      {ability && tooltipData && (
        <div className="py-3 border-t border-gray-700 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src={getAbilityIconUrl(ability.icon)} alt={tooltipData.name} className="w-8 h-8 rounded" />
              <p className="font-bold text-text-primary dark:text-dark-text-primary text-sm">{tooltipData.name}</p>
            </div>
            <p className="text-text-secondary dark:text-dark-text-secondary text-xs font-mono">마나: {tooltipData.mana}</p>
          </div>
          
          <p className="text-text-secondary dark:text-dark-text-secondary text-xs leading-relaxed whitespace-pre-wrap">
            {tooltipData.description}
          </p>
          
          <div className="space-y-1.5 pt-1">
            {tooltipData.values.map((detail, i) => (
              <div key={i} className="text-text-secondary dark:text-dark-text-secondary text-xs flex justify-between">
                <span>{detail.label}</span>
                <span className="font-bold text-right text-brand-mint">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-gray-700">
        <p className="font-bold text-text-secondary dark:text-dark-text-secondary text-xs mb-1.5">추천 아이템</p>
        <div className="flex gap-1.5">
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">추천 아이템 정보가 없습니다.</p>
        </div>
      </div>
    </div>
  );
});

export default ChampionTooltip;

// PropTypes 제거 (TypeScript 전환으로 불필요)