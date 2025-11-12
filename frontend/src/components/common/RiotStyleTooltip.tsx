import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Champion, Item } from '../../types';
import { getAbilityIconUrl, safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';
import { calculateCombatStats, calculateSkillValue } from '../../utils/tooltipCalculator';

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

interface RiotStyleTooltipProps {
  champion: Champion;
  position: Position;
  items?: Item[];
  starLevel?: number;
}

const RiotStyleTooltip: React.FC<RiotStyleTooltipProps> = ({ 
  champion, 
  position, 
  items = [], 
  starLevel = 2 
}) => {
  const { t } = useTranslation();
  
  if (!champion) return null;

  const { name = '', cost = 1, traits = [] } = champion;
  const ability = champion.ability || champion.abilities?.[0];
  
  // 실제 전투 스탯 계산
  const combatStats = useMemo(() => {
    return calculateCombatStats(champion, items, starLevel);
  }, [champion, items, starLevel]);
  
  // 스킬 설명을 섹션별로 파싱
  const parsedAbility = useMemo(() => {
    if (!ability) return null;
    
    // 설명을 문단별로 분리 (빈 줄 또는 \n\n 기준)
    const paragraphs = (ability.desc || '').split(/\n\n|\. (?=[A-Z가-힣])/).filter(p => p.trim());
    
    // 변수들을 계산된 값으로 매핑
    const calculatedVariables = new Map<string, any>();
    (ability.variables || []).forEach((variable: any) => {
      const calculated = calculateSkillValue(variable, combatStats, starLevel);
      const varName = variable.name.replace(/@/g, '');
      calculatedVariables.set(varName, calculated);
    });
    
    return {
      name: ability.name,
      type: ability.abilityType || 'Active', // Active, Passive 등
      manaStart: ability.manaStart || 0,
      manaCost: ability.manaCost || 0,
      paragraphs,
      variables: calculatedVariables
    };
  }, [ability, combatStats, starLevel]);
  
  // 변수 라벨 매핑
  const getVariableLabel = (varName: string): string => {
    const labelMap: Record<string, string> = {
      'Damage': '피해량',
      'SecondaryDamage': '피해량',
      'ThrowDamage': '던지기 피해량',
      'ExecuteThreshold': '처형 기준값',
      'StunDuration': '기절 시간',
      'Duration': '지속시간',
      'Heal': '회복량',
      'Shield': '보호막',
      'AttackSpeed': '공격 속도',
      'MoveSpeed': '이동 속도',
      'ArmorReduction': '방어력 감소',
      'MRReduction': '마법 저항력 감소',
      'Range': '사거리',
      'Radius': '범위'
    };
    
    // 숫자가 포함된 변수명 처리 (예: Damage1, Damage2)
    const baseVarName = varName.replace(/\d+$/, '');
    return labelMap[baseVarName] || varName;
  };
  
  return (
    <div
      className="fixed z-50 bg-[#0a0e1a] border border-[#3c4043] rounded-md shadow-2xl text-white"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: '400px',
        fontFamily: 'Spiegel, Arial, sans-serif'
      }}
    >
      {/* 챔피언 헤더 */}
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0" 
            style={{ border: `2px solid ${costColors[cost]}` }}
          >
            <img 
              src={safeProcessImagePath(champion.tileIcon)} 
              alt={name} 
              className="w-full h-full object-cover" 
              onError={createImageErrorHandler('champion')}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold" style={{ color: costColors[cost] }}>
              {name}
            </h3>
            <div className="flex gap-2 mt-1">
              {traits.map((trait, idx) => (
                <span key={idx} className="text-xs text-gray-400">
                  {trait}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">코스트</div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold">{cost}</span>
              <div className="w-4 h-4 bg-[#c89b3c] rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 스킬 정보 */}
      {parsedAbility && (
        <div className="px-4 pb-4">
          <div className="border-t border-[#1e2328] pt-3">
            {/* 스킬 헤더 */}
            <div className="flex items-center gap-3 mb-3">
              <img 
                src={getAbilityIconUrl(ability.icon)} 
                alt={parsedAbility.name} 
                className="w-10 h-10 rounded border border-[#3c4043]" 
                onError={createImageErrorHandler('champion')}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#f0e6d2]">
                    {parsedAbility.name}
                  </h4>
                  <span className="text-xs text-gray-400 border-l border-gray-600 pl-2">
                    {parsedAbility.type === 'Passive' ? '패시브' : '액티브'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">마나</div>
                <div className="text-sm text-[#0596aa]">
                  {parsedAbility.manaStart}/{parsedAbility.manaCost}
                </div>
              </div>
            </div>
            
            {/* 스킬 설명 */}
            <div className="space-y-3 text-sm leading-relaxed">
              {parsedAbility.paragraphs.map((paragraph, idx) => (
                <p key={idx} className="text-gray-300">
                  {paragraph}
                </p>
              ))}
            </div>
            
            {/* 스킬 수치 */}
            {parsedAbility.variables.size > 0 && (
              <div className="mt-4 pt-3 border-t border-[#1e2328] space-y-1">
                {Array.from(parsedAbility.variables.entries()).map(([varName, calculated]) => {
                  const label = getVariableLabel(varName);
                  const values = calculated.total;
                  
                  // 백분율인지 확인
                  const isPercent = varName.toLowerCase().includes('percent') || 
                                   varName.toLowerCase().includes('ratio') ||
                                   varName.toLowerCase().includes('threshold');
                  
                  return (
                    <div key={varName} className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">{label}:</span>
                      <span className="text-sm text-[#0596aa] font-medium">
                        {values[0]} / {values[1]} / {values[2]}
                        {isPercent && '%'}
                        {calculated.bonus > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            (+{calculated.bonus})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiotStyleTooltip;