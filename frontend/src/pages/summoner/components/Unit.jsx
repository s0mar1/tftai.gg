// frontend/src/pages/summoner/components/Unit.jsx

import React from 'react';
import Item from './Item';
import { useTFTData } from '../../../context/TFTDataContext';
import { useDarkMode } from '../../../hooks/useDarkMode';

const costColors = { 1:'#6B7280', 2:'#16A34A', 3:'#3B82F6', 4:'#9333EA', 5:'#FBBF24' };
const getCostColor     = c => costColors[c] || costColors[1];

const Unit = ({ unit, isCompact = false }) => {
  const costBorderColor = getCostColor(unit.cost);
  const isDarkMode = useDarkMode(); // 현재 다크 모드 여부 확인

  // 다크 모드일 때만 그림자 적용
  const textShadowStyle = isDarkMode ? '0 0 3px black, 0 0 3px black' : 'none';

  return (
    <div className="relative w-12 pt-2">
      <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 flex text-sm font-bold text-white z-10" style={{ color: costBorderColor, textShadow: textShadowStyle }}>
        {'★'.repeat(unit.tier)}
      </div>
      <img src={unit.image_url} alt={unit.name} className="w-full h-12 rounded-md block object-cover" style={{ border: `2px solid ${costBorderColor}` }} title={unit.name} />
      {!isCompact && (
        <div className="flex justify-center gap-px mt-0.5">
          {unit.items.map((item, index) => item.image_url && (
            <img key={index} src={item.image_url} alt={item.name} className="w-4 h-4 rounded-sm" />
          ))}
        </div>
      )}
    </div>
  );
};

export default Unit;