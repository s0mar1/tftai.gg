/**
 * GraphQL 리졸버 헬퍼 함수들
 * 기존 리졸버 코드를 변경하지 않으면서 타입 안전성을 강화할 수 있는 유틸리티
 */

import { validateGraphQLResponse, ValidationStatsCollector } from './typeSafetyValidator';
import logger from '../config/logger';

/**
 * 안전한 데이터 변환 헬퍼
 * 기존 리졸버에서 return 직전에 사용하여 타입 검증 적용
 */
export class SafeResolverHelpers {
  
  /**
   * 챔피언 데이터 안전 변환
   * 사용법: return SafeResolverHelpers.safeChampion(rawChampionData, context.requestId);
   */
  static safeChampion(data: any, requestId?: string) {
    const result = validateGraphQLResponse.champion(data, requestId);
    ValidationStatsCollector.recordValidation('Champion', result.success, result.fallbackUsed);
    
    if (!result.success) {
      logger.debug(`🛡️ [Safe Resolver] Champion 데이터 보정됨`, {
        requestId,
        fallbackUsed: result.fallbackUsed,
        errorCount: result.errors?.length || 0
      });
    }
    
    return result.data;
  }

  /**
   * 챔피언 목록 안전 변환
   */
  static safeChampions(data: any[], requestId?: string) {
    const result = validateGraphQLResponse.champions(data, requestId);
    ValidationStatsCollector.recordValidation('Champions', result.success, result.fallbackUsed);
    
    if (!result.success) {
      logger.debug(`🛡️ [Safe Resolver] Champions 배열 보정됨`, {
        requestId,
        originalCount: Array.isArray(data) ? data.length : 0,
        validatedCount: result.data.length,
        fallbackUsed: result.fallbackUsed
      });
    }
    
    return result.data;
  }

  /**
   * 소환사 정보 안전 변환
   */
  static safeSummonerInfo(data: any, requestId?: string) {
    const result = validateGraphQLResponse.summonerInfo(data, requestId);
    ValidationStatsCollector.recordValidation('SummonerInfo', result.success, result.fallbackUsed);
    
    if (!result.success) {
      logger.debug(`🛡️ [Safe Resolver] SummonerInfo 데이터 보정됨`, {
        requestId,
        fallbackUsed: result.fallbackUsed,
        hasOriginalData: !!result.originalData
      });
    }
    
    return result.data;
  }

  /**
   * 매치 정보 안전 변환
   */
  static safeMatchInfo(data: any, requestId?: string) {
    const result = validateGraphQLResponse.matchInfo(data, requestId);
    ValidationStatsCollector.recordValidation('MatchInfo', result.success, result.fallbackUsed);
    
    if (!result.success) {
      logger.debug(`🛡️ [Safe Resolver] MatchInfo 데이터 보정됨`, {
        requestId,
        fallbackUsed: result.fallbackUsed
      });
    }
    
    return result.data;
  }

  /**
   * 매치 히스토리 안전 변환
   */
  static safeMatchHistory(data: any[], requestId?: string) {
    const result = validateGraphQLResponse.matchHistory(data, requestId);
    ValidationStatsCollector.recordValidation('MatchHistory', result.success, result.fallbackUsed);
    
    if (!result.success) {
      logger.debug(`🛡️ [Safe Resolver] MatchHistory 배열 보정됨`, {
        requestId,
        originalCount: Array.isArray(data) ? data.length : 0,
        validatedCount: result.data.length
      });
    }
    
    return result.data;
  }

  /**
   * 티어리스트 덱 안전 변환
   */
  static safeTierlistDeck(data: any, requestId?: string) {
    const result = validateGraphQLResponse.tierlistDeck(data, requestId);
    ValidationStatsCollector.recordValidation('TierlistDeck', result.success, result.fallbackUsed);
    
    if (!result.success) {
      logger.debug(`🛡️ [Safe Resolver] TierlistDeck 데이터 보정됨`, {
        requestId,
        fallbackUsed: result.fallbackUsed
      });
    }
    
    return result.data;
  }

  /**
   * 티어리스트 덱 목록 안전 변환
   */
  static safeTierlistDecks(data: any[], requestId?: string) {
    const result = validateGraphQLResponse.tierlistDecks(data, requestId);
    ValidationStatsCollector.recordValidation('TierlistDecks', result.success, result.fallbackUsed);
    
    if (!result.success) {
      logger.debug(`🛡️ [Safe Resolver] TierlistDecks 배열 보정됨`, {
        requestId,
        originalCount: Array.isArray(data) ? data.length : 0,
        validatedCount: result.data.length
      });
    }
    
    return result.data;
  }

