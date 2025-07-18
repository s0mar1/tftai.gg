/**
 * 서버 초기화 설정
 * 서버 시작 시 각 단계별 타임아웃, 재시도 횟수 등을 설정합니다.
 * 
 * 역할: 초기화 프로세스의 상수와 설정값 정의
 * 사용: initialization/coreModules.ts에서 초기화 프로세스 제어 시 사용
 */

export const INITIALIZATION_CONFIG = {
  // 환경 변수 설정
  env: {
    // 필수 환경 변수 목록
    required: ['RIOT_API_KEY', 'MONGODB_URI'],
    // 선택적 환경 변수와 기본값
    optional: {
      PORT: '4001',
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:3000,http://localhost:5173',
      INITIAL_DATA_COLLECTION_DELAY: '30000',
      DATA_COLLECTION_TIMEOUT: '300000',
      ENABLE_INITIAL_DATA_COLLECTION: 'false'
    }
  },
  
  // 외부 서비스 연결 설정
  externalServices: {
    mongodb: {
      connectionTimeout: 10000, // 10초
      maxRetries: 3,
      retryDelay: 1000, // 1초
      poolSize: {
        min: 2,
        max: 10
      }
    },
    redis: {
      connectionTimeout: 10000, // 10초
      maxRetries: 3,
      retryDelay: 1000, // 1초
      required: false // Redis는 선택사항
    }
  },
  
  // 정적 데이터 로드 설정
  staticData: {
    languages: ['ko', 'en', 'ja', 'fr'],
    primaryLanguage: 'ko',
    loadTimeout: 30000, // 언어당 30초
    parallel: true,
    continueOnError: true,
    retryAttempts: 2,
    retryDelay: 2000 // 2초
  },
  
  // 초기 데이터 수집 설정
  dataCollection: {
    // 환경 변수로 제어 (ENABLE_INITIAL_DATA_COLLECTION)
    defaultEnabled: false,
    // 서버 시작 후 지연 시간 (밀리초)
    defaultDelay: 30000, // 30초
    // 전체 데이터 수집 타임아웃
    timeout: 300000, // 5분
    // 각 작업별 타임아웃
    tasks: {
      matchCollection: 120000, // 2분
      deckAnalysis: 90000, // 1.5분
      playerStats: 90000 // 1.5분
    }
  },
  
  // 서버 시작 설정
  server: {
    // 전체 초기화 타임아웃
    initializationTimeout: 120000, // 2분
    // 각 단계별 실패 시 동작
    failureHandling: {
      env: 'stop', // 환경 변수 검증 실패 시 중단
      mongodb: 'stop', // MongoDB 연결 실패 시 중단
      redis: 'continue', // Redis 연결 실패 시 계속
      staticData: {
        primary: 'stop', // 주 언어 로드 실패 시 중단
        secondary: 'continue' // 보조 언어 로드 실패 시 계속
      },
      scheduler: 'continue', // 스케줄러 초기화 실패 시 계속
      dataCollection: 'continue' // 초기 데이터 수집 실패 시 계속
    }
  },
  
  // 로깅 설정
  logging: {
    // 초기화 과정 상세 로깅
    verbose: process.env.NODE_ENV === 'development',
    // 성능 측정
    measurePerformance: true,
    // 각 단계 완료 시 요약 출력
    showSummary: true
  }
};

/**
 * 초기화 설정을 환경 변수로 오버라이드합니다.
 */
export function getInitializationConfig() {
  const config = { ...INITIALIZATION_CONFIG };
  
  // 환경 변수로 설정 오버라이드
  if (process.env.MONGODB_TIMEOUT) {
    config.externalServices.mongodb.connectionTimeout = parseInt(process.env.MONGODB_TIMEOUT, 10);
  }
  
  if (process.env.REDIS_TIMEOUT) {
    config.externalServices.redis.connectionTimeout = parseInt(process.env.REDIS_TIMEOUT, 10);
  }
  
  if (process.env.STATIC_DATA_LANGUAGES) {
    config.staticData.languages = process.env.STATIC_DATA_LANGUAGES.split(',');
  }
  
  if (process.env.INITIALIZATION_TIMEOUT) {
    config.server.initializationTimeout = parseInt(process.env.INITIALIZATION_TIMEOUT, 10);
  }
  
  return config;
}

/**
 * 초기화 단계 이름
 */
export enum InitializationStage {
  ENV_LOAD = '환경 변수 로드',
  EXTERNAL_SERVICES = '외부 서비스 연결',
  STATIC_DATA = '정적 데이터 로드',
  CORE_MODULES = '핵심 모듈 초기화',
  ROUTING = '라우팅 설정',
  DATA_COLLECTION = '초기 데이터 수집',
  SERVER_LISTEN = '서버 리스닝'
}

/**
 * 초기화 상태 추적
 */
export interface InitializationStatus {
  stage: InitializationStage;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  error?: any;
  details?: any;
}