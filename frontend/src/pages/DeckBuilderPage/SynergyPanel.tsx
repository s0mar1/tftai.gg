import React, { useMemo } from 'react';
import { useTFTData } from '../../context/TFTDataContext';
import { useTranslation } from 'react-i18next';
import { useTraitProcessing } from '../../hooks/useTraitProcessing';
import Trait from '../../pages/summoner/components/Trait';
import { Champion, Trait as TraitType } from '../../types';

interface SynergyPanelProps {
  placedUnits: Champion[];
}

const SynergyPanel: React.FC<SynergyPanelProps> = ({ placedUnits }) => {
  const { t } = useTranslation();
  
  const unitsArray = useMemo(() => Object.values(placedUnits || {}), [placedUnits]);
  
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