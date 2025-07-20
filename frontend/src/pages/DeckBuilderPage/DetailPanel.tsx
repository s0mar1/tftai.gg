import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTranslation } from 'react-i18next';
import { Champion, Item } from '../../types';
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
}

const COST_COLORS: { [key: number]: string } = {
    1: '#808080', 
    2: '#1E823C', 
    3: '#156293', 
    4: '#87259E', 
    5: '#B89D29'  
};

const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedUnit,
  onUnitRemove,
  onChangeStar,
  onEquip,
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

  return (
    <div ref={drop} className="bg-background-card dark:bg-dark-background-card p-3 rounded-lg text-text-primary dark:text-dark-text-primary space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
            <img 
                src={safeProcessImagePath(selectedUnit.tileIcon)} 
                alt={selectedUnit.name} 
                className="w-12 h-12 rounded-md" 
                style={{ border: `2px solid ${unitBorderColor}`}}
            />
            <div>
                <h2 className="text-lg font-bold">{selectedUnit.name}</h2>
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