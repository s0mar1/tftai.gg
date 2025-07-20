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
  clearLocalCache: () => void; // 캐시 클리어 함수 타입 추가
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
  clearLocalCache: () => {}, // 캐시 클리어 함수 기본값 추가
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

  // 캐시 클리어 함수 (개발자 도구용)
  const clearLocalCache = useCallback(() => {
    const currentLanguage = i18n.language || 'ko';
    const tftDataCacheKey = `tft-static-data-${currentLanguage}`;
    const itemsCacheKey = `items-static-data-${currentLanguage}`;
    
    localStorage.removeItem(tftDataCacheKey);
    localStorage.removeItem(itemsCacheKey);
    
    console.log('TFT 로컬 캐시가 클리어되었습니다.');
    
    // 데이터 다시 로드
    setRetryCount(prev => prev + 1);
  }, [i18n.language]);

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
          console.log('🔄 TFTStaticDataContext: 캐시된 데이터 복원 시도');
          
          // traitMap이 배열인지 Map인지 확인하고 적절히 처리
          let rehydratedTraitMap: Map<string, Trait>;
          if (Array.isArray(cachedTftData.traitMap)) {
            rehydratedTraitMap = new Map<string, Trait>(cachedTftData.traitMap as Array<[string, Trait]>);
          } else if (cachedTftData.traitMap instanceof Map) {
            rehydratedTraitMap = cachedTftData.traitMap;
          } else {
            rehydratedTraitMap = new Map<string, Trait>();
          }
          
          // krNameMap 복원
          let rehydratedKrNameMap: Map<string, string>;
          const nameMapData = cachedTftData.krNameMap || cachedTftData.nameMap;
          if (Array.isArray(nameMapData)) {
            rehydratedKrNameMap = new Map<string, string>(nameMapData as Array<[string, string]>);
          } else if (nameMapData instanceof Map) {
            rehydratedKrNameMap = nameMapData;
          } else {
            rehydratedKrNameMap = new Map<string, string>();
          }
          const extractedTraits = Array.from(rehydratedTraitMap.entries()).map(([apiName, traitData]) => ({
            ...(traitData as Omit<Trait, 'apiName'>),
            apiName: apiName, 
          }));
          
          // 캐시된 데이터에도 필터링 적용
          const filteredChampions = cachedTftData.champions?.filter((champ: any) => {
            const apiName = champ.apiName?.toLowerCase() || '';
            
            const excludePatterns = [
              'tft_bluegolem', 'tft_krug', 'tft9_slime_crab', 'tft_wolf', 
              'tft_murkwolf', 'tft_razorbeak', 'tft_dragon', 'tft_baron',
              'tft_trainingdummy', 'tft_voidspawn', 'tft_riftherald'
            ];
            
            if (excludePatterns.some(pattern => apiName.includes(pattern))) {
              return false;
            }
            
            if (!apiName.includes('tft14_')) {
              return false;
            }
            
            if (!champ.traits || !Array.isArray(champ.traits) || champ.traits.length === 0) {
              return false;
            }
            
            return true;
          }) || [];

          // 캐시된 데이터에도 한국어 이름 매핑 적용 (챔피언 이름 + 특성 이름)
          const mappedChampions = filteredChampions.map((champ: any) => {
            const koreanName = rehydratedKrNameMap.get(champ.apiName?.toLowerCase());
            
            // traits 배열도 한국어로 변환
            const koreanTraits = champ.traits?.map((traitName: string) => {
              // traitMap에서 해당 특성의 한국어 이름 찾기
              const traitEntry = Array.from(rehydratedTraitMap.entries()).find(([key, trait]) => {
                // 1. 설명에서 해당 특성 이름이 언급되는지 확인
                if (trait.desc?.includes(traitName)) {
                  return true;
                }
                // 2. API명에 특성 이름이 포함되는지 확인 (소문자 변환)
                const cleanTraitName = traitName.toLowerCase().replace(/\s+/g, '');
                const cleanApiName = key.toLowerCase().replace(/^tft\d+_/, '');
                if (cleanApiName.includes(cleanTraitName) || cleanTraitName.includes(cleanApiName)) {
                  return true;
                }
                return false;
              });
              
              if (traitEntry) {
                console.log(`🔄 캐시 특성 매핑: "${traitName}" -> "${traitEntry[1].name}"`);
                return traitEntry[1].name;
              } else {
                console.warn(`⚠️ 캐시 특성 매핑 실패: "${traitName}"`);
                return traitName; // 매핑 실패 시 원본 사용
              }
            }) || [];
            
            return {
              ...champ,
              name: koreanName || champ.name, // 한국어 이름이 있으면 사용, 없으면 기존 이름
              traits: koreanTraits // 한국어로 변환된 특성 배열
            };
          });

          const finalTftData = {
            ...cachedTftData,
            champions: mappedChampions, // 필터링 + 한국어 매핑된 챔피언 사용
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
        if (!tftData.krNameMap) tftData.krNameMap = [];
        if (!tftData.champions) tftData.champions = [];
        if (!tftData.traits) tftData.traits = [];

        console.log('🔍 TFTStaticDataContext: Raw API 응답 데이터:', {
          traitMapType: typeof tftData.traitMap,
          traitMapLength: Array.isArray(tftData.traitMap) ? tftData.traitMap.length : 'not array',
          traitMapSample: Array.isArray(tftData.traitMap) ? tftData.traitMap.slice(0, 3) : tftData.traitMap,
          traitsType: typeof tftData.traits,
          traitsLength: Array.isArray(tftData.traits) ? tftData.traits.length : 'not array',
          traitsSample: Array.isArray(tftData.traits) ? tftData.traits.slice(0, 3) : tftData.traits,
          krNameMapType: typeof tftData.krNameMap,
          krNameMapLength: Array.isArray(tftData.krNameMap) ? tftData.krNameMap.length : 'not array'
        });

        // traitMap이 배열인지 Map인지 확인하고 적절히 처리
        let rehydratedTraitMap: Map<string, Trait>;
        if (Array.isArray(tftData.traitMap)) {
          console.log('🔧 TFTStaticDataContext: traitMap을 배열에서 Map으로 변환');
          rehydratedTraitMap = new Map<string, Trait>(tftData.traitMap as Array<[string, Trait]>);
        } else if (tftData.traitMap instanceof Map) {
          rehydratedTraitMap = tftData.traitMap;
        } else {
          console.warn('⚠️ TFTStaticDataContext: traitMap이 예상된 형식이 아님:', typeof tftData.traitMap);
          rehydratedTraitMap = new Map<string, Trait>();
        }
        
        // krNameMap 처리
        let rehydratedKrNameMap: Map<string, string>;
        const nameMapData = tftData.krNameMap || tftData.nameMap;
        if (Array.isArray(nameMapData)) {
          console.log('🔧 TFTStaticDataContext: krNameMap을 배열에서 Map으로 변환');
          rehydratedKrNameMap = new Map<string, string>(nameMapData as Array<[string, string]>);
        } else if (nameMapData instanceof Map) {
          rehydratedKrNameMap = nameMapData;
        } else {
          console.warn('⚠️ TFTStaticDataContext: krNameMap이 예상된 형식이 아님:', typeof nameMapData);
          rehydratedKrNameMap = new Map<string, string>();
        }
        const extractedTraits = Array.from(rehydratedTraitMap.entries()).map(([apiName, traitData]) => ({
          ...(traitData as Omit<Trait, 'apiName'>),
          apiName: apiName, 
        }));

        console.log('📊 TFTStaticDataContext: 특성 데이터 처리 결과:', {
          rehydratedTraitMapSize: rehydratedTraitMap.size,
          rehydratedKrNameMapSize: rehydratedKrNameMap.size,
          extractedTraitsLength: extractedTraits.length,
          extractedTraitsSample: extractedTraits.slice(0, 5).map(t => ({ 
            apiName: t.apiName, 
            name: t.name, 
            type: t.type 
          })),
          traitMapSample: Array.from(rehydratedTraitMap.entries()).slice(0, 3).map(([key, value]) => ({ 
            key, 
            value: { apiName: value.apiName, name: value.name, type: value.type } 
          })),
          krNameMapSample: Array.from(rehydratedKrNameMap.entries()).slice(0, 5)
        });

        // Golden Ox와 Bruiser를 직접 검색해보자
        console.log('🔍 Golden Ox 직접 검색:', {
          traitMapHasGoldenOx: rehydratedTraitMap.has('Golden Ox'),
          traitMapHasGoldenox: rehydratedTraitMap.has('goldenox'),
          traitMapHasTft14GoldenOx: rehydratedTraitMap.has('tft14_goldenox'),
          extractedTraitsWithGolden: extractedTraits.filter(t => 
            t.apiName?.toLowerCase().includes('golden') || 
            t.name?.toLowerCase().includes('golden') ||
            t.name?.includes('황소') ||
            t.name?.includes('골든')
          ),
          extractedTraitsWithBruiser: extractedTraits.filter(t => 
            t.apiName?.toLowerCase().includes('bruiser') || 
            t.name?.toLowerCase().includes('bruiser') ||
            t.name?.includes('투사') ||
            t.name?.includes('파괴')
          ),
          allTraitApiNames: Array.from(rehydratedTraitMap.keys()).slice(0, 10),
          allTraitNames: extractedTraits.slice(0, 10).map(t => t.name)
        });

        // 임시 클라이언트 사이드 필터링 (백엔드 필터링이 작동하지 않을 때 사용)
        const filteredChampions = tftData.champions?.filter((champ: any) => {
          const apiName = champ.apiName?.toLowerCase() || '';
          
          // 중성 유닛 제외
          const excludePatterns = [
            'tft_bluegolem', 'tft_krug', 'tft9_slime_crab', 'tft_wolf', 
            'tft_murkwolf', 'tft_razorbeak', 'tft_dragon', 'tft_baron',
            'tft_trainingdummy', 'tft_voidspawn', 'tft_riftherald'
          ];
          
          if (excludePatterns.some(pattern => apiName.includes(pattern))) {
            return false;
          }
          
          // TFT14만 허용
          if (!apiName.includes('tft14_')) {
            return false;
          }
          
          // traits 조건
          if (!champ.traits || !Array.isArray(champ.traits) || champ.traits.length === 0) {
            return false;
          }
          
          return true;
        }) || [];

        // 한국어 이름 매핑 적용 (챔피언 이름 + 특성 이름)
        const mappedChampions = filteredChampions.map((champ: any) => {
          const koreanName = rehydratedKrNameMap.get(champ.apiName?.toLowerCase());
          
          // traits 배열도 한국어로 변환
          const koreanTraits = champ.traits?.map((traitName: string) => {
            // traitMap에서 해당 특성의 한국어 이름 찾기
            const traitEntry = Array.from(rehydratedTraitMap.entries()).find(([key, trait]) => {
              // 1. 설명에서 해당 특성 이름이 언급되는지 확인
              if (trait.desc?.includes(traitName)) {
                return true;
              }
              // 2. API명에 특성 이름이 포함되는지 확인 (소문자 변환)
              const cleanTraitName = traitName.toLowerCase().replace(/\s+/g, '');
              const cleanApiName = key.toLowerCase().replace(/^tft\d+_/, '');
              if (cleanApiName.includes(cleanTraitName) || cleanTraitName.includes(cleanApiName)) {
                return true;
              }
              return false;
            });
            
            if (traitEntry) {
              console.log(`🔄 특성 매핑: "${traitName}" -> "${traitEntry[1].name}"`);
              return traitEntry[1].name;
            } else {
              console.warn(`⚠️ 특성 매핑 실패: "${traitName}"`);
              return traitName; // 매핑 실패 시 원본 사용
            }
          }) || [];
          
          return {
            ...champ,
            name: koreanName || champ.name, // 한국어 이름이 있으면 사용, 없으면 기존 이름
            traits: koreanTraits // 한국어로 변환된 특성 배열
          };
        });

        const finalTftData = {
          ...tftData,
          champions: mappedChampions, // 필터링 + 한국어 매핑된 챔피언 사용
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
    clearLocalCache, // 캐시 클리어 함수 추가
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
    clearLocalCache,
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