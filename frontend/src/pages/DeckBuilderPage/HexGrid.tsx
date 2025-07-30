import React from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';
import { Champion, Item } from '../../types';
import { safeProcessImagePath, createImageErrorHandler } from '../../utils/imageUtils';

// 타입 정의
export interface Position {
  x: number;
  y: number;
}

interface PlacedUnit extends Champion {
  pos: Position;
  star: number;
  items: Item[];
}

interface PlacedUnits {
  [key: string]: PlacedUnit;
}

interface DraggedUnit {
  championApiName?: string;
  unit?: PlacedUnit;
  fromKey?: string;
}

interface HexGridProps {
  placedUnits: PlacedUnits;
  onUnitAction: (draggedItem: DraggedUnit, targetPos: Position) => void;
  onSelectUnit: (pos: Position | null) => void;
  onUnitRemove: (pos: Position) => void;
  onItemDrop: (pos: Position, item: Item) => void;
  selectedKey: string | null;
}

interface HexCellProps {
  x: number;
  y: number;
  CELL: { w: number; h: number };
  SPACING: number;
  onUnitAction: (draggedItem: DraggedUnit, targetPos: Position) => void;
}

interface PlacedUnitProps {
  unit: PlacedUnit;
  pos: Position;
  CELL: { w: number; h: number };
  SPACING: number;
  isSelected: boolean;
  onUnitAction: (draggedItem: DraggedUnit, targetPos: Position) => void;
  onSelectUnit: (pos: Position | null) => void;
  onUnitRemove: (pos: Position) => void;
  onItemDrop: (pos: Position, item: Item) => void;
}


const HEX_CLIP = '50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%';
const COST_COLORS: { [key: number]: string } = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };

const HexGrid: React.FC<HexGridProps> = ({
  placedUnits,
  onUnitAction,
  onSelectUnit,
  onUnitRemove,
  onItemDrop,
  selectedKey,
}) => {
  const ROWS = 5;
  const COLS = 7;
  const CELL = { w: 80, h: 92 };
  const SPACING = 8;

  const WIDTH = COLS * (CELL.w + SPACING) + CELL.w / 2;
  const HEIGHT = ROWS * ((CELL.h * 0.75) + SPACING) + CELL.h * 0.25;

  const coords: Position[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) coords.push({ x, y });
  }

  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      {coords.map(({ x, y }) => (
        <HexCell
          key={`${y}-${x}`}
          x={x}
          y={y}
          CELL={CELL}
          SPACING={SPACING}
          onUnitAction={onUnitAction}
        />
      ))}

      {Object.entries(placedUnits).map(([key, unit]) => {
        const [y, x] = key.split('-').map(Number);
        return (
          <PlacedUnit
            key={key}
            unit={unit}
            pos={{ x, y }}
            CELL={CELL}
            SPACING={SPACING}
            isSelected={key === selectedKey}
            onUnitAction={onUnitAction}
            onSelectUnit={onSelectUnit}
            onUnitRemove={onUnitRemove}
            onItemDrop={onItemDrop}
          />
        );
      })}
    </div>
  );
}

