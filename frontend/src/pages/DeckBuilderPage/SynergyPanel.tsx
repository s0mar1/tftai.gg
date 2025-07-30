import React, { useMemo } from 'react';
import { useTFTData } from '../../context/TFTDataContext';
import { useTranslation } from 'react-i18next';
import { useTraitProcessing } from '../../hooks/useTraitProcessing';
import Trait from '../../pages/summoner/components/Trait';
import { Champion, Trait as TraitType } from '../../types';

interface PlacedUnit extends Champion {
  pos?: { x: number; y: number };
  star?: number;
  items?: any[];
}

interface SynergyPanelProps {
  placedUnits: PlacedUnit[] | { [key: string]: PlacedUnit };
}

const SynergyPanel: React.FC<SynergyPanelProps> = ({ placedUnits }) => {
  const { t } = useTranslation();
  
  const unitsArray = useMemo(() => {
    if (!placedUnits) return [];
    
    // 배열인 경우 그대로 반환
    if (Array.isArray(placedUnits)) {
      console.log('SynergyPanel: placedUnits는 배열:', placedUnits);
      return placedUnits;
    }
    
    // 객체인 경우 값들을 배열로 변환
    const units = Object.values(placedUnits);
    console.log('SynergyPanel: placedUnits를 배열로 변환:', { 
      originalKeys: Object.keys(placedUnits),
      unitsCount: units.length,
      units: units.map(u => ({ name: u.name, traits: u.traits }))
    });
    return units;
  }, [placedUnits]);
  
  const { processedTraits } = useTraitProcessing(unitsArray);

  const allSynergies: TraitType[] = processedTraits;

  // Set 15 특성을 활성화된 것과 비활성화된 것으로 분리
  const activeSynergies = useMemo(() => 
    allSynergies.filter(trait => trait.isActive), 
    [allSynergies]
  );
  
  const inactiveSynergies = useMemo(() => 
    allSynergies.filter(trait => !trait.isActive && trait.tier_current > 0), 
    [allSynergies]
  );

  // Set 15 특성 타입별로 그룹화 (출신/직업)
  const { traits: allTraits = [] } = useTFTData() || {};
  const groupedSynergies = useMemo(() => {
    const origins = activeSynergies.filter(trait => {
      const traitData = allTraits.find(t => t.name === trait.name);
      return traitData?.type === 'origin';
    });
    
    const classes = activeSynergies.filter(trait => {
      const traitData = allTraits.find(t => t.name === trait.name);
      return traitData?.type === 'class';
    });
    
    return { origins, classes };
  }, [activeSynergies, allTraits]);

  return (
    <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg text-text-primary dark:text-dark-text-primary space-y-4">
      <h3 className="text-lg font-bold mb-2">{t('deckBuilder.synergies')}</h3>
      
      {allSynergies.length > 0 ? (
        <div className="space-y-4">
          {/* Set 15 활성화된 특성들 */}
          {activeSynergies.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                활성화된 특성 ({activeSynergies.length})
              </div>
              
              {/* 출신 특성 */}
              {groupedSynergies.origins.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-text-secondary dark:text-dark-text-secondary mb-1">출신</div>
                  <div className="flex flex-wrap gap-2">
                    {groupedSynergies.origins.map(trait => (
                      <div key={trait.apiName} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-md border border-green-200 dark:border-green-700">
                        <Trait trait={trait} showCount={true} />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {trait.name}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {trait.tier_current}
                            {trait.nextThreshold && `/${trait.nextThreshold}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 직업 특성 */}
              {groupedSynergies.classes.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-text-secondary dark:text-dark-text-secondary mb-1">직업</div>
                  <div className="flex flex-wrap gap-2">
                    {groupedSynergies.classes.map(trait => (
                      <div key={trait.apiName} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md border border-blue-200 dark:border-blue-700">
                        <Trait trait={trait} showCount={true} />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                            {trait.name}
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            {trait.tier_current}
                            {trait.nextThreshold && `/${trait.nextThreshold}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Set 15 비활성화된 특성들 (진행 중인 것들) */}
          {inactiveSynergies.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                진행 중인 특성 ({inactiveSynergies.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {inactiveSynergies.map(trait => (
                  <div key={trait.apiName} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md border border-amber-200 dark:border-amber-700 opacity-75">
                    <Trait trait={trait} showCount={true} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        {trait.name}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {trait.tier_current}
                        {trait.nextThreshold && `/${trait.nextThreshold}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Set 15 덱 통계 요약 */}
          <div className="mt-4 p-3 bg-background-base dark:bg-dark-background-base rounded-md border">
            <div className="text-sm font-semibold mb-2">덱 요약</div>
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
              <div>유닛 수: {unitsArray.length}/7</div>
              <div>활성 특성: {activeSynergies.length}개</div>
              <div>진행 중인 특성: {inactiveSynergies.length}개</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-text-secondary dark:text-dark-text-secondary text-sm mb-2">
            ⚔️ 챔피언을 보드에 배치해보세요
          </div>
          <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
            특성 시너지가 여기에 표시됩니다
          </div>
        </div>
      )}
    </div>
  );
}

export default SynergyPanel;