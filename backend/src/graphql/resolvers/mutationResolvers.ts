/**
 * GraphQL Mutation 리졸버
 * 기존 AI 분석 서비스를 재사용하여 GraphQL 뮤테이션을 처리합니다.
 */

import logger from '../../config/logger';
import { AIAnalysisService } from '../../services/ai/AIAnalysisService';
import { requireAccess, ResourceType, ActionType } from '../../auth/rbac';

// 타입 import
import type { 
  MutationResolvers, 
  MatchAnalysisResponse,
  GraphQLContext,
  AnalyzeMatchArgs
} from '../types';

// AI 서비스 인스턴스 (lazy initialization)
let aiAnalysisService: AIAnalysisService | null = null;

function getAIAnalysisService(): AIAnalysisService {
  if (!aiAnalysisService) {
    aiAnalysisService = new AIAnalysisService();
  }
  return aiAnalysisService;
}

/**
 * AI 분석 결과 변환 헬퍼
 */
function transformAnalysisResult(analysisResult: any, matchId: string, userPuuid: string): any {
  if (!analysisResult || !analysisResult.success || !analysisResult.data) {
    throw new Error('AI 분석 결과를 처리할 수 없습니다');
  }

  const data = analysisResult.data;
  
  return {
    matchId,
    userPuuid,
    analysis: {
      placement: data.analysis?.placement || 0,
      deckComposition: {
        mainCarry: data.analysis?.deckComposition?.mainCarry || '',
        supportUnits: data.analysis?.deckComposition?.supportUnits || [],
        traits: (data.analysis?.deckComposition?.traits || []).map((trait: any) => ({
          name: trait.name || '',
          level: trait.level || 1,
          description: trait.description
        }))
      },
      itemAnalysis: {
        optimal: data.analysis?.itemAnalysis?.optimal || [],
        actual: data.analysis?.itemAnalysis?.actual || [],
        effectiveness: data.analysis?.itemAnalysis?.effectiveness || 0
      },
      recommendations: (data.analysis?.recommendations || []).map((rec: any) => ({
        category: mapRecommendationCategory(rec.category),
        suggestion: rec.suggestion || '',
        priority: mapPriority(rec.priority)
      })),
      score: {
        overall: data.analysis?.score?.overall || 0,
        positioning: data.analysis?.score?.positioning || 0,
        itemization: data.analysis?.score?.itemization || 0,
        economy: data.analysis?.score?.economy || 0
      }
    }
  };
}

/**
 * 추천사항 카테고리 매핑
 */
function mapRecommendationCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'positioning': 'POSITIONING',
    'itemization': 'ITEMIZATION',
    'economy': 'ECONOMY',
    'leveling': 'LEVELING'
  };
  
  return categoryMap[category] || 'POSITIONING';
}

/**
 * 우선순위 매핑
 */
function mapPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    'high': 'HIGH',
    'medium': 'MEDIUM',
    'low': 'LOW'
  };
  
  return priorityMap[priority] || 'MEDIUM';
}

export const mutationResolvers: MutationResolvers = {
  /**
   * AI 매치 분석 수행 (인증 필요)
   */
  analyzeMatch: requireAccess(ResourceType.ANALYSIS, ActionType.CREATE)(
    async (_parent, args: AnalyzeMatchArgs, _context: GraphQLContext): Promise<MatchAnalysisResponse> => {
    try {
      const { input } = args;
      const { matchId, userPuuid } = input;
      
      logger.info(`🔍 GraphQL AnalyzeMatch 뮤테이션: matchId=${matchId}, userPuuid=${userPuuid}`);
      
      const startTime = Date.now();
      
      // 기존 AI 분석 서비스 재사용
      const analysisResult = await getAIAnalysisService().analyzeMatch(matchId, userPuuid);
      const processingTime = Date.now() - startTime;
      
      if (!analysisResult.success) {
        logger.error('❌ AI 분석 실패:', analysisResult.error);
        
        return {
          success: false,
          error: {
            code: 'AI_ANALYSIS_ERROR',
            message: analysisResult.error || 'AI 분석 중 오류가 발생했습니다'
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime
          }
        };
      }
      
      // 결과 변환
      const transformedData = transformAnalysisResult(analysisResult, matchId, userPuuid);
      
      logger.info(`✅ GraphQL AnalyzeMatch 뮤테이션 완료: placement=${transformedData.analysis.placement}`);
      
      return {
        success: true,
        data: transformedData,
        message: 'AI 매치 분석이 성공적으로 완료되었습니다',
        meta: {
          timestamp: new Date().toISOString(),
          processingTime,
          version: '1.0.0'
        }
      };
      
    } catch (error: any) {
      logger.error('❌ GraphQL AnalyzeMatch 뮤테이션 오류:', error);
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '서버 내부 오류가 발생했습니다'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }
  })
};