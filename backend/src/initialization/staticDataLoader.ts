/**
 * 정적 데이터 로더 모듈
 * Community Dragon에서 TFT 게임 데이터를 로드하고 관리합니다.
 */

import logger from '../config/logger';
import { getTFTDataWithLanguage } from '../services/tftData';

interface LanguageDataResult {
  language: string;
  status: 'success' | 'failed';
  error?: any;
  dataSize?: {
    champions: number;
    items: number;
    augments: number;
    traits: number;
  };
}

interface StaticDataLoadResult {
  allLoaded: boolean;
  primaryLanguageLoaded: boolean;
  results: LanguageDataResult[];
  loadedLanguages: string[];
}

// 지원 언어 설정
const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'fr'];
const PRIMARY_LANGUAGE = 'ko'; // 필수 언어

/**
 * 단일 언어의 TFT 데이터를 로드합니다.
 */
const loadLanguageData = async (language: string): Promise<LanguageDataResult> => {
  try {
    logger.info(`[Static Data] ${language} 언어 데이터 로드 시작...`);
    
    const startTime = Date.now();
    const tftData = await getTFTDataWithLanguage(language);
    const loadTime = Date.now() - startTime;
    
    if (!tftData || !tftData.champions) {
      throw new Error('Invalid TFT data structure');
    }
    
    const dataSize = {
      champions: tftData.champions?.length || 0,
      items: Object.values(tftData.items || {}).flat().length,
      augments: tftData.augments?.length || 0,
      traits: tftData.traits?.length || 0
    };
    
    logger.info(
      `[Static Data] ✅ ${language} 언어 데이터 로드 완료 (${loadTime}ms) - ` +
      `챔피언: ${dataSize.champions}, 아이템: ${dataSize.items}, ` +
      `증강체: ${dataSize.augments}, 특성: ${dataSize.traits}`
    );
    
    return {
      language,
      status: 'success',
      dataSize
    };
    
  } catch (_error: any) {
    logger.error(`[Static Data] ❌ ${language} 언어 데이터 로드 실패:`, _error.message);
    
    return {
      language,
      status: 'failed',
      error: _error.message
    };
  }
};

/**
 * 모든 지원 언어의 정적 데이터를 로드합니다.
 * @param options 로드 옵션
 */
export const loadStaticData = async (options?: {
  languages?: string[];
  parallel?: boolean;
  continueOnError?: boolean;
}): Promise<StaticDataLoadResult> => {
  const {
    languages = SUPPORTED_LANGUAGES,
    parallel = true,
    continueOnError = true
  } = options || {};
  
  logger.info('=== 정적 데이터 로드 시작 ===');
  logger.info(`로드할 언어: ${languages.join(', ')}`);
  logger.info(`로드 방식: ${parallel ? '병렬' : '순차'}`);
  
  const results: LanguageDataResult[] = [];
  const startTime = Date.now();
  
  if (parallel) {
    // 병렬 로드
    const promises = languages.map(lang => loadLanguageData(lang));
    const loadResults = await Promise.allSettled(promises);
    
    loadResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          language: languages[index] || 'unknown',
          status: 'failed',
          error: result.reason
        });
      }
    });
  } else {
    // 순차 로드
    for (const language of languages) {
      const result = await loadLanguageData(language);
      results.push(result);
      
      // 실패 시 continueOnError 옵션에 따라 처리
      if (result.status === 'failed' && !continueOnError) {
        break;
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // 결과 분석
  const loadedLanguages = results
    .filter(r => r.status === 'success')
    .map(r => r.language);
  
  const allLoaded = results.every(r => r.status === 'success');
  const primaryLanguageLoaded = results.some(
    r => r.language === PRIMARY_LANGUAGE && r.status === 'success'
  );
  
  // 결과 로깅
  logger.info('=== 정적 데이터 로드 결과 ===');
  logger.info(`총 소요 시간: ${totalTime}ms`);
  logger.info(`성공: ${loadedLanguages.length}/${languages.length} 언어`);
  
  results.forEach(result => {
    const emoji = result.status === 'success' ? '✅' : '❌';
    const sizeInfo = result.dataSize 
      ? ` (챔피언: ${result.dataSize.champions}, 아이템: ${result.dataSize.items})` 
      : '';
    logger.info(`${emoji} ${result.language}: ${result.status}${sizeInfo}`);
  });
  
  if (!primaryLanguageLoaded) {
    logger.error(`❌ 주요 언어(${PRIMARY_LANGUAGE}) 데이터 로드 실패!`);
  }
  
  return {
    allLoaded,
    primaryLanguageLoaded,
    results,
    loadedLanguages
  };
};

/**
 * 정적 데이터를 새로고침합니다.
 * @param language 특정 언어만 새로고침 (선택사항)
 */
export const refreshStaticData = async (language?: string): Promise<void> => {
  logger.info('[Static Data] 데이터 새로고침 시작...');
  
  try {
    if (language) {
      // 특정 언어만 새로고침
      await loadLanguageData(language);
    } else {
      // 모든 언어 새로고침
      await loadStaticData({ parallel: true });
    }
    
    logger.info('[Static Data] ✅ 데이터 새로고침 완료');
  } catch (_error: any) {
    logger.error('[Static Data] ❌ 데이터 새로고침 실패:', _error);
    throw _error;
  }
};

/**
 * 정적 데이터 로드 상태를 확인합니다.
 */
export const getStaticDataStatus = async (): Promise<{
  loadedLanguages: string[];
  dataStats: {
    [language: string]: {
      champions: number;
      items: number;
      augments: number;
      traits: number;
    };
  };
}> => {
  const dataStats: any = {};
  const loadedLanguages: string[] = [];
  
  for (const lang of SUPPORTED_LANGUAGES) {
    try {
      const tftData = await getTFTDataWithLanguage(lang);
      if (tftData && tftData.champions) {
        loadedLanguages.push(lang);
        dataStats[lang] = {
          champions: tftData.champions?.length || 0,
          items: Object.values(tftData.items || {}).flat().length,
          augments: tftData.augments?.length || 0,
          traits: tftData.traits?.length || 0
        };
      }
    } catch (_error) {
      // 해당 언어 데이터가 없음
    }
  }
  
  return {
    loadedLanguages,
    dataStats
  };
};