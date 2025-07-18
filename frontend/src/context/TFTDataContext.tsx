import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Champion, Item, Trait, Augment } from '../types';
import { api } from '../utils/fetchApi';

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

// 기본값을 제공하여 undefined 문제 방지
const defaultTFTDataValue: TFTDataContextValue = {
  champions: [],
  items: { 
    basic: [], 
    completed: [], 
    ornn: [], 
    radiant: [], 
    emblem: [], 
    support: [], 
    robot: [], 
    unknown: [] 
  },
  augments: [],
  traits: [],
  traitMap: new Map(),
  krNameMap: new Map(),
  currentSet: '',
  itemsByCategory: {
    basic: [],
    completed: [],
    ornn: [],
    radiant: [],
    emblem: [],
    support: [],
    robot: [],
    unknown: []
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
  
  // context가 기본값과 동일한지 확인 (Provider가 제대로 작동하지 않을 때)
  if (!context) {
    console.error('❌ useTFTData: context가 undefined입니다!');
    console.error('❌ TFTDataProvider가 이 컴포넌트를 감싸지 못했습니다!');
    return defaultTFTDataValue;
  }
  
  if (context === defaultTFTDataValue) {
    console.warn('⚠️ useTFTData: context가 기본값입니다. Provider 상태 확인 필요');
  }
  
  return context;
};

interface TFTDataProviderProps {
  children: React.ReactNode;
}

export const TFTDataProvider: React.FC<TFTDataProviderProps> = ({ children }) => {
  console.log('TFTDataProvider: 컴포넌트 초기화');
  
  const { i18n } = useTranslation();
  
  // 재시도 상태 추가
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const MAX_RETRIES = 3;
  
  const [itemsByCategory, setItemsByCategory] = useState<ItemsByCategory>({
    basic: [],
    completed: [],
    ornn: [],
    radiant: [],
    emblem: [],
    support: [],
    robot: [],
    unknown: []
  });
  
  const [tftData, setTftData] = useState<TFTData>({
    champions: [],
    items: { 
      basic: [], 
      completed: [], 
      ornn: [], 
      radiant: [], 
      emblem: [], 
      support: [], 
      robot: [], 
      unknown: [] 
    },
    augments: [],
    traits: [],
    traitMap: new Map(),
    krNameMap: new Map(),
    currentSet: '',
  });
  
  console.log('TFTDataProvider: 상태 초기화 완료', { 
    tftDataKeys: Object.keys(tftData),
    itemsByCategoryKeys: Object.keys(itemsByCategory)
  });

  const allItems = useMemo(() => {
    console.log('TFTDataProvider: allItems 계산 중', { itemsByCategory });
    if (!itemsByCategory) return [];
    const result = Object.values(itemsByCategory).flat();
    console.log('TFTDataProvider: allItems 계산 완료', { count: result.length });
    return result;
  }, [itemsByCategory]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    data: null,
    position: { x: 0, y: 0 },
  });
  
  console.log('TFTDataProvider: 모든 상태 준비 완료', { loading, error, tooltipVisible: tooltip.visible });

  // 로컬 스토리지 캐시 관리
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < 30 * 60 * 1000) { // 30분 캐시
          console.log(`TFTDataContext: 캐시된 데이터 사용 (${key})`);
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn(`TFTDataContext: 캐시 읽기 실패 (${key}):`, error);
    }
    return null;
  };

  const setCachedData = (key: string, data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`TFTDataContext: 데이터 캐시됨 (${key})`);
    } catch (error) {
      console.warn(`TFTDataContext: 캐시 저장 실패 (${key}):`, error);
    }
  };

  // 재시도 함수
  const retryFetch = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      console.log(`TFTDataContext: 재시도 ${retryCount + 1}/${MAX_RETRIES}`);
      setRetryCount(prev => prev + 1);
      setError(null);
    }
  }, [retryCount, MAX_RETRIES]);

  useEffect(() => {
    const fetchData = async () => {
      console.log('TFTDataContext: 데이터 로딩 시작');
      setLoading(true);
      setError(null);
      
      const currentLanguage = i18n.language || 'ko';
      const tftDataCacheKey = `tft-data-${currentLanguage}`;
      const itemsCacheKey = `items-data-${currentLanguage}`;
      
      // 캐시된 데이터 확인
      const cachedTftData = getCachedData(tftDataCacheKey);
      const cachedItemsData = getCachedData(itemsCacheKey);
      
      if (cachedTftData && cachedItemsData) {
        try {
          console.log('TFTDataContext: 캐시된 데이터로 복원');
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
          console.warn('TFTDataContext: 캐시 복원 실패, API 호출로 진행:', error);
        }
      }
      
      try {
        const currentLanguage = i18n.language || 'ko';
        console.log('TFTDataContext: API 호출 시작 - 언어:', currentLanguage);
        
        console.log('TFTDataContext: API 엔드포인트:', {
          tftDataUrl: `/api/static-data/tft-data/${currentLanguage}`,
          itemsByCategoryUrl: `/api/static-data/items-by-category/${currentLanguage}`
        });
        
        const [tftMetaResponse, itemsByCategoryResponse] = await Promise.all([
          api.get(`/api/static-data/tft-data/${currentLanguage}`),
          api.get(`/api/static-data/items-by-category/${currentLanguage}`)
        ]);
        
        console.log('TFTDataContext: API 호출 완료', {
          tftMetaResponse: !!tftMetaResponse,
          itemsByCategoryResponse: !!itemsByCategoryResponse
        });
        
        // fetchApi.ts의 extractData 함수에서 이미 데이터가 추출되어 반환됨
        const tftData = tftMetaResponse;
        const itemsData = itemsByCategoryResponse;
        
        console.log('TFTDataContext: API 응답 받음', {
          tftDataKeys: Object.keys(tftData || {}),
          hasChampions: !!tftData?.champions,
          championsCount: tftData?.champions?.length,
          hasTraits: !!tftData?.traits,
          traitsCount: tftData?.traits?.length,
          hasTraitMap: !!tftData?.traitMap,
          itemsData: !!itemsData,
          itemsDataKeys: Object.keys(itemsData || {}),
          itemsDataEntries: Object.entries(itemsData || {}).map(([key, items]) => ({ key, count: items?.length || 0 }))
        });
        
        const receivedTftData = tftData;

        // 데이터 구조 검증 (완화된 버전)
        if (!receivedTftData) {
          console.error('TFTDataContext: 데이터가 없습니다');
          throw new Error('No TFT data received from API');
        }
        
        // 필수 필드들을 기본값으로 초기화 (defensive programming)
        if (!receivedTftData.traitMap) {
          receivedTftData.traitMap = [];
        }
        if (!receivedTftData.nameMap) {
          receivedTftData.nameMap = [];
        }
        if (!receivedTftData.champions) {
          receivedTftData.champions = [];
        }
        if (!receivedTftData.traits) {
          receivedTftData.traits = [];
        }

        console.log('TFTDataContext: 데이터 구조 검증 완료', {
          hasTraitMap: !!receivedTftData.traitMap,
          traitMapIsArray: Array.isArray(receivedTftData.traitMap),
          hasNameMap: !!receivedTftData.nameMap,
          nameMapIsArray: Array.isArray(receivedTftData.nameMap)
        });

        let rehydratedTraitMap: Map<string, Trait>;
        let rehydratedKrNameMap: Map<string, string>;
        let extractedTraits: Trait[];

        try {
          rehydratedTraitMap = new Map<string, Trait>(receivedTftData.traitMap);
          console.log('TFTDataContext: TraitMap 변환 성공, size:', rehydratedTraitMap.size);
        } catch (error) {
          console.error('TFTDataContext: TraitMap 변환 실패:', error);
          throw new Error('Failed to convert traitMap from server response');
        }

        try {
          rehydratedKrNameMap = new Map<string, string>(receivedTftData.nameMap);
          console.log('TFTDataContext: NameMap 변환 성공, size:', rehydratedKrNameMap.size);
        } catch (error) {
          console.error('TFTDataContext: NameMap 변환 실패:', error);
          throw new Error('Failed to convert nameMap from server response');
        }

        try {
          extractedTraits = Array.from(rehydratedTraitMap.entries()).map(([apiName, traitData]) => ({
            ...(traitData as Omit<Trait, 'apiName'>),
            apiName: apiName, 
          }));
          console.log('TFTDataContext: 특성 추출 성공, count:', extractedTraits.length);
        } catch (error) {
          console.error('TFTDataContext: 특성 추출 실패:', error);
          throw new Error('Failed to extract traits from traitMap');
        }

        const finalTftData = {
          ...receivedTftData,
          traits: extractedTraits,
          traitMap: rehydratedTraitMap,
          krNameMap: rehydratedKrNameMap,
        };
        
        console.log('TFTDataContext: 상태 업데이트 전 최종 데이터:', {
          champions: finalTftData.champions?.length || 0,
          traits: finalTftData.traits?.length || 0,
          items: finalTftData.items ? Object.keys(finalTftData.items).length : 0,
          itemsByCategory: itemsData ? Object.keys(itemsData).length : 0
        });
        
        setTftData(finalTftData);
        setItemsByCategory(itemsData);
        
        // 성공적으로 로드된 데이터 캐시
        setCachedData(tftDataCacheKey, finalTftData);
        setCachedData(itemsCacheKey, itemsData);
        
        console.log('TFTDataContext: 상태 업데이트 완료');
        setRetryCount(0);
        
        // 강제 리렌더링을 위한 작은 지연
        setTimeout(() => {
          console.log('TFTDataContext: 지연된 확인 - 상태 업데이트 후:', {
            tftDataState: !!finalTftData,
            champions: finalTftData.champions?.length || 0,
            itemsCategory: itemsData ? Object.keys(itemsData).length : 0
          });
        }, 100);

      } catch (err: unknown) {
        console.error('TFTDataContext: 오류 발생', err);
        console.error('TFTDataContext: 오류 세부 정보:', {
          error: err,
          message: err instanceof Error ? err.message : '알 수 없는 오류',
          stack: err instanceof Error ? err.stack : undefined,
          retryCount: retryCount
        });
        
        const errorMessage = err instanceof Error ? err.message : "데이터 로딩 중 알 수 없는 오류 발생";
        setLastError(errorMessage);
        
        // 재시도 가능한 경우 자동 재시도
        if (retryCount < MAX_RETRIES) {
          console.log(`TFTDataContext: 자동 재시도 ${retryCount + 1}/${MAX_RETRIES} 스케줄링`);
          setTimeout(() => {
            retryFetch();
          }, 2000 * (retryCount + 1)); // 지수 백오프
        } else {
          console.error('TFTDataContext: 최대 재시도 횟수 초과');
          setError(`${errorMessage} (재시도 ${MAX_RETRIES}회 실패)`);
        }
      } finally {
        console.log('TFTDataContext: 로딩 완료');
        setLoading(false);
      }
    };
    fetchData();
  }, [i18n.language, retryCount]); // Re-fetch when language changes or retry count changes

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

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);
  
  console.log('TFTDataProvider: callback 함수들 준비 완료');

  const value = useMemo(() => {
    console.log('TFTDataProvider: value 생성 시작');
    console.log('TFTDataProvider: 입력 값들', { 
      tftData: !!tftData, 
      itemsByCategory: !!itemsByCategory, 
      allItems: !!allItems,
      loading, 
      error,
      tooltip: !!tooltip,
      showTooltip: !!showTooltip,
      hideTooltip: !!hideTooltip
    });
    
    try {
      const result = {
        ...tftData,
        itemsByCategory,
        allItems,
        loading,
        error,
        tooltip,
        showTooltip,
        hideTooltip,
        retryCount,
        canRetry: retryCount < MAX_RETRIES && !!error,
        retry: retryFetch,
      };
      console.log('TFTDataProvider: value 생성 성공', { 
        resultKeys: Object.keys(result),
        loading: result.loading,
        error: result.error,
        champions: result.champions?.length || 0,
        traits: result.traits?.length || 0,
        itemsByCategory: result.itemsByCategory ? Object.keys(result.itemsByCategory).length : 0
      });
      return result;
    } catch (error) {
      console.error('TFTDataProvider: value 생성 실패:', error);
      throw error;
    }
  }, [tftData, itemsByCategory, allItems, loading, error, tooltip, showTooltip, hideTooltip, retryCount, retryFetch]);

  console.log('TFTDataProvider: 렌더링 중, value 존재:', !!value);
  console.log('TFTDataProvider: 렌더링 중, value 타입:', typeof value);

  return (
    <TFTDataContext.Provider value={value}>
      {children}
    </TFTDataContext.Provider>
  );
};