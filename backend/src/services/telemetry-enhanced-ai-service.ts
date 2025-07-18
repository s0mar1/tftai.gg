// backend/src/services/telemetry-enhanced-ai-service.ts - 텔레메트리 강화된 AI 분석 서비스
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { trace, context } from '@opentelemetry/api';
import { AiAnalysisFlowTracer } from './telemetry/distributedTracing';
import { recordAiAnalysis } from './telemetry/tftMetrics';
// import { trackAiAnalysis } from '../middlewares/telemetryMiddleware'; // 임시 비활성화
import { getMatchDetailWithTracing } from './telemetry-enhanced-riot-api';
import { telemetryEnhancedCacheManager } from './telemetry-enhanced-cache';
import { getMetaDecks } from './metaDataService';
import Match from '../models/Match';
import logger from '../config/logger';
import { AI_CONFIG, envGuards } from '../config/env';

// 프롬프트 및 유틸리티 imports
import { parsePlayerDeck, formatPlayerDataForAI, formatMetaDecksForAI } from '../utils/ai/dataParser';
import { createGradeInfo, calculateGradeFromScore } from '../utils/ai/gradeCalculator';
import { buildAnalysisPrompt, sanitizeAIResponse } from '../utils/ai/promptBuilder';
import { 
  AIAnalysisResult, 
  FinalAnalysisResult, 
  PlayerDeck 
} from '../types/ai';

const tracer = trace.getTracer('tft-meta-analyzer', '1.0.0');

/**
 * 텔레메트리 강화된 AI 분석 서비스
 */
export class TelemetryEnhancedAIAnalysisService {
  private model: GenerativeModel;

  constructor() {
    const apiKey = AI_CONFIG.GOOGLE_AI_MAIN_KEY;
    if (!envGuards.hasGoogleAIKey(apiKey)) {
      throw new Error('GOOGLE_AI_MAIN_API_KEY가 설정되지 않았습니다.');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });
    
