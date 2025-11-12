import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Champion, Item } from '../../types';
import { getAbilityIconUrl, safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';
import { calculateCombatStats } from '../../utils/tooltipCalculator';

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

interface ExactRiotTooltipProps {
  champion: Champion;
  position: Position;
  items?: Item[];
  starLevel?: number;
}

// 정확한 브라움 스타일 파싱
function parseExactTooltip(ability: any, combatStats: any, starLevel: number) {
  if (!ability || !ability.desc || !ability.variables) {
    return null;
  }

  const variables = ability.variables;
  const description = ability.desc;
  
  // 1. 설명을 문단으로 분리 (정확한 규칙)
  let paragraphs: string[] = [];
  
  // "이후"로 시작하는 부분을 새 문단으로 분리
  const mainParts = description.split(/\s*이후\s*/);
  paragraphs.push(mainParts[0]);
  
  if (mainParts.length > 1) {
    paragraphs.push('이후 ' + mainParts[1]);
  }
  
  // 2. 변수값 계산 및 매핑
  const calculatedVars: Array<{
    name: string;
    label: string;
    values: number[];
    order: number;
  }> = [];
  
  // 변수명을 정확한 한글 라벨로 매핑
  const getVariableLabel = (varName: string, order: number): string => {
    const cleanName = varName.replace(/@/g, '').toLowerCase();
    
    if (cleanName.includes('damage')) {
      if (order === 0) return '피해량';
      if (order === 1) return '피해량'; // 2차 피해량도 "피해량"으로 표시
      return '피해량';
    }
    if (cleanName.includes('throw')) return '던지기 피해량';
    if (cleanName.includes('execute') || cleanName.includes('threshold')) return '처형 기준값';
    if (cleanName.includes('stun')) return '기절 시간';
    if (cleanName.includes('duration')) return '지속시간';
    if (cleanName.includes('heal')) return '회복량';
    if (cleanName.includes('shield')) return '보호막';
    
    return cleanName;
  };
  
  // 3. 설명에 나타나는 순서대로 변수 처리
  let varOrder = 0;
  variables.forEach((variable: any) => {
    const varName = variable.name;
    if (description.includes(varName)) {
      // 실제 계산된 값 (별 레벨별)
      const baseValues = variable.value || [0, 0, 0, 0];
      
      // AP/AD 스케일링 적용
      let scalingBonus = 0;
      const cleanName = varName.replace(/@/g, '').toLowerCase();
      
      if (cleanName.includes('ap') || cleanName.includes('magic')) {
        scalingBonus = combatStats.abilityPower * 0.8; // 예시: 80% AP 스케일링
      } else if (cleanName.includes('ad') || cleanName.includes('attack')) {
        scalingBonus = combatStats.attackDamage * 1.2; // 예시: 120% AD 스케일링
      }
      
      const finalValues = [
        Math.round((baseValues[1] || 0) + scalingBonus),
        Math.round((baseValues[2] || 0) + scalingBonus * 1.5),
        Math.round((baseValues[3] || 0) + scalingBonus * 2.25)
      ];
      
      calculatedVars.push({
        name: varName,
        label: getVariableLabel(varName, varOrder),
        values: finalValues,
        order: varOrder
      });
      
      varOrder++;
    }
  });
  
  // 4. 설명에서 플레이스홀더를 현재 별 레벨값으로 교체
  const processedParagraphs = paragraphs.map(para => {
    let processed = para;
    calculatedVars.forEach(variable => {
      const placeholder = variable.name;
      const currentValue = variable.values[starLevel - 1];
      processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), currentValue.toString());
    });
    return processed;
  });
  
  return {
    name: ability.name || '알 수 없는 스킬',
    type: ability.abilityType === 'passive' ? '패시브' : '액티브',
    manaStart: ability.manaStart || 0,
    manaCost: ability.manaCost || 0,
    paragraphs: processedParagraphs,
    variables: calculatedVars
  };
}

const ExactRiotTooltip: React.FC<ExactRiotTooltipProps> = ({ 
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
  
  // 정확한 브라움 스타일 파싱
  const tooltipData = useMemo(() => {
    if (!ability) return null;
    return parseExactTooltip(ability, combatStats, starLevel);
  }, [ability, combatStats, starLevel]);
  
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
      className="fixed z-50 bg-[#010a13] border border-[#c8aa6e] rounded text-white"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: '380px',
        fontFamily: 'Spiegel, -apple-system, BlinkMacSystemFont, sans-serif'
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

      {/* 스킬 정보 - 정확한 브라움 형식 */}
      <div className="px-4 py-3">
        {/* 스킬 이름 */}
        <div className="text-[#f0e6d2] font-bold text-base mb-1">
          {tooltipData.name}
        </div>
        
        {/* 스킬 타입 */}
        <div className="text-[#0596aa] text-sm mb-1">
          {tooltipData.type}
        </div>
        
        {/* 구분선 */}
        <div className="text-gray-500 text-sm mb-2">|</div>
        
        {/* 마나 정보 */}
        <div className="mb-3">
          <div className="text-[#0596aa] text-xs mb-1">mp</div>
          <div className="text-gray-300 text-sm">
            마나: {tooltipData.manaStart}/{tooltipData.manaCost}
          </div>
        </div>
        
        {/* 스킬 설명 - 각 문단을 빈 줄로 구분 */}
        <div className="space-y-3 mb-4 text-sm leading-relaxed">
          {tooltipData.paragraphs.map((paragraph, idx) => (
            <p key={idx} className="text-gray-300">
              {paragraph}
            </p>
          ))}
        </div>
        
        {/* 수치 정보 - 정확한 형식 */}
        <div className="space-y-1">
          {tooltipData.variables.map((variable, idx) => (
            <div key={idx} className="text-sm">
              <span className="text-gray-300">{variable.label}: </span>
              <span className="text-[#0596aa] font-mono">
                {variable.values.map((value, valueIdx) => (
                  <React.Fragment key={valueIdx}>
                    {valueIdx > 0 && <span className="text-gray-500"> / </span>}
                    <span className={valueIdx === starLevel - 1 ? 'text-white font-bold' : ''}>
                      {value}
                    </span>
                  </React.Fragment>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExactRiotTooltip;