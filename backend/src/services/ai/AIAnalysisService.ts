import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getMatchDetail } from '../riotApi';
import Match from '../../models/Match';
import { getMetaDecks } from '../metaDataService';
import cacheManager from '../cacheManager';
import logger from '../../config/logger';
import { AI_CONFIG, envGuards } from '../../config/env';

// 프롬프트 임포트
import analysisSystemRole from '../../prompts/common/analysisSystemRole';
import autoAnalysisContext from '../../prompts/autoAnalysis/context';
import autoAnalysisFormat from '../../prompts/autoAnalysis/format';

// 유틸리티 임포트
import { parsePlayerDeck, formatPlayerDataForAI, formatMetaDecksForAI, parseAIScores } from '../../utils/ai/dataParser';

// 타입 가드 함수들
function isValidError(_error: unknown): _error is Error {
  return _error instanceof Error && typeof _error.message === 'string';
}

function hasProperty<T, K extends string>(
  obj: T, 
  prop: K
): obj is T & Record<K, unknown> {
  return obj != null && typeof obj === 'object' && prop in obj;
}

import { createGradeInfo, calculateGradeFromScore } from '../../utils/ai/gradeCalculator';
import { buildAnalysisPrompt, sanitizeAIResponse, extractKeyInsights, extractImprovements } from '../../utils/ai/promptBuilder';

// 타입 임포트
import { 
  AIAnalysisResult, 
  FinalAnalysisResult, 
  AIComments,
  PlayerDeck 
} from '../../types/ai';

export class AIAnalysisService {
  private model: GenerativeModel;

