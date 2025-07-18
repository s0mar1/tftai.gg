import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Champion, Item, Trait, Augment } from '../types';
import { api } from '../utils/fetchApi';

/**
 * TFT 정적 데이터 Context (자주 변하지 않는 데이터)
 * - Champions, Items, Traits, Augments
 * - Name mappings
 * - 언어별 캐싱
 */

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

// TFT 정적 데이터 타입
interface TFTStaticData {
  champions: Champion[];
  items: ItemsByCategory;
  augments: Augment[];
  traits: Trait[];
  traitMap: Map<string, Trait>;
  krNameMap: Map<string, string>;
  currentSet: string;
}

// 컨텍스트 값 타입
interface TFTStaticDataContextValue extends TFTStaticData {
  itemsByCategory: ItemsByCategory;
  allItems: Item[];
  loading: boolean;
  error: string | null;
  retryCount: number;
  canRetry: boolean;
  retry: () => void;
  // 선택적 데이터 접근 함수들
  getChampionByApiName: (apiName: string) => Champion | undefined;
  getTraitByApiName: (apiName: string) => Trait | undefined;
  getItemByApiName: (apiName: string) => Item | undefined;
}

// 기본값
const defaultTFTStaticDataValue: TFTStaticDataContextValue = {
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
  retryCount: 0,
  canRetry: false,
  retry: () => {},
  getChampionByApiName: () => undefined,
  getTraitByApiName: () => undefined,
  getItemByApiName: () => undefined,
};

export const TFTStaticDataContext = createContext<TFTStaticDataContextValue>(defaultTFTStaticDataValue);

// 선택적 구독을 위한 훅들
export const useTFTChampions = () => {
  const { champions, loading, error } = useContext(TFTStaticDataContext);
  return { champions, loading, error };
};

export const useTFTItems = () => {
  const { itemsByCategory, allItems, loading, error } = useContext(TFTStaticDataContext);
  return { itemsByCategory, allItems, loading, error };
};

export const useTFTTraits = () => {
  const { traits, traitMap, loading, error } = useContext(TFTStaticDataContext);
  return { traits, traitMap, loading, error };
};

export const useTFTStaticData = (): TFTStaticDataContextValue => {
  const context = useContext(TFTStaticDataContext);
  
  if (!context) {
    console.error('❌ useTFTStaticData: context가 undefined입니다!');
    return defaultTFTStaticDataValue;
  }
  
  return context;
};

interface TFTStaticDataProviderProps {
  children: React.ReactNode;
}

