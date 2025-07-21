import express, { Request, Response, NextFunction } from 'express';
import championStatsService from '../services/championStatsService';

const router = express.Router();

/**
 * @swagger
 * /meta:
 *   get:
 *     summary: 메타 분석 API 정보를 조회합니다.
 *     description: |
 *       메타 분석 API의 사용 가능한 엔드포인트와 기능을 안내합니다.
 *       - 챔피언 및 아이템 픽률 통계
 *       - 챔피언 및 아이템 승률 통계
 *       - 최신 메타 트렌드 분석
 *     tags: [Meta]
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
 *                   example: "TFT Meta Analysis API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                   example: "TFT 메타 분석을 위한 챔피언 및 아이템 통계를 제공합니다."
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                         example: "GET"
 *                       path:
 *                         type: string
 *                         example: "/api/meta/pick-rates"
 *                       description:
 *                         type: string
 *                         example: "챔피언 및 아이템 픽률 통계 조회"
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [
 *                     "실시간 픽률 통계 분석",
 *                     "승률 기반 티어 평가",
 *                     "특성(시너지) 분석",
 *                     "최근 게임 데이터 기반 통계"
 *                   ]
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-07-15T10:30:00.000Z"
 */
router.get('/', (_req: Request, _res: Response) => {
  _res.json({
    success: true,
    service: 'TFT Meta Analysis API',
    version: '1.0.0',
    description: 'TFT 메타 분석을 위한 챔피언 및 아이템 통계를 제공합니다.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/meta/pick-rates',
        description: '챔피언 및 아이템 픽률 통계 조회'
      },
      {
        method: 'GET',
        path: '/api/meta/win-rates',
        description: '챔피언 및 아이템 승률 통계 조회'
      }
    ],
    features: [
      '실시간 픽률 통계 분석',
      '승률 기반 티어 평가',
      '특성(시너지) 분석',
      '최근 게임 데이터 기반 통계'
    ],
    lastUpdated: new Date().toISOString()
  });
});

/**
 * @swagger
 * /meta/pick-rates:
 *   get:
 *     summary: 챔피언 및 아이템 픽률 통계를 조회합니다.
 *     description: |
 *       TFT 메타 분석을 위한 챔피언과 아이템의 픽률 통계를 반환합니다.
 *       - 최근 경기 데이터를 바탕으로 계산
 *       - 챔피언별 선택 빈도 분석
 *       - 아이템별 사용 빈도 분석
 *       - 트레이트별 선택 빈도 분석
 *     tags: [Meta]
 *     responses:
 *       200:
 *         description: 픽률 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 champions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "아리"
 *                       apiName:
 *                         type: string
 *                         example: "TFT4_Ahri"
 *                       pickRate:
 *                         type: number
 *                         description: 픽률 (0~1)
 *                         example: 0.65
 *                       pickCount:
 *                         type: number
 *                         description: 선택된 횟수
 *                         example: 1300
 *                       totalGames:
 *                         type: number
 *                         description: 전체 게임 수
 *                         example: 2000
 *                       cost:
 *                         type: number
 *                         description: 챔피언 비용
 *                         example: 4
 *                       tier:
 *                         type: string
 *                         description: 평가 티어
 *                         example: "S"
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "무한의 대검"
 *                       apiName:
 *                         type: string
 *                         example: "TFT4_InfinityEdge"
 *                       pickRate:
 *                         type: number
 *                         description: 픽률 (0~1)
 *                         example: 0.42
 *                       pickCount:
 *                         type: number
 *                         description: 선택된 횟수
 *                         example: 840
 *                       totalGames:
 *                         type: number
 *                         description: 전체 게임 수
 *                         example: 2000
 *                       category:
 *                         type: string
 *                         description: 아이템 카테고리
 *                         example: "completed"
 *                 traits:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "비술사"
 *                       apiName:
 *                         type: string
 *                         example: "TFT4_Mage"
 *                       pickRate:
 *                         type: number
 *                         description: 픽률 (0~1)
 *                         example: 0.38
 *                       pickCount:
 *                         type: number
 *                         description: 선택된 횟수
 *                         example: 760
 *                       totalGames:
 *                         type: number
 *                         description: 전체 게임 수
 *                         example: 2000
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   description: 마지막 업데이트 시간
 *                   example: "2024-07-15T10:30:00.000Z"
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
 *                       example: "픽률 계산 중 오류가 발생했습니다"
 */