const HexCell: React.FC<HexCellProps> = ({ x, y, CELL, SPACING, onUnitAction }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.UNIT, ItemTypes.PLACED_UNIT],
    drop: (item: DraggedUnit) => {
      const championApiName = item.championApiName || item.unit?.apiName;
      if (import.meta.env.DEV) {
        console.log('HexCell 드롭 받음:', { championApiName, position: { x, y }, item });
      }
      onUnitAction({ championApiName, fromKey: item.fromKey, unit: item.unit }, { x, y });
    },
    collect: (m) => ({ isOver: m.isOver({ shallow: true }), canDrop: m.canDrop() }),
    hover: (item: DraggedUnit) => {
      if (import.meta.env.DEV) {
        console.log('HexCell 위로 hover:', { x, y, item });
      }
    }
  });

  const offsetX = y % 2 ? CELL.w / 2 + SPACING / 2 : 0;
  const left = x * (CELL.w + SPACING) + offsetX;
  const top = y * ((CELL.h * 0.75) + SPACING);

  const borderColor = isOver && canDrop ? '#ffd700' : '#1f2937';

  return (
    <div ref={drop} className="absolute" style={{ left, top, width: CELL.w, height: CELL.h }}>
      <div
        className="w-full h-full"
        style={{
          clipPath: `polygon(${HEX_CLIP})`,
          backgroundColor: borderColor,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          className="w-[calc(100%-4px)] h-[calc(100%-4px)]"
          style={{
            clipPath: `polygon(${HEX_CLIP})`,
            backgroundColor: 'var(--background-base)',
          }}
        />
      </div>
    </div>
  );
}

const PlacedUnit: React.FC<PlacedUnitProps> = ({
  unit,
  pos,
  CELL,
  SPACING,
  isSelected,
  onSelectUnit,
  onUnitRemove,
  onItemDrop,
}) => {
  const tftDataResult = useTFTData();
  const { showTooltip, hideTooltip } = tftDataResult || {};
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PLACED_UNIT,
    item: { unit, fromKey: `${pos.y}-${pos.x}` },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const [{ isOver: isOverItem, canDrop: canDropItem }, dropItem] = useDrop({
    accept: ItemTypes.ITEM,
    drop: (draggedItem: { item: Item }) => {
      onItemDrop(pos, draggedItem.item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const offsetX = pos.y % 2 ? CELL.w / 2 + SPACING / 2 : 0;
  const left = pos.x * (CELL.w + SPACING) + offsetX;
  const top = pos.y * ((CELL.h * 0.75) + SPACING);

  const BORDER = 3;
  const cost = Number(unit.cost) || 1;
  const borderColor = COST_COLORS[cost];

  return (
    <div
      ref={node => drag(dropItem(node))}
      className={`absolute cursor-pointer ${isOverItem && canDropItem ? 'ring-4 ring-yellow-400' : ''}`}
      onClick={() => onSelectUnit(pos)}
      onContextMenu={(e) => {
        e.preventDefault();
        onUnitRemove(pos);
      }}
      onMouseEnter={(e) => {
        if (showTooltip && typeof showTooltip === 'function') {
          showTooltip(unit, e);
        } else {
          console.warn('showTooltip 함수가 없습니다:', { showTooltip, unit });
        }
      }}
      onMouseLeave={() => {
        if (hideTooltip && typeof hideTooltip === 'function') {
          hideTooltip();
        } else {
          console.warn('hideTooltip 함수가 없습니다:', { hideTooltip });
        }
      }}
      style={{
        left,
        top,
        width: CELL.w,
        height: CELL.h,
        opacity: isDragging ? 0.5 : 1,
        zIndex: 10,
      }}
    >
      <div
        className="w-full h-full"
        style={{
          clipPath: `polygon(${HEX_CLIP})`,
          background: borderColor,
        }}
      >
        <div
          className="w-full h-full"
          style={{
            clipPath: `polygon(${HEX_CLIP})`,
            transform: `scale(${(CELL.w - BORDER * 2) / CELL.w})`,
            transformOrigin: 'center',
          }}
        >
          <img
            src={safeProcessImagePath(unit.tileIcon || unit.image_url || unit.icon)}
            alt={unit.name}
            className="w-full h-full object-cover pointer-events-none"
            onError={createImageErrorHandler('champion')}
          />
        </div>
      </div>

      {unit.star > 0 && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-px text-brand-mint text-base font-bold"
          style={{ textShadow: '0 0 2px black', zIndex: 20 }}
        >
          {'★'.repeat(unit.star)}
        </div>
      )}

      {unit.items && unit.items.length > 0 && (
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 flex justify-center gap-px"
          style={{ zIndex: 20 }}
        >
          {unit.items.slice(0, 3).map(
            (item, idx) =>
              item.icon && (
                <img
                  key={idx}
                  src={safeProcessImagePath(item.icon)}
                  alt={item.name}
                  className="w-5 h-5 rounded-sm"
                  title={item.name}
                  onError={createImageErrorHandler('item')}
                />
              ),
          )}
        </div>
      )}
    </div>
  );
}

export default HexGrid;