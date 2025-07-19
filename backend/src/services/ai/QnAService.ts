import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import cacheManager from '../cacheManager';
import logger from '../../config/logger';
import { getMetaDecks } from '../metaDataService';
import { getTFTDataWithLanguage } from '../tftData';
import { AI_CONFIG, envGuards } from '../../config/env';

// 프롬프트 임포트
import systemRole from '../../prompts/common/systemRole';
import qnaContext from '../../prompts/qna/context';
import qnaFormat from '../../prompts/qna/format';

// 유틸리티 임포트
import { buildQnAPrompt, sanitizeAIResponse } from '../../utils/ai/promptBuilder';

// 타입 임포트
import { ChatMessage, QnAResponse } from '../../types/ai';

export class QnAService {
  private model: GenerativeModel;

  constructor() {
    const apiKey = AI_CONFIG.GOOGLE_AI_MAIN_KEY;
    if (!envGuards.hasGoogleAIKey(apiKey)) {
      throw new Error('GOOGLE_AI_MAIN_API_KEY가 설정되지 않았습니다. QnA 기능을 사용할 수 없습니다.');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });
  }

  async processQuestion(question: string, history: ChatMessage[] = []): Promise<QnAResponse> {
    logger.info(`💬 QnA 요청 받음 - 질문: ${question.substring(0, 50)}...`);

    try {
      // 캐시 확인
      const cacheKey = `qna_${this.generateCacheKey(question, history)}`;
      const cachedResult = await cacheManager.get(cacheKey);
      
      if (cachedResult && this.isValidQnAResponse(cachedResult)) {
        logger.info(`✅ 캐시된 QnA 답변 반환`);
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            answeredAt: cachedResult.metadata?.answeredAt || new Date().toISOString(),
            cacheHit: true
          }
        };
      }

      // 대화 히스토리 제한 (최근 10개 메시지만)
      const limitedHistory = this.limitHistory(history);

      // AI 답변 생성
      const answer = await this.generateAnswer(question, limitedHistory);

      // 새로운 대화 히스토리 생성
      const newHistory = [
        ...limitedHistory,
        { role: 'user' as const, content: question },
        { role: 'assistant' as const, content: answer }
      ];

      const result: QnAResponse = {
        success: true,
        answer,
        history: newHistory,
        metadata: {
          answeredAt: new Date().toISOString(),
          cacheHit: false
        }
      };

      // 캐시 저장 (30분)
      await cacheManager.set(cacheKey, result, 1800);

      logger.info(`✅ QnA 답변 생성 완료`);
      return result;

    } catch (_error: any) {
      logger.error(`❌ QnA 처리 실패: ${_error.message}`, _error);
      
      // Google AI API 에러 타입별 처리
      let userMessage = '죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.';
      
      if (_error.message?.includes('API key')) {
        userMessage = '죄송합니다. AI 서비스 설정에 문제가 있습니다. 관리자에게 문의해주세요.';
      } else if (_error.message?.includes('quota') || _error.message?.includes('limit')) {
        userMessage = '죄송합니다. AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (_error.message?.includes('model')) {
        userMessage = '죄송합니다. AI 모델에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      } else if (_error.message?.includes('network') || _error.message?.includes('timeout')) {
        userMessage = '죄송합니다. 네트워크 문제가 발생했습니다. 다시 시도해주세요.';
      }
      
      return {
        success: false,
        error: _error.message,
        history: [
          ...history,
          { role: 'user', content: question },
          { role: 'assistant', content: userMessage }
        ],
        metadata: {
          answeredAt: new Date().toISOString(),
          cacheHit: false
        }
      };
    }
  }

  private async generateAnswer(question: string, history: ChatMessage[]): Promise<string> {
    // 실제 메타 데이터 가져오기
    const metaDataForAI = await this.getMetaDataForAI();
    
    const prompt = buildQnAPrompt(
      question,
      history,
      systemRole,
      qnaContext({ question, chatHistory: history, metaDataForAI }),
      qnaFormat
    );

    const result = await this.model.generateContent(prompt);
    const rawAnswer = result.response.text();
    
    return sanitizeAIResponse(rawAnswer);
  }

  private limitHistory(history: ChatMessage[]): ChatMessage[] {
    const MAX_HISTORY_LENGTH = 10;
    
    if (history.length <= MAX_HISTORY_LENGTH) {
      return history;
    }
    
    // 최근 메시지들만 유지
    return history.slice(-MAX_HISTORY_LENGTH);
  }

  private generateCacheKey(question: string, history: ChatMessage[]): string {
    // 질문과 최근 2개 메시지만 고려하여 캐시 키 생성
    const recentHistory = history.slice(-2);
    const contextString = recentHistory.map(msg => `${msg.role}:${msg.content}`).join('|');
    const combined = `${question}|${contextString}`;
    
    // 간단한 해시 생성
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    
    return Math.abs(hash).toString(36);
  }

  private isValidQnAResponse(response: any): response is QnAResponse {
    try {
      return response && 
             response.success !== undefined &&
             response.answer !== undefined &&
             response.history !== undefined &&
             Array.isArray(response.history) &&
             response.metadata !== undefined;
    } catch {
      return false;
    }
  }

  // 대화 히스토리 관리 유틸리티
  public clearHistory(): ChatMessage[] {
    return [];
  }

  public validateQuestion(question: string): { isValid: boolean; reason?: string } {
    if (!question || question.trim().length === 0) {
      return { isValid: false, reason: '질문이 비어있습니다.' };
    }

    if (question.length > 1000) {
      return { isValid: false, reason: '질문이 너무 깁니다. (최대 1000자)' };
    }

    // 스팸 패턴 검사
    const spamPatterns = [
      /(.)\1{10,}/, // 같은 문자 10개 이상 반복
      /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/, // 특수문자만
      /^\d+$/, // 숫자만
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(question)) {
        return { isValid: false, reason: '유효하지 않은 질문 형식입니다.' };
      }
    }

    return { isValid: true };
  }

  public formatHistoryForDisplay(history: ChatMessage[]): string {
    return history
      .map(msg => `${msg.role === 'user' ? '👤' : '🤖'} ${msg.content}`)
      .join('\n\n');
  }

  private async getMetaDataForAI(): Promise<string> {
    try {
      // 메타 덱 정보와 TFT 정적 데이터를 병렬로 가져오기
      const [metaDecks, tftData] = await Promise.all([
        getMetaDecks(10), // 상위 10개 메타 덱
        getTFTDataWithLanguage('ko')
      ]);

      // 메타 덱 정보 포맷팅
      const metaDecksInfo = metaDecks.map((deck, index) => {
        const deckName = (deck as any).deckName || `덱 ${index + 1}`;
        const avgPlacement = deck.averagePlacement ? deck.averagePlacement.toFixed(1) : 'N/A';
        const playRate = (deck as any).playRate ? ((deck as any).playRate * 100).toFixed(1) : 'N/A';
        const winRate = deck.winRate ? (deck.winRate * 100).toFixed(1) : 'N/A';
        
        return `${index + 1}. ${deckName} - 평균 등수: ${avgPlacement}, 픽률: ${playRate}%, 승률: ${winRate}%`;
      }).join('\n');

      // TFT 정적 데이터 요약
      const championCount = tftData?.champions?.length || 0;
      const traitCount = tftData?.traitMap?.size || 0;
      const itemCount = tftData?.items?.completed?.length || 0;

      return `
현재 TFT 메타 정보:

[상위 메타 덱들]
${metaDecksInfo}

[게임 정보]
- 총 챔피언 수: ${championCount}개
- 총 시너지 수: ${traitCount}개  
- 총 완성 아이템 수: ${itemCount}개

[참고사항]
이 데이터는 TFTai.gg의 실시간 챌린저 통계를 기반으로 합니다.
질문에 답변할 때 이 메타 정보를 참고하여 현재 상황에 맞는 조언을 제공하세요.
      `.trim();

    } catch (_error) {
      logger.error('메타 데이터 로딩 실패:', _error);
      return '현재 메타 데이터를 불러오는 중 문제가 발생했습니다. 일반적인 TFT 지식을 바탕으로 답변드리겠습니다.';
    }
  }
}