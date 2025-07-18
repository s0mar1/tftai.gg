import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';
import { Champion, Item, Trait, Augment } from '../types';

/**
 * TFT 툴팁 Context (자주 변하는 UI 상태)
 * - 툴팁 표시/숨김 상태
 * - 툴팁 위치 및 데이터
 */

// 툴팁 상태 타입
type TooltipableData = Champion | Item | Trait | Augment;

interface TooltipState {
  visible: boolean;
  data: TooltipableData | null;
  position: { x: number; y: number };
}

// 컨텍스트 값 타입
interface TFTTooltipContextValue {
  tooltip: TooltipState;
  showTooltip: (data: TooltipableData, event: React.MouseEvent) => void;
  hideTooltip: () => void;
  updateTooltipPosition: (x: number, y: number) => void;
}

// 기본값
const defaultTooltipValue: TFTTooltipContextValue = {
  tooltip: {
    visible: false,
    data: null,
    position: { x: 0, y: 0 },
  },
  showTooltip: () => {},
  hideTooltip: () => {},
  updateTooltipPosition: () => {},
};

export const TFTTooltipContext = createContext<TFTTooltipContextValue>(defaultTooltipValue);

export const useTFTTooltip = (): TFTTooltipContextValue => {
  const context = useContext(TFTTooltipContext);
  
  if (!context) {
    console.error('❌ useTFTTooltip: context가 undefined입니다!');
    return defaultTooltipValue;
  }
  
  return context;
};

interface TFTTooltipProviderProps {
  children: React.ReactNode;
}

export const TFTTooltipProvider: React.FC<TFTTooltipProviderProps> = ({ children }) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    data: null,
    position: { x: 0, y: 0 },
  });

  // 툴팁 표시 함수 (메모이제이션)
  const showTooltip = useCallback((data: TooltipableData, event: React.MouseEvent) => {
    const tooltipWidth = 320;
    const x = event.clientX + 15 + tooltipWidth > window.innerWidth
      ? event.clientX - tooltipWidth - 15
      : event.clientX + 15;
    const y = event.clientY + 15;

    setTooltip({
      visible: true,
      data: data,
      position: { x, y }
    });
  }, []);

  // 툴팁 숨김 함수 (메모이제이션)
  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // 툴팁 위치 업데이트 함수 (메모이제이션)
  const updateTooltipPosition = useCallback((x: number, y: number) => {
    setTooltip(prev => ({
      ...prev,
      position: { x, y }
    }));
  }, []);

  const value = useMemo(() => ({
    tooltip,
    showTooltip,
    hideTooltip,
    updateTooltipPosition,
  }), [tooltip, showTooltip, hideTooltip, updateTooltipPosition]);

  return (
    <TFTTooltipContext.Provider value={value}>
      {children}
    </TFTTooltipContext.Provider>
  );
};