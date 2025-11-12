import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PowerSnax, PowerUp } from '../../types';

interface PowerSnaxPanelProps {
  selectedPowerSnax: { [round: string]: PowerUp | null };
  onPowerSnaxSelect: (round: '1-3' | '3-6', powerUp: PowerUp | null) => void;
}

// 샘플 PowerSnax 데이터 (실제로는 API에서 가져와야 함)
interface PowerSnaxWithKeys extends Omit<PowerSnax, 'name' | 'description'> {
  name?: string;
  description?: string;
  nameKey?: string;
  descriptionKey?: string;
  powerUps: (Omit<PowerUp, 'name' | 'description'> & {
    name?: string;
    description?: string;
    nameKey?: string;
    descriptionKey?: string;
    effects: (PowerUp['effects'][0] & {
      descriptionKey?: string;
    })[];
  })[];
}

const SAMPLE_POWER_SNAX: PowerSnaxWithKeys[] = [
  {
    id: 'golden-ox',
    nameKey: 'powerSnax.goldenOx',
    descriptionKey: 'powerSnax.goldenOxDesc',
    round: '1-3',
    powerUps: [
      {
        id: 'gold-boost',
        nameKey: 'powerSnax.goldBoost',
        descriptionKey: 'powerSnax.goldBoostDesc',
        type: 'special',
        effects: [{ descriptionKey: 'powerSnax.goldBoostDesc', duration: 'permanent' }]
      },
      {
        id: 'trait-enhance',
        nameKey: 'powerSnax.traitEnhance',
        descriptionKey: 'powerSnax.traitEnhanceDesc',
        type: 'trait',
        effects: [{ descriptionKey: 'powerSnax.effects.allActiveTraitsLevel', duration: 'permanent' }]
      }
    ]
  },
  {
    id: 'combat-mastery',
    nameKey: 'powerSnax.combatMastery',
    descriptionKey: 'powerSnax.combatMasteryDesc',
    round: '3-6',
    powerUps: [
      {
        id: 'damage-boost',
        nameKey: 'powerSnax.damageBoost',
        descriptionKey: 'powerSnax.damageBoostDesc',
        type: 'stats',
        effects: [{ stat: 'damage', value: '20%', duration: 'permanent' }]
      },
      {
        id: 'health-boost',
        nameKey: 'powerSnax.healthBoost',
        descriptionKey: 'powerSnax.healthBoostDesc',
        type: 'stats',
        effects: [{ stat: 'health', value: '25%', duration: 'permanent' }]
      },
      {
        id: 'crit-master',
        nameKey: 'powerSnax.critMaster',
        descriptionKey: 'powerSnax.critMasterDesc',
        type: 'stats',
        effects: [
          { stat: 'critChance', value: '15%', duration: 'permanent' },
          { stat: 'critDamage', value: '30%', duration: 'permanent' }
        ]
      }
    ]
  }
];

const PowerSnaxPanel: React.FC<PowerSnaxPanelProps> = ({ selectedPowerSnax, onPowerSnaxSelect }) => {
  const { t } = useTranslation();
  const [expandedRound, setExpandedRound] = useState<'1-3' | '3-6' | null>(null);

  const roundData = useMemo(() => {
    return SAMPLE_POWER_SNAX.reduce((acc, snax) => {
      if (!acc[snax.round]) {
        acc[snax.round] = [];
      }
      acc[snax.round].push(snax);
      return acc;
    }, {} as { [key: string]: PowerSnax[] });
  }, []);

  const getRoundColor = (round: '1-3' | '3-6') => {
    return round === '1-3' 
      ? 'from-blue-500 to-blue-600'
      : 'from-purple-500 to-purple-600';
  };

  const getPowerUpTypeColor = (type: string) => {
    switch (type) {
      case 'stats': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ability': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'trait': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'special': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg text-text-primary dark:text-dark-text-primary space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">⚡</span>
        </div>
        <h3 className="text-lg font-bold">{t('powerSnax.title')}</h3>
      </div>

      <div className="space-y-3">
        {(['1-3', '3-6'] as const).map(round => (
          <div key={round} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Round 헤더 */}
            <div 
              className={`bg-gradient-to-r ${getRoundColor(round)} text-white p-3 cursor-pointer`}
              onClick={() => setExpandedRound(expandedRound === round ? null : round)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Round {round}</span>
                  {selectedPowerSnax[round] && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      {selectedPowerSnax[round]?.nameKey ? t(selectedPowerSnax[round].nameKey) : selectedPowerSnax[round]?.name}
                    </span>
                  )}
                </div>
                <svg 
                  className={`w-5 h-5 transform transition-transform ${expandedRound === round ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Power Ups */}
            {expandedRound === round && roundData[round] && (
              <div className="p-3 space-y-3">
                {roundData[round].map(snax => (
                  <div key={snax.id} className="space-y-2">
                    <div className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                      {snax.nameKey ? t(snax.nameKey) : snax.name}
                    </div>
                    <div className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2">
                      {snax.descriptionKey ? t(snax.descriptionKey) : snax.description}
                    </div>
                    <div className="grid gap-2">
                      {snax.powerUps.map(powerUp => {
                        const isSelected = selectedPowerSnax[round]?.id === powerUp.id;
                        return (
                          <div
                            key={powerUp.id}
                            className={`p-2 rounded border cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'border-brand-mint bg-brand-mint/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => onPowerSnaxSelect(round, isSelected ? null : powerUp)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                                    {powerUp.nameKey ? t(powerUp.nameKey) : powerUp.name}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPowerUpTypeColor(powerUp.type)}`}>
                                    {t(`powerSnax.type.${powerUp.type}`)}
                                  </span>
                                </div>
                                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-1">
                                  {powerUp.descriptionKey ? t(powerUp.descriptionKey) : powerUp.description}
                                </p>
                                {powerUp.effects.length > 0 && (
                                  <div className="space-y-0.5">
                                    {powerUp.effects.map((effect, index) => (
                                      <div key={index} className="text-xs">
                                        {effect.stat && effect.value && (
                                          <span className="text-brand-mint font-medium">
                                            {effect.stat}: +{effect.value}
                                          </span>
                                        )}
                                        {(effect.description || effect.descriptionKey) && (
                                          <div className="text-text-secondary dark:text-dark-text-secondary">
                                            {effect.descriptionKey ? t(effect.descriptionKey) : effect.description}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <div className="w-4 h-4 bg-brand-mint rounded-full flex items-center justify-center flex-shrink-0">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {/* 선택 해제 버튼 */}
                {selectedPowerSnax[round] && (
                  <button
                    onClick={() => onPowerSnaxSelect(round, null)}
                    className="w-full mt-2 p-2 text-xs text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary border border-gray-200 dark:border-gray-700 rounded hover:bg-background-base dark:hover:bg-dark-background-base transition-colors"
                  >
                    {t('powerSnax.deselect')}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 선택된 Power Snax 요약 */}
      <div className="mt-4 p-3 bg-background-base dark:bg-dark-background-base rounded border">
        <div className="text-sm font-semibold mb-2">{t('powerSnax.selected')}</div>
        <div className="space-y-1 text-xs">
          {(['1-3', '3-6'] as const).map(round => (
            <div key={round} className="flex justify-between">
              <span className="text-text-secondary dark:text-dark-text-secondary">{t('powerSnax.round')} {round}:</span>
              <span className="text-text-primary dark:text-dark-text-primary">
                {selectedPowerSnax[round]?.nameKey ? t(selectedPowerSnax[round].nameKey) : (selectedPowerSnax[round]?.name || t('powerSnax.notSelected'))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PowerSnaxPanel;