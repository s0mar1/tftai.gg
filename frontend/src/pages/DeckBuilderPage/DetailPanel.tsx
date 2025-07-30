import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTranslation } from 'react-i18next';
import { Champion, Item, PowerUp } from '../../types';
import { safeProcessImagePath } from '../../utils/imageUtils';

// 타입 정의
interface Position {
  x: number;
  y: number;
}

interface PlacedUnit extends Champion {
  pos: Position;
  star: number;
  items: Item[];
}

interface DetailPanelProps {
  selectedUnit: PlacedUnit | null;
  onUnitRemove: (pos: Position) => void;
  onChangeStar: (pos: Position, star: number) => void;
  onEquip: (pos: Position, item: Item) => void;
  onUnequip: (pos: Position, item: Item) => void;
  selectedPowerSnax?: { [round: string]: PowerUp | null };
}

const COST_COLORS: { [key: number]: string } = {
    1: '#808080', 
    2: '#1E823C', 
    3: '#156293', 
    4: '#87259E', 
    5: '#B89D29'  
};

// Set 15 롤 설정
const ROLE_CONFIG: { [key: string]: { color: string; icon: string; koreanName: string } } = {
  tank: { color: '#8B4513', icon: '🛡️', koreanName: '탱커' },
  fighter: { color: '#DC143C', icon: '⚔️', koreanName: '파이터' },
  assassin: { color: '#6A0DAD', icon: '🗡️', koreanName: '어쌔신' },
  caster: { color: '#4169E1', icon: '🔮', koreanName: '캐스터' },
  specialist: { color: '#FF8C00', icon: '⚙️', koreanName: '스페셜리스트' },
  marksman: { color: '#228B22', icon: '🏹', koreanName: '마크스맨' }
};

// Set 15 롤 배지 컴포넌트
interface RoleBadgeProps {
  role: string;
  size?: 'small' | 'medium' | 'large';
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'medium' }) => {
  const config = ROLE_CONFIG[role];
  if (!config) return null;

  const badgeSize = {
    small: 'w-4 h-4 text-[8px]',
    medium: 'w-6 h-6 text-[10px]',
    large: 'w-8 h-8 text-[12px]'
  }[size];
  
  const iconSize = {
    small: 'text-[6px]',
    medium: 'text-[8px]', 
    large: 'text-[10px]'
  }[size];

  return (
    <div 
      className={`${badgeSize} rounded-full flex items-center justify-center font-bold text-white shadow-sm`}
      style={{ backgroundColor: config.color }}
      title={config.koreanName}
    >
      <span className={iconSize}>{config.icon}</span>
    </div>
  );
};

