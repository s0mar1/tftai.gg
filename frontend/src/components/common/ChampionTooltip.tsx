import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTFTData } from '../../context/TFTDataContext';
import TraitTooltipItem from './TraitTooltipItem';
import { Champion, Item } from '../../types';
import { createComponentLogger } from '../../utils/logger';
import { getAbilityIconUrl, safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';
import { calculateCombatStats, replaceWithCalculatedValues, calculateSkillValue, calculateSkillDPS } from '../../utils/tooltipCalculator';
import { translateAbility, getKoreanVariableLabel } from '../../utils/koreanAbilityTranslations';

const logger = createComponentLogger('ChampionTooltip');

const costColors: Record<number, string> = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getCostColor = (cost: number): string => costColors[cost] || costColors[1];

interface Position {
  x: number;
  y: number;
}

interface ChampionTooltipProps {
  champion: Champion;
  position: Position;
  items?: Item[];
  starLevel?: number;
}

const ChampionTooltip = React.memo<ChampionTooltipProps>(function ChampionTooltip({ champion, position, items = [], starLevel = 2 }) {
  const { t } = useTranslation();

  if (!champion) return null;

  const { name = '', cost = 1, traits = [], stats = {} } = champion;
  // 데이터 컨텍스트에서 이미 정제된 데이터를 받으므로, 그대로 사용합니다.
  const ability = champion.ability || champion.abilities?.[0];

  if (!name) return null;
  
  const displayTraits = traits.filter(Boolean);
  
  const combatStats = useMemo(() => {
    return calculateCombatStats(champion, items, starLevel);
  }, [champion, items, starLevel]);
  
  const tooltipData = React.useMemo(() => {
    if (!ability) {
      return { name: t('tooltip.unknownAbility'), mana: 'N/A', description: t('tooltip.noDescription'), values: [], dps: null };
    }

    // 스킬 이름과 설명을 한국어로 번역
    const translatedAbility = translateAbility(ability);
    const abilityName = translatedAbility.name || t('tooltip.unknownAbility');
    const abilityDescription = translatedAbility.description || t('tooltip.noDescription');

    // 중앙에서 데이터가 이미 처리되었으므로, 여기서는 계산 및 표시에만 집중합니다.
    const processedDescription = replaceWithCalculatedValues(
      abilityDescription,
      ability.variables || [],
      combatStats,
      starLevel,
      true
    );

    const calculatedValues = (ability.variables || []).map((variable: any) => {
      const calculated = calculateSkillValue(variable, combatStats, starLevel);
      const varName = variable.name.replace(/@/g, '');
      
      // 한국어 변수 라벨 사용
      let label = getKoreanVariableLabel(varName);
      let color = 'text-text-primary dark:text-dark-text-primary';
      
      // 변수 타입에 따른 색상 설정
      const lowerVarName = varName.toLowerCase();
      if (lowerVarName.includes('damage')) { label = '피해량'; color = 'text-red-400'; }
      else if (lowerVarName.includes('heal')) { label = '회복량'; color = 'text-green-400'; }
      else if (lowerVarName.includes('shield')) { label = '보호막'; color = 'text-blue-400'; }
      else if (lowerVarName.includes('duration')) { label = '지속시간'; color = 'text-yellow-400'; }
      else if (lowerVarName.includes('slow')) { label = '둔화'; color = 'text-purple-400'; }
      
      return { label, color, baseValue: calculated.base.join(' / '), totalValue: calculated.total.join(' / '), bonus: calculated.bonus, formula: calculated.formula };
    });

    const dpsInfo = calculateSkillDPS(ability, combatStats, starLevel);

    let manaInfo = 'N/A';
    if (ability.manaStart !== undefined && ability.manaCost !== undefined) manaInfo = `${ability.manaStart} / ${ability.manaCost}`;
    else if (ability.manaStart !== undefined) manaInfo = `${ability.manaStart}`;
    else if (stats?.mana) manaInfo = `0 / ${stats.mana}`;

    return { name: abilityName, mana: manaInfo, description: processedDescription, values: calculatedValues, dps: dpsInfo };
  }, [ability, stats, t, combatStats, starLevel]);
    
  return (
    <div
      className="fixed z-50 w-80 p-4 bg-background-card dark:bg-dark-background-card bg-opacity-95 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl text-text-primary dark:text-dark-text-primary pointer-events-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="flex items-start gap-3 pb-3">
        <div className="w-12 h-12 rounded" style={{ border: `2px solid ${getCostColor(cost)}` }}>
          <img 
            src={safeProcessImagePath(champion.tileIcon)} 
            alt={name} 
            className="w-full h-full object-cover rounded-sm" 
            onError={createImageErrorHandler('champion')}
          />
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
              <img 
                src={getAbilityIconUrl(ability.icon)} 
                alt={tooltipData.name} 
                className="w-8 h-8 rounded" 
                onError={createImageErrorHandler('champion')}
              />
              <p className="font-bold text-text-primary dark:text-dark-text-primary text-sm">{tooltipData.name}</p>
            </div>
            <p className="text-text-secondary dark:text-dark-text-secondary text-xs font-mono">{t('tooltip.mana')}: {tooltipData.mana}</p>
          </div>
          
          <div className="text-sm leading-relaxed whitespace-pre-wrap space-y-2">
            <p className="text-text-primary dark:text-dark-text-primary">
              {tooltipData.description}
            </p>
            {tooltipData.dps && tooltipData.dps.damage > 0 && (
              <div className="bg-background-base dark:bg-gray-800 rounded px-2 py-1 text-xs border border-gray-300 dark:border-gray-600">
                <span className="text-text-secondary dark:text-gray-400">예상 DPS: </span>
                <span className="text-orange-400 font-bold">{tooltipData.dps.dps}</span>
                <span className="text-text-secondary dark:text-gray-500"> (시전 시간: {tooltipData.dps.castTime}초)</span>
              </div>
            )}
          </div>
          
          {tooltipData.values.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="font-semibold text-text-primary dark:text-dark-text-primary text-sm border-b border-gray-300 dark:border-gray-600 pb-1">
                {t('tooltip.skillValues')} (★{starLevel})
              </p>
              <div className="space-y-2">
                {tooltipData.values.map((detail, i) => (
                  <div key={i} className="bg-background-base dark:bg-gray-800 rounded p-2 border border-gray-300 dark:border-gray-600">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-medium ${detail.color}`}>
                        {detail.label}
                      </span>
                      <span className="font-bold text-text-primary dark:text-dark-text-primary text-lg">
                        {detail.totalValue}
                      </span>
                    </div>
                    {detail.bonus > 0 && (
                      <div className="text-xs text-text-secondary dark:text-gray-400">
                        <span>기본: {detail.baseValue}</span>
                        <span className="text-green-400 ml-2">+{detail.bonus}</span>
                      </div>
                    )}
                    <div className="text-xs text-text-secondary dark:text-gray-500 mt-1">
                      {detail.formula}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-3 border-t border-gray-300 dark:border-gray-700">
        <div className="space-y-2">
          <p className="font-bold text-text-primary dark:text-dark-text-primary text-sm">{t('tooltip.recommendedItems')}</p>
          {combatStats.abilityPower > 0 && (
            <div className="text-xs text-blue-400">
              현재 주문력: {combatStats.abilityPower}
            </div>
          )}
          {combatStats.attackDamage > 100 && (
            <div className="text-xs text-red-400">
              현재 공격력: {combatStats.attackDamage.toFixed(0)}
            </div>
          )}
          <div className="flex gap-1.5">
            <p className="text-xs text-gray-500">{t('tooltip.noRecommendedItems')}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChampionTooltip;

