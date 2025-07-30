/**
 * TFT Data Context - GraphQL 버전
 * 챔피언 데이터를 GraphQL로 조회하여 언어별 캐싱과 성능 최적화
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Champion, Item, Trait, Augment } from '../types';
import { useChampions, convertLanguageToGraphQL } from '../hooks/useGraphQLQueries';
import { useTFTTooltip } from './TFTTooltipContext';
import { useTFTLoading } from './TFTLoadingContext';

// 기존 타입들 유지 (호환성을 위해)
type TooltipableData = Champion | Item | Trait | Augment;
interface TooltipState {
  visible: boolean;
  data: TooltipableData | null;
  position: { x: number; y: number };
}

interface ItemsByCategory {
  basic: Item[];
  completed: Item[];
  ornn: Item[];
  radiant: Item[];
  emblem: Item[];
  unknown: Item[];
}

interface TFTData {
  champions: Champion[];
  items: ItemsByCategory;
  augments: Augment[];
  traits: Trait[];
  traitMap: Map<string, Trait>;
  krNameMap: Map<string, string>;
  currentSet: string;
}

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

export const TFTDataGraphQLContext = createContext<TFTDataContextValue>(defaultTFTDataValue);

interface TFTDataGraphQLProviderProps {
  children: React.ReactNode;
}

/**
 * GraphQL을 사용하는 TFT Data Provider
 */
export const TFTDataGraphQLProvider: React.FC<TFTDataGraphQLProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const graphqlLanguage = convertLanguageToGraphQL(i18n.language);
  
  // 🚀 GraphQL 챔피언 데이터 조회 - 언어별 캐싱
  const { 
    champions: graphqlChampions, 
    isLoading: championsLoading, 
    error: championsError,
    refetch: refetchChampions,
    success: championsSuccess,
    meta: championsMeta
  } = useChampions(graphqlLanguage);

  // 툴팁 상태 관리
  const tooltipState = useTFTTooltip();
  
  // 로딩 상태 관리 (기존 로직 유지)
  const loadingState = useTFTLoading();

  // GraphQL 챔피언 데이터를 기존 Champion 타입으로 변환
  const champions: Champion[] = useMemo(() => {
    if (!graphqlChampions || !championsSuccess) return [];

    return graphqlChampions.map(entry => ({
      // 기존 Champion 인터페이스에 맞게 변환
      name: entry.champion.name,
      apiName: entry.key,
      cost: entry.champion.cost,
      traits: entry.champion.traits,
      ability: entry.champion.ability ? {
        name: entry.champion.ability.name,
        description: entry.champion.ability.description
      } : undefined,
      stats: entry.champion.stats ? {
        health: entry.champion.stats.health,
        mana: entry.champion.stats.mana,
        damage: entry.champion.stats.damage,
        armor: entry.champion.stats.armor,
        magicResist: entry.champion.stats.magicResist,
        attackSpeed: entry.champion.stats.attackSpeed,
        critChance: entry.champion.stats.critChance
      } : undefined,
      // 추가 필드들 (기존 로직과 호환성을 위해)
      image_url: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/tft-champion/${entry.key}.png`,
      tags: entry.champion.traits,
      tier: 1 // 기본값
    }));
  }, [graphqlChampions, championsSuccess]);

  // 기존 데이터 구조 유지 (items, augments, traits는 추후 GraphQL로 전환 가능)
  const mockItems: ItemsByCategory = useMemo(() => ({
    basic: [],
    completed: [],
    ornn: [],
    radiant: [],
    emblem: [],
    support: [],
    robot: [],
    unknown: []
  }), []);

  const mockAugments: Augment[] = useMemo(() => [], []);
  const mockTraits: Trait[] = useMemo(() => [], []);

  // 트레이트 매핑
  const traitMap = useMemo(() => {
    const map = new Map<string, Trait>();
    mockTraits.forEach(trait => {
      map.set(trait.apiName, trait);
    });
    return map;
  }, [mockTraits]);

  // 한국어 이름 매핑
  const krNameMap = useMemo(() => {
    const map = new Map<string, string>();
    champions.forEach(champion => {
      if (champion.apiName && champion.name) {
        map.set(champion.apiName, champion.name);
      }
    });
    return map;
  }, [champions]);

  // 컨텍스트 값 구성
  const contextValue: TFTDataContextValue = useMemo(() => ({
    // GraphQL 데이터
    champions,
    
    // 기존 데이터 (추후 GraphQL로 전환 가능)
    items: mockItems,
    augments: mockAugments,
    traits: mockTraits,
    traitMap,
    krNameMap,
    currentSet: 'Set15', // 현재 세트 정보
    
    // 아이템 관련
    itemsByCategory: mockItems,
    allItems: [],
    
    // 상태 관리
    loading: championsLoading,
    error: championsError?.message || null,
    
    // 툴팁 상태
    tooltip: tooltipState.tooltip,
    showTooltip: tooltipState.showTooltip,
    hideTooltip: tooltipState.hideTooltip,
    
    // 재시도 로직
    retryCount: 0,
    canRetry: true,
    retry: () => {
      refetchChampions();
    }
  }), [
    champions,
    mockItems,
    mockAugments,
    mockTraits,
    traitMap,
    krNameMap,
    championsLoading,
    championsError,
    tooltipState,
    refetchChampions
  ]);

  // 개발 환경에서 성능 정보 로깅
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && championsMeta) {
      console.log('🚀 [TFT GraphQL] 챔피언 데이터 로드 완료:', {
        language: graphqlLanguage,
        processingTime: championsMeta.processingTime,
        championsCount: champions.length,
        version: championsMeta.version
      });
    }
  }, [championsMeta, graphqlLanguage, champions.length]);

  return (
    <TFTDataGraphQLContext.Provider value={contextValue}>
      {children}
    </TFTDataGraphQLContext.Provider>
  );
};

/**
 * GraphQL TFT 데이터 훅
 */
export const useTFTDataGraphQL = (): TFTDataContextValue => {
  const context = useContext(TFTDataGraphQLContext);
  
  if (!context) {
    console.error('❌ useTFTDataGraphQL: context가 undefined입니다!');
    console.error('❌ TFTDataGraphQLProvider가 이 컴포넌트를 감싸지 못했습니다!');
    return defaultTFTDataValue;
  }
  
  return context;
};

/**
 * 기존 useTFTData와 호환성을 위한 alias
 */
export const useTFTData = useTFTDataGraphQL;

export default TFTDataGraphQLProvider;