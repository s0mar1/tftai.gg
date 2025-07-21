import express, { Request, Response, NextFunction } from 'express';
import { validateAIRequest, validateQnARequest } from '../middlewares/validation';
import { AIAnalysisService } from '../services/ai/AIAnalysisService';
import { QnAService } from '../services/ai/QnAService';
import logger from '../config/logger';

// 타입 임포트
import { AIRequestBody, QnARequestBody } from '../types/ai';

const router = express.Router();

/**
 * @swagger
 * /ai:
 *   get:
 *     summary: AI API 정보를 조회합니다.
 *     description: |
 *       AI API의 사용 가능한 엔드포인트와 기능을 안내합니다.
 *       - AI 기반 TFT 매치 분석
 *       - AI 질문 답변 서비스
 *       - 게임 플레이 개선 제안
 *       - 실시간 메타 조언
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: API 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: "TFT AI Analysis API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                   example: "AI 기반 TFT 분석 및 조언 서비스를 제공합니다."
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                         example: "POST"
 *                       path:
 *                         type: string
 *                         example: "/api/ai/analyze"
 *                       description:
 *                         type: string
 *                         example: "AI 기반 매치 분석"
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [
 *                     "매치 데이터 심층 분석",
 *                     "덱 구성 최적화 제안",
 *                     "아이템 선택 효율성 평가",
 *                     "포지셔닝 및 경제 관리 조언",
 *                     "TFT 관련 질문에 대한 AI 답변",
 *                     "대화 기록 유지로 연속 대화 지원"
 *                   ]
 *                 aiModels:
 *                   type: object
 *                   properties:
 *                     analysis:
 *                       type: string
 *                       example: "GPT-4 based match analysis"
 *                     qna:
 *                       type: string
 *                       example: "GPT-4 based Q&A service"
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-07-15T10:30:00.000Z"
 */
router.get('/', (_req: Request, _res: Response) => {
  _res.json({
    success: true,
    service: 'TFT AI Analysis API',
    version: '1.0.0',
    description: 'AI 기반 TFT 분석 및 조언 서비스를 제공합니다.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/ai/analyze',
        description: 'AI 기반 매치 분석',
        requiredParams: ['matchId', 'userPuuid']
      },
      {
        method: 'POST',
        path: '/api/ai/qna',
        description: 'AI 질문 답변 서비스',
        requiredParams: ['question'],
        optionalParams: ['history']
      }
    ],
    features: [
      '매치 데이터 심층 분석',
      '덱 구성 최적화 제안',
      '아이템 선택 효율성 평가',
      '포지셔닝 및 경제 관리 조언',
      'TFT 관련 질문에 대한 AI 답변',
      '대화 기록 유지로 연속 대화 지원'
    ],
    aiModels: {
      analysis: 'GPT-4 based match analysis',
      qna: 'GPT-4 based Q&A service'
    },
    lastUpdated: new Date().toISOString()
  });
});

// 서비스 인스턴스 lazy initialization
let aiAnalysisService: AIAnalysisService | null = null;
let qnaService: QnAService | null = null;

function getAIAnalysisService(): AIAnalysisService {
  if (!aiAnalysisService) {
    aiAnalysisService = new AIAnalysisService();
  }
  return aiAnalysisService;
}

function getQnAService(): QnAService {
  if (!qnaService) {
    qnaService = new QnAService();
  }
  return qnaService;
}