    logger.info('🔍 텔레메트리 강화된 AI 분석 서비스 초기화 완료');
  }

  /**
   * 매치 분석 (완전한 분산 추적 포함)
   */
  async analyzeMatchWithTracing(matchId: string, userPuuid: string): Promise<FinalAnalysisResult> {
    const flowTracer = new AiAnalysisFlowTracer(matchId, userPuuid, 'match');
    
    try {
      logger.info(`🔍 AI 매치 분석 시작 - matchId: ${matchId}, userPuuid: ${userPuuid.substring(0, 8)}...`);

      // 1. 캐시 확인
      const cacheKey = `ai_analysis_${matchId}_${userPuuid}`;
      const cachedResult = await telemetryEnhancedCacheManager.get(cacheKey);
      
      if (cachedResult && this.isValidAnalysisStructure(cachedResult)) {
        logger.info(`✅ 캐시된 AI 분석 결과 반환: ${matchId}`);
        flowTracer.finish(true);
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            cacheHit: true
          }
        };
      }

      // 2. 매치 데이터 조회
      const matchDetail = await flowTracer.traceMatchDataRetrieval(
        matchId,
        'kr',
        async () => await getMatchDetailWithTracing(matchId, 'kr')
      );

      if (!matchDetail) {
        const errorResult = this.createErrorResult(matchId, userPuuid, '매치를 찾을 수 없습니다.');
        flowTracer.finish(false, '매치를 찾을 수 없습니다.');
        return errorResult;
      }

      // 3. 사용자 참가자 찾기
      const userParticipant = matchDetail.info.participants.find((p: any) => p.puuid === userPuuid);
      if (!userParticipant) {
        const errorResult = this.createErrorResult(matchId, userPuuid, '사용자 참가자를 찾을 수 없습니다.');
        flowTracer.finish(false, '사용자 참가자를 찾을 수 없습니다.');
        return errorResult;
      }

      // 4. 플레이어 데이터 파싱
      const playerDeck = parsePlayerDeck(userParticipant);
      
      // 5. 메타 데이터 조회
      const metaDecks = await flowTracer.traceMetaDataRetrieval(
        async () => await getMetaDecks(15)
      );

      // 6. AI 분석 실행
      const analysisResult = await this.executeAIAnalysisWithTracing(
        flowTracer,
        playerDeck,
        metaDecks
      );

      // 7. 결과 저장
      const finalResult: FinalAnalysisResult = {
        success: true,
        analysis: analysisResult,
        metadata: {
          analyzedAt: new Date().toISOString(),
          matchId,
          userPuuid,
          source: 'fresh_analysis',
          cacheHit: false
        } as any
      };

      await flowTracer.traceResultSaving(
        cacheKey,
        true,
        async () => {
          // 캐시 저장
          await telemetryEnhancedCacheManager.set(cacheKey, finalResult, 3600 * 24);
          
          // DB 저장 (선택적)
          const match = await Match.findOne({ 'metadata.match_id': matchId });
          if (match) {
            await this.saveAnalysisToDatabase(match, userPuuid, analysisResult);
          }
          
          return finalResult;
        }
      );

      flowTracer.finish(true);
      logger.info(`✅ AI 분석 완료: ${matchId}`);
      return finalResult;

    } catch (error: any) {
      logger.error(`❌ AI 분석 실패: ${error.message}`, error);
      flowTracer.finish(false, error.message);
      
      return this.createErrorResult(matchId, userPuuid, this.getUserFriendlyErrorMessage(error));
    }
  }

  /**
   * AI 분석 실행 (상세 텔레메트리 포함)
   */
  private async executeAIAnalysisWithTracing(
    flowTracer: AiAnalysisFlowTracer,
    playerDeck: PlayerDeck,
    metaDecks: any[]
  ): Promise<AIAnalysisResult> {
    const playerData = formatPlayerDataForAI(playerDeck);
    const metaData = formatMetaDecksForAI(metaDecks);
    
    const prompt = buildAnalysisPrompt(playerData, metaData);
    
    return await flowTracer.traceAiModelCall(
      'gemini-2.5-pro',
      prompt.length,
      async () => {
        const result = await this.model.generateContent(prompt);
        const aiResponse = result.response.text();
        
        // 토큰 사용량 추정 (실제 API에서는 사용량을 제공하지 않음)
        const estimatedTokens = Math.ceil((prompt.length + aiResponse.length) / 4);
        
        // 메트릭 기록
        recordAiAnalysis('match', true, Date.now(), estimatedTokens);
        
        return this.parseAIResponse(aiResponse);
      }
    );
  }

  /**
   * AI 응답 파싱 (텔레메트리 포함)
   */
  private parseAIResponse(response: string): AIAnalysisResult {
    const span = tracer.startSpan('ai_response_parsing', {
      attributes: {
        'tft.ai.response_length': response.length,
      },
    });

    try {
      // JSON 응답 파싱 시도
      const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsedJson = JSON.parse(jsonStr);
        
        if (parsedJson.scores && parsedJson.analysis) {
          span.setAttributes({
            'tft.ai.parsing_method': 'json',
            'tft.ai.parsing_success': true,
          });
          
          return this.processJsonResponse(parsedJson);
        }
      }
    } catch (error) {
      logger.warn('JSON 파싱 실패, 텍스트 파싱으로 전환:', (error as Error).message);
      span.setAttributes({
        'tft.ai.json_parsing_failed': true,
      });
    }
    
    // 텍스트 파싱 fallback
    span.setAttributes({
      'tft.ai.parsing_method': 'text',
      'tft.ai.parsing_success': true,
    });
    
    span.end();
    return this.processTextResponse(response);
  }

  /**
   * JSON 응답 처리
   */
  private processJsonResponse(parsedJson: any): AIAnalysisResult {
    const scores = {
      metaFit: parsedJson.scores.meta_suitability || parsedJson.scores.metaFit || 50,
      deckCompletion: parsedJson.scores.deck_completion || parsedJson.scores.deckCompletion || 50,
      itemEfficiency: parsedJson.scores.item_efficiency || parsedJson.scores.itemEfficiency || 50,
      total: 0
    };
    
    scores.total = Math.round((scores.metaFit + scores.deckCompletion + scores.itemEfficiency) / 3);
    
    return {
      scores,
      grade: createGradeInfo(calculateGradeFromScore(scores.total)),
      aiComments: {
        summary: this.extractSummaryFromJson(parsedJson.analysis),
        scoreAnalysis: this.extractScoreAnalysisFromJson(parsedJson.analysis),
        keyInsights: this.extractKeyInsightsFromJson(parsedJson.analysis),
        improvements: this.extractImprovementsFromJson(parsedJson.analysis),
        nextSteps: this.extractNextStepsFromJson(parsedJson.analysis),
        fullAnalysis: parsedJson.analysis
      },
      recommendations: {
        positioning: ["포지셔닝 분석 결과"],
        itemPriority: ["아이템 우선순위 분석 결과"],
        synergies: ["시너지 조합 분석 결과"]
      },
      comparison: {
        vsAverage: "평균 대비 분석 결과",
        vsTopPlayers: "상위권 플레이어 대비 분석 결과"
      }
    };
  }

  /**
   * 텍스트 응답 처리
   */
  private processTextResponse(response: string): AIAnalysisResult {
    const sanitizedResponse = sanitizeAIResponse(response);
    
    // 기본 점수 추출 로직
    const scores = {
      metaFit: this.extractScore(sanitizedResponse, 'meta') || 50,
      deckCompletion: this.extractScore(sanitizedResponse, 'deck') || 50,
      itemEfficiency: this.extractScore(sanitizedResponse, 'item') || 50,
      total: 0
    };
    
    scores.total = Math.round((scores.metaFit + scores.deckCompletion + scores.itemEfficiency) / 3);
    
    return {
      scores,
      grade: createGradeInfo(calculateGradeFromScore(scores.total)),
      aiComments: {
        summary: this.extractSummary(sanitizedResponse),
        scoreAnalysis: {
          metaFit: "메타 적합도 분석 결과",
          deckCompletion: "덱 완성도 분석 결과",
          itemEfficiency: "아이템 효율성 분석 결과"
        },
        keyInsights: ["핵심 인사이트"],
        improvements: ["개선 사항"],
        nextSteps: "다음 단계 가이드",
        fullAnalysis: sanitizedResponse
      },
      recommendations: {
        positioning: ["포지셔닝 추천"],
        itemPriority: ["아이템 우선순위"],
        synergies: ["시너지 추천"]
      },
      comparison: {
        vsAverage: "평균 대비 분석",
        vsTopPlayers: "상위권 대비 분석"
      }
    };
  }

  // 헬퍼 메서드들
  private extractScore(response: string, type: string): number | null {
    const patterns = [
      new RegExp(`${type}[^\\d]*(\\d+)`, 'i'),
      new RegExp(`(\\d+)[^\\d]*${type}`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        const score = parseInt(match[1]);
        if (score >= 0 && score <= 100) {
          return score;
        }
      }
    }
    return null;
  }

  private extractSummary(response: string): string {
    const summaryMatch = response.match(/요약[:\\s]*(.*?)(?=\\n\\n|\\n[A-Z]|$)/s);
    return summaryMatch ? summaryMatch[1].trim() : "분석 요약";
  }

  private extractSummaryFromJson(analysis: string): string {
    const summaryMatch = analysis.match(/\\*\\*총평:\\*\\*\\s*(.*?)(?=\\n\\*\\*|$)/s);
    return summaryMatch ? summaryMatch[1].trim() : "AI 종합 분석 결과";
  }

  private extractScoreAnalysisFromJson(analysis: string): any {
    return {
      metaFit: "메타 적합도 분석",
      deckCompletion: "덱 완성도 분석",
      itemEfficiency: "아이템 효율성 분석"
    };
  }

  private extractKeyInsightsFromJson(analysis: string): string[] {
    return ["핵심 인사이트 1", "핵심 인사이트 2"];
  }

  private extractImprovementsFromJson(analysis: string): string[] {
    return ["개선 사항 1", "개선 사항 2"];
  }

  private extractNextStepsFromJson(analysis: string): string {
    return "다음 게임을 위한 가이드";
  }

  private createErrorResult(matchId: string, userPuuid: string, errorMessage: string): FinalAnalysisResult {
    return {
      success: false,
      _error: errorMessage,
      analysis: this.getDefaultAnalysis(),
      metadata: {
        analyzedAt: new Date().toISOString(),
        matchId,
        userPuuid,
        source: 'error',
        cacheHit: false
      } as any
    };
  }

  private getDefaultAnalysis(): AIAnalysisResult {
    return {
      scores: { metaFit: 50, deckCompletion: 50, itemEfficiency: 50, total: 50 },
      grade: createGradeInfo('C'),
      aiComments: {
        summary: "분석을 진행하는 중입니다.",
        scoreAnalysis: {
          metaFit: "메타 적합도 분석 중",
          deckCompletion: "덱 완성도 분석 중",
          itemEfficiency: "아이템 효율성 분석 중"
        },
        keyInsights: ["분석 준비 중입니다."],
        improvements: ["잠시만 기다려주세요."],
        nextSteps: "분석 결과를 확인해보세요.",
        fullAnalysis: "AI 분석이 진행 중입니다."
      },
      recommendations: {
        positioning: ["포지셔닝 분석 중"],
        itemPriority: ["아이템 우선순위 분석 중"],
        synergies: ["시너지 조합 분석 중"]
      },
      comparison: {
        vsAverage: "평균 대비 분석 준비 중",
        vsTopPlayers: "상위권 대비 분석 준비 중"
      }
    };
  }

  private getUserFriendlyErrorMessage(error: any): string {
    if (error.message?.includes('API key')) {
      return 'AI 서비스 설정에 문제가 있습니다.';
    }
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return 'AI 서비스 사용량이 초과되었습니다.';
    }
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return '네트워크 문제가 발생했습니다.';
    }
    return 'AI 분석 중 오류가 발생했습니다.';
  }

  private isValidAnalysisStructure(analysisResult: any): boolean {
    return !!(analysisResult?.success && analysisResult?.analysis && analysisResult?.metadata);
  }

  private async saveAnalysisToDatabase(match: any, userPuuid: string, analysis: AIAnalysisResult): Promise<void> {
    const span = tracer.startSpan('save_analysis_to_database');
    
    try {
      const existingFeedbackIndex = match.aiFeedback.findIndex((f: any) => f.userPuuid === userPuuid);
      
      if (existingFeedbackIndex >= 0) {
        match.aiFeedback[existingFeedbackIndex].structuredAnalysis = analysis;
        match.aiFeedback[existingFeedbackIndex].analyzedAt = new Date();
      } else {
        match.aiFeedback.push({
          userPuuid,
          structuredAnalysis: analysis,
          analyzedAt: new Date()
        });
      }
      
      await match.save();
      
      span.setAttributes({
        'tft.db.save_success': true,
        'tft.db.operation': 'upsert_ai_feedback',
      });
    } catch (error) {
      span.recordException(error as Error);
      logger.error('AI 분석 결과 DB 저장 실패:', error);
    } finally {
      span.end();
    }
  }
}

// 싱글톤 인스턴스
export const telemetryEnhancedAIService = new TelemetryEnhancedAIAnalysisService();
export default telemetryEnhancedAIService;