/**
 * GraphQL 타입 안전성 검증 시스템 (Fallback 전략)
 * 런타임에서 데이터 타입을 검증하되, 실패 시 기본값으로 fallback
 */

import { z } from 'zod';
import logger from '../config/logger';

/**
 * Fallback 전략 타입
 */
export type FallbackStrategy = 'default' | 'empty' | 'null' | 'throw';

/**
 * 검증 결과 인터페이스
 */
interface ValidationResult<T> {
  success: boolean;
  data: T;
  errors?: string[];
  fallbackUsed: boolean;
  originalData?: any;
}

/**
 * 공통 GraphQL 스키마 정의
 */
export const GraphQLSchemas = {
  // 기본 타입들
  Champion: z.object({
    name: z.string().min(1),
    apiName: z.string().min(1),
    cost: z.number().min(1).max(5),
    image_url: z.string().url().optional(),
    traits: z.array(z.string()).default([]),
    ability: z.object({
      name: z.string(),
      description: z.string(),
    }).optional(),
    stats: z.record(z.number()).optional()
  }),

  Trait: z.object({
    name: z.string().min(1),
    apiName: z.string().min(1),
    description: z.string().default(''),
    image_url: z.string().url().optional(),
    tier_current: z.number().min(0).default(0),
    style: z.enum(['inactive', 'bronze', 'silver', 'gold', 'chromatic']).default('inactive')
  }),

  Item: z.object({
    name: z.string().min(1),
    apiName: z.string().min(1),
    description: z.string().default(''),
    image_url: z.string().url().optional(),
    category: z.string().default('unknown')
  }),

  SummonerInfo: z.object({
    name: z.string().min(1),
    tag: z.string().min(1),
    puuid: z.string().min(1),
    summonerId: z.string().min(1),
    profileIconId: z.number().min(0).default(0),
    summonerLevel: z.number().min(1).default(1),
    tier: z.string().optional(),
    rank: z.string().optional(),
    leaguePoints: z.number().min(0).default(0),
    wins: z.number().min(0).default(0),
    losses: z.number().min(0).default(0)
  }),

  MatchInfo: z.object({
    gameId: z.string().min(1),
    gameDateTime: z.string(), // ISO string
    queueType: z.string().default(''),
    placement: z.number().min(1).max(8),
    level: z.number().min(1).default(1),
    totalDamageToPlayers: z.number().min(0).default(0),
    traits: z.array(z.object({
      name: z.string(),
      apiName: z.string(),
      level: z.number().min(0).default(0),
      description: z.string().default(''),
      style: z.string().default('inactive'),
      styleOrder: z.number().min(0).default(0)
    })).default([]),
    units: z.array(z.object({
      name: z.string(),
      apiName: z.string(),
      tier: z.number().min(1).max(3).default(1),
      cost: z.number().min(1).max(5).default(1),
      items: z.array(z.any()).default([])
    })).default([])
  }),

  TierlistDeck: z.object({
    name: z.string().min(1),
    champions: z.array(z.string()).min(1),
    traits: z.array(z.string()).default([]),
    items: z.array(z.string()).default([]),
    augments: z.array(z.string()).default([]),
    playstyle: z.string().default(''),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
    tier: z.enum(['S', 'A', 'B', 'C', 'D']).default('C'),
    patch: z.string().default('current')
  })
};

/**
 * 기본값 생성기
 */
export class DefaultValueGenerator {
  static forChampion(): any {
    return {
      name: 'Unknown Champion',
      apiName: 'unknown',
      cost: 1,
      image_url: null,
      traits: [],
      ability: null,
      stats: {}
    };
  }

  static forTrait(): any {
    return {
      name: 'Unknown Trait',
      apiName: 'unknown',
      description: '',
      image_url: null,
      tier_current: 0,
      style: 'inactive'
    };
  }

  static forItem(): any {
    return {
      name: 'Unknown Item',
      apiName: 'unknown',
      description: '',
      image_url: null,
      category: 'unknown'
    };
  }

  static forSummonerInfo(): any {
    return {
      name: 'Unknown Summoner',
      tag: 'KR',
      puuid: '',
      summonerId: '',
      profileIconId: 0,
      summonerLevel: 1,
      tier: undefined,
      rank: undefined,
      leaguePoints: 0,
      wins: 0,
      losses: 0
    };
  }

  static forMatchInfo(): any {
    return {
      gameId: '',
      gameDateTime: new Date().toISOString(),
      queueType: '',
      placement: 8,
      level: 1,
      totalDamageToPlayers: 0,
      traits: [],
      units: []
    };
  }

  static forTierlistDeck(): any {
    return {
      name: 'Unknown Deck',
      champions: [],
      traits: [],
      items: [],
      augments: [],
      playstyle: '',
      difficulty: 'Medium',
      tier: 'C',
      patch: 'current'
    };
  }
}

/**
 * 타입 안전성 검증기 클래스
 */
export class TypeSafetyValidator {
  private static logValidationError(
    schemaName: string,
    data: any,
    errors: z.ZodError,
    fallbackUsed: boolean,
    requestId?: string
  ): void {
    logger.warn(`🔍 [GraphQL Type Validation] ${schemaName} 검증 실패`, {
      schemaName,
      fallbackUsed,
      requestId: requestId || 'unknown',
      errorCount: errors.errors.length,
      errors: errors.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code
      })),
      receivedDataType: typeof data,
      isArray: Array.isArray(data),
      keys: typeof data === 'object' && data ? Object.keys(data) : null
    });
  }

  /**
   * 단일 객체 검증
   */
  static validate<T>(
    schema: z.ZodSchema<T>,
    data: any,
    options: {
      schemaName: string;
      fallbackStrategy?: FallbackStrategy;
      defaultValue?: T;
      requestId?: string;
    }
  ): ValidationResult<T> {
    const { schemaName, fallbackStrategy = 'default', defaultValue, requestId } = options;

    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          fallbackUsed: false
        };
      }

      // 검증 실패 시 처리
      this.logValidationError(schemaName, data, result.error, true, requestId);

      let fallbackData: T;
      
      switch (fallbackStrategy) {
        case 'throw':
          throw new Error(`${schemaName} validation failed: ${result.error.message}`);
        
        case 'null':
          fallbackData = null as T;
          break;
        
        case 'empty':
          fallbackData = (Array.isArray(data) ? [] : {}) as T;
          break;
        
        case 'default':
        default:
          if (defaultValue !== undefined) {
            fallbackData = defaultValue;
          } else {
            // 스키마 이름에 따른 기본값 제공
            fallbackData = this.getDefaultBySchemaName(schemaName) as T;
          }
          break;
      }

      return {
        success: false,
        data: fallbackData,
        errors: result.error.errors.map(e => e.message),
        fallbackUsed: true,
        originalData: data
      };

    } catch (error: any) {
      logger.error(`❌ [GraphQL Type Validation] ${schemaName} 검증 중 오류`, {
        schemaName,
        error: error.message,
        requestId
      });

      return {
        success: false,
        data: this.getDefaultBySchemaName(schemaName) as T,
        errors: [error.message],
        fallbackUsed: true,
        originalData: data
      };
    }
  }

  /**
   * 배열 검증 (각 요소를 개별 검증)
   */
  static validateArray<T>(
    schema: z.ZodSchema<T>,
    data: any[],
    options: {
      schemaName: string;
      fallbackStrategy?: FallbackStrategy;
      defaultValue?: T;
      requestId?: string;
      skipInvalidItems?: boolean;
    }
  ): ValidationResult<T[]> {
    const { schemaName, skipInvalidItems = true, requestId } = options;

    if (!Array.isArray(data)) {
      logger.warn(`🔍 [GraphQL Type Validation] ${schemaName} 배열이 아님`, {
        schemaName,
        dataType: typeof data,
        requestId
      });

      return {
        success: false,
        data: [],
        errors: ['Expected array but received ' + typeof data],
        fallbackUsed: true,
        originalData: data
      };
    }

    const validatedItems: T[] = [];
    const errors: string[] = [];
    let hasErrors = false;

    for (let i = 0; i < data.length; i++) {
      const itemResult = this.validate(schema, data[i], {
        ...options,
        schemaName: `${schemaName}[${i}]`
      });

      if (itemResult.success || !skipInvalidItems) {
        validatedItems.push(itemResult.data);
      }

      if (!itemResult.success) {
        hasErrors = true;
        if (itemResult.errors) {
          errors.push(...itemResult.errors);
        }
      }
    }

    return {
      success: !hasErrors,
      data: validatedItems,
      errors: errors.length > 0 ? errors : undefined,
      fallbackUsed: hasErrors,
      originalData: data
    };
  }

  /**
   * 스키마 이름에 따른 기본값 제공
   */
  private static getDefaultBySchemaName(schemaName: string): any {
    const lowerName = schemaName.toLowerCase();
    
    if (lowerName.includes('champion')) {
      return DefaultValueGenerator.forChampion();
    } else if (lowerName.includes('trait')) {
      return DefaultValueGenerator.forTrait();
    } else if (lowerName.includes('item')) {
      return DefaultValueGenerator.forItem();
    } else if (lowerName.includes('summoner')) {
      return DefaultValueGenerator.forSummonerInfo();
    } else if (lowerName.includes('match')) {
      return DefaultValueGenerator.forMatchInfo();
    } else if (lowerName.includes('deck')) {
      return DefaultValueGenerator.forTierlistDeck();
    }
    
    return {};
  }
}