router.get('/pick-rates', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const pickRates = await championStatsService.calculatePickRates();
    _res.json(pickRates);
  } catch (_err) {
    _next(_err);
  }
});

/**
 * @swagger
 * /meta/win-rates:
 *   get:
 *     summary: 챔피언 및 아이템 승률 통계를 조회합니다.
 *     description: |
 *       TFT 메타 분석을 위한 챔피언과 아이템의 승률 통계를 반환합니다.
 *       - 최근 경기 데이터를 바탕으로 계산
 *       - 챔피언별 승률 분석
 *       - 아이템별 승률 분석
 *       - 트레이트별 승률 분석
 *       - 평균 순위 및 상위 4위 비율 포함
 *     tags: [Meta]
 *     responses:
 *       200:
 *         description: 승률 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 champions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "아리"
 *                       apiName:
 *                         type: string
 *                         example: "TFT4_Ahri"
 *                       winRate:
 *                         type: number
 *                         description: 승률 (0~1)
 *                         example: 0.18
 *                       top4Rate:
 *                         type: number
 *                         description: 상위 4위 비율 (0~1)
 *                         example: 0.58
 *                       averagePlacement:
 *                         type: number
 *                         description: 평균 순위
 *                         example: 3.8
 *                       totalGames:
 *                         type: number
 *                         description: 전체 게임 수
 *                         example: 2000
 *                       winCount:
 *                         type: number
 *                         description: 승리 횟수
 *                         example: 360
 *                       top4Count:
 *                         type: number
 *                         description: 상위 4위 횟수
 *                         example: 1160
 *                       cost:
 *                         type: number
 *                         description: 챔피언 비용
 *                         example: 4
 *                       tier:
 *                         type: string
 *                         description: 평가 티어
 *                         example: "S"
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "무한의 대검"
 *                       apiName:
 *                         type: string
 *                         example: "TFT4_InfinityEdge"
 *                       winRate:
 *                         type: number
 *                         description: 승률 (0~1)
 *                         example: 0.22
 *                       top4Rate:
 *                         type: number
 *                         description: 상위 4위 비율 (0~1)
 *                         example: 0.64
 *                       averagePlacement:
 *                         type: number
 *                         description: 평균 순위
 *                         example: 3.5
 *                       totalGames:
 *                         type: number
 *                         description: 전체 게임 수
 *                         example: 1800
 *                       winCount:
 *                         type: number
 *                         description: 승리 횟수
 *                         example: 396
 *                       top4Count:
 *                         type: number
 *                         description: 상위 4위 횟수
 *                         example: 1152
 *                       category:
 *                         type: string
 *                         description: 아이템 카테고리
 *                         example: "completed"
 *                 traits:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "비술사"
 *                       apiName:
 *                         type: string
 *                         example: "TFT4_Mage"
 *                       winRate:
 *                         type: number
 *                         description: 승률 (0~1)
 *                         example: 0.19
 *                       top4Rate:
 *                         type: number
 *                         description: 상위 4위 비율 (0~1)
 *                         example: 0.61
 *                       averagePlacement:
 *                         type: number
 *                         description: 평균 순위
 *                         example: 3.7
 *                       totalGames:
 *                         type: number
 *                         description: 전체 게임 수
 *                         example: 1500
 *                       winCount:
 *                         type: number
 *                         description: 승리 횟수
 *                         example: 285
 *                       top4Count:
 *                         type: number
 *                         description: 상위 4위 횟수
 *                         example: 915
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   description: 마지막 업데이트 시간
 *                   example: "2024-07-15T10:30:00.000Z"
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
 *                       example: "승률 계산 중 오류가 발생했습니다"
 */
router.get('/win-rates', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const winRates = await championStatsService.calculateWinRates();
    _res.json(winRates);
  } catch (_err) {
    _next(_err);
  }
});

export default router;