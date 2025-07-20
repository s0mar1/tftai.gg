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

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">{t('deckBuilder.synergies')}</h3>
      {allSynergies.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allSynergies.map(trait => (
            <div key={trait.apiName} className={`flex items-center gap-2 p-2 rounded-md ${
              trait.isActive 
                ? 'bg-background-base dark:bg-dark-background-base' 
                : 'bg-gray-100 dark:bg-gray-800 opacity-70'
            }`}>
              <Trait trait={trait} showCount={true} />
              <div className="flex flex-col">
                <span className={`text-sm font-semibold ${
                  trait.isActive 
                    ? 'text-text-primary dark:text-dark-text-primary' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{trait.name}</span>
                <span className={`text-xs ${
                  trait.isActive 
                    ? 'text-text-secondary dark:text-dark-text-secondary'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {trait.tier_current}/{trait.nextThreshold || trait.tier_current}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-primary dark:text-dark-text-primary text-sm">{t('deckBuilder.selectChampion')}</p>
      )}
    </div>
  );
}

export default SynergyPanel;