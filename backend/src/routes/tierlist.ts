import express, { Request, Response, NextFunction } from 'express';
import DeckTier from '../models/DeckTier';
import logger from '../config/logger';
import { sendSuccess } from '../utils/responseHelper';
import { checkDBConnection } from '../middlewares/dbConnectionCheck';

const router = express.Router();

/**
 * @swagger
 * /tierlist/decks/{language}:
 *   get:
 *     summary: 덱 티어리스트 데이터를 조회합니다.
 *     description: |
 *       TFT 덱 구성별 티어 랭킹을 조회합니다.
 *       - 티어 순서와 평균 순위로 정렬
 *       - 최대 50개 덱까지 제한
 *       - 다국어 지원 (ko, en, ja, zh)
 *       - DB 데이터가 없을 경우 모의 데이터 반환
 *     tags: [Tierlist]
 *     parameters:
 *       - name: language
 *         in: path
 *         required: true
 *         description: 응답 언어 (ko, en, ja, zh - 미지원 언어는 ko로 처리)
 *         schema:
 *           type: string
 *           enum: [ko, en, ja, zh]
 *           example: ko
 *     responses:
 *       200:
 *         description: 티어리스트 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       deckKey:
 *                         type: string
 *                         description: 덱 구성 식별자
 *                         example: "yasuo_challenger"
 *                       tierRank:
 *                         type: string
 *                         description: 티어 등급 (S, A, B, C)
 *                         example: "S"
 *                       tierOrder:
 *                         type: number
 *                         description: 티어 순서 (낮을수록 상위)
 *                         example: 1
 *                       carryChampionName:
 *                         type: string
 *                         description: 메인 캐리 챔피언 이름 (선택된 언어)
 *                         example: "야스오"
 *                       mainTraitName:
 *                         type: string
 *                         description: 주요 특성 이름 (선택된 언어)
 *                         example: "도전자"
 *                       coreUnits:
 *                         type: array
 *                         description: 핵심 유닛 배열
 *                         items:
 *                           type: object
 *                         example: []
 *                       totalGames:
 *                         type: number
 *                         description: 전체 게임 수
 *                         example: 1000
 *                       top4Count:
 *                         type: number
 *                         description: 상위 4위 안에 든 게임 수
 *                         example: 650
 *                       winCount:
 *                         type: number
 *                         description: 1위 달성 게임 수
 *                         example: 180
 *                       averagePlacement:
 *                         type: number
 *                         description: 평균 순위
 *                         example: 3.2
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 생성 시간
 *                         example: "2024-07-15T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 수정 시간
 *                         example: "2024-07-15T10:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "티어 데이터 조회 완료 (ko)"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-07-15T10:30:00.000Z"
 *       400:
 *         description: 잘못된 요청 (지원하지 않는 언어 등)
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
 *                       example: "지원하지 않는 언어입니다"
 *       500:
 *         description: 서버 오류
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
 *                       example: "INTERNAL_SERVER_ERROR"
 *                     message:
 *                       type: string
 *                       example: "데이터베이스 연결 오류"
 *       503:
 *         description: 데이터베이스 연결 실패
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
 *                       example: "DB_CONNECTION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "데이터베이스 연결이 불안정합니다"
 */