/**
 * GraphQL 리졸버에서 사용할 수 있는 편의 함수들
 */
export const validateGraphQLResponse = {
  champion: (data: any, requestId?: string) =>
    TypeSafetyValidator.validate(GraphQLSchemas.Champion, data, {
      schemaName: 'Champion',
      requestId
    }),

  champions: (data: any[], requestId?: string) =>
    TypeSafetyValidator.validateArray(GraphQLSchemas.Champion, data, {
      schemaName: 'Champions',
      requestId,
      skipInvalidItems: true
    }),

  trait: (data: any, requestId?: string) =>
    TypeSafetyValidator.validate(GraphQLSchemas.Trait, data, {
      schemaName: 'Trait',
      requestId
    }),

  traits: (data: any[], requestId?: string) =>
    TypeSafetyValidator.validateArray(GraphQLSchemas.Trait, data, {
      schemaName: 'Traits',
      requestId,
      skipInvalidItems: true
    }),

  summonerInfo: (data: any, requestId?: string) =>
    TypeSafetyValidator.validate(GraphQLSchemas.SummonerInfo, data, {
      schemaName: 'SummonerInfo',
      requestId
    }),

  matchInfo: (data: any, requestId?: string) =>
    TypeSafetyValidator.validate(GraphQLSchemas.MatchInfo, data, {
      schemaName: 'MatchInfo',
      requestId
    }),

  matchHistory: (data: any[], requestId?: string) =>
    TypeSafetyValidator.validateArray(GraphQLSchemas.MatchInfo, data, {
      schemaName: 'MatchHistory',
      requestId,
      skipInvalidItems: true
    }),

  tierlistDeck: (data: any, requestId?: string) =>
    TypeSafetyValidator.validate(GraphQLSchemas.TierlistDeck, data, {
      schemaName: 'TierlistDeck',
      requestId
    }),

  tierlistDecks: (data: any[], requestId?: string) =>
    TypeSafetyValidator.validateArray(GraphQLSchemas.TierlistDeck, data, {
      schemaName: 'TierlistDecks',
      requestId,
      skipInvalidItems: true
    })
};

/**
 * 타입 검증 통계 수집기
 */
export class ValidationStatsCollector {
  private static stats = new Map<string, {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    fallbacksUsed: number;
    lastValidation: number;
  }>();

  static recordValidation(schemaName: string, success: boolean, fallbackUsed: boolean): void {
    const existing = this.stats.get(schemaName) || {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      fallbacksUsed: 0,
      lastValidation: 0
    };

    existing.totalValidations++;
    if (success) {
      existing.successfulValidations++;
    } else {
      existing.failedValidations++;
    }
    if (fallbackUsed) {
      existing.fallbacksUsed++;
    }
    existing.lastValidation = Date.now();

    this.stats.set(schemaName, existing);
  }

  static getStats(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [schema, stats] of this.stats.entries()) {
      result[schema] = {
        ...stats,
        successRate: (stats.successfulValidations / stats.totalValidations) * 100,
        fallbackRate: (stats.fallbacksUsed / stats.totalValidations) * 100,
        lastValidationAgo: Date.now() - stats.lastValidation
      };
    }

    return result;
  }

  static getSchemasWithHighFailureRate(threshold = 10): string[] {
    const problematicSchemas: string[] = [];
    
    for (const [schema, stats] of this.stats.entries()) {
      const failureRate = (stats.failedValidations / stats.totalValidations) * 100;
      if (failureRate > threshold) {
        problematicSchemas.push(schema);
      }
    }

    return problematicSchemas;
  }

  static reset(): void {
    this.stats.clear();
  }
}