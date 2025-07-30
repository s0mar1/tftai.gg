/**
 * GraphQL Code Generator 설정
 * TypeScript 타입 자동 생성 및 프론트엔드-백엔드 타입 동기화
 */

import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // GraphQL 스키마 소스
  schema: './src/graphql/schema.ts',
  
  // 생성할 파일들 설정
  generates: {
    // 백엔드용 자동 생성 타입
    './src/generated/graphql-types.ts': {
      plugins: [
        'typescript',
        'typescript-resolvers'
      ],
      config: {
        // TypeScript 설정
        useIndexSignature: true,
        contextType: '../graphql/types#GraphQLContext',
        // mappers: {
        //   // 커스텀 타입 매핑 - 임시 비활성화 (타입 충돌 해결)
        //   ChampionResponse: '../graphql/types#ChampionResponse',
        //   TierlistResponse: '../graphql/types#TierlistResponse', 
        //   SummonerResponse: '../graphql/types#SummonerResponse',
        //   MatchAnalysisResponse: '../graphql/types#MatchAnalysisResponse'
        // },
        scalars: {
          // 커스텀 스칼라 타입 매핑
          DateTime: 'string',
          JSON: 'Record<string, any>',
          Upload: 'File'
        },
        // 리졸버 타입 생성 설정
        makeResolverTypeCallable: true,
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false
        }
      }
    },
    
    // 스키마 SDL (Schema Definition Language) 파일 생성
    './src/generated/schema.graphql': {
      plugins: ['schema-ast']
    },
    
    // 프론트엔드용 타입 (공통 인터페이스)
    '../frontend/src/generated/graphql-types.ts': {
      plugins: [
        'typescript',
        'typescript-operations'
      ],
      config: {
        useIndexSignature: true,
        avoidOptionals: true,
        scalars: {
          DateTime: 'string',
          JSON: 'Record<string, any>'
        },
        // 프론트엔드용 커스터마이징
        enumsAsTypes: true,
        constEnums: true,
        skipTypename: false
      }
    },
    
    // GraphQL 쿼리 검증용 스키마
    './src/generated/schema.json': {
      plugins: ['introspection']
    }
  },
  
  // 전역 설정
  config: {
    // 생성된 파일 상단 주석
    addHead: '/* eslint-disable */',
    federation: false,
    namingConvention: {
      typeNames: 'pascal-case#pascalCase',
      enumValues: 'upper-case#upperCase'
    },
    // TypeScript strict 모드 대응
    strict: true,
    maybeValue: 'T | null | undefined'
  },
  
  // 플러그인 설정
  pluginLoader: (name: string) => {
    // 플러그인 동적 로딩
    return require(name);
  },
  
  // 훅 설정 (생성 전후 작업) - 일단 비활성화
  // hooks: {
  //   afterAllFileWrite: [
  //     // 생성된 파일들 포맷팅
  //     'prettier --write'
  //   ]
  // },
  
  // 감시 모드 설정 (개발 중 실시간 타입 업데이트)
  watch: process.env.NODE_ENV === 'development',
  watchPattern: './src/graphql/**/*.ts',
  
  // 디버그 모드
  verbose: process.env.NODE_ENV === 'development',
  debug: process.env.DEBUG === 'graphql-codegen'
};

export default config;