  /**
   * 일반적인 배열 데이터 안전 변환
   */
  static safeArray<T>(
    data: any[],
    validator: (item: any, requestId?: string) => T,
    schemaName: string,
    requestId?: string
  ): T[] {
    try {
      if (!Array.isArray(data)) {
        logger.warn(`🛡️ [Safe Resolver] ${schemaName} - 배열이 아닌 데이터 수신`, {
          requestId,
          dataType: typeof data,
          hasData: !!data
        });
        ValidationStatsCollector.recordValidation(schemaName, false, true);
        return [];
      }

      const validatedItems: T[] = [];
      let errorCount = 0;

      for (let i = 0; i < data.length; i++) {
        try {
          const validatedItem = validator(data[i], requestId);
          validatedItems.push(validatedItem);
        } catch (error: any) {
          errorCount++;
          logger.debug(`🛡️ [Safe Resolver] ${schemaName}[${i}] 검증 실패 (건너뜀)`, {
            requestId,
            error: error.message,
            index: i
          });
        }
      }

      const success = errorCount === 0;
      ValidationStatsCollector.recordValidation(schemaName, success, errorCount > 0);

      if (errorCount > 0) {
        logger.debug(`🛡️ [Safe Resolver] ${schemaName} 배열 부분적 보정`, {
          requestId,
          originalCount: data.length,
          validCount: validatedItems.length,
          errorCount
        });
      }

      return validatedItems;

    } catch (error: any) {
      logger.error(`❌ [Safe Resolver] ${schemaName} 배열 처리 중 오류`, {
        requestId,
        error: error.message
      });
      ValidationStatsCollector.recordValidation(schemaName, false, true);
      return [];
    }
  }
}

/**
 * 기존 리졸버 래핑 헬퍼
 * 기존 리졸버 함수를 감싸서 타입 검증 추가
 */
export function wrapResolverWithTypeChecking<TArgs, TResult>(
  originalResolver: (parent: any, args: TArgs, context: any) => Promise<TResult> | TResult,
  validator: (data: TResult, requestId?: string) => TResult,
  resolverName: string
) {
  return async (parent: any, args: TArgs, context: any): Promise<TResult> => {
    try {
      // 원본 리졸버 실행
      const result = await originalResolver(parent, args, context);
      
      // 결과 검증 및 보정
      const validatedResult = validator(result, context.requestId);
      
      return validatedResult;
      
    } catch (error: any) {
      logger.error(`❌ [Wrapped Resolver] ${resolverName} 실행 중 오류`, {
        resolverName,
        requestId: context.requestId,
        error: error.message,
        args: JSON.stringify(args)
      });
      
      // 원본 에러 그대로 재발생 (기존 에러 처리 로직 유지)
      throw error;
    }
  };
}

/**
 * 조건부 타입 검증 헬퍼
 * 환경 변수나 설정에 따라 타입 검증을 활성화/비활성화
 */
export class ConditionalTypeValidation {
  private static isEnabled(): boolean {
    return process.env.ENABLE_TYPE_VALIDATION !== 'false';
  }

  private static isStrictMode(): boolean {
    return process.env.TYPE_VALIDATION_STRICT === 'true';
  }

  /**
   * 조건부로 타입 검증 수행
   */
  static validate<T>(
    data: T,
    validator: (data: T, requestId?: string) => T,
    requestId?: string
  ): T {
    if (!this.isEnabled()) {
      return data;
    }

    try {
      return validator(data, requestId);
    } catch (error: any) {
      if (this.isStrictMode()) {
        throw error;
      }
      
      logger.warn('조건부 타입 검증 실패 (무시됨)', {
        requestId,
        error: error.message
      });
      
      return data;
    }
  }

  /**
   * 개발 환경에서만 타입 검증
   */
  static validateInDev<T>(
    data: T,
    validator: (data: T, requestId?: string) => T,
    requestId?: string
  ): T {
    if (process.env.NODE_ENV !== 'development') {
      return data;
    }

    return this.validate(data, validator, requestId);
  }
}

/**
 * 타입 검증 통계 리포팅
 */
export function logTypeValidationStats(): void {
  const stats = ValidationStatsCollector.getStats();
  const problematicSchemas = ValidationStatsCollector.getSchemasWithHighFailureRate(15);

  logger.info('📊 [Type Validation Stats] 타입 검증 통계', {
    totalSchemas: Object.keys(stats).length,
    problematicSchemas,
    stats
  });

  if (problematicSchemas.length > 0) {
    logger.warn('⚠️ [Type Validation] 높은 실패율을 보이는 스키마들', {
      schemas: problematicSchemas,
      suggestion: '해당 스키마들의 데이터 소스를 확인해보세요'
    });
  }
}

// 주기적으로 통계 리포팅 (10분마다)
setInterval(logTypeValidationStats, 10 * 60 * 1000);