import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTFTData } from '../../context/TFTDataContext';
import TraitTooltipItem from './TraitTooltipItem';
import { Champion } from '../../types';
import { formatTooltipSections } from '../../utils/improvedTooltipFormatter';
import { getAbilityIconUrl, safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';

const costColors: Record<number, string> = { 
  1: '#808080', 
  2: '#1E823C', 
  3: '#156293', 
  4: '#87259E', 
  5: '#B89D29' 
};

interface Position {
  x: number;
  y: number;
}

interface ImprovedChampionTooltipProps {
  champion: Champion;
  position: Position;
}

const ImprovedChampionTooltip: React.FC<ImprovedChampionTooltipProps> = ({ 
  champion, 
  position 
}) => {
  const { t } = useTranslation();
  const { hideTooltip } = useTFTData() || {};
  const [currentStar, setCurrentStar] = useState(2);
  
  if (!champion) return null;

  const { name = '', cost = 1, traits = [], stats = {} } = champion;
  const ability = champion.ability || champion.abilities?.[0];
  
  // 개선된 툴팁 데이터 생성
  const tooltipData = useMemo(() => {
    if (!ability) {
      return {
        summary: t('tooltip.noDescription'),
        mechanics: [],
        details: [],
        tips: []
      };
    }
    
    return formatTooltipSections(champion, ability, { 
      currentStar,
      language: 'ko' 
    });
  }, [ability, champion, currentStar, t]);
  
  // 마나 정보
  const manaInfo = useMemo(() => {
    if (!ability) return 'N/A';
    if (ability.manaStart !== undefined && ability.manaCost !== undefined) {
      return `${ability.manaStart} / ${ability.manaCost}`;
    }
    return stats?.mana ? `${stats.mana}` : 'N/A';
  }, [ability, stats]);
  
  return (
    <div
      className="fixed z-50 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl text-white pointer-events-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* 헤더 섹션 */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div 
              className="w-14 h-14 rounded-lg overflow-hidden" 
              style={{ border: `3px solid ${costColors[cost]}` }}
            >
              <img 
                src={safeProcessImagePath(champion.tileIcon)} 
                alt={name} 
                className="w-full h-full object-cover" 
                onError={createImageErrorHandler('champion')}
              />
            </div>
            {/* 별 레벨 선택기 */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5">
              {[1, 2, 3].map(star => (
                <button
                  key={star}
                  onClick={() => setCurrentStar(star)}
                  className={`text-xs ${
                    currentStar === star 
                      ? 'text-yellow-400' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  onMouseEnter={() => setCurrentStar(star)}
                >
                  {'★'.repeat(star)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1" style={{ color: costColors[cost] }}>
              {name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {traits.map((traitName, index) => (
                <TraitTooltipItem key={index} traitName={traitName} />
              ))}
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-brand-mint font-bold">
              <span className="text-lg">{cost}</span>
              <div className="w-5 h-5 bg-brand-mint rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 스킬 정보 섹션 */}
      {ability && (
        <div className="p-4 space-y-4">
          {/* 스킬 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={getAbilityIconUrl(ability.icon)} 
                alt={ability.name} 
                className="w-10 h-10 rounded-lg" 
                onError={createImageErrorHandler('champion')}
              />
              <div>
                <p className="font-bold text-base">{ability.name || t('tooltip.unknownAbility')}</p>
                <p className="text-xs text-gray-400">
                  {t('tooltip.mana')}: {manaInfo}
                </p>
              </div>
            </div>
          </div>
          
          {/* 스킬 설명 - 개선된 가독성 */}
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-sm leading-relaxed">
              {tooltipData.summary}
            </p>
          </div>
          
          {/* 스킬 메커니즘 */}
          {tooltipData.mechanics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tooltipData.mechanics.map((mechanic, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
                >
                  {mechanic}
                </span>
              ))}
            </div>
          )}
          
          {/* 상세 수치 정보 */}
          {tooltipData.details.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('tooltip.skillValues')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tooltipData.details.map((detail, i) => (
                  <div 
                    key={i} 
                    className="bg-gray-800 rounded-lg p-2 flex items-center gap-2"
                  >
                    {detail.icon && (
                      <span className="text-lg">{detail.icon}</span>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">{detail.label}</p>
                      <p className="text-sm font-bold text-white">
                        {detail.value}
                        {detail.scaling && (
                          <span className="ml-1 text-xs text-blue-400">
                            +{detail.scaling}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 스킬 태그 */}
          {tooltipData.tags && tooltipData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tooltipData.tags.map((tag, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 추천 아이템 & 팁 섹션 */}
      <div className="p-4 pt-0 space-y-3">
        {/* 추천 아이템 */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {t('tooltip.recommendedItems')}
          </p>
          <div className="flex gap-2">
            {champion.recommendedItems && champion.recommendedItems.length > 0 ? (
              champion.recommendedItems.map((item, idx) => (
                <div key={idx} className="w-8 h-8 bg-gray-800 rounded">
                  {/* 아이템 아이콘 */}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">{t('tooltip.noRecommendedItems')}</p>
            )}
          </div>
        </div>
        
        {/* 사용 팁 */}
        {tooltipData.tips && tooltipData.tips.length > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <div className="space-y-1">
              {tooltipData.tips.map((tip, idx) => (
                <p key={idx} className="text-xs text-gray-400">
                  {tip}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImprovedChampionTooltip;