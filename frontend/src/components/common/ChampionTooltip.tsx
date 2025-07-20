import React, { useEffect } from 'react';
import { useTFTData } from '../../context/TFTDataContext';
import TraitTooltipItem from './TraitTooltipItem';
import { generateTooltip } from '../../utils/abilityTemplates';
import { Champion } from '../../types';
import { createComponentLogger } from '../../utils/logger';
import { getAbilityIconUrl, preloadImage, safeProcessImagePath } from '../../utils/imageUtils';

const logger = createComponentLogger('ChampionTooltip');

const costColors: Record<number, string> = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getCostColor = (cost: number): string => costColors[cost] || costColors[1];

interface TraitData {
  icon: string;
  name: string;
}

interface TraitInfoProps {
  traitData: TraitData;
}

const TraitInfo: React.FC<TraitInfoProps> = ({ traitData }) => {
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

interface Position {
  x: number;
  y: number;
}

interface ChampionTooltipProps {
  champion: Champion;
  position: Position;
}

const ChampionTooltip = React.memo<ChampionTooltipProps>(function ChampionTooltip({ champion, position }) {
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
      logger.error('Failed to generate tooltip', error as Error, { championName: champion.name });
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
          <img src={safeProcessImagePath(champion.tileIcon)} alt={name} className="w-full h-full object-cover rounded-sm" />
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