router.get('/decks/:language', checkDBConnection, async (_req: Request, _res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { language } = _req.params;
    const supportedLanguages = ['ko', 'en', 'ja', 'zh'];

    // 지원하지 않는 언어일 경우 기본값 'ko' 사용
    const lang = (language && supportedLanguages.includes(language)) ? language : 'ko';

    logger.info(`[GET /api/tierlist/${language}] 요청 처리 시작`);
    
    // 개발 모드에서는 DB 조회를 건너뛰고 바로 모의 데이터 반환
    if (process.env.DEVELOPMENT_MODE === 'true') {
      logger.info('개발 모드: DB 조회를 건너뛰고 모의 데이터를 반환합니다.');
      
      const mockTierData = [
        {
          deckKey: 'yasuo_challenger',
          tierRank: 'S',
          tierOrder: 1,
          carryChampionName: {
            ko: '야스오',
            en: 'Yasuo',
            ja: 'ヤスオ',
            zh: '亚索'
          },
          mainTraitName: {
            ko: '도전자',
            en: 'Challenger',
            ja: 'チャレンジャー',
            zh: '挑战者'
          },
          coreUnits: [] as any[],
          totalGames: 1000,
          top4Count: 650,
          winCount: 180,
          averagePlacement: 3.2,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          deckKey: 'jinx_sniper',
          tierRank: 'A',
          tierOrder: 2,
          carryChampionName: {
            ko: '징크스',
            en: 'Jinx',
            ja: 'ジンクス',
            zh: '金克丝'
          },
          mainTraitName: {
            ko: '저격수',
            en: 'Sniper',
            ja: 'スナイパー',
            zh: '狙击手'
          },
          coreUnits: [] as any[],
          totalGames: 800,
          top4Count: 480,
          winCount: 120,
          averagePlacement: 3.8,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // 언어별 필드 추출 및 프론트엔드 호환 형태로 변환
      const formattedMockData = mockTierData.map(deck => ({
        deckKey: deck.deckKey,
        tierRank: deck.tierRank,
        tierOrder: deck.tierOrder,
        carryChampionName: deck.carryChampionName[lang as keyof typeof deck.carryChampionName] || deck.carryChampionName.ko,
        mainTraitName: deck.mainTraitName[lang as keyof typeof deck.mainTraitName] || deck.mainTraitName.ko,
        coreUnits: deck.coreUnits,
        totalGames: deck.totalGames,
        top4Count: deck.top4Count,
        winCount: deck.winCount,
        averagePlacement: deck.averagePlacement,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt
      }));
      
      logger.info(`개발 모드: ${formattedMockData.length}개의 모의 티어 데이터를 ${lang} 언어로 반환합니다.`);
      sendSuccess(_res, formattedMockData, `개발 모드 모의 티어 데이터 (${lang})`);
      return;
    }
    
    // 실제 DB에서 DeckTier 데이터 조회
    const tierData = await DeckTier.find({})
      .sort({ tierOrder: 1, averagePlacement: 1 }) // 티어 순서와 평균 순위로 정렬
      .limit(50) // 최대 50개로 제한
      .lean(); // 성능 최적화를 위해 lean() 사용

    logger.info(`DB에서 ${tierData.length}개의 티어 데이터를 조회했습니다.`);

    // 데이터가 없을 경우 모의 데이터 반환
    if (tierData.length === 0) {
      logger.warn('DB에 티어 데이터가 없어 모의 데이터를 반환합니다.');
      
      const mockTierData = [
        {
          deckKey: 'yasuo_challenger',
          tierRank: 'S',
          tierOrder: 1,
          carryChampionName: {
            ko: '야스오',
            en: 'Yasuo',
            ja: 'ヤスオ',
            zh: '亚索'
          },
          mainTraitName: {
            ko: '도전자',
            en: 'Challenger',
            ja: 'チャレンジャー',
            zh: '挑战者'
          },
          coreUnits: [] as any[],
          totalGames: 1000,
          top4Count: 650,
          winCount: 180,
          averagePlacement: 3.2,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          deckKey: 'jinx_sniper',
          tierRank: 'A',
          tierOrder: 2,
          carryChampionName: {
            ko: '징크스',
            en: 'Jinx',
            ja: 'ジンクス',
            zh: '金克丝'
          },
          mainTraitName: {
            ko: '저격수',
            en: 'Sniper',
            ja: 'スナイパー',
            zh: '狙击手'
          },
          coreUnits: [] as any[],
          totalGames: 800,
          top4Count: 480,
          winCount: 120,
          averagePlacement: 3.8,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      logger.debug(`[GET /api/tierlist/decks/:language] 반환 데이터 (모의): ${JSON.stringify(mockTierData)}`);
      sendSuccess(_res, mockTierData, '모의 티어 데이터입니다. (DB 데이터 없음)');
      return;
    }

    // 언어별 필드 추출 및 프론트엔드 호환 형태로 변환
    const formattedData = tierData.map(deck => ({
      deckKey: deck.deckKey,
      tierRank: deck.tierRank || 'C',
      tierOrder: deck.tierOrder || 99,
      // 다국어 필드에서 요청된 언어의 값을 추출 (더 안전한 fallback)
      carryChampionName: deck.carryChampionName?.[lang as keyof typeof deck.carryChampionName] || 
                        deck.carryChampionName?.ko || 
                        deck.carryChampionName?.en || 
                        deck.carryChampionName || 
                        '미확인 챔피언',
      mainTraitName: deck.mainTraitName?.[lang as keyof typeof deck.mainTraitName] || 
                    deck.mainTraitName?.ko || 
                    deck.mainTraitName?.en || 
                    deck.mainTraitName || 
                    '미확인 특성',
      coreUnits: deck.coreUnits || [],
      totalGames: deck.totalGames || 0,
      top4Count: deck.top4Count || 0,
      winCount: deck.winCount || 0,
      averagePlacement: deck.averagePlacement || 0,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt
    }));

    logger.info(`${formattedData.length}개의 티어 데이터를 ${lang} 언어로 반환합니다.`);
    logger.debug(`[GET /api/tierlist/decks/:language] 반환 데이터: ${JSON.stringify(formattedData)}`);

    sendSuccess(_res, formattedData, `티어 데이터 조회 완료 (${lang})`);
    
  } catch (_error) {
    logger.error(`[GET /api/tierlist/:language] - 언어: ${_req.params.language}, 오류:`, _error);
    _next(_error);
  }
});

export default router;