const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedUnit,
  onUnitRemove,
  onChangeStar,
  onEquip,
  selectedPowerSnax = {},
}) => {
  const { t } = useTranslation();
  const [, drop] = useDrop({
    accept: ItemTypes.ITEM,
    drop: ({ item }: { item: Item }) => {
      if (selectedUnit) {
        onEquip(selectedUnit.pos, item);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  if (!selectedUnit) {
    return (
      <div className="bg-background-card dark:bg-dark-background-card p-3 rounded-lg text-text-primary dark:text-dark-text-primary text-sm">
        {t('deckBuilder.noUnitSelected')}
      </div>
    );
  }

  const unitBorderColor = COST_COLORS[selectedUnit.cost] || COST_COLORS[1];
  
  // Set 15 3성 5코스트 특수 효과 체크
  const hasFiveCostThreeStarEffect = selectedUnit.cost === 5 && selectedUnit.star === 3;

  return (
    <div ref={drop} className="bg-background-card dark:bg-dark-background-card p-3 rounded-lg text-text-primary dark:text-dark-text-primary space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                  src={safeProcessImagePath(selectedUnit.tileIcon)} 
                  alt={selectedUnit.name} 
                  className="w-12 h-12 rounded-md" 
                  style={{ border: `2px solid ${unitBorderColor}`}}
              />
              {/* Set 15 3성 5코스트 특수 효과 오버레이 */}
              {hasFiveCostThreeStarEffect && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">⚡</span>
                </div>
              )}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold">{selectedUnit.name}</h2>
                  {/* Set 15 롤 배지 */}
                  {selectedUnit.role && (
                    <RoleBadge role={selectedUnit.role} size="medium" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                    <div>
                        {[1, 2, 3].map(star => (
                        <span
                            key={star}
                            className={
                            selectedUnit.star >= star
                                ? 'text-brand-mint'
                                : 'text-text-secondary dark:text-dark-text-secondary'
                            }
                            style={{ cursor: 'pointer', fontSize: '1.2rem' }}
                            onClick={() => onChangeStar(selectedUnit.pos, star)}
                        >
                            ★
                        </span>
                        ))}
                    </div>
                    {/* 코스트 표시 */}
                    <div 
                      className="px-2 py-0.5 rounded text-xs text-white font-bold"
                      style={{ backgroundColor: unitBorderColor }}
                    >
                      {selectedUnit.cost}코스트
                    </div>
                </div>
            </div>
        </div>
        <button
          onClick={() => onUnitRemove(selectedUnit.pos)}
          className="text-error-red hover:text-error-red text-xl font-bold"
          title={t('common.delete')}
        >
          ×
        </button>
      </div>

      {/* Set 15 특성 정보 표시 */}
      {selectedUnit.traits && selectedUnit.traits.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2">특성</div>
          <div className="flex flex-wrap gap-1">
            {selectedUnit.traits.map((trait, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-background-base dark:bg-dark-background-base rounded text-xs text-text-primary dark:text-dark-text-primary"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Set 15 3성 5코스트 특수 효과 설명 */}
      {hasFiveCostThreeStarEffect && (
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 p-3 rounded-lg border border-yellow-300 dark:border-yellow-600">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚡</span>
            <div className="text-sm font-bold text-yellow-800 dark:text-yellow-200">3성 5코스트 특수 효과</div>
          </div>
          <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            <div>• CC(군중 제어) 효과에 면역</div>
            <div>• 초당 +20 마나 재생</div>
          </div>
        </div>
      )}

      {/* Set 15 롤 정보 표시 */}
      {selectedUnit.role && (
        <div>
          <div className="text-sm font-semibold mb-2">롤</div>
          <div className="flex items-center gap-2 p-2 bg-background-base dark:bg-dark-background-base rounded">
            <RoleBadge role={selectedUnit.role} size="medium" />
            <div>
              <div className="text-sm font-medium">{ROLE_CONFIG[selectedUnit.role]?.koreanName}</div>
              <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
                {selectedUnit.role === 'tank' && '전방에서 적의 공격을 받아내는 역할'}
                {selectedUnit.role === 'fighter' && '근접전에서 적과 맞서 싸우는 역할'}
                {selectedUnit.role === 'assassin' && '적 후방을 급습하여 딜러를 처치하는 역할'}
                {selectedUnit.role === 'caster' && '마법 피해로 적들을 공격하는 역할'}
                {selectedUnit.role === 'specialist' && '특수한 능력으로 팀을 지원하는 역할'}
                {selectedUnit.role === 'marksman' && '원거리에서 지속적인 피해를 주는 역할'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set 15 Power Snax 효과 표시 */}
      {Object.values(selectedPowerSnax).some(powerSnax => powerSnax !== null) && (
        <div>
          <div className="text-sm font-semibold mb-2 flex items-center gap-1">
            <span className="text-yellow-600 dark:text-yellow-400">⚡</span>
            Power Snax 효과
          </div>
          <div className="space-y-2">
            {(['1-3', '3-6'] as const).map(round => {
              const powerSnax = selectedPowerSnax[round];
              if (!powerSnax) return null;
              
              return (
                <div key={round} className="p-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium">
                      Round {round}
                    </span>
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {powerSnax.name}
                    </span>
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
                    {powerSnax.description}
                  </div>
                  {powerSnax.effects.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {powerSnax.effects.map((effect, index) => (
                        <div key={index} className="text-xs text-yellow-600 dark:text-yellow-400">
                          {effect.stat && effect.value && (
                            <span>• {effect.stat}: +{effect.value}</span>
                          )}
                          {effect.description && !effect.stat && (
                            <span>• {effect.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-base font-semibold">{t('deckBuilder.equippedItems')}</div>
      {/* 추천 아이템 섹션 */}
      <div>
        <div className="text-base font-semibold mb-1">{t('deckBuilder.items')}</div>
        <div className="flex flex-col gap-1.5">
          {(selectedUnit.recommendedItems || []).slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center bg-background-base dark:bg-dark-background-base p-1 rounded">
              <img src={item.icon} alt={item.name} className="w-8 h-8 rounded" />
              <div className="ml-2 flex-grow">
                <div className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">{item.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('stats.averagePlacement')}</div>
                <div className="text-sm font-bold text-brand-mint">#{(item.avgPlacement || 0).toFixed(2)}</div>
              </div>
            </div>
          ))}
          {(selectedUnit.recommendedItems || []).length === 0 && (
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('common.noData')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailPanel;