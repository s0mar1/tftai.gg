import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions, QueryClient } from '@tanstack/react-query';
import { api } from '../utils/fetchApi';
import { fetchDeckTiersAPI } from '../api';
import { SummonerData, Match, DeckTier, Guide, ApiResponse, Ranker, ItemStats, TraitStats } from '../shared/types';

// API 응답 래퍼 타입 정의
interface SummonerApiResponse {
  data: SummonerData;
}

interface MatchHistoryApiResponse {
  data: Match[];
}

interface DeckTierApiResponse {
  data: DeckTier[];
}

// 기타 API 응답 타입들
interface RankingApiResponse {
  data: Ranker[];
}

interface GuideApiResponse {
  data: Guide[];
}

interface SingleGuideApiResponse {
  data: Guide;
}

interface StatsApiResponse {
  data: {
    items?: ItemStats[];
    traits?: TraitStats[];
    [key: string]: any;
  };
}

interface StaticDataApiResponse {
  data: any;
}

interface TranslationApiResponse {
  data: {
    translatedText: string;
    targetLanguage: string;
  };
}

interface DeckAnalysisApiResponse {
  data: {
    units: any[];
    traits: any[];
    analysis: string;
  };
}

interface SummonerDataParams {
  region: string;
  gameName: string;
  tagLine: string;
  options?: UseQueryOptions<SummonerApiResponse>;
}

interface MatchHistoryParams {
  region: string;
  puuid: string;
  options?: UseQueryOptions<MatchHistoryApiResponse>;
}

// 소환사 정보 조회
export const useSummonerData = (region: string, gameName: string, tagLine: string, options: UseQueryOptions<SummonerApiResponse> = {}) => {
  return useQuery<SummonerApiResponse>({
    queryKey: ['summoner', region, gameName, tagLine],
    queryFn: async ({ meta = {} }) => {
      let url = `/api/summoner?region=${region}&gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`;
      if (meta.force) {
        url += '&forceRefresh=true';
      }
      const response = await api.get<SummonerData>(url);
      return { data: response }; // fetchApi가 이미 data를 추출함
    },
    enabled: !!(region && gameName && tagLine),
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
    retry: 1,
    ...options,
  });
};

// 매치 히스토리 조회
export const useMatchHistory = (region: string, puuid: string, options: UseQueryOptions<MatchHistoryApiResponse> = {}) => {
  return useQuery<MatchHistoryApiResponse>({
    queryKey: ['matches', region, puuid],
    queryFn: async () => {
      if (import.meta.env.DEV) {
        console.log('useMatchHistory: API 호출 시작:', { region });
      }
      
      try {
        // 백엔드는 { matches: [...], pagination: {...}, filters: {...} } 구조로 응답
        const response = await api.get<{
          matches: Match[];
          pagination: any;
          filters: any;
        }>(`/api/matches?region=${region}&puuid=${puuid}`);
        
        if (import.meta.env.DEV) {
          console.log('useMatchHistory: API 응답 받음:', {
            hasMatches: response && typeof response === 'object' && 'matches' in response,
            matchesLength: Array.isArray(response?.matches) ? response.matches.length : 'not an array'
          });
        }
        
        // 응답 데이터 구조 검증
        if (!response || typeof response !== 'object') {
          if (import.meta.env.DEV) {
            console.error('useMatchHistory: API 응답이 객체가 아님:', typeof response);
          }
          return { data: [] };
        }
        
        if (!('matches' in response) || !Array.isArray(response.matches)) {
          if (import.meta.env.DEV) {
            console.error('useMatchHistory: API 응답에 matches 배열이 없음');
          }
          return { data: [] };
        }
        
        console.log('useMatchHistory: 성공적으로 매치 데이터 추출:', response.matches.length);
        return { data: response.matches };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('useMatchHistory: API 호출 실패:', error instanceof Error ? error.message : 'Unknown error');
        }
        // 에러 시에도 구조화된 응답 반환
        return { data: [] };
      }
    },
    enabled: !!(region && puuid),
    staleTime: 2 * 60 * 1000, // 2분
    cacheTime: 10 * 60 * 1000, // 10분
    retry: 1,
    ...options,
  });
};

// 덱 티어 리스트 조회 (다국어 지원)
export const useDeckTiers = (lang: string = 'ko', options: UseQueryOptions<DeckTier[]> = {}) => {
  return useQuery<DeckTier[]>({
    queryKey: ['deck-tiers', lang], // 쿼리 키에 언어 추가
    queryFn: async () => {
      const response = await fetchDeckTiersAPI(lang);
      return response.data || []; // ApiResponse에서 data 추출
    },
    staleTime: 30 * 60 * 1000, // 30분
    cacheTime: 60 * 60 * 1000, // 1시간
    retry: 2,
    ...options,
  });
};

// 랭킹 정보 조회
export const useRanking = (options: UseQueryOptions<RankingApiResponse> = {}) => {
  return useQuery<RankingApiResponse>({
    queryKey: ['ranking'],
    queryFn: async () => {
      const response = await api.get<Ranker[]>('/api/ranking');
      return { data: response }; // fetchApi가 이미 data를 추출함
    },
    staleTime: 10 * 60 * 1000, // 10분
    cacheTime: 30 * 60 * 1000, // 30분
    retry: 2,
    ...options,
  });
};

// 가이드 리스트 조회
export const useGuides = (options: UseQueryOptions<Guide[]> = {}) => {
  return useQuery<Guide[]>({
    queryKey: ['guides'],
    queryFn: async () => {
      const data = await api.get<Guide[]>('/api/guides');
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1시간
    cacheTime: 2 * 60 * 60 * 1000, // 2시간
    retry: 2,
    ...options,
  });
};

// 가이드 상세 조회
export const useGuideById = (id: string, options: UseQueryOptions<Guide> = {}) => {
  return useQuery<Guide>({
    queryKey: ['guide', id],
    queryFn: async () => {
      const data = await api.get<Guide>(`/api/guides/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 60 * 60 * 1000, // 1시간
    cacheTime: 2 * 60 * 60 * 1000, // 2시간
    retry: 2,
    ...options,
  });
};

// 통계 정보 조회
export const useStats = (options: UseQueryOptions<StatsApiResponse['data']> = {}) => {
  return useQuery<StatsApiResponse['data']>({
    queryKey: ['stats'],
    queryFn: async () => {
      const data = await api.get<StatsApiResponse['data']>('/api/stats');
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30분
    cacheTime: 60 * 60 * 1000, // 1시간
    retry: 2,
    ...options,
  });
};

// 정적 데이터 조회 (TFT 메타 데이터)
export const useStaticData = (endpoint: string, options: UseQueryOptions<any> = {}) => {
  return useQuery<any>({
    queryKey: ['static-data', endpoint],
    queryFn: async () => {
      const data = await api.get<any>(`/api/static-data/${endpoint}`);
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24시간
    cacheTime: 48 * 60 * 60 * 1000, // 48시간
    retry: 3,
    ...options,
  });
};

interface TranslationRequest {
  text: string;
  targetLanguage: string;
}

// 번역 요청
export const useTranslationMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation<TranslationApiResponse['data'], Error, TranslationRequest>({
    mutationFn: async ({ text, targetLanguage }: TranslationRequest) => {
      const data = await api.post<TranslationApiResponse['data']>('/api/translate', {
        text,
        targetLanguage,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });
};

// 덱 코드 분석
export const useDeckAnalysis = () => {
  return useMutation<DeckAnalysisApiResponse['data'], Error, string>({
    mutationFn: async (deckCode: string) => {
      const data = await api.post<DeckAnalysisApiResponse['data']>('/api/deck-builder/analyze', {
        deckCode,
      });
      return data;
    },
  });
};

// 캐시 무효화 유틸리티
export const useCacheInvalidation = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateSummoner: (region: string, gameName: string, tagLine: string) => {
      queryClient.invalidateQueries({ queryKey: ['summoner', region, gameName, tagLine] });
    },
    invalidateMatches: (region: string, puuid: string) => {
      queryClient.invalidateQueries({ queryKey: ['matches', region, puuid] });
    },
    invalidateDeckTiers: (lang?: string) => {
      // 특정 언어 또는 모든 언어의 덱 티어 캐시 무효화
      queryClient.invalidateQueries({ queryKey: lang ? ['deck-tiers', lang] : ['deck-tiers'] });
    },
    invalidateRanking: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
    },
    invalidateGuides: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  };
};

// 에러 처리 유틸리티
export const useErrorHandler = () => {
  return {
    handleError: (error: Error & { status?: number }) => {
      if (error.status === 401) {
        // 인증 에러 처리
        console.error('Authentication error:', error);
      } else if (error.status === 403) {
        // 권한 에러 처리
        console.error('Authorization error:', error);
      } else if (error.status === 429) {
        // Rate limit 에러 처리
        console.error('Rate limit error:', error);
      } else if (error.status && error.status >= 500) {
        // 서버 에러 처리
        console.error('Server error:', error);
      } else {
        // 기타 에러 처리
        console.error('Unknown error:', error);
      }
    },
  };
};

// 백그라운드 데이터 새로고침
export const useBackgroundRefresh = () => {
  const queryClient = useQueryClient();
  
  return {
    refreshAll: async () => {
      await queryClient.refetchQueries();
    },
    refreshSummoner: async (region: string, gameName: string, tagLine: string) => {
      await queryClient.refetchQueries({ queryKey: ['summoner', region, gameName, tagLine] });
    },
    refreshMatches: async (region: string, puuid: string) => {
      await queryClient.refetchQueries({ queryKey: ['matches', region, puuid] });
    },
    refreshDeckTiers: async () => {
      await queryClient.refetchQueries({ queryKey: ['deck-tiers'] });
    },
  };
};