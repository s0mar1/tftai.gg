import dotenv from 'dotenv';
import { jest } from '@jest/globals';

// 테스트 환경에서 환경변수 로드
dotenv.config({ path: '.env.test' });

// logger 모듈을 모킹합니다.
jest.mock('./src/config/logger', () => ({
  __esModule: true, // ES 모듈임을 명시
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));


// 테스트 전 글로벌 설정
beforeAll(() => {
  // 콘솔 출력 억제 (필요시)
  // console.log = jest.fn();
});

afterAll(() => {
  // 테스트 후 정리
});