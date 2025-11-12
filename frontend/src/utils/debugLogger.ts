/**
 * 개발 환경에서만 동작하는 디버깅 로거
 * 프로덕션 환경에서는 로그를 출력하지 않음
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const debugLog = {
  log: isDevelopment ? console.log.bind(console) : () => {},
  warn: isDevelopment ? console.warn.bind(console) : () => {},
  error: isDevelopment ? console.error.bind(console) : () => {},
  info: isDevelopment ? console.info.bind(console) : () => {},
  debug: isDevelopment ? console.debug.bind(console) : () => {},
  table: isDevelopment ? console.table?.bind(console) : () => {},
  time: isDevelopment ? console.time?.bind(console) : () => {},
  timeEnd: isDevelopment ? console.timeEnd?.bind(console) : () => {},
  group: isDevelopment ? console.group?.bind(console) : () => {},
  groupEnd: isDevelopment ? console.groupEnd?.bind(console) : () => {},
  groupCollapsed: isDevelopment ? console.groupCollapsed?.bind(console) : () => {},
};

// TypeScript 타입 호환성을 위한 타입 정의
export type DebugLogger = typeof debugLog;

// 특정 모듈에서만 로그를 출력하는 로거 생성 함수
export function createDebugLogger(moduleName: string) {
  return {
    log: (...args: any[]) => debugLog.log(`[${moduleName}]`, ...args),
    warn: (...args: any[]) => debugLog.warn(`[${moduleName}]`, ...args),
    error: (...args: any[]) => debugLog.error(`[${moduleName}]`, ...args),
    info: (...args: any[]) => debugLog.info(`[${moduleName}]`, ...args),
    debug: (...args: any[]) => debugLog.debug(`[${moduleName}]`, ...args),
  };
}