/**
 * @swagger
 * /ai/analyze:
 *   post:
 *     summary: AI를 활용한 TFT 매치 분석을 수행합니다.
 *     description: |
 *       특정 매치에 대해 AI 분석을 수행하여 게임 플레이 개선 사항을 제공합니다.
 *       - 매치 데이터 분석
 *       - 덱 구성 분석
 *       - 아이템 선택 분석
 *       - 플레이 패턴 분석
 *       - 개선사항 제안
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - matchId
 *               - userPuuid
 *             properties:
 *               matchId:
 *                 type: string
 *                 description: 분석할 매치 ID
 *                 example: "KR_123456789"
 *               userPuuid:
 *                 type: string
 *                 description: 분석 대상 유저의 PUUID
 *                 example: "abc123-def456-ghi789"
 *     responses:
 *       200:
 *         description: AI 분석 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     matchId:
 *                       type: string
 *                       example: "KR_123456789"
 *                     userPuuid:
 *                       type: string
 *                       example: "abc123-def456-ghi789"
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         placement:
 *                           type: number
 *                           description: 최종 순위
 *                           example: 3
 *                         deckComposition:
 *                           type: object
 *                           properties:
 *                             mainCarry:
 *                               type: string
 *                               description: 메인 캐리 챔피언
 *                               example: "아리"
 *                             supportUnits:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["케넨", "신드라"]
 *                             traits:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                     example: "비술사"
 *                                   level:
 *                                     type: number
 *                                     example: 6
 *                         itemAnalysis:
 *                           type: object
 *                           properties:
 *                             optimal:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["무한의 대검", "주문검"]
 *                             actual:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["무한의 대검", "거인의 벨트"]
 *                             effectiveness:
 *                               type: number
 *                               description: 아이템 효율성 (0~1)
 *                               example: 0.85
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: string
 *                                 example: "positioning"
 *                               suggestion:
 *                                 type: string
 *                                 example: "메인 캐리를 뒤쪽에 배치하여 보호하세요"
 *                               priority:
 *                                 type: string
 *                                 enum: [high, medium, low]
 *                                 example: "high"
 *                         score:
 *                           type: object
 *                           properties:
 *                             overall:
 *                               type: number
 *                               description: 전체 점수 (0~100)
 *                               example: 78
 *                             positioning:
 *                               type: number
 *                               description: 포지셔닝 점수 (0~100)
 *                               example: 85
 *                             itemization:
 *                               type: number
 *                               description: 아이템화 점수 (0~100)
 *                               example: 82
 *                             economy:
 *                               type: number
 *                               description: 경제 관리 점수 (0~100)
 *                               example: 65
 *                 message:
 *                   type: string
 *                   example: "AI 분석이 성공적으로 완료되었습니다."
 *                 meta:
 *                   type: object
 *                   properties:
 *                     analysisTime:
 *                       type: number
 *                       description: 분석 소요 시간 (ms)
 *                       example: 2500
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-07-15T10:30:00.000Z"
 *       400:
 *         description: 잘못된 요청 (필수 필드 누락 또는 유효하지 않은 데이터)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "matchId는 필수 필드입니다"
 *                     field:
 *                       type: string
 *                       example: "matchId"
 *       404:
 *         description: 매치 또는 유저 정보를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "매치 데이터를 찾을 수 없습니다"
 *       500:
 *         description: 서버 오류 (AI 분석 실패 등)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "AI_ANALYSIS_ERROR"
 *                     message:
 *                       type: string
 *                       example: "AI 분석 중 오류가 발생했습니다"
 */
router.post('/analyze', validateAIRequest, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { matchId, userPuuid }: AIRequestBody = _req.body;
    
    logger.info(`🔍 AI 분석 요청: matchId=${matchId}, userPuuid=${userPuuid}`);
    
    const result = await getAIAnalysisService().analyzeMatch(matchId, userPuuid);
    
    logger.info(`✅ AI 분석 완료: success=${result.success}`);
    _res.json(result);
    
  } catch (_error) {
    logger.error(`❌ AI 분석 오류:`, _error);
    _next(_error);
  }
});

/**
 * @swagger
 * /ai/qna:
 *   post:
 *     summary: AI 기반 TFT 질문 답변 서비스를 제공합니다.
 *     description: |
 *       TFT 관련 질문에 대해 AI가 답변을 제공합니다.
 *       - 게임 전략 문의
 *       - 메타 정보 문의
 *       - 덱 구성 문의
 *       - 아이템 조합 문의
 *       - 대화 기록 유지로 연속 대화 지원
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *                 description: TFT 관련 질문
 *                 example: "현재 메타에서 가장 강력한 덱 구성은 무엇인가요?"
 *               history:
 *                 type: array
 *                 description: 이전 대화 기록 (옵션)
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                       description: 메시지 역할
 *                       example: "user"
 *                     content:
 *                       type: string
 *                       description: 메시지 내용
 *                       example: "비술사 덱에 대해 알려주세요"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: 메시지 시간
 *                       example: "2024-07-15T10:25:00.000Z"
 *                 example: [
 *                   {
 *                     "role": "user",
 *                     "content": "비술사 덱에 대해 알려주세요",
 *                     "timestamp": "2024-07-15T10:25:00.000Z"
 *                   },
 *                   {
 *                     "role": "assistant", 
 *                     "content": "비술사 덱은 마법 데미지를 주력으로 하는 덱입니다...",
 *                     "timestamp": "2024-07-15T10:25:30.000Z"
 *                   }
 *                 ]
 *     responses:
 *       200:
 *         description: AI 질문 답변 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: string
 *                       example: "현재 메타에서 가장 강력한 덱 구성은 무엇인가요?"
 *                     answer:
 *                       type: string
 *                       example: "현재 메타에서는 비술사 덱이 가장 강력한 덱 구성 중 하나입니다. 아리를 메인 캐리로 하여 신드라, 케넨과 함께 구성하면 좋습니다..."
 *                     sources:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: "meta_stats"
 *                           description:
 *                             type: string
 *                             example: "최근 랭크 게임 승률 통계"
 *                           confidence:
 *                             type: number
 *                             description: 신뢰도 (0~1)
 *                             example: 0.92
 *                       example: [
 *                         {
 *                           "type": "meta_stats",
 *                           "description": "최근 랭크 게임 승률 통계",
 *                           "confidence": 0.92
 *                         }
 *                       ]
 *                     followUpQuestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [
 *                         "비술사 덱의 아이템 조합은 어떻게 하나요?",
 *                         "비술사 덱의 카운터 덱은 무엇인가요?",
 *                         "비술사 덱의 레벨링 타이밍은 언제인가요?"
 *                       ]
 *                     relatedTopics:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [
 *                         "아이템 조합",
 *                         "레벨링 전략",
 *                         "포지셔닝"
 *                       ]
 *                 message:
 *                   type: string
 *                   example: "AI 질문 답변이 성공적으로 완료되었습니다."
 *                 meta:
 *                   type: object
 *                   properties:
 *                     processingTime:
 *                       type: number
 *                       description: 처리 소요 시간 (ms)
 *                       example: 1800
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-07-15T10:30:00.000Z"
 *                     conversationId:
 *                       type: string
 *                       description: 대화 세션 ID
 *                       example: "conv_123456789"
 *       400:
 *         description: 잘못된 요청 (필수 필드 누락 또는 유효하지 않은 데이터)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "질문 내용이 필요합니다"
 *                     field:
 *                       type: string
 *                       example: "question"
 *       429:
 *         description: 요청 횟수 초과 (AI 서비스 레이트 리밋)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "RATE_LIMIT_EXCEEDED"
 *                     message:
 *                       type: string
 *                       example: "AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
 *                     retryAfter:
 *                       type: number
 *                       example: 60
 *       500:
 *         description: 서버 오류 (AI 서비스 실패 등)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "AI_SERVICE_ERROR"
 *                     message:
 *                       type: string
 *                       example: "AI 서비스에서 오류가 발생했습니다"
 */
router.post('/qna', validateQnARequest, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { question, history = [] }: QnARequestBody = _req.body;
    
    logger.info(`💬 QnA 요청: question=${question.substring(0, 50)}...`);
    
    const result = await getQnAService().processQuestion(question, history);
    
    logger.info(`✅ QnA 완료: success=${result.success}`);
    _res.json(result);
    
  } catch (_error) {
    logger.error(`❌ QnA 오류:`, _error);
    _next(_error);
  }
});

export default router;