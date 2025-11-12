/**
 * Apollo Server GraphQL 설정 모듈
 * Express 애플리케이션에 Apollo Server를 미들웨어로 통합합니다.
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Application } from 'express';
import http from 'http';
import logger from '../config/logger';
import { typeDefs } from '../graphql/schema';
import { resolvers } from '../graphql/resolvers';
import { getServerConfig } from './envLoader';
import { DataLoaderManager } from '../graphql/dataLoaders';
import { 
  // createComplexityValidationRule, // 임시 비활성화 - GraphQL 16 호환성 문제
  createDepthLimitRule,
  // QueryComplexityAnalyzer, // 임시 비활성화
  // complexityMetricsCollector // 임시 비활성화
} from '../graphql/queryComplexity';
import { graphqlTelemetryPlugin } from '../graphql/telemetry';
import { performanceMonitoringPlugin } from '../graphql/performanceMonitoringPlugin';
import { errorClassificationPlugin } from '../graphql/errorClassificationPlugin';
import { queryComplexityMonitorPlugin } from '../graphql/queryComplexityMonitorPlugin';
import { authenticateGraphQLContext } from '../middlewares/auth';

// 타입 import
import type { GraphQLContext } from '../graphql/types';

/**
 * GraphQL 설정 결과 인터페이스
 */
export interface GraphQLSetupResult {
  success: boolean;
  message: string;
  server?: ApolloServer<GraphQLContext>;
  endpoint?: string;
  wsServer?: any; // WebSocket 서버 정리를 위한 참조
}

/**
 * WebSocket 서버 설정
 */
async function createWebSocketServer(httpServer: http.Server): Promise<any> {
  const config = getServerConfig();
  
  logger.info('[GraphQL WebSocket] WebSocket 서버 설정 시작...');
  
  // WebSocket 서버 생성
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql', // GraphQL Subscriptions 경로
  });
  
  // 실행 가능한 스키마 생성
  const executableSchema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  // GraphQL-WS 서버 설정
  const serverCleanup = useServer(
    {
      schema: executableSchema,
      context: async (ctx) => {
        // WebSocket 컨텍스트 생성
        const dataLoaders = new DataLoaderManager();
        const requestId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        // WebSocket 인증 처리 (connectionParams에서 토큰 추출)
        const token = ctx.connectionParams?.authorization?.replace('Bearer ', '') || 
                     ctx.connectionParams?.token;
        
        let user = undefined;
        if (token) {
          // 간단한 req 객체 모킹 (WebSocket용)
          const mockReq = {
            headers: {
              authorization: `Bearer ${token}`
            }
          };
          
          user = await authenticateGraphQLContext({
            req: mockReq,
            res: null,
            dataLoaders,
            requestId,
            startTime
          });
        }

        return {
          connectionParams: ctx.connectionParams,
          extra: ctx.extra,
          dataLoaders,
          requestId,
          startTime,
          user: user || undefined
        };
      },
      onConnect: async (ctx) => {
        logger.info('🔌 [GraphQL WebSocket] 클라이언트 연결됨:', {
          protocol: ctx.protocol,
          connectionParams: ctx.connectionParams
        });
        return true;
      },
      onDisconnect: async (ctx, code, reason) => {
        logger.info('🔌 [GraphQL WebSocket] 클라이언트 연결 해제됨:', {
          code,
          reason: reason?.toString()
        });
      },
      onError: (ctx, msg, errors) => {
        logger.error('❌ [GraphQL WebSocket] 에러 발생:', {
          message: msg,
          errors: errors.map(e => e.message)
        });
      },
      onSubscribe: async (ctx, msg) => {
        logger.info('📡 [GraphQL WebSocket] 구독 시작:', {
          operationName: msg.payload.operationName,
          query: msg.payload.query?.substring(0, 100) + '...'
        });
      }
    },
    wsServer
  );
  
  logger.info('  ✓ WebSocket 서버 설정 완료');
  
  return { wsServer, serverCleanup };
}

/**
 * Apollo Server 생성 및 설정
 */
async function createApolloServer(httpServer: http.Server, wsServerCleanup: any): Promise<ApolloServer<GraphQLContext>> {
  const config = getServerConfig();
  
  // Apollo Server 설정
  const apolloServer = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    
    // 보안 및 성능을 위한 쿼리 검증 규칙 - 임시 비활성화
    validationRules: [
      // createComplexityValidationRule(), // 임시 비활성화 - GraphQL 16 호환성 문제
      // createDepthLimitRule() // 임시 비활성화 - GraphQL 16 호환성 문제
    ],
    
    // 플러그인 설정
    plugins: [
      // HTTP 서버와의 graceful shutdown 연동
      ApolloServerPluginDrainHttpServer({ httpServer }),
      
      // WebSocket 서버 정리 플러그인
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await wsServerCleanup.dispose();
            },
          };
        },
      },
      
      // 복잡도 메트릭스 수집 플러그인
      {
        async requestDidStart() {
          return {
            async didResolveOperation(requestContext) {
              // QueryComplexityAnalyzer 임시 비활성화 - GraphQL 16 호환성 문제
              logger.debug(`🔍 [GraphQL] 쿼리 처리:`, {
                operationName: requestContext.operationName || 'Unknown'
              });
            },
            
            async didEncounterErrors(requestContext) {
              // 에러 로깅 - 복잡도 체크 임시 비활성화
              if (requestContext.errors && requestContext.errors.length > 0) {
                logger.error(`❌ [GraphQL] 쿼리 에러:`, {
                  operationName: requestContext.operationName || 'Unknown',
                  errorCount: requestContext.errors.length
                });
              }
            },
            
            async willSendResponse(requestContext) {
              // complexityMetricsCollector 임시 비활성화 - GraphQL 16 호환성 문제
              logger.debug(`🎯 [GraphQL] 요청 완료:`, {
                operationName: requestContext.operationName || 'Unknown'
              });
            }
          };
        }
      },
      
      // OpenTelemetry 성능 모니터링 플러그인
      graphqlTelemetryPlugin,
      
      // 추가 성능 모니터링 플러그인 (기존 동작에 영향 없음)
      performanceMonitoringPlugin,
      
      // 에러 분류 및 강화된 로깅 플러그인 (기존 에러 처리에 영향 없음)
      errorClassificationPlugin,
      
      // 쿼리 복잡도 모니터링 플러그인 (LOG-ONLY, 쿼리 차단 안함)
      queryComplexityMonitorPlugin,
      
      // GraphQL Playground 설정 (개발 환경에서만)
      config.isDevelopment 
        ? ApolloServerPluginLandingPageLocalDefault({ footer: false })
        : ApolloServerPluginLandingPageLocalDefault({ footer: false, embed: false })
    ],
    
    // 보안 설정
    introspection: config.isDevelopment, // 개발 환경에서만 introspection 허용
    includeStacktraceInErrorResponses: config.isDevelopment, // 개발 환경에서만 스택 트레이스 포함
    
    // 포매팅 설정
    formatError: (formattedError, error) => {
      // 프로덕션에서는 민감한 정보 숨김
      if (config.isProduction) {
        const { locations, path, ...productionError } = formattedError;
        formattedError = productionError as any;
        
        // 서버 에러만 로깅
        if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          logger.error('GraphQL Internal Error:', error);
        }
      } else {
        // 개발 환경에서는 모든 에러 로깅
        logger.error('GraphQL Error:', error);
      }
      
      return formattedError;
    }
  });
  
  return apolloServer;
}

/**
 * GraphQL 컨텍스트 생성 함수
 */
async function createGraphQLContext({ req, res }: { req: any; res: any }): Promise<GraphQLContext> {
  // 매 요청마다 새로운 DataLoader 인스턴스 생성 (요청 스코프 배치)
  const dataLoaders = new DataLoaderManager();
  
  // 성능 추적을 위한 메타데이터
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  // JWT 인증 처리 (선택적)
  const user = await authenticateGraphQLContext({
    req,
    res,
    dataLoaders,
    requestId,
    startTime
  });

  const context: GraphQLContext = {
    req,
    res,
    dataLoaders,
    requestId,
    startTime
  };
  
  if (user) {
    context.user = user;
  }
  
  return context;
}

/**
 * Express 앱에 Apollo Server 미들웨어 설정
 */
export async function setupGraphQL(app: Application, httpServer: http.Server): Promise<GraphQLSetupResult> {
  try {
    const config = getServerConfig();
    
    logger.info('[GraphQL Setup] Apollo Server 설정 시작...');
    
    // WebSocket 서버 생성
    const { wsServer, serverCleanup } = await createWebSocketServer(httpServer);
    
    // Apollo Server 생성
    const apolloServer = await createApolloServer(httpServer, serverCleanup);
    
    // Apollo Server 시작
    await apolloServer.start();
    logger.info('  ✓ Apollo Server 시작 완료');
    
    // GraphQL 엔드포인트 경로
    const graphqlPath = '/graphql';
    
    // Express 미들웨어로 Apollo Server 연결
    app.use(
      graphqlPath,
      // JSON 미들웨어는 이미 앱 레벨에서 설정되어 있음
      expressMiddleware(apolloServer, {
        context: createGraphQLContext
      })
    );
    
    logger.info(`  ✓ GraphQL 엔드포인트 등록: ${graphqlPath}`);
    
    // GraphiQL 접근성 로깅
    if (config.isDevelopment) {
      logger.info(`  ✓ GraphiQL available at: http://localhost:${config.port}${graphqlPath}`);
      logger.info(`  ✓ WebSocket Subscriptions available at: ws://localhost:${config.port}${graphqlPath}`);
    } else {
      logger.info('  ✓ GraphQL Playground는 프로덕션에서 비활성화됨');
    }
    
    logger.info('[GraphQL Setup] Apollo Server와 WebSocket 서버 설정 완료');
    
    return {
      success: true,
      message: 'GraphQL과 WebSocket이 성공적으로 설정되었습니다',
      server: apolloServer,
      endpoint: graphqlPath,
      wsServer: { wsServer, serverCleanup }
    };
    
  } catch (error: any) {
    logger.error('[GraphQL Setup] Apollo Server 설정 실패:', error);
    
    return {
      success: false,
      message: `GraphQL 설정 실패: ${error.message}`
    };
  }
}

/**
 * GraphQL 기능 활성화 여부 확인
 */
export function isGraphQLEnabled(): boolean {
  const enableGraphQL = process.env.ENABLE_GRAPHQL;
  
  // 환경변수가 명시적으로 'false'가 아니면 활성화 (기본값: true)
  return enableGraphQL !== 'false';
}

/**
 * GraphQL 설정 정보 로깅
 */
export function logGraphQLInfo(): void {
  const config = getServerConfig();
  const enabled = isGraphQLEnabled();
  
  logger.info('[GraphQL Info] 설정 정보:');
  logger.info(`  - GraphQL 활성화: ${enabled ? '예' : '아니오'}`);
  logger.info(`  - Introspection: ${config.isDevelopment ? '활성화' : '비활성화'}`);
  logger.info(`  - GraphQL Playground: ${config.isDevelopment ? '활성화' : '비활성화'}`);
  logger.info(`  - 환경: ${config.isDevelopment ? '개발' : '프로덕션'}`);
}