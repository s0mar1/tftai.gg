/**
 * AI 메타 예측 API 클라이언트
 * 실시간 메타 분석 및 개인화 추천 서비스
 */

import { api } from '../utils/fetchApi';

// 타입 정의
export interface MetaPrediction {
  trendingComps: CompositiionPrediction[];
  risingChampions: ChampionTrend[];
  fallingChampions: ChampionTrend[];
  itemMetaShifts: ItemTrend[];
  confidenceScore: number;
  predictionDate: string;
  nextUpdateTime: string;
}

export interface CompositiionPrediction {
  name: string;
  coreUnits: string[];
  traits: string[];
  predictedWinRate: number;
  currentWinRate: number;
  trendDirection: 'rising' | 'stable' | 'falling';
  popularityChange: number;
  confidence: number;
  reasoning: string[];
}

export interface ChampionTrend {
  apiName: string;
  name: string;
  cost: number;
  currentPickRate: number;
  predictedPickRate: number;
  winRateChange: number;
  trendStrength: number;
  keyFactors: string[];
  impact?: 'high' | 'medium';
  recommendation?: string;
}

export interface ItemTrend {
  apiName: string;
  name: string;
  category: string;
  currentPopularity: number;
  predictedPopularity: number;
  effectiveness: number;
  synergisticsScore: number;
}

export interface PersonalizedRecommendation {
  recommendedComps: CompositiionPrediction[];
  avoidComps: string[];
  itemPriorities: ItemTrend[];
  playStyleMatch: number;
  reasoning: string;
  playerProfile?: {
    playStyle: string;
    skillLevel: string;
    avgPlacement: number;
  };
  performance?: {
    responseTime: string;
    processingComplexity: string;
  };
}

export interface PlayerProfile {
  preferredTraits?: string[];
  avgPlacement?: number;
  playStyle?: 'aggressive' | 'economic' | 'flexible' | 'specialist';
  recentPerformance?: number[];
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

/**
 * AI 메타 예측 API 클래스
 */
export class AIMetaAPI {
  private static baseUrl = '/api/ai-meta';

  /**
   * 실시간 메타 예측 조회
   */
  static async getMetaPrediction(language: string = 'ko'): Promise<MetaPrediction> {
    try {
      const response = await api.get<ApiResponse<MetaPrediction>>(
        `${this.baseUrl}/prediction/${language}`
      );
      return response.data.data;
    } catch (error) {
      console.error('[AI Meta API] 메타 예측 조회 실패:', error);
      throw new Error('메타 예측을 가져올 수 없습니다');
    }
  }

  /**
   * 개인화된 메타 추천 조회
   */
  static async getPersonalizedRecommendation(
    playerProfile: PlayerProfile,
    language: string = 'ko'
  ): Promise<PersonalizedRecommendation> {
    try {
      const response = await api.post<ApiResponse<PersonalizedRecommendation>>(
        `${this.baseUrl}/personalized/${language}`,
        playerProfile
      );
      return response.data.data;
    } catch (error) {
      console.error('[AI Meta API] 개인화 추천 조회 실패:', error);
      throw new Error('개인화 추천을 가져올 수 없습니다');
    }
  }

  /**
   * 트렌딩 컴포지션만 조회
   */
  static async getTrendingCompositions(language: string = 'ko'): Promise<{
    trendingComps: CompositiionPrediction[];
    metadata: {
      totalComps: number;
      avgConfidence: number;
      predictionDate: string;
      nextUpdate: string;
    };
  }> {
    try {
      const response = await api.get(
        `${this.baseUrl}/trending-comps/${language}`
      );
      return response.data.data;
    } catch (error) {
      console.error('[AI Meta API] 트렌딩 컴포지션 조회 실패:', error);
      throw new Error('트렌딩 컴포지션을 가져올 수 없습니다');
    }
  }

  /**
   * 챔피언 트렌드 분석 조회
   */
  static async getChampionTrends(language: string = 'ko'): Promise<{
    championTrends: {
      rising: ChampionTrend[];
      falling: ChampionTrend[];
    };
    summary: {
      risingCount: number;
      fallingCount: number;
      highImpactChanges: number;
      analysisDate: string;
    };
  }> {
    try {
      const response = await api.get(
        `${this.baseUrl}/champion-trends/${language}`
      );
      return response.data.data;
    } catch (error) {
      console.error('[AI Meta API] 챔피언 트렌드 조회 실패:', error);
      throw new Error('챔피언 트렌드를 가져올 수 없습니다');
    }
  }

  /**
   * 아이템 트렌드 분석 조회
   */
  static async getItemTrends(language: string = 'ko'): Promise<{
    itemTrends: {
      byCategory: Record<string, ItemTrend[]>;
      topEffective: ItemTrend[];
      all: ItemTrend[];
    };
    recommendations: {
      priorityItems: string[];
      avoidItems: string[];
    };
  }> {
    try {
      const response = await api.get(
        `${this.baseUrl}/item-trends/${language}`
      );
      return response.data.data;
    } catch (error) {
      console.error('[AI Meta API] 아이템 트렌드 조회 실패:', error);
      throw new Error('아이템 트렌드를 가져올 수 없습니다');
    }
  }

  /**
   * 캐시 상태 및 성능 정보 조회
   */
  static async getCacheStatus(): Promise<{
    cacheInfo: {
      cacheDuration: string;
      status: string;
      description: string;
    };
    performance: {
      avgResponseTime: string;
      updateFrequency: string;
      confidenceRange: string;
    };
    features: {
      realTimePrediction: boolean;
      personalizedRecommendation: boolean;
      trendAnalysis: boolean;
      multilanguageSupport: boolean;
    };
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/cache-status`);
      return response.data.data;
    } catch (error) {
      console.error('[AI Meta API] 캐시 상태 조회 실패:', error);
      throw new Error('캐시 상태를 가져올 수 없습니다');
    }
  }
}

/**
 * React Hook용 편의 함수들
 */

/**
 * 트렌드 방향에 따른 색상 반환
 */
export const getTrendColor = (direction: 'rising' | 'stable' | 'falling'): string => {
  switch (direction) {
    case 'rising':
      return 'text-green-500';
    case 'falling':
      return 'text-red-500';
    case 'stable':
    default:
      return 'text-gray-500';
  }
};

/**
 * 신뢰도 점수에 따른 색상 반환
 */
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-500';
  if (confidence >= 0.6) return 'text-yellow-500';
  return 'text-red-500';
};

/**
 * 승률 변화량 포맷팅
 */
export const formatWinRateChange = (change: number): string => {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

/**
 * 인기도 변화량 포맷팅
 */
export const formatPopularityChange = (change: number): string => {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

/**
 * 플레이 스타일 한국어 변환
 */
export const translatePlayStyle = (playStyle: string): string => {
  const translations: Record<string, string> = {
    aggressive: '공격적',
    economic: '경제적',
    flexible: '유연함',
    specialist: '전문가'
  };
  return translations[playStyle] || playStyle;
};

/**
 * 스킬 레벨 한국어 변환
 */
export const translateSkillLevel = (skillLevel: string): string => {
  const translations: Record<string, string> = {
    beginner: '초급자',
    intermediate: '중급자',
    advanced: '고급자',
    expert: '전문가'
  };
  return translations[skillLevel] || skillLevel;
};

/**
 * 컴포지션 이름 한국어 변환 (필요시)
 */
export const translateCompName = (compName: string): string => {
  // 추후 번역 테이블 추가 가능
  return compName;
};

export default AIMetaAPI;