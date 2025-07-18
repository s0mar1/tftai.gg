import express, { Request, Response, NextFunction } from 'express';
import championStatsService from '../services/championStatsService';

const router = express.Router();

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