import React, { useState } from 'react';
import { PowerSnax, PowerUp } from '../../api/index';

interface PowerSnaxCardProps {
  powerSnax: PowerSnax;
  onPowerUpSelect?: (powerUp: PowerUp) => void;
}

const PowerSnaxCard: React.FC<PowerSnaxCardProps> = ({ powerSnax, onPowerUpSelect }) => {
  const [selectedPowerUp, setSelectedPowerUp] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handlePowerUpClick = (powerUp: PowerUp) => {
    setSelectedPowerUp(powerUp.id === selectedPowerUp ? null : powerUp.id);
    onPowerUpSelect?.(powerUp);
  };

  const getRoundColor = (round: '1-3' | '3-6') => {
    return round === '1-3' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  };

  const getPowerUpTypeColor = (type: 'stats' | 'ability' | 'trait' | 'special') => {
    switch (type) {
      case 'stats': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ability': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'trait': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'special': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-background-card dark:bg-dark-background-card rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {powerSnax.icon && (
            <img 
              src={powerSnax.icon} 
              alt={powerSnax.name}
              className="w-8 h-8 rounded"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              {powerSnax.name}
            </h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoundColor(powerSnax.round)}`}>
              Round {powerSnax.round}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary"
        >
          <svg 
            className={`w-5 h-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Description */}
      <p className="text-text-secondary dark:text-dark-text-secondary text-sm mb-4">
        {powerSnax.description}
      </p>

      {/* Power Ups */}
      {showDetails && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-text-primary dark:text-dark-text-primary">
            Available Power-Ups:
          </h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {powerSnax.powerUps.map((powerUp) => (
              <div
                key={powerUp.id}
                className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                  selectedPowerUp === powerUp.id
                    ? 'border-brand-mint bg-brand-mint/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handlePowerUpClick(powerUp)}
              >
                <div className="flex items-start gap-2 mb-2">
                  {powerUp.icon && (
                    <img 
                      src={powerUp.icon} 
                      alt={powerUp.name}
                      className="w-6 h-6 rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <h5 className="font-medium text-text-primary dark:text-dark-text-primary text-sm">
                      {powerUp.name}
                    </h5>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPowerUpTypeColor(powerUp.type)}`}>
                      {powerUp.type}
                    </span>
                  </div>
                </div>
                <p className="text-text-secondary dark:text-dark-text-secondary text-xs mb-2">
                  {powerUp.description}
                </p>
                
                {/* Effects */}
                {powerUp.effects.length > 0 && (
                  <div className="space-y-1">
                    {powerUp.effects.map((effect, index) => (
                      <div key={index} className="text-xs">
                        {effect.stat && effect.value && (
                          <span className="text-text-primary dark:text-dark-text-primary font-medium">
                            {effect.stat}: +{effect.value}
                          </span>
                        )}
                        {effect.description && (
                          <p className="text-text-secondary dark:text-dark-text-secondary">
                            {effect.description}
                          </p>
                        )}
                        {effect.duration && effect.duration !== 'permanent' && (
                          <span className="text-text-secondary dark:text-dark-text-secondary italic">
                            ({typeof effect.duration === 'number' ? `${effect.duration}s` : effect.duration})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerSnaxCard;