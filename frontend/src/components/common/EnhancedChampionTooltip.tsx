import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Champion, Item } from '../../types';
import { getAbilityIconUrl, safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';
import { translateAbility, getKoreanVariableLabel } from '../../utils/koreanAbilityTranslations';
import { calculateCombatStats, calculateSkillValue, replaceWithCalculatedValues } from '../../utils/improvedTooltipCalculator';

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

interface EnhancedChampionTooltipProps {
  champion: Champion | null;
  position: Position;
  items?: Item[];
  starLevel?: number;
}

const EnhancedChampionTooltip: React.FC<EnhancedChampionTooltipProps> = ({ 
  champion, 
  position, 
  items = [], 
  starLevel = 2 
}) => {
  const { t } = useTranslation();
  
  if (!champion) return null;

  const { name = '', cost = 1 } = champion;
  const ability = champion.ability || champion.abilities?.[0];
  
  // 전투 스탯 계산
  const combatStats = useMemo(() => {
    return calculateCombatStats(champion, items, starLevel);
  }, [champion, items, starLevel]);
  
  // 툴팁 데이터 처리 (롤체지지 스타일)
  const tooltipData = useMemo(() => {
    if (!ability) {
      return null;
    }
    
    // 스킬 번역
    const translatedAbility = translateAbility(ability);
    const skillName = translatedAbility.name || '알 수 없는 스킬';
    const skillDescription = translatedAbility.description || '';
    
    // 마나 정보
    let manaInfo = '';
    if (ability.manaStart !== undefined && ability.manaCost !== undefined) {
      manaInfo = `${ability.manaStart}/${ability.manaCost}`;
    }
    
    // 스킬 타입 (액티브/패시브)
    const skillType = manaInfo ? '액티브' : '패시브';
    
    // 설명문에 실제 수치 적용
    const processedDescription = replaceWithCalculatedValues(
      skillDescription,
      ability.variables || [],
      combatStats,
      starLevel,
      false
    );
    
    // 변수별 상세 수치 계산
    const skillValues = (ability.variables || []).map((variable: any) => {
      const calculated = calculateSkillValue(variable, combatStats, starLevel);
      const koreanLabel = getKoreanVariableLabel(variable.name.replace(/@/g, ''));
      
      return {
        label: koreanLabel,
        values: calculated.total, // [1성, 2성, 3성]
        currentValue: calculated.total[starLevel - 1],
        formula: calculated.formula
      };
    });
    
    return {
      name: skillName,
      type: skillType,
      mana: manaInfo,
      description: processedDescription,
      values: skillValues
    };
  }, [champion, ability, starLevel, combatStats, t]);
  
  if (!tooltipData) {
    return (
      <div
        className="fixed z-50 bg-[#010a13] border border-[#c8aa6e] rounded p-3 text-white pointer-events-none"
        style={{ left: `${position.x}px`, top: `${position.y}px`, width: '400px' }}
      >
        <p className="text-gray-400">스킬 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }
  
  return (
    <div
      className="fixed z-50 bg-[#010a13] border border-[#c8aa6e] rounded text-white pointer-events-none shadow-2xl"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: '420px',
        fontFamily: 'Spiegel, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '13px',
        lineHeight: '1.4'
      }}
    >
      {/* 챔피언 헤더 (롤체지지 스타일) */}
      <div className="bg-[#0c1f1f] px-4 py-3 border-b border-[#1e2328] flex items-center gap-3">
        <img 
          src={safeProcessImagePath(champion.tileIcon)} 
          alt={name} 
          className="w-10 h-10 rounded-sm" 
          style={{ border: `2px solid ${costColors[cost]}` }}
          onError={createImageErrorHandler('champion')}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold text-[#f0e6d2]">{name}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold" style={{ color: costColors[cost] }}>{cost}</span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: costColors[cost] }} />
            </div>
          </div>
          {/* 별 표시 */}
          <div className="flex gap-1">
            {Array.from({ length: 3 }, (_, i) => (
              <div 
                key={i}
                className={`w-3 h-3 ${i < starLevel ? 'text-yellow-400' : 'text-gray-600'}`}
              >
                ★
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 스킬 정보 (세라핀 스타일 헤더) */}
      <div className="px-4 py-3 border-b border-[#1e2328]">
        <div className="mb-2">
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="text-[#f0e6d2] font-bold">{tooltipData.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#0596aa]">{tooltipData.type}</span>
            {tooltipData.mana && (
              <>
                <span className="text-gray-500">|</span>
                <span className="text-[#0596aa]">mp</span>
                <span className="text-gray-300">마나: {tooltipData.mana}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* 스킬 설명 */}
      <div className="px-4 py-3">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          {tooltipData.description}
        </p>
        
        {/* 스킬 수치 상세 정보 (롤체지지 스타일) */}
        {tooltipData.values.length > 0 && (
          <div className="space-y-2">
            {tooltipData.values.map((skillValue, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">
                  {skillValue.label}:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[#0596aa] font-mono text-sm">
                    {skillValue.values.map((value, valueIdx) => (
                      <React.Fragment key={valueIdx}>
                        {valueIdx > 0 && (
                          <span className="text-gray-500 mx-1">/</span>
                        )}
                        <span 
                          className={valueIdx === starLevel - 1 ? 'text-white font-bold' : 'text-gray-400'}
                        >
                          {value}
                        </span>
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 현재 전투력 정보 */}
      <div className="px-4 py-3 border-t border-[#1e2328] bg-[#0a1428]">
        <div className="space-y-1 text-xs">
          {combatStats.abilityPower > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">현재 주문력:</span>
              <span className="text-blue-400 font-mono">{combatStats.abilityPower}</span>
            </div>
          )}
          {combatStats.attackDamage > 100 && (
            <div className="flex justify-between">
              <span className="text-gray-400">현재 공격력:</span>
              <span className="text-red-400 font-mono">{Math.round(combatStats.attackDamage)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedChampionTooltip;