/** @type {import('jest').Config} */
export default {
  // 공통 Jest 설정
  testEnvironment: 'node',
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 파일 변환 설정
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // 모듈 경로 매핑 (TypeScript 경로와 일치)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 테스트 실행 전 설정
  setupFilesAfterEnv: [],
  
  // 타임아웃 설정
  testTimeout: 10000,
  
  // 병렬 실행 설정
  maxWorkers: '50%',
  
  // 상세 출력
  verbose: true,
  
  // 캐시 설정
  cache: true,
  
  // Git과 관련된 파일 무시
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ]
};