import React, { createContext, useContext, useMemo } from 'react';
import { Champion, Item, Trait, Augment } from '../types';
import { useTFTStaticData } from './TFTStaticDataContext';
import { useTFTTooltip } from './TFTTooltipContext';
import { useTFTLoading } from './TFTLoadingContext';

/**
 * TFT 통합 데이터 Context (호환성을 위한 래퍼)
 * 
 * 이 Context는 기존 코드 호환성을 위해 유지되며,
 * 내부적으로 분리된 Context들을 사용합니다:
 * - TFTStaticDataContext: 정적 데이터 (champions, items, traits, augments)
 * - TFTTooltipContext: 툴팁 상태 관리
 * - TFTLoadingContext: 로딩 상태 및 에러 처리
 */

// 툴팁 상태 타입
type TooltipableData = Champion | Item | Trait | Augment;
interface TooltipState {
  visible: boolean;
  data: TooltipableData | null;
  position: { x: number; y: number };
}

// 아이템 카테고리 타입
interface ItemsByCategory {
  basic: Item[];
  completed: Item[];
  ornn: Item[];
  radiant: Item[];
  emblem: Item[];
  support: Item[];
  robot: Item[];
  unknown: Item[];
}

// TFT 데이터 타입
interface TFTData {
  champions: Champion[];
  items: ItemsByCategory;
  augments: Augment[];
  traits: Trait[];
  traitMap: Map<string, Trait>;
  krNameMap: Map<string, string>;
  currentSet: string;
}

// 컨텍스트 값 타입
interface TFTDataContextValue extends TFTData {
  itemsByCategory: ItemsByCategory;
  allItems: Item[];
  loading: boolean;
  error: string | null;
  tooltip: TooltipState;
  showTooltip: (data: TooltipableData, event: React.MouseEvent) => void;
  hideTooltip: () => void;
  retryCount: number;
  canRetry: boolean;
  retry: () => void;
}

// 기본값
const defaultTFTDataValue: TFTDataContextValue = {
  champions: [],
  items: { 
    basic: [], completed: [], ornn: [], radiant: [], 
    emblem: [], support: [], robot: [], unknown: [] 
  },
  augments: [],
  traits: [],
  traitMap: new Map(),
  krNameMap: new Map(),
  currentSet: '',
  itemsByCategory: {
    basic: [], completed: [], ornn: [], radiant: [],
    emblem: [], support: [], robot: [], unknown: []
  },
  allItems: [],
  loading: true,
  error: null,
  tooltip: {
    visible: false,
    data: null,
    position: { x: 0, y: 0 },
  },
  showTooltip: () => {},
  hideTooltip: () => {},
  retryCount: 0,
  canRetry: false,
  retry: () => {},
};

export const TFTDataContext = createContext<TFTDataContextValue>(defaultTFTDataValue);

export const useTFTData = (): TFTDataContextValue => {
  const context = useContext(TFTDataContext);
  
  if (!context) {
    console.error('❌ useTFTData: context가 undefined입니다!');
    console.error('❌ TFTDataProvider가 이 컴포넌트를 감싸지 못했습니다!');
    return defaultTFTDataValue;
  }
  
  return context;
};

interface TFTDataProviderProps {
  children: React.ReactNode;
}

export const TFTDataProvider: React.FC<TFTDataProviderProps> = ({ children }) => {
  // 분리된 Context들에서 데이터 가져오기
  const staticData = useTFTStaticData();
  const tooltipState = useTFTTooltip();
  const loadingState = useTFTLoading();

  // 통합된 값 생성 (메모이제이션)
  const value = useMemo(() => ({
    // 정적 데이터 (TFTStaticDataContext에서)
    champions: staticData.champions,
    items: staticData.items,
    augments: staticData.augments,
    traits: staticData.traits,
    traitMap: staticData.traitMap,
    krNameMap: staticData.krNameMap,
    currentSet: staticData.currentSet,
    itemsByCategory: staticData.itemsByCategory,
    allItems: staticData.allItems,
    
    // 로딩 상태 (TFTLoadingContext에서)
    loading: staticData.loading,
    error: staticData.error,
    retryCount: staticData.retryCount,
    canRetry: staticData.canRetry,
    retry: staticData.retry,
    
    // 툴팁 상태 (TFTTooltipContext에서)
    tooltip: tooltipState.tooltip,
    showTooltip: tooltipState.showTooltip,
    hideTooltip: tooltipState.hideTooltip,
  }), [staticData, tooltipState, loadingState]);

  return (
    <TFTDataContext.Provider value={value}>
      {children}
    </TFTDataContext.Provider>
  );
};

// 편의 훅들 (기존 코드 호환성을 위해 유지)
export const useTFTChampions = () => {
  const { champions, loading, error } = useTFTData();
  return { champions, loading, error };
};

export const useTFTItems = () => {
  const { itemsByCategory, allItems, loading, error } = useTFTData();
  return { itemsByCategory, allItems, loading, error };
};

export const useTFTTraits = () => {
  const { traits, traitMap, loading, error } = useTFTData();
  return { traits, traitMap, loading, error };
};

// 내부 로직 숨기기 - 분리된 Context들을 직접 사용하는 것을 권장
export { useTFTStaticData } from './TFTStaticDataContext';
export { useTFTTooltip } from './TFTTooltipContext';
export { useTFTLoading } from './TFTLoadingContext';
export { TFTStaticDataProvider } from './TFTStaticDataContext';
export { TFTTooltipProvider } from './TFTTooltipContext';
export { TFTLoadingProvider } from './TFTLoadingContext';