export const TFTStaticDataProvider: React.FC<TFTStaticDataProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  
  // 재시도 상태
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  const [itemsByCategory, setItemsByCategory] = useState<ItemsByCategory>({
    basic: [], completed: [], ornn: [], radiant: [],
    emblem: [], support: [], robot: [], unknown: []
  });
  
  const [tftData, setTftData] = useState<TFTStaticData>({
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
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 메모이제이션된 계산값들
  const allItems = useMemo(() => {
    return Object.values(itemsByCategory).flat();
  }, [itemsByCategory]);

  // 검색 함수들 (메모이제이션)
  const getChampionByApiName = useCallback((apiName: string): Champion | undefined => {
    return tftData.champions.find(champ => 
      champ.apiName?.toLowerCase() === apiName.toLowerCase()
    );
  }, [tftData.champions]);

  const getTraitByApiName = useCallback((apiName: string): Trait | undefined => {
    return tftData.traitMap.get(apiName.toLowerCase());
  }, [tftData.traitMap]);

  const getItemByApiName = useCallback((apiName: string): Item | undefined => {
    return allItems.find(item => 
      item.apiName?.toLowerCase() === apiName.toLowerCase()
    );
  }, [allItems]);

  // 로컬 스토리지 캐시 관리
  const getCachedData = useCallback((key: string) => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < 30 * 60 * 1000) { // 30분 캐시
          return parsed.data;
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`TFTStaticDataContext: 캐시 읽기 실패 (${key}):`, error);
      }
    }
    return null;
  }, []);

  const setCachedData = useCallback((key: string, data: unknown) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`TFTStaticDataContext: 캐시 저장 실패 (${key}):`, error);
      }
    }
  }, []);

  // 재시도 함수
  const retryFetch = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setError(null);
    }
  }, [retryCount, MAX_RETRIES]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const currentLanguage = i18n.language || 'ko';
      const tftDataCacheKey = `tft-static-data-${currentLanguage}`;
      const itemsCacheKey = `items-static-data-${currentLanguage}`;
      
      // 캐시된 데이터 확인
      const cachedTftData = getCachedData(tftDataCacheKey);
      const cachedItemsData = getCachedData(itemsCacheKey);
      
      if (cachedTftData && cachedItemsData) {
        try {
          const rehydratedTraitMap = new Map<string, Trait>(cachedTftData.traitMap);
          const rehydratedKrNameMap = new Map<string, string>(cachedTftData.nameMap);
          const extractedTraits = Array.from(rehydratedTraitMap.entries()).map(([apiName, traitData]) => ({
            ...(traitData as Omit<Trait, 'apiName'>),
            apiName: apiName, 
          }));
          
          const finalTftData = {
            ...cachedTftData,
            traits: extractedTraits,
            traitMap: rehydratedTraitMap,
            krNameMap: rehydratedKrNameMap,
          };
          
          setTftData(finalTftData);
          setItemsByCategory(cachedItemsData);
          setLoading(false);
          setRetryCount(0);
          return;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('TFTStaticDataContext: 캐시 복원 실패, API 호출로 진행:', error);
          }
        }
      }
      
      try {
        const [tftMetaResponse, itemsByCategoryResponse] = await Promise.all([
          api.get(`/api/static-data/tft-data/${currentLanguage}`),
          api.get(`/api/static-data/items-by-category/${currentLanguage}`)
        ]);
        
        const tftData = tftMetaResponse;
        const itemsData = itemsByCategoryResponse;
        
        if (!tftData) {
          throw new Error('No TFT data received from API');
        }
        
        // 필수 필드들을 기본값으로 초기화
        if (!tftData.traitMap) tftData.traitMap = [];
        if (!tftData.nameMap) tftData.nameMap = [];
        if (!tftData.champions) tftData.champions = [];
        if (!tftData.traits) tftData.traits = [];

        const rehydratedTraitMap = new Map<string, Trait>(tftData.traitMap);
        const rehydratedKrNameMap = new Map<string, string>(tftData.nameMap);
        const extractedTraits = Array.from(rehydratedTraitMap.entries()).map(([apiName, traitData]) => ({
          ...(traitData as Omit<Trait, 'apiName'>),
          apiName: apiName, 
        }));

        const finalTftData = {
          ...tftData,
          traits: extractedTraits,
          traitMap: rehydratedTraitMap,
          krNameMap: rehydratedKrNameMap,
        };
        
        setTftData(finalTftData);
        setItemsByCategory(itemsData);
        
        // 성공적으로 로드된 데이터 캐시
        setCachedData(tftDataCacheKey, finalTftData);
        setCachedData(itemsCacheKey, itemsData);
        
        setRetryCount(0);

      } catch (err: unknown) {
        console.error('TFTStaticDataContext: 오류 발생', err);
        
        const errorMessage = err instanceof Error ? err.message : "데이터 로딩 중 알 수 없는 오류 발생";
        
        // 재시도 가능한 경우 자동 재시도
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            retryFetch();
          }, 2000 * (retryCount + 1)); // 지수 백오프
        } else {
          setError(`${errorMessage} (재시도 ${MAX_RETRIES}회 실패)`);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [i18n.language, retryCount, getCachedData, setCachedData, retryFetch]); // 의존성 배열 최적화

  const value = useMemo(() => ({
    ...tftData,
    itemsByCategory,
    allItems,
    loading,
    error,
    retryCount,
    canRetry: retryCount < MAX_RETRIES && !!error,
    retry: retryFetch,
    getChampionByApiName,
    getTraitByApiName,
    getItemByApiName,
  }), [
    tftData, 
    itemsByCategory, 
    allItems, 
    loading, 
    error, 
    retryCount, 
    retryFetch,
    getChampionByApiName,
    getTraitByApiName,
    getItemByApiName
  ]);

  return (
    <TFTStaticDataContext.Provider value={value}>
      {children}
    </TFTStaticDataContext.Provider>
  );
};