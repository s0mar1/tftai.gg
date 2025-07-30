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

// 아이템 카테고리 타입 (Set 15 - Support 아이템 제거됨)
interface ItemsByCategory {
  basic: Item[];
  completed: Item[];
  ornn: Item[];
  radiant: Item[];
  emblem: Item[];
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

// 기본값 (Set 15 - Support 아이템 제거됨)
const defaultTFTStaticDataValue: TFTStaticDataContextValue = {
  champions: [],
  items: { 
    basic: [], completed: [], ornn: [], radiant: [], 
    emblem: [], unknown: [] 
  },
  augments: [],
  traits: [],
  traitMap: new Map(),
  krNameMap: new Map(),
  currentSet: '',
  itemsByCategory: {
    basic: [], completed: [], ornn: [], radiant: [],
    emblem: [], unknown: []
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
    emblem: [], unknown: []
  });
  
  const [tftData, setTftData] = useState<TFTStaticData>({
    champions: [],
    items: { 
      basic: [], completed: [], ornn: [], radiant: [],
      emblem: [], unknown: []
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

  // 로컬 스토리지 캐시 관리 - 개선된 버전
  const getCachedData = useCallback((key: string) => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < 30 * 60 * 1000) { // 30분 캐시
          return parsed.data;
        } else {
          // 만료된 캐시는 삭제
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`TFTStaticDataContext: 캐시 읽기 실패 (${key}):`, error);
      }
      // 손상된 캐시 삭제
      try {
        localStorage.removeItem(key);
      } catch {} // 삭제 실패는 무시
    }
    return null;
  }, []);

  const setCachedData = useCallback((key: string, data: unknown) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      
      const jsonString = JSON.stringify(cacheData);
      
      // 데이터 크기 확인 (5MB localStorage 한계 고려)
      const size = new Blob([jsonString]).size;
      if (size > 4.5 * 1024 * 1024) { // 4.5MB 이상이면 저장하지 않음
        if (import.meta.env.DEV) {
          console.warn(`TFTStaticDataContext: 캐시 데이터가 너무 큼 (${key}): ${(size / 1024 / 1024).toFixed(2)}MB`);
        }
        return;
      }
      
      localStorage.setItem(key, jsonString);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`TFTStaticDataContext: 캐시 저장 실패 (${key}):`, error);
      }
      
      // LocalStorage 용량 초과 시 오래된 캐시 정리 시도
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          // 모든 TFT 관련 캐시들 정리
          const keysToRemove: string[] = [];
          const now = Date.now();
          
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey && (
              storageKey.startsWith('tft-') || 
              storageKey.startsWith('items-') ||
              storageKey.includes('cache') ||
              storageKey.includes('data')
            )) {
              try {
                const item = localStorage.getItem(storageKey);
                if (item) {
                  const parsed = JSON.parse(item);
                  // 10분 이상 된 데이터는 삭제 대상
                  if (!parsed.timestamp || now - parsed.timestamp > 10 * 60 * 1000) {
                    keysToRemove.push(storageKey);
                  }
                }
              } catch {
                // 파싱 실패한 항목도 삭제 대상
                keysToRemove.push(storageKey);
              }
            }
          }
          
          // 오래된 것부터 삭제
          keysToRemove.forEach(keyToDelete => {
            localStorage.removeItem(keyToDelete);
          });
          
          if (import.meta.env.DEV) {
            console.log(`TFTStaticDataContext: LocalStorage 정리 완료 (${keysToRemove.length}개 항목 제거)`);
          }
          
          // 정리 후 다시 시도
          if (keysToRemove.length > 0) {
            try {
              localStorage.setItem(key, jsonString);
              return; // 성공하면 종료
            } catch {} // 실패하면 계속 진행
          }
        } catch (cleanupError) {
          if (import.meta.env.DEV) {
            console.error('TFTStaticDataContext: LocalStorage 정리 실패:', cleanupError);
          }
        }
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
      
      // 캐시된 데이터 확인 - 임시로 비활성화하여 강제 API 호출
      const cachedTftData = null; // getCachedData(tftDataCacheKey);
      const cachedItemsData = null; // getCachedData(itemsCacheKey);
      
      if (false && cachedTftData && cachedItemsData) {
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
            
            if (!apiName.includes('tft15_')) {
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
            
            // traits 배열도 한국어로 변환 (개선된 매핑 로직)
            const koreanTraits = champ.traits?.map((traitName: string) => {
              // 1. 이미 한국어인 경우 그대로 반환
              if (rehydratedTraitMap.has(traitName.toLowerCase())) {
                const trait = rehydratedTraitMap.get(traitName.toLowerCase());
                if (trait) {
                  console.log(`✅ 캐시 특성 직접 매핑: "${traitName}" -> "${trait.name}"`);
                  return trait.name;
                }
              }
              
              // 2. nameMap을 통한 역방향 매핑 시도 (한국어 -> API 이름)
              const apiName = rehydratedKrNameMap.get(traitName);
              if (apiName) {
                const trait = rehydratedTraitMap.get(apiName.toLowerCase());
                if (trait) {
                  console.log(`🔄 캐시 특성 nameMap 매핑: "${traitName}" -> "${trait.name}"`);
                  return trait.name;
                }
              }
              
              // 3. traitMap에서 해당 특성의 한국어 이름 찾기 (기존 로직)
              const traitEntry = Array.from(rehydratedTraitMap.entries()).find(([key, trait]) => {
                // 3-1. 특성 이름이 정확히 일치하는지 확인
                if (trait.name === traitName || trait.koreanName === traitName || trait.englishName === traitName) {
                  return true;
                }
                // 3-2. 설명에서 해당 특성 이름이 언급되는지 확인
                if (trait.desc?.includes(traitName)) {
                  return true;
                }
                // 3-3. API명에 특성 이름이 포함되는지 확인 (소문자 변환)
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
                console.warn(`⚠️ 캐시 특성 매핑 실패: "${traitName}" - 원본 이름으로 대체`);
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

        // Set 15 특성 매핑 확인
        console.log('🔍 Set 15 특성 매핑 확인:', {
          traitMapSize: rehydratedTraitMap.size,
          sampleTraits: extractedTraits.slice(0, 5).map(t => ({
            apiName: t.apiName,
            name: t.name
          }))
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
          
          // TFT15만 허용
          if (!apiName.includes('tft15_')) {
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
          
          // traits 배열도 한국어로 변환 (개선된 매핑 로직)
          const koreanTraits = champ.traits?.map((traitName: string) => {
            // 1. 이미 한국어인 경우 그대로 반환
            if (rehydratedTraitMap.has(traitName.toLowerCase())) {
              const trait = rehydratedTraitMap.get(traitName.toLowerCase());
              if (trait) {
                console.log(`✅ 특성 직접 매핑: "${traitName}" -> "${trait.name}"`);
                return trait.name;
              }
            }
            
            // 2. nameMap을 통한 역방향 매핑 시도 (한국어 -> API 이름)
            const apiName = rehydratedKrNameMap.get(traitName);
            if (apiName) {
              const trait = rehydratedTraitMap.get(apiName.toLowerCase());
              if (trait) {
                console.log(`🔄 특성 nameMap 매핑: "${traitName}" -> "${trait.name}"`);
                return trait.name;
              }
            }
            
            // 3. traitMap에서 해당 특성의 한국어 이름 찾기 (기존 로직)
            const traitEntry = Array.from(rehydratedTraitMap.entries()).find(([key, trait]) => {
              // 3-1. 특성 이름이 정확히 일치하는지 확인
              if (trait.name === traitName || trait.koreanName === traitName || trait.englishName === traitName) {
                return true;
              }
              // 3-2. 설명에서 해당 특성 이름이 언급되는지 확인
              if (trait.desc?.includes(traitName)) {
                return true;
              }
              // 3-3. API명에 특성 이름이 포함되는지 확인 (소문자 변환)
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
              console.warn(`⚠️ 특성 매핑 실패: "${traitName}" - 원본 이름으로 대체`);
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
        
        console.log('🎯 TFTStaticDataContext: 데이터 로딩 완료, 상태 업데이트 시작');
        setTftData(finalTftData);
        setItemsByCategory(itemsData);
        
        // 성공적으로 로드된 데이터 캐시
        setCachedData(tftDataCacheKey, finalTftData);
        setCachedData(itemsCacheKey, itemsData);
        
        setRetryCount(0);
        console.log('✅ TFTStaticDataContext: 모든 상태 업데이트 완료');

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
        console.log('🔧 TFTStaticDataContext: setLoading(false) 호출');
        setLoading(false);
        console.log('🔧 TFTStaticDataContext: setLoading(false) 완료');
      }
    };
    
    fetchData();
  }, [i18n.language, retryCount]); // 의존성 배열 단순화

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