  constructor() {
    const apiKey = AI_CONFIG.GOOGLE_AI_MAIN_KEY;
    if (!envGuards.hasGoogleAIKey(apiKey)) {
      throw new Error('GOOGLE_AI_MAIN_API_KEY가 설정되지 않았습니다. AI 분석 기능을 사용할 수 없습니다.');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });
  }

  async analyzeMatch(matchId: string, userPuuid: string): Promise<FinalAnalysisResult> {
    logger.info(`🔍 AI 분석 요청 받음 - matchId: ${matchId}, userPuuid: ${userPuuid}`);

    try {
      // 캐시 확인
      const cacheKey = `ai_analysis_${matchId}_${userPuuid}`;
      const cachedResult = await cacheManager.get(cacheKey);
      
      if (cachedResult && this.isValidAnalysisStructure(cachedResult)) {
        logger.info(`✅ 캐시된 AI 분석 결과 반환: ${matchId}`);
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            cacheHit: true
          }
        };
      }

      // 매치 상세 정보를 Riot API에서 직접 가져오기
      const matchDetail = await getMatchDetail(matchId, 'kr');
      if (!matchDetail) {
        logger.error(`❌ Riot API에서 매치를 찾을 수 없습니다: ${matchId}`);
        return {
          success: false,
          _error: '매치를 찾을 수 없습니다.',
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

      // MongoDB에서 기존 AI 피드백 확인 (선택적)
      const match = await Match.findOne({ 'metadata.match_id': matchId });
      if (match) {
        const cachedFeedback = match.aiFeedback?.find((f: any) => f.userPuuid === userPuuid);
        if (cachedFeedback && cachedFeedback.structuredAnalysis) {
          logger.info(`✅ 기존 AI 피드백 반환: ${matchId}`);
          return {
            success: true,
            analysis: cachedFeedback.structuredAnalysis,
            metadata: {
              analyzedAt: cachedFeedback.analyzedAt.toISOString(),
              matchId,
              userPuuid,
              source: 'database_cache',
              cacheHit: true
            } as any
          };
        }
      }
      const userParticipant = matchDetail.info.participants.find((p: any) => p.puuid === userPuuid);

      if (!userParticipant) {
        logger.error(`❌ 사용자 참가자를 찾을 수 없습니다: ${userPuuid}`);
        logger.debug(`매치 참가자 목록:`, matchDetail.info.participants.map((p: any) => ({ puuid: p.puuid?.substring(0, 10) + '...', placement: p.placement })));
        return {
          success: false,
          _error: '사용자 참가자를 찾을 수 없습니다.',
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

      // 플레이어 데이터 파싱
      logger.debug(`사용자 참가자 데이터 샘플:`, {
        puuid: userParticipant.puuid?.substring(0, 10) + '...',
        placement: userParticipant.placement,
        level: userParticipant.level,
        gold_left: userParticipant.gold_left,
        unitsCount: userParticipant.units?.length,
        traitsCount: userParticipant.traits?.length,
        sampleUnit: userParticipant.units?.[0],
        sampleTrait: userParticipant.traits?.[0]
      });
      
      const playerDeck = parsePlayerDeck(userParticipant);
      
      // 메타 데이터 가져오기
      const metaDecks = await getMetaDecks(15);
      
      // AI 분석 실행
      const analysisResult = await this.generateAIAnalysis(playerDeck, metaDecks);

      // 결과 저장
      const finalResult: FinalAnalysisResult = {
        success: true,
        analysis: analysisResult,
        metadata: {
          analyzedAt: new Date().toISOString(),
          matchId,
          userPuuid,
          source: 'fresh_analysis', // 새로 생성된 분석 결과
          cacheHit: false // 캐시 미사용
        } as any
      };

      // AI 피드백 결과를 캐시와 DB에 저장
      await cacheManager.set(cacheKey, finalResult, 3600 * 24); // 24시간 캐시
      
      // MongoDB에 저장 (선택적 - 매치가 존재하는 경우에만)
      if (match) {
        await this.saveAnalysisToDatabase(match, userPuuid, analysisResult);
      } else {
        logger.info(`매치가 MongoDB에 없어 AI 분석 결과를 캐시에만 저장: ${matchId}`);
      }

      logger.info(`✅ AI 분석 완료: ${matchId}`);
      return finalResult;

    } catch (_error: unknown) {
      const errorMessage = isValidError(_error) ? _error.message : 'Unknown error occurred';
      logger.error(`❌ AI 분석 실패: ${errorMessage}`, _error);
      
      // Google AI API 에러 타입별 처리
      let userMessage = 'AI 분석 중 오류가 발생했습니다.';
      
      if (isValidError(_error)) {
        if (_error.message?.includes('API key')) {
          userMessage = 'AI 서비스 설정에 문제가 있습니다.';
        } else if (_error.message?.includes('quota') || _error.message?.includes('limit')) {
          userMessage = 'AI 서비스 사용량이 초과되었습니다.';
        } else if (_error.message?.includes('model')) {
          userMessage = 'AI 모델에 문제가 있습니다.';
        } else if (_error.message?.includes('network') || _error.message?.includes('timeout')) {
          userMessage = '네트워크 문제가 발생했습니다.';
        }
      }
      
      return {
        success: false,
        _error: userMessage,
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
  }

  private async generateAIAnalysis(playerDeck: PlayerDeck, metaDecks: any[]): Promise<AIAnalysisResult> {
    const playerData = formatPlayerDataForAI(playerDeck);
    const metaData = formatMetaDecksForAI(metaDecks);
    
    // 실제 플레이어 정보 파싱
    const playerInfo = this.parsePlayerInfo(playerDeck);
    
    const prompt = buildAnalysisPrompt(
      playerData,
      metaData,
      analysisSystemRole,
      autoAnalysisContext({ playerInfo, metaDataForAI: metaData }),
      autoAnalysisFormat
    );

    const result = await this.model.generateContent(prompt);
    const aiResponse = result.response.text();
    
    return this.parseAIResponse(aiResponse);
  }

  private parseAIResponse(response: string): AIAnalysisResult {
    try {
      // JSON 응답 파싱 시도
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsedJson = JSON.parse(jsonStr);
        
        if (parsedJson.scores && parsedJson.analysis) {
          // JSON 형태 응답 처리
          const scores = {
            metaFit: parsedJson.scores.meta_suitability || parsedJson.scores.metaFit || 50,
            deckCompletion: parsedJson.scores.deck_completion || parsedJson.scores.deckCompletion || 50,
            itemEfficiency: parsedJson.scores.item_efficiency || parsedJson.scores.itemEfficiency || 50,
            total: Math.round(((parsedJson.scores.meta_suitability || 50) + 
                             (parsedJson.scores.deck_completion || 50) + 
                             (parsedJson.scores.item_efficiency || 50)) / 3)
          };
          
          const grade = createGradeInfo(calculateGradeFromScore(scores.total));
          
          return {
            scores,
            grade,
            aiComments: {
              summary: this.extractSummaryFromJson(parsedJson.analysis),
              scoreAnalysis: this.extractScoreAnalysisFromJson(parsedJson.analysis),
              keyInsights: this.extractKeyInsightsFromJson(parsedJson.analysis),
              improvements: this.extractImprovementsFromJson(parsedJson.analysis),
              nextSteps: this.extractNextStepsFromJson(parsedJson.analysis),
              fullAnalysis: parsedJson.analysis
            },
            recommendations: {
              positioning: ["포지셔닝 분석 중입니다."],
              itemPriority: ["아이템 우선순위 분석 중입니다."],
              synergies: ["시너지 조합 분석 중입니다."]
            },
            comparison: {
              vsAverage: "평균 대비 분석 결과를 준비 중입니다.",
              vsTopPlayers: "상위권 플레이어 대비 분석 결과를 준비 중입니다."
            }
          };
        }
      }
    } catch (_error) {
      const errorMessage = isValidError(_error) ? _error.message : 'Unknown parsing error';
      logger.warn('JSON 파싱 실패, 텍스트 파싱으로 전환:', errorMessage);
    }
    
    // 기존 텍스트 파싱 방식으로 fallback
    const sanitizedResponse = sanitizeAIResponse(response);
    
    // 점수 파싱
    const scores = parseAIScores(sanitizedResponse);
    
    // 등급 계산
    const grade = createGradeInfo(calculateGradeFromScore(scores.total));
    
    // 코멘트 파싱
    const comments = this.parseComments(sanitizedResponse);
    
    return {
      scores,
      grade,
      aiComments: comments,
      recommendations: {
        positioning: this.extractRecommendations(sanitizedResponse, '포지셔닝'),
        itemPriority: this.extractRecommendations(sanitizedResponse, '아이템'),
        synergies: this.extractRecommendations(sanitizedResponse, '시너지')
      },
      comparison: {
        vsAverage: this.extractComparison(sanitizedResponse, '평균'),
        vsTopPlayers: this.extractComparison(sanitizedResponse, '상위권')
      }
    };
  }

  private parseComments(response: string): AIComments {
    const keyInsights = extractKeyInsights(response);
    const improvements = extractImprovements(response);
    
    return {
      summary: this.extractSummary(response),
      scoreAnalysis: this.extractScoreAnalysis(response),
      keyInsights,
      improvements,
      nextSteps: this.extractNextSteps(response),
      fullAnalysis: response
    };
  }

  private extractSummary(response: string): string {
    const summaryPatterns = [
      /요약[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|\n점수|$)/s,
      /종합[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|\n점수|$)/s,
      /결론[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|\n점수|$)/s
    ];

    for (const pattern of summaryPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return "분석 결과를 요약하는 중입니다.";
  }

  private extractScoreAnalysis(response: string): { metaFit: string; deckCompletion: string; itemEfficiency: string } {
    return {
      metaFit: this.extractScoreComment(response, ['메타', 'meta']),
      deckCompletion: this.extractScoreComment(response, ['덱', 'deck', '완성']),
      itemEfficiency: this.extractScoreComment(response, ['아이템', 'item', '효율'])
    };
  }

  private extractScoreComment(response: string, keywords: string[]): string {
    for (const keyword of keywords) {
      const pattern = new RegExp(`${keyword}[^\\n]*?[:：]\\s*\\d+[^\\n]*?([\\n\\s]+([^\\n]+))?`, 'i');
      const match = response.match(pattern);
      if (match) {
        return match[2] || match[0];
      }
    }
    return "분석 중입니다.";
  }

  private extractNextSteps(response: string): string {
    const nextStepsPatterns = [
      /다음 단계[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|$)/s,
      /추천 행동[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|$)/s,
      /앞으로[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|$)/s
    ];

    for (const pattern of nextStepsPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return "계속해서 메타 덱 연구와 실전 경험을 쌓아보세요.";
  }

  private async saveAnalysisToDatabase(match: any, userPuuid: string, analysis: AIAnalysisResult): Promise<void> {
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
    } catch (_error) {
      logger.error('DB 저장 실패:', _error);
    }
  }

  private extractRecommendations(response: string, category: string): string[] {
    const pattern = new RegExp(`${category}[^\\n]*?[:：]([^\\n]+(?:\\n[^\\n]*?)*)`, 'i');
    const match = response.match(pattern);
    if (match && match[1]) {
      return match[1].split(/[,\n]/).map(item => item.trim()).filter(item => item.length > 0);
    }
    return [`${category} 관련 추천사항을 분석 중입니다.`];
  }

  private extractComparison(response: string, type: string): string {
    const pattern = new RegExp(`${type}[^\\n]*?[:：]([^\\n]+)`, 'i');
    const match = response.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    return `${type} 대비 분석 결과를 준비 중입니다.`;
  }

  // JSON 응답에서 데이터 추출하는 헬퍼 메서드들
  private extractSummaryFromJson(analysis: string): string {
    const summaryMatch = analysis.match(/\*\*총평:\*\*\s*(.*?)(?=\n\*\*|$)/s);
    if (summaryMatch && summaryMatch[1]) {
      return summaryMatch[1].trim();
    }
    return "AI가 경기를 종합적으로 분석했습니다.";
  }

  private extractScoreAnalysisFromJson(analysis: string): { metaFit: string; deckCompletion: string; itemEfficiency: string } {
    const metaMatch = analysis.match(/\*\*메타 적합도 분석:\*\*\s*(.*?)(?=\n\*\*|$)/s);
    const deckMatch = analysis.match(/\*\*덱 완성도 분석:\*\*\s*(.*?)(?=\n\*\*|$)/s);
    const itemMatch = analysis.match(/\*\*아이템 효율성 분석:\*\*\s*(.*?)(?=\n\*\*|$)/s);

    return {
      metaFit: metaMatch && metaMatch[1] ? metaMatch[1].trim() : "메타 적합도를 분석 중입니다.",
      deckCompletion: deckMatch && deckMatch[1] ? deckMatch[1].trim() : "덱 완성도를 분석 중입니다.",
      itemEfficiency: itemMatch && itemMatch[1] ? itemMatch[1].trim() : "아이템 효율성을 분석 중입니다."
    };
  }

  private extractKeyInsightsFromJson(analysis: string): string[] {
    const insightsMatch = analysis.match(/\*\*핵심 인사이트:\*\*\s*(.*?)(?=\n\*\*|$)/s);
    if (insightsMatch && insightsMatch[1]) {
      const insights = insightsMatch[1].split(/\n-\s*/).filter(item => item.trim().length > 0);
      return insights.map(item => item.trim().replace(/^-\s*/, ''));
    }
    return ["핵심 인사이트를 분석 중입니다."];
  }

  private extractImprovementsFromJson(analysis: string): string[] {
    const improvementsMatch = analysis.match(/\*\*개선점:\*\*\s*(.*?)(?=\n\*\*|$)/s);
    if (improvementsMatch && improvementsMatch[1]) {
      const improvements = improvementsMatch[1].split(/\n-\s*/).filter(item => item.trim().length > 0);
      return improvements.map(item => item.trim().replace(/^-\s*/, ''));
    }
    return ["개선점을 분석 중입니다."];
  }

  private extractNextStepsFromJson(analysis: string): string {
    const nextStepsMatch = analysis.match(/\*\*다음 게임 가이드:\*\*\s*(.*?)(?=\n\*\*|$)/s);
    if (nextStepsMatch && nextStepsMatch[1]) {
      return nextStepsMatch[1].trim();
    }
    return "다음 게임을 위한 가이드를 준비 중입니다.";
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
        positioning: ["포지셔닝 분석 중입니다."],
        itemPriority: ["아이템 우선순위 분석 중입니다."],
        synergies: ["시너지 조합 분석 중입니다."]
      },
      comparison: {
        vsAverage: "평균 대비 분석 결과를 준비 중입니다.",
        vsTopPlayers: "상위권 플레이어 대비 분석 결과를 준비 중입니다."
      }
    };
  }

  private parsePlayerInfo(playerDeck: PlayerDeck): any {
    // PlayerDeck에서 실제 정보 추출 (타입 가드 사용)
    const placement = hasProperty(playerDeck, 'placement') ? playerDeck.placement as number : 8;
    const level = hasProperty(playerDeck, 'level') ? playerDeck.level as number : 1;
    const goldLeft = hasProperty(playerDeck, 'goldLeft') ? playerDeck.goldLeft as number : 0;
    
    // 유닛 상세 정보 생성 (타입 가드 사용)
    const unitDetails = playerDeck.units?.map(unit => {
      const itemNames = hasProperty(unit, 'items') && Array.isArray(unit.items) 
        ? (unit.items as any[]).map(item => hasProperty(item, 'name') ? item.name : 'Unknown').join(', ') 
        : '아이템 없음';
      const unitName = hasProperty(unit, 'name') ? unit.name as string : 
                       (unit as any).character_id || 'Unknown Unit';
      const unitCost = hasProperty(unit, 'cost') ? unit.cost as number : '?';
      return `${unitName} (${unit.tier}성, ${unitCost}코스트) - 아이템: ${itemNames}`;
    }).join('\n') || '유닛 정보 없음';
    
    // 시너지 상세 정보 생성 (타입 가드 사용)
    const synergyDetails = hasProperty(playerDeck, 'traits') && Array.isArray(playerDeck.traits) 
      ? (playerDeck.traits as any[]).map(trait => {
          return `${trait.name} ${trait.tier_current}단계 (${trait.style})`;
        }).join(', ') 
      : '시너지 정보 없음';
    
    // 총 데미지 계산 (추정값)
    const totalDamage = this.estimateTotalDamage(placement, level);
    
    // 마지막 라운드 추정
    const lastRound = this.estimateLastRound(placement, level);
    
    return {
      placement,
      lastRound,
      totalDamage,
      goldLeft,
      unitDetails: unitDetails || "유닛 정보 없음",
      synergyDetails: synergyDetails || "시너지 정보 없음",
      itemDetails: this.generateItemSummary(playerDeck.units)
    };
  }

  private estimateTotalDamage(placement: number, level: number): number {
    // 등수와 레벨을 기반으로 총 데미지 추정
    const baseDamage = level * 20;
    const placementMultiplier = placement <= 4 ? 1.5 : 1.0;
    return Math.floor(baseDamage * placementMultiplier);
  }

  private estimateLastRound(placement: number, level: number): number {
    // 등수와 레벨을 기반으로 마지막 라운드 추정
    if (placement <= 2) return Math.min(level + 15, 47); // 1-2등은 후반까지
    if (placement <= 4) return Math.min(level + 10, 40); // 3-4등은 중후반
    if (placement <= 6) return Math.min(level + 5, 35);  // 5-6등은 중반
    return Math.min(level + 2, 30); // 7-8등은 초중반
  }

  private generateItemSummary(units: any[]): string {
    const allItems = units.flatMap(unit => unit.items || []);
    const itemCounts = allItems.reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const itemSummary = Object.entries(itemCounts)
      .map(([itemName, count]) => (typeof count === 'number' && count > 1) ? `${itemName} x${count}` : itemName)
      .join(', ');
    
    return itemSummary || "아이템 정보 없음";
  }

  private isValidAnalysisStructure(analysisResult: any): analysisResult is FinalAnalysisResult {
    try {
      return analysisResult && 
             analysisResult.success &&
             analysisResult.analysis &&
             analysisResult.analysis.scores &&
             analysisResult.analysis.grade &&
             analysisResult.analysis.comments &&
             analysisResult.metadata;
    } catch {
      return false;
    }
  }
}