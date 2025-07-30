/**
 * Fragment 기반 최적화된 GraphQL 쿼리 훅들
 * 기존 useGraphQLQueries.ts와 병행 사용 가능
 */

import { useQuery, useLazyQuery, QueryHookOptions } from '@apollo/client';
import {
  GET_CHAMPIONS_FOR_CARD,
  GET_CHAMPION_DETAIL,
  GET_SUMMONER_FOR_CARD,
  GET_MATCH_HISTORY_OPTIMIZED,
  GET_TIERLIST_OPTIMIZED
} from '../graphql/fragments';

// GraphQL에서 사용하는 언어 타입 (기존과 동일)
export type GraphQLLanguage = 'KO' | 'EN' | 'JA' | 'ZH';

/**
 * 챔피언 카드 컴포넌트에 최적화된 훅
 * 필요한 필드만 요청하여 네트워크 사용량 최소화
 */
export function useChampionsForCard(
  language: GraphQLLanguage = 'KO',
  set?: string,
  options?: QueryHookOptions<any, { language: GraphQLLanguage; set?: string }>
) {
  const { data, loading, error, refetch } = useQuery(GET_CHAMPIONS_FOR_CARD, {
    variables: { language, set },
    // 기본 캐싱 정책: 캐시 우선, 백그라운드에서 업데이트
    fetchPolicy: 'cache-first',
    // 5분간 캐시 유지
    nextFetchPolicy: 'cache-first',
    errorPolicy: 'all',
    ...options
  });

  return {
    champions: data?.champions || [],
    isLoading: loading,
    error,
    refetch,
    // 추가 유틸리티
    isEmpty: !loading && (!data?.champions || data.champions.length === 0),
    count: data?.champions?.length || 0
  };
}

/**
 * 소환사 카드 컴포넌트에 최적화된 훅
 * 기본 정보 + 랭크 정보만 요청 (매치 히스토리 제외)
 */
export function useSummonerForCard(
  name: string,
  region: string = 'kr',
  options?: {
    enabled?: boolean;
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
  }
) {
  const { data, loading, error, refetch } = useQuery(GET_SUMMONER_FOR_CARD, {
    variables: { name, region },
    skip: !name || !region || (options?.enabled === false),
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    onCompleted: options?.onSuccess,
    onError: options?.onError
  });

  return {
    summoner: data?.summonerIntegrated?.summoner,
    isLoading: loading,
    error: error || data?.summonerIntegrated?.error,
    refetch,
    // 편의 함수들
    hasData: !loading && !!data?.summonerIntegrated?.summoner,
    isRanked: !!data?.summonerIntegrated?.summoner?.tier,
    winRate: data?.summonerIntegrated?.summoner ? 
      (data.summonerIntegrated.summoner.wins / 
       (data.summonerIntegrated.summoner.wins + data.summonerIntegrated.summoner.losses) * 100) : 0
  };
}

/**
 * 매치 히스토리에 최적화된 훅
 * 소환사 정보 없이 매치 데이터만 요청
 */
export function useOptimizedMatchHistory(
  name: string,
  region: string = 'kr',
  matchCount: number = 10,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    onError?: (error: any) => void;
  }
) {
  const { data, loading, error, refetch, fetchMore } = useQuery(GET_MATCH_HISTORY_OPTIMIZED, {
    variables: { name, region, matchCount },
    skip: !name || !region || (options?.enabled === false),
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    refetchInterval: options?.refetchInterval,
    onError: options?.onError
  });

  return {
    matches: data?.summonerIntegrated?.matches || [],
    isLoading: loading,
    error: error || data?.summonerIntegrated?.error,
    refetch,
    fetchMore,
    // 편의 함수들
    isEmpty: !loading && (!data?.summonerIntegrated?.matches || data.summonerIntegrated.matches.length === 0),
    matchCount: data?.summonerIntegrated?.matches?.length || 0,
    // 통계 계산
    avgPlacement: data?.summonerIntegrated?.matches?.length > 0 ? 
      data.summonerIntegrated.matches.reduce((sum: number, match: any) => sum + match.placement, 0) / 
      data.summonerIntegrated.matches.length : 0,
    top4Rate: data?.summonerIntegrated?.matches?.length > 0 ?
      (data.summonerIntegrated.matches.filter((match: any) => match.placement <= 4).length / 
       data.summonerIntegrated.matches.length * 100) : 0
  };
}

/**
 * 티어리스트에 최적화된 훅
 * 티어별로 다른 수준의 정보 요청 (S티어는 상세, C티어는 기본)
 */
export function useOptimizedTierlist(
  language: GraphQLLanguage = 'KO',
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    onError?: (error: any) => void;
  }
) {
  const { data, loading, error, refetch } = useQuery(GET_TIERLIST_OPTIMIZED, {
    variables: { language },
    skip: options?.enabled === false,
    fetchPolicy: 'cache-first',
    // 티어리스트는 자주 변하지 않으므로 긴 간격
    nextFetchPolicy: 'cache-first',
    refetchInterval: options?.refetchInterval,
    errorPolicy: 'all',
    onError: options?.onError
  });

  const tierlist = data?.tierlist;

  return {
    tierlist,
    isLoading: loading,
    error,
    refetch,
    // 편의 함수들
    isEmpty: !loading && !tierlist,
    // 각 티어별 덱 수
    counts: {
      S: tierlist?.S?.length || 0,
      A: tierlist?.A?.length || 0,
      B: tierlist?.B?.length || 0,
      C: tierlist?.C?.length || 0,
      total: (tierlist?.S?.length || 0) + (tierlist?.A?.length || 0) + 
             (tierlist?.B?.length || 0) + (tierlist?.C?.length || 0)
    },
    // 특정 티어의 덱들 가져오기
    getDecksByTier: (tier: 'S' | 'A' | 'B' | 'C') => tierlist?.[tier] || []
  };
}

/**
 * Lazy 쿼리들 (필요할 때만 실행)
 */

/**
 * 챔피언 상세 정보 Lazy Query
 */
export function useLazyChampionDetail() {
  const [getChampionDetail, { data, loading, error }] = useLazyQuery(GET_CHAMPION_DETAIL, {
    fetchPolicy: 'cache-first',
    errorPolicy: 'all'
  });

  return {
    getChampionDetail: (language: GraphQLLanguage, championName: string) =>
      getChampionDetail({ variables: { language, championName } }),
    champion: data?.champions?.find((c: any) => 
      c.name === championName || c.apiName === championName
    ),
    isLoading: loading,
    error
  };
}

/**
 * 조건부 쿼리 실행 헬퍼
 */
export function useConditionalQuery<TData, TVariables>(
  query: any,
  variables: TVariables,
  condition: boolean,
  options?: QueryHookOptions<TData, TVariables>
) {
  return useQuery<TData, TVariables>(query, {
    variables,
    skip: !condition,
    ...options
  });
}

/**
 * 여러 쿼리를 병렬로 실행하는 헬퍼
 */
export function useParallelQueries(
  summoner: { name: string; region: string },
  options: {
    includeCard?: boolean;
    includeMatches?: boolean;
    matchCount?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    includeCard = true,
    includeMatches = true,
    matchCount = 10,
    enabled = true
  } = options;

  // 소환사 카드 정보
  const cardQuery = useSummonerForCard(
    summoner.name,
    summoner.region,
    { enabled: enabled && includeCard }
  );

  // 매치 히스토리
  const matchesQuery = useOptimizedMatchHistory(
    summoner.name,
    summoner.region,
    matchCount,
    { enabled: enabled && includeMatches }
  );

  return {
    card: cardQuery,
    matches: matchesQuery,
    // 전체 로딩 상태
    isLoading: cardQuery.isLoading || matchesQuery.isLoading,
    // 모든 쿼리가 완료되었는지
    isComplete: !cardQuery.isLoading && !matchesQuery.isLoading,
    // 에러가 있는지
    hasError: !!cardQuery.error || !!matchesQuery.error,
    // 모든 쿼리 리페치
    refetchAll: () => {
      cardQuery.refetch();
      matchesQuery.refetch();
    }
  };
}

/**
 * 캐시 최적화 유틸리티
 */
export const cacheOptimization = {
  /**
   * 특정 쿼리의 캐시 데이터 확인
   */
  getCachedData: (client: any, query: any, variables: any) => {
    try {
      return client.readQuery({ query, variables });
    } catch {
      return null;
    }
  },

  /**
   * 캐시에 데이터 미리 로드
   */
  preloadData: (client: any, query: any, variables: any, data: any) => {
    try {
      client.writeQuery({ query, variables, data });
    } catch (error) {
      console.warn('Failed to preload cache data:', error);
    }
  }
};

/**
 * 사용 예시:
 * 
 * // 기존 방식 (계속 사용 가능)
 * const { data } = useSummonerIntegrated(name, region, 10);
 * 
 * // 최적화된 방식 (새로운 옵션)
 * const { summoner } = useSummonerForCard(name, region);
 * const { matches } = useOptimizedMatchHistory(name, region, 10);
 * 
 * // 병렬 실행
 * const { card, matches } = useParallelQueries({ name, region });
 */