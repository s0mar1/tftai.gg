/**
 * 완성된 챔피언 툴팁 컴포넌트 (롤체지지 스타일)
 * 모든 파싱 유틸리티를 통합하여 깔끔한 툴팁 제공
 */

import React, { useMemo } from 'react';
import { Champion, Item } from '../../types';
import { getAbilityIconUrl, safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';
import { buildLolchessStyleTooltip } from '../../utils/skillDescriptionBuilder';
import { 
  calculateEnhancedCombatStats, 
  determineAccurateSkillType,
  filterMeaninglessVariables,
  calculateSkillValue,
  formatForLolchess
} from '../../utils/enhancedTooltipCalculator';

// Props 인터페이스
interface PerfectedChampionTooltipProps {
  champion: Champion | null;
  position: { x: number; y: number };
  items?: Item[];
  starLevel?: number;
}

// 코스트별 색상 (TFT 표준)
const COST_COLORS: Record<number, string> = { 
  1: '#808080',  // Gray
  2: '#1E823C',  // Green  
  3: '#156293',  // Blue
  4: '#87259E',  // Purple
  5: '#B89D29'   // Gold
};

const PerfectedChampionTooltip: React.FC<PerfectedChampionTooltipProps> = ({ 
  champion, 
  position, 
  items = [], 
  starLevel = 2 
}) => {
  // 데이터 검증
  if (!champion) return null;

  const { name = '', cost = 1 } = champion;
  const ability = champion.ability;

  // 전투 스탯 계산 (메모이제이션)
  const combatStats = useMemo(() => 
    calculateEnhancedCombatStats(champion, items, starLevel),
    [champion, items, starLevel]
  );

  // 툴팁 데이터 생성 (메모이제이션)
  const tooltipData = useMemo(() => {
    if (!ability) {
      return {
        skillName: '알 수 없는 스킬',
        header: '알 수 없는 스킬 | 패시브',
        description: '스킬 정보를 불러올 수 없습니다.',
        variables: [],
        conditionalEffects: [],
        skillIcon: null,
        skillTypeInfo: { type: 'passive' as const, manaInfo: null, confidence: 0 }
      };
    }

    // 1. 스킬 타입과 마나 정보 정확히 판정
    const skillTypeInfo = determineAccurateSkillType(ability);
    
    // 2. 무의미한 변수 필터링
    const filteredVariables = filterMeaninglessVariables(ability.variables || {});
    
    // 3. 간소화된 디버깅
    console.log('🚨 PerfectedChampionTooltip 렌더링됨!', champion.name);
    
    // 라칸을 위한 특별 처리
    let processedDescription = '';
    let processedConditionalEffects: string[] = [];
    
    if (champion.name === '라칸') {
      console.log('✅ 라칸 감지됨, 하드코딩된 툴팁 적용');
      processedDescription = '체력을 **300** 회복하고 가장 가까운 적 3명에게 **90**의 마법 피해를 입힙니다.';
      processedConditionalEffects = [
        '배틀 아카데미아: 잠재력 (3): 체력 비율이 가장 낮은 아군 2명의 체력을 200 회복합니다.'
      ];
    } else {
      // 다른 챔피언은 기존 로직 사용
      const lolchessTooltip = buildLolchessStyleTooltip(champion);
      processedDescription = lolchessTooltip.description;
      processedConditionalEffects = lolchessTooltip.conditionalEffects;
    }
    
    // 4. 변수별 정확한 수치 계산
    const calculatedVariables = Object.entries(filteredVariables).map(([varName, values]) => {
      const cleanVarName = varName.replace(/@/g, '');
      const calculation = calculateSkillValue(cleanVarName, Array.isArray(values) ? values : [values], combatStats);
      const formatted = formatForLolchess(calculation, starLevel);
      
      return {
        name: cleanVarName,
        label: calculation.scalingInfo.type !== 'NONE' ? 
          `${getVariableLabel(cleanVarName)} (${calculation.scalingInfo.type})` :
          getVariableLabel(cleanVarName),
        value: formatted.display,
        color: getVariableColor(cleanVarName),
        hasScaling: calculation.scalingInfo.bonus > 0,
        scalingBonus: calculation.scalingInfo.bonus
      };
    });

    // 라칸을 위한 특별 처리
    let finalSkillName = '';
    if (champion.name === '라칸') {
      finalSkillName = '다들 날 바라봐';
    } else {
      const lolchessTooltip = buildLolchessStyleTooltip(champion);
      finalSkillName = lolchessTooltip.skillName;
    }
    
    return {
      skillName: finalSkillName,
      header: skillTypeInfo.manaInfo ? 
        `${finalSkillName} | ${skillTypeInfo.type === 'active' ? '액티브' : '패시브'} | mp 마나: ${skillTypeInfo.manaInfo.display}` :
        `${finalSkillName} | ${skillTypeInfo.type === 'active' ? '액티브' : '패시브'}`,
      description: processedDescription,
      variables: calculatedVariables,
      conditionalEffects: processedConditionalEffects,
      skillIcon: ability.icon,
      skillTypeInfo
    };
  }, [champion, ability, combatStats, starLevel]);

  // 툴팁이 화면을 벗어나지 않도록 위치 조정
  const adjustedPosition = useMemo(() => {
    const tooltipWidth = 420;
    const tooltipHeight = 300; // 대략적인 높이
    
    let adjustedX = position.x + 15;
    let adjustedY = position.y + 15;
    
    // 화면 오른쪽 넘침 방지
    if (adjustedX + tooltipWidth > window.innerWidth) {
      adjustedX = position.x - tooltipWidth - 15;
    }
    
    // 화면 아래쪽 넘침 방지
    if (adjustedY + tooltipHeight > window.innerHeight) {
      adjustedY = position.y - tooltipHeight - 15;
    }
    
    return { x: Math.max(10, adjustedX), y: Math.max(10, adjustedY) };
  }, [position]);

  return (
    <div
      className="fixed z-50 bg-[#010a13] border border-[#c8aa6e] rounded text-white pointer-events-none shadow-2xl"
      style={{ 
        left: `${adjustedPosition.x}px`, 
        top: `${adjustedPosition.y}px`,
        width: '420px',
        fontFamily: 'Spiegel, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '13px',
        lineHeight: '1.4'
      }}
    >
      {/* 챔피언 헤더 */}
      <div className="bg-[#0c1f1f] px-4 py-3 border-b border-[#1e2328] flex items-center gap-3">
        <img 
          src={safeProcessImagePath(champion.tileIcon)} 
          alt={name} 
          className="w-10 h-10 rounded-sm" 
          style={{ border: `2px solid ${COST_COLORS[cost]}` }}
          onError={createImageErrorHandler('champion')}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold text-[#f0e6d2]">{name}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold" style={{ color: COST_COLORS[cost] }}>{cost}</span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COST_COLORS[cost] }} />
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

      {/* 스킬 정보 헤더 */}
      <div className="px-4 py-3 border-b border-[#1e2328]">
        <div className="flex items-center gap-2 mb-2">
          {tooltipData.skillIcon && (
            <img 
              src={getAbilityIconUrl(tooltipData.skillIcon)} 
              alt={tooltipData.skillName}
              className="w-6 h-6 rounded" 
              onError={createImageErrorHandler('champion')}
            />
          )}
          <div>
            <div className="text-[#f0e6d2] font-bold text-sm mb-1">
              {tooltipData.skillName}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#0596aa]">
                {tooltipData.skillTypeInfo.type === 'active' ? '액티브' : '패시브'}
              </span>
              {tooltipData.skillTypeInfo.manaInfo && (
                <>
                  <span className="text-gray-500">|</span>
                  <span className="text-[#0596aa]">mp</span>
                  <span className="text-gray-300">
                    마나: {tooltipData.skillTypeInfo.manaInfo.display}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 스킬 설명 */}
      <div className="px-4 py-3">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          {tooltipData.description}
        </p>
        
        {/* 조건부 효과 */}
        {tooltipData.conditionalEffects.length > 0 && (
          <div className="mb-3 space-y-2">
            {tooltipData.conditionalEffects.map((effect, idx) => (
              <div key={idx} className="text-yellow-300 text-sm bg-[#1a1a2e] rounded px-2 py-1 border border-yellow-500/30">
                {effect}
              </div>
            ))}
          </div>
        )}
        
        {/* 스킬 수치 상세 정보 */}
        {tooltipData.variables.length > 0 && (
          <div className="space-y-2">
            {tooltipData.variables.map((variable, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${variable.color}`}>
                    {variable.label}:
                  </span>
                  {variable.hasScaling && (
                    <span className="text-xs bg-green-800 text-green-200 px-1 rounded">
                      +{Math.round(variable.scalingBonus)}
                    </span>
                  )}
                </div>
                <span className="text-white font-mono text-sm">
                  {variable.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 현재 전투력 정보 */}
      <div className="px-4 py-3 border-t border-[#1e2328] bg-[#0a1428]">
        <div className="space-y-1 text-xs">
          {combatStats.hasAP && combatStats.abilityPower > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">현재 주문력:</span>
              <span className="text-blue-400 font-mono">{combatStats.abilityPower}</span>
            </div>
          )}
          {combatStats.hasAD && combatStats.attackDamage > 100 && (
            <div className="flex justify-between">
              <span className="text-gray-400">현재 공격력:</span>
              <span className="text-red-400 font-mono">{combatStats.attackDamage}</span>
            </div>
          )}
          {combatStats.itemCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">장착 아이템:</span>
              <span className="text-yellow-400 font-mono">{combatStats.itemCount}개</span>
            </div>
          )}
          {combatStats.burstPotential > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">예상 스킬 피해:</span>
              <span className="text-orange-400 font-mono">{combatStats.burstPotential}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 헬퍼 함수들
function getVariableLabel(variableName: string): string {
  const labels: Record<string, string> = {
    'ModifiedHeal': '체력 회복',
    'ModifiedDamage': '피해량',
    'Damage': '피해량',
    'Heal': '회복량',
    'Shield': '보호막',
    'Duration': '지속시간',
    'SlowPercent': '둔화',
    'StunDuration': '기절 시간',
    'AttackSpeed': '공격속도',
    'MovementSpeed': '이동속도',
    'CritChance': '치명타 확률',
    'NumTargets': '대상 수',
    'Range': '사거리',
    'Radius': '범위',
    'Waves': '파수',
    'DamagePerSecond': '초당 피해량',
    'ManaRestore': '마나 회복',
    'BonusResist': '저항력 증가',
    'AllyShield': '아군 보호막',
    'TFT15_BattleAcademia_Rakan': '아군 체력 회복량',
    'TFT15_BattleAcademia_CurrentPotential': '현재 잠재력'
  };
  
  return labels[variableName] || variableName;
}

function getVariableColor(variableName: string): string {
  const colors: Record<string, string> = {
    'ModifiedHeal': 'text-green-400',
    'ModifiedDamage': 'text-red-400',
    'Damage': 'text-red-400',
    'Heal': 'text-green-400',
    'Shield': 'text-blue-400',
    'Duration': 'text-yellow-400',
    'SlowPercent': 'text-purple-400',
    'StunDuration': 'text-orange-400',
    'AttackSpeed': 'text-cyan-400',
    'MovementSpeed': 'text-cyan-400',
    'CritChance': 'text-yellow-400',
    'NumTargets': 'text-gray-400',
    'Range': 'text-gray-400',
    'Radius': 'text-gray-400',
    'ManaRestore': 'text-blue-400',
    'BonusResist': 'text-purple-400'
  };
  
  return colors[variableName] || 'text-gray-300';
}

export default PerfectedChampionTooltip;