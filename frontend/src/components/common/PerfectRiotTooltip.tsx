import React, { useMemo } from 'react';
import { Champion, Item } from '../../types';
import { getAbilityIconUrl, safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';
import { parseExactCommunityDragonData, replaceDescriptionPlaceholders } from '../../utils/exactTooltipParser';

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

interface PerfectRiotTooltipProps {
  champion: Champion;
  position: Position;
  items?: Item[];
  starLevel?: number;
}

const PerfectRiotTooltip: React.FC<PerfectRiotTooltipProps> = ({ 
  champion, 
  position, 
  items = [], 
  starLevel = 2 
}) => {
  
  if (!champion) return null;

  const { name = '', cost = 1 } = champion;
  const ability = champion.ability || champion.abilities?.[0];
  
  // 커뮤니티 드래곤 데이터 정확히 파싱
  const tooltipData = useMemo(() => {
    const parsed = parseExactCommunityDragonData(champion, ability);
    if (!parsed) return null;
    
    // 현재 별 레벨에 맞춰 설명 처리
    const processedDescription = replaceDescriptionPlaceholders(
      parsed.description,
      parsed.variables,
      starLevel
    );
    
    return {
      ...parsed,
      processedDescription
    };
  }, [champion, ability, starLevel]);
  
  if (!tooltipData) {
    return (
      <div
        className="fixed z-50 bg-[#010a13] border border-[#c8aa6e] rounded p-3 text-white"
        style={{ left: `${position.x}px`, top: `${position.y}px`, width: '350px' }}
      >
        <p className="text-gray-400">스킬 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }
  
  return (
    <div
      className="fixed z-50 bg-[#010a13] border border-[#c8aa6e] rounded text-white pointer-events-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: '400px',
        fontFamily: 'Spiegel, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '13px',
        lineHeight: '1.4'
      }}
    >
      {/* 챔피언 헤더 */}
      <div className="bg-[#0c1f1f] px-3 py-2 border-b border-[#1e2328]">
        <div className="flex items-center gap-2">
          <img 
            src={safeProcessImagePath(champion.tileIcon)} 
            alt={name} 
            className="w-8 h-8 rounded" 
            style={{ border: `1px solid ${costColors[cost]}` }}
            onError={createImageErrorHandler('champion')}
          />
          <span className="text-sm font-bold text-[#f0e6d2]">{name}</span>
        </div>
      </div>

      {/* 정확한 브라움 스타일 툴팁 */}
      <div className="px-4 py-3 space-y-2">
        {/* 스킬 이름 */}
        <div className="text-[#f0e6d2] font-bold text-base">
          {tooltipData.name}
        </div>
        
        {/* 스킬 타입 */}
        <div className="text-[#0596aa] text-sm">
          {tooltipData.type === 'Active' ? '액티브' : '패시브'}
        </div>
        
        {/* 구분선 */}
        <div className="text-gray-500 text-sm">|</div>
        
        {/* 마나 정보 */}
        <div className="space-y-1">
          <div className="text-[#0596aa] text-sm font-medium">mp</div>
          <div className="text-gray-300 text-sm">
            마나: {tooltipData.mana.start}/{tooltipData.mana.cost}
          </div>
        </div>
        
        {/* 스킬 설명 - 각 문단을 빈 줄로 구분 */}
        <div className="space-y-3 py-2">
          {tooltipData.processedDescription.map((paragraph, idx) => (
            <p key={idx} className="text-gray-300 text-sm leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
        
        {/* 수치 정보 - 정확한 브라움 형식 */}
        <div className="space-y-1 pt-1">
          {tooltipData.variables.map((variable, idx) => (
            <div key={idx} className="flex items-center">
              <span className="text-gray-300 text-sm min-w-[120px]">
                {variable.label}:
              </span>
              <span className="text-[#0596aa] font-mono text-sm ml-2">
                {variable.values.map((value, valueIdx) => (
                  <React.Fragment key={valueIdx}>
                    {valueIdx > 0 && (
                      <span className="text-gray-500 mx-1">/</span>
                    )}
                    <span 
                      className={valueIdx === starLevel - 1 ? 'text-white font-bold' : ''}
                    >
                      {variable.isPercent ? `${value}` : value}
                    </span>
                  </React.Fragment>
                ))}
                {variable.isPercent && <span className="text-gray-400">%</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerfectRiotTooltip;