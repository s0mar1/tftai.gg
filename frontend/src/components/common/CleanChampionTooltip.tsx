import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Champion, Item } from '../../types';
import { getAbilityIconUrl, safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';
import { calculateCombatStats, calculateSkillValue } from '../../utils/tooltipCalculator';
import { parseRiotTooltip } from '../../utils/tooltipParser';

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

interface CleanChampionTooltipProps {
  champion: Champion;
  position: Position;
  items?: Item[];
  starLevel?: number;
}

const CleanChampionTooltip: React.FC<CleanChampionTooltipProps> = ({ 
  champion, 
  position, 
  items = [], 
  starLevel = 2 
}) => {
  const { t } = useTranslation();
  
  if (!champion) return null;

  const { name = '', cost = 1 } = champion;
  const ability = champion.ability || champion.abilities?.[0];
  
  // 실제 전투 스탯 계산
  const combatStats = useMemo(() => {
    return calculateCombatStats(champion, items, starLevel);
  }, [champion, items, starLevel]);
  
  // 라이엇 스타일로 파싱된 스킬 정보
  const tooltipData = useMemo(() => {
    if (!ability) return null;
    
    const parsed = parseRiotTooltip(ability);
    
    // 변수값 계산 및 대체
    const processedDescription = parsed.description.map(para => {
      let processed = para;
      
      // [varName] 형태를 실제 값으로 대체
      processed = processed.replace(/\[(\w+)\]/g, (match, varName) => {
        const variable = parsed.variables.find(v => v.key === varName);
        if (!variable) return match;
        
        // 현재 별 레벨의 값만 표시
        const value = variable.values[starLevel - 1];
        return variable.isPercent ? `${value}%` : String(value);
      });
      
      return processed;
    });
    
    return {
      ...parsed,
      processedDescription
    };
  }, [ability, starLevel, combatStats]);
  
  return (
    <div
      className="fixed z-50 bg-[#010a13] border border-[#c8aa6e] rounded shadow-2xl"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: '360px'
      }}
    >
      {/* 헤더 - 챔피언 정보 */}
      <div className="bg-[#0c1f1f] p-3 border-b border-[#1e2328]">
        <div className="flex items-center gap-3">
          <img 
            src={safeProcessImagePath(champion.tileIcon)} 
            alt={name} 
            className="w-10 h-10 rounded" 
            style={{ border: `2px solid ${costColors[cost]}` }}
            onError={createImageErrorHandler('champion')}
          />
          <div>
            <h3 className="text-white font-bold">{name}</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#c8aa6e]">코스트 {cost}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-400">★{starLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 스킬 정보 */}
      {tooltipData && (
        <div className="p-3">
          {/* 스킬 이름과 타입 */}
          <div className="mb-2">
            <h4 className="text-[#f0e6d2] font-bold mb-1">{tooltipData.name}</h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#0596aa]">
                {tooltipData.type === 'Active' ? '액티브' : '패시브'}
              </span>
              <span className="text-gray-600">|</span>
            </div>
          </div>
          
          {/* 마나 정보 */}
          {tooltipData.mana && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <span className="text-[#0596aa]">mp</span>
              <span className="text-gray-300">
                마나: {tooltipData.mana.start}/{tooltipData.mana.cost}
              </span>
            </div>
          )}
          
          {/* 스킬 설명 */}
          <div className="space-y-2 mb-4">
            {tooltipData.processedDescription.map((para, idx) => (
              <p key={idx} className="text-gray-300 text-sm leading-relaxed">
                {para}
              </p>
            ))}
          </div>
          
          {/* 스킬 수치 */}
          {tooltipData.variables.length > 0 && (
            <div className="border-t border-[#1e2328] pt-3 space-y-1">
              {tooltipData.variables.map((variable) => (
                <div key={variable.key} className="flex justify-between text-sm">
                  <span className="text-gray-400">{variable.label}:</span>
                  <span className="text-[#0596aa] font-mono">
                    {variable.values.map((v, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-gray-600"> / </span>}
                        <span className={i === starLevel - 1 ? 'text-white' : ''}>
                          {variable.isPercent ? `${v}%` : v}
                        </span>
                      </React.Fragment>
                    ))}
                    {variable.hasScaling && (
                      <span className="text-xs text-gray-500 ml-1">
                        <span className="text-gray-600">(</span>
                        <span className={
                          variable.scalingType === 'AP' ? 'text-blue-400' : 
                          variable.scalingType === 'AD' ? 'text-orange-400' : 
                          'text-green-400'
                        }>
                          +{variable.scalingType}
                        </span>
                        <span className="text-gray-600">)</span>
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CleanChampionTooltip;