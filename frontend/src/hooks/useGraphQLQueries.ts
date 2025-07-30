/**
 * GraphQL 쿼리를 위한 커스텀 훅들
 * Apollo Client와 TanStack Query의 통합 사용
 */

import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { 
  GET_SUMMONER_INTEGRATED,
  GET_SUMMONER_BASIC,
  GET_TIERLIST,
  GET_CHAMPIONS,
  ANALYZE_MATCH,
  SUBSCRIBE_MATCH_ANALYSIS_PROGRESS,
  GET_SERVICE_INFO
} from '../graphql/queries';

// GraphQL에서 사용하는 언어 타입
export type GraphQLLanguage = 'KO' | 'EN' | 'JA' | 'ZH';

/**
 * 소환사 통합 정보 조회 훅
 * 소환사 정보 + 최근 매치 + 리그 정보를 한 번에 조회
 */
export function useSummonerIntegrated(
  name: string,
  region: string = 'kr',
  matchCount: number = 10,
  options?: {
    enabled?: boolean;
    onError?: (error: any) => void;
  }
) {
  const { data, loading, error, refetch } = useQuery(GET_SUMMONER_INTEGRATED, {
    variables: { name, region, matchCount },
    skip: !options?.enabled && options?.enabled !== undefined ? true : !name || !region,
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
    onError: options?.onError,
    // Apollo Client 캐싱 정책
    fetchPolicy: 'cache-and-network',
    // 5분간 캐시 유지
    nextFetchPolicy: 'cache-first'
  });

  return {
    data: data?.summonerIntegrated,
    isLoading: loading,
    error: error || data?.summonerIntegrated?.error,
    refetch,
    // 편의를 위한 데이터 추출
    summoner: data?.summonerIntegrated?.data?.summoner,
    matches: data?.summonerIntegrated?.data?.recentMatches || [],
    leagueEntries: data?.summonerIntegrated?.data?.leagueEntries || [],
    success: data?.summonerIntegrated?.success,
    meta: data?.summonerIntegrated?.meta
  };
}

/**
 * 소환사 기본 정보만 조회하는 훅 (빠른 조회용)
 */
export function useSummonerBasic(
  name: string,
  region: string = 'kr',
  options?: {
    enabled?: boolean;
    onError?: (error: any) => void;
  }
) {
  const { data, loading, error, refetch } = useQuery(GET_SUMMONER_BASIC, {
    variables: { name, region },
    skip: !options?.enabled && options?.enabled !== undefined ? true : !name || !region,
    errorPolicy: 'all',
    onError: options?.onError,
    fetchPolicy: 'cache-first'
  });

  return {
    data: data?.summoner,
    isLoading: loading,
    error: error || data?.summoner?.error,
    refetch,
    summoner: data?.summoner?.data?.summoner,
    success: data?.summoner?.success,
    meta: data?.summoner?.meta
  };
}

/**
 * 티어리스트 조회 훅
 */
export function useTierlist(
  language: GraphQLLanguage = 'KO',
  options?: {
    enabled?: boolean;
  }
) {
  const { data, loading, error, refetch } = useQuery(GET_TIERLIST, {
    variables: { language },
    skip: !options?.enabled && options?.enabled !== undefined ? true : false,
    errorPolicy: 'all',
    // 언어별 캐싱 - 10분간 유지
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first'
  });

  return {
    data: data?.tierlist,
    isLoading: loading,
    error: error || data?.tierlist?.error,
    refetch,
    decks: data?.tierlist?.data?.decks || [],
    lastUpdated: data?.tierlist?.data?.lastUpdated,
    totalDecks: data?.tierlist?.data?.totalDecks,
    success: data?.tierlist?.success,
    meta: data?.tierlist?.meta
  };
}

/**
 * 챔피언 데이터 조회 훅
 */
export function useChampions(
  language: GraphQLLanguage = 'KO',
  options?: {
    enabled?: boolean;
  }
) {
  const { data, loading, error, refetch } = useQuery(GET_CHAMPIONS, {
    variables: { language },
    skip: !options?.enabled && options?.enabled !== undefined ? true : false,
    errorPolicy: 'all',
    // 챔피언 데이터는 자주 변경되지 않으므로 더 오래 캐싱
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first'
  });

  return {
    data: data?.champions,
    isLoading: loading,
    error: error || data?.champions?.error,
    refetch,
    champions: data?.champions?.data?.TFTChampions || [],
    success: data?.champions?.success,
    meta: data?.champions?.meta
  };
}

/**
 * AI 매치 분석 뮤테이션 훅
 */
export function useMatchAnalysis() {
  const [analyzeMatch, { data, loading, error }] = useMutation(ANALYZE_MATCH, {
    errorPolicy: 'all'
  });

  const analyze = async (matchId: string, userPuuid: string) => {
    return await analyzeMatch({
      variables: {
        input: { matchId, userPuuid }
      }
    });
  };

  return {
    analyze,
    data: data?.analyzeMatch,
    isLoading: loading,
    error: error || data?.analyzeMatch?.error,
    analysis: data?.analyzeMatch?.data?.analysis,
    success: data?.analyzeMatch?.success
  };
}

/**
 * 매치 분석 진행상황 구독 훅 (선택적 실시간 기능)
 */
export function useMatchAnalysisProgress(
  matchId?: string,
  userPuuid?: string,
  options?: {
    enabled?: boolean;
  }
) {
  const { data, loading, error } = useSubscription(SUBSCRIBE_MATCH_ANALYSIS_PROGRESS, {
    variables: { matchId, userPuuid },
    skip: !options?.enabled && options?.enabled !== undefined ? true : !matchId && !userPuuid,
    onData: ({ data }) => {
      if (data?.data?.matchAnalysisUpdated) {
        console.log('📡 매치 분석 진행상황:', data.data.matchAnalysisUpdated);
      }
    },
    onError: (error) => {
      console.error('❌ 매치 분석 구독 에러:', error);
    }
  });

  return {
    data: data?.matchAnalysisUpdated,
    isLoading: loading,
    error,
    eventType: data?.matchAnalysisUpdated?.eventType,
    progress: data?.matchAnalysisUpdated?.progress,
    message: data?.matchAnalysisUpdated?.message,
    analysisData: data?.matchAnalysisUpdated?.data
  };
}

/**
 * 서비스 정보 조회 훅
 */
export function useServiceInfo() {
  const { data, loading, error, refetch } = useQuery(GET_SERVICE_INFO, {
    errorPolicy: 'all',
    // 서비스 정보는 거의 변경되지 않으므로 캐시 우선
    fetchPolicy: 'cache-first'
  });

  return {
    data: data?.serviceInfo,
    isLoading: loading,
    error,
    refetch,
    serviceInfo: data?.serviceInfo
  };
}

/**
 * 언어 변환 유틸리티
 */
export function convertLanguageToGraphQL(language: string): GraphQLLanguage {
  switch (language.toLowerCase()) {
    case 'ko':
    case 'korean':
      return 'KO';
    case 'en':
    case 'english':
      return 'EN';
    case 'ja':
    case 'japanese':
      return 'JA';
    case 'zh':
    case 'chinese':
      return 'ZH';
    default:
      return 'KO';
  }
}

/**
 * GraphQL 에러 처리 유틸리티
 */
export function handleGraphQLError(error: any) {
  if (error?.networkError?.statusCode === 429) {
    return {
      type: 'RATE_LIMIT',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
    };
  }
  
  if (error?.graphQLErrors?.length > 0) {
    const graphQLError = error.graphQLErrors[0];
    if (graphQLError.extensions?.code === 'UNAUTHENTICATED') {
      return {
        type: 'AUTH_ERROR',
        message: '인증이 필요합니다.'
      };
    }
    
    return {
      type: 'GRAPHQL_ERROR',
      message: graphQLError.message
    };
  }
  
  if (error?.networkError) {
    return {
      type: 'NETWORK_ERROR',
      message: '네트워크 연결을 확인해주세요.'
    };
  }
  
  return {
    type: 'UNKNOWN_ERROR',
    message: error?.message || '알 수 없는 오류가 발생했습니다.'
  };
}