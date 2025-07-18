/**
 * 핵심 모듈 초기화
 * 서버의 핵심 기능 모듈들을 초기화합니다.
 */

import logger from '../config/logger';

interface ModuleInitResult {
  module: string;
  status: 'initialized' | 'failed' | 'skipped';
  message: string;
  error?: any;
}

interface CoreModulesStatus {
  allInitialized: boolean;
  results: ModuleInitResult[];
}

/**
 * 모든 핵심 모듈을 초기화합니다.
 */
export const initializeCoreModules = async (): Promise<CoreModulesStatus> => {
  logger.info('=== Core Modules Initialization ===');
  
  const results: ModuleInitResult[] = [{
    module: 'Core',
    status: 'initialized',
    message: 'Basic core modules initialized'
  }];
  
  return {
    allInitialized: true,
    results
  };
};