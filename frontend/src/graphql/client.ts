/**
 * Apollo GraphQL 클라이언트 설정
 * 타입 안전성을 보장하는 GraphQL 클라이언트 구성
 */

import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// 환경 설정
const isProduction = import.meta.env.PROD;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';
const WS_URL = API_BASE_URL.replace(/^https?/, 'ws').replace(/^http/, 'ws');

// HTTP Link 설정
const httpLink = createHttpLink({
  uri: `${API_BASE_URL}/graphql`,
  credentials: 'same-origin'
});

// WebSocket Link 설정 (Subscriptions용) - 현대적 graphql-ws 방식
const wsLink = new GraphQLWsLink(
  createClient({
    url: `${WS_URL}/graphql`,
    connectionParams: () => {
      const token = localStorage.getItem('authToken');
      return {
        authorization: token ? `Bearer ${token}` : '',
        'client-name': 'TFT-Meta-Analyzer-Frontend',
        'client-version': '1.0.0'
      };
    },
    shouldRetry: (errOrCloseEvent) => {
      // 재연결 로직
      return !isProduction; // 개발 환경에서만 자동 재연결
    }
  })
);

// 인증 컨텍스트 링크
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-client-name': 'TFT-Meta-Analyzer',
      'x-client-version': '1.0.0'
    }
  };
});

// 에러 핸들링 링크
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      // GraphQL 모듈 충돌 에러 특별 처리
      if (message.includes('Cannot use GraphQLEnumType') || 
          message.includes('from another module or realm')) {
        console.error('[GraphQL Module Conflict]:', message);
        console.error('GraphQL 모듈 충돌이 감지되었습니다. 서버를 재시작해주세요.');
        return;
      }
      
      console.error(
        `[GraphQL Error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        { extensions }
      );
      
      // 인증 에러 처리
      if (extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      
      // 권한 에러 처리  
      if (extensions?.code === 'FORBIDDEN') {
        console.error('권한이 없습니다:', message);
        // 권한 없음 알림 표시
      }
    });
  }
  
  if (networkError) {
    // 네트워크 에러 안전한 로깅 - 순환 참조 방지
    const safeNetworkError = {
      message: networkError.message || 'Unknown network error',
      name: networkError.name || 'NetworkError',
      ...(('statusCode' in networkError) && { statusCode: networkError.statusCode }),
      ...(('result' in networkError) && { 
        result: typeof networkError.result === 'string' 
          ? networkError.result 
          : '[Object]' 
      })
    };
    
    console.error(`[Network Error]:`, safeNetworkError);
    
    // 네트워크 에러 처리
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    // 400 에러 특별 처리 (GraphQL 모듈 충돌 관련)
    if ('statusCode' in networkError && networkError.statusCode === 400) {
      const errorMessage = networkError.message || '';
      if (errorMessage.includes('GraphQL') || errorMessage.includes('module')) {
        console.error('GraphQL 모듈 충돌로 인한 400 에러가 발생했습니다.');
        // 재시도 대신 REST API 폴백 사용을 권장
        return;
      }
    }
  }
});

// 링크 분할 로직 (HTTP vs WebSocket)
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// Apollo Client 캐시 설정
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Champions 캐시 정책
        champions: {
          keyArgs: ['language'],
          merge: (existing, incoming) => {
            // 언어별로 별도 캐시
            return incoming;
          }
        },
        
        // Tierlist 캐시 정책  
        tierlist: {
          keyArgs: ['language'],
          merge: (existing, incoming) => {
            return incoming;
          }
        },
        
        // Summoner 캐시 정책
        summoner: {
          keyArgs: ['name', 'region'],
          merge: (existing, incoming) => {
            return incoming;
          }
        }
      }
    },
    
    // 캐시된 객체 식별자 설정
    Champion: {
      keyFields: ['name', 'cost']
    },
    
    Deck: {
      keyFields: ['id']
    },
    
    SummonerInfo: {
      keyFields: ['puuid']
    }
  },
  
  // 개발 환경에서 캐시 디버깅
  ...(isProduction ? {} : {
    possibleTypes: {} // Schema introspection 결과 추가 가능
  })
});

// Apollo Client 인스턴스 생성
export const apolloClient = new ApolloClient({
  link: from([
    errorLink,
    authLink,
    splitLink
  ]),
  cache,
  
  // 개발 환경 설정
  connectToDevTools: !isProduction,
  
  // 기본 옵션
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all'
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all'
    },
    mutate: {
      errorPolicy: 'all'
    }
  }
});

// GraphQL 쿼리 타입 안전성을 위한 헬퍼
export type TypedDocumentNode<TResult, TVariables = Record<string, any>> = any;

// 타입 안전한 쿼리 실행 헬퍼
export function executeTypedQuery<TResult, TVariables = Record<string, any>>(
  query: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
) {
  return apolloClient.query<TResult, TVariables>({
    query,
    variables
  });
}

// 타입 안전한 뮤테이션 실행 헬퍼
export function executeTypedMutation<TResult, TVariables = Record<string, any>>(
  mutation: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
) {
  return apolloClient.mutate<TResult, TVariables>({
    mutation,
    variables
  });
}

// 구독 헬퍼
export function createTypedSubscription<TResult, TVariables = Record<string, any>>(
  subscription: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
) {
  return apolloClient.subscribe<TResult, TVariables>({
    query: subscription,
    variables
  });
}

// 캐시 유틸리티
export const cacheUtils = {
  // 캐시 초기화
  clearCache: () => apolloClient.cache.reset(),
  
  // 특정 쿼리 캐시 제거
  evictQuery: (query: any, variables?: any) => {
    apolloClient.cache.evict({ 
      id: 'ROOT_QUERY',
      fieldName: query.definitions[0].selectionSet.selections[0].name.value,
      args: variables
    });
  },
  
  // 캐시 상태 확인
  inspect: () => apolloClient.cache.extract()
};

export default apolloClient;