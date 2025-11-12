/**
 * AI 메타 예측 API 라우터
 * 실시간 메타 분석, 개인화 추천, 트렌드 예측 엔드포인트
 */

import express, { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { 
    getPredictedMeta, 
    getPersonalizedRecommendation,
    aiMetaPredictor 
} from '../services/aiMetaPredictor';
import logger from '../config/logger';

const router = express.Router();

interface PersonalizedRequest extends Request {
    body: {
        preferredTraits?: string[];
        avgPlacement?: number;
        playStyle?: 'aggressive' | 'economic' | 'flexible' | 'specialist';
        recentPerformance?: number[];
        skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    };
}

// 라우터 초기화 로깅
logger.info('[AI Meta Router] AI 메타 예측 라우터 초기화 완료');

/**
 * GET /api/ai-meta
 * AI 메타 라우터 정보 제공
 */
router.get('/', (_req: Request, res: Response) => {
    return sendSuccess(res, {
        message: 'TFT AI Meta Prediction API',
        version: '1.0.0',
        features: [
            'Real-time meta prediction',
            'Personalized recommendations', 
            'Champion trend analysis',
            'Item meta shifts',
            'Composition viability scoring'
        ],
        endpoints: [
            {
                path: '/prediction/:language?',
                method: 'GET',
                description: 'Get AI-powered meta predictions',
                parameters: {
                    language: {
                        type: 'string',
                        optional: true,
                        default: 'ko',
                        description: 'Language code'
                    }
                }
            },
            {
                path: '/personalized/:language?',
                method: 'POST',
                description: 'Get personalized meta recommendations',
                body: {
                    preferredTraits: 'string[]',
                    avgPlacement: 'number',
                    playStyle: "'aggressive' | 'economic' | 'flexible' | 'specialist'",
                    skillLevel: "'beginner' | 'intermediate' | 'advanced' | 'expert'"
                }
            },
            {
                path: '/trending-comps/:language?',
                method: 'GET',
                description: 'Get trending compositions only'
            },
            {
                path: '/champion-trends/:language?',
                method: 'GET', 
                description: 'Get champion trend analysis'
            }
        ]
    }, 'AI Meta Prediction API 정보');
});

/**
 * GET /api/ai-meta/prediction/:language?
 * 실시간 메타 예측 조회
 */
router.get('/prediction/:language?', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const language = req.params.language || 'ko';
        
        logger.info(`[AI Meta] 메타 예측 요청 - 언어: ${language}`);
        
        const startTime = Date.now();
        const prediction = await getPredictedMeta(language);
        const duration = Date.now() - startTime;
        
        logger.info(`[AI Meta] 메타 예측 완료`, {
            language,
            duration: `${duration}ms`,
            trendingComps: prediction.trendingComps.length,
            risingChampions: prediction.risingChampions.length,
            confidenceScore: prediction.confidenceScore
        });
        
        return sendSuccess(res, {
            ...prediction,
            performance: {
                responseTime: `${duration}ms`,
                cacheStatus: duration < 100 ? 'hit' : 'miss'
            }
        }, `AI 메타 예측 (${language}) 조회 완료`);
        
    } catch (error) {
        logger.error('[AI Meta] 메타 예측 실패:', error);
        return next(error);
    }
});

/**
 * POST /api/ai-meta/personalized/:language?
 * 개인화된 메타 추천
 */
router.post('/personalized/:language?', async (req: PersonalizedRequest, res: Response, next: NextFunction) => {
    try {
        const language = req.params.language || 'ko';
        const {
            preferredTraits = [],
            avgPlacement = 5,
            playStyle = 'flexible',
            recentPerformance = [5, 4, 6, 3, 5],
            skillLevel = 'intermediate'
        } = req.body;
        
        // 플레이어 프로필 검증
        if (avgPlacement < 1 || avgPlacement > 8) {
            return sendError(res, 'avgPlacement는 1-8 사이의 값이어야 합니다', 400);
        }
        
        const validPlayStyles = ['aggressive', 'economic', 'flexible', 'specialist'];
        if (!validPlayStyles.includes(playStyle)) {
            return sendError(res, `playStyle은 다음 중 하나여야 합니다: ${validPlayStyles.join(', ')}`, 400);
        }
        
        const validSkillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
        if (!validSkillLevels.includes(skillLevel)) {
            return sendError(res, `skillLevel은 다음 중 하나여야 합니다: ${validSkillLevels.join(', ')}`, 400);
        }
        
        logger.info(`[AI Meta] 개인화 추천 요청`, {
            language,
            playStyle,
            skillLevel,
            avgPlacement,
            preferredTraitsCount: preferredTraits.length
        });
        
        const playerProfile = {
            preferredTraits,
            avgPlacement,
            playStyle,
            recentPerformance,
            skillLevel
        };
        
        const startTime = Date.now();
        const recommendation = await getPersonalizedRecommendation(playerProfile, language);
        const duration = Date.now() - startTime;
        
        logger.info(`[AI Meta] 개인화 추천 완료`, {
            language,
            duration: `${duration}ms`,
            recommendedComps: recommendation.recommendedComps.length,
            playStyleMatch: recommendation.playStyleMatch
        });
        
        return sendSuccess(res, {
            ...recommendation,
            playerProfile: {
                playStyle,
                skillLevel,
                avgPlacement
            },
            performance: {
                responseTime: `${duration}ms`,
                processingComplexity: 'high'
            }
        }, `개인화 메타 추천 (${language}) 완료`);
        
    } catch (error) {
        logger.error('[AI Meta] 개인화 추천 실패:', error);
        return next(error);
    }
});

/**
 * GET /api/ai-meta/trending-comps/:language?
 * 트렌딩 컴포지션만 조회
 */
router.get('/trending-comps/:language?', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const language = req.params.language || 'ko';
        
        logger.info(`[AI Meta] 트렌딩 컴포지션 요청 - 언어: ${language}`);
        
        const prediction = await getPredictedMeta(language);
        
        return sendSuccess(res, {
            trendingComps: prediction.trendingComps,
            metadata: {
                totalComps: prediction.trendingComps.length,
                avgConfidence: prediction.trendingComps.reduce((sum, comp) => sum + comp.confidence, 0) / prediction.trendingComps.length,
                predictionDate: prediction.predictionDate,
                nextUpdate: prediction.nextUpdateTime
            }
        }, `트렌딩 컴포지션 (${language}) 조회 완료`);
        
    } catch (error) {
        logger.error('[AI Meta] 트렌딩 컴포지션 조회 실패:', error);
        return next(error);
    }
});

/**
 * GET /api/ai-meta/champion-trends/:language?
 * 챔피언 트렌드 분석 조회
 */
router.get('/champion-trends/:language?', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const language = req.params.language || 'ko';
        
        logger.info(`[AI Meta] 챔피언 트렌드 요청 - 언어: ${language}`);
        
        const prediction = await getPredictedMeta(language);
        
        // 상승/하락 챔피언 추가 분석
        const trendAnalysis = {
            rising: prediction.risingChampions.map(champ => ({
                ...champ,
                impact: champ.trendStrength > 0.4 ? 'high' : 'medium',
                recommendation: champ.cost >= 4 ? 'prioritize' : 'consider'
            })),
            falling: prediction.fallingChampions.map(champ => ({
                ...champ,
                impact: Math.abs(champ.trendStrength) > 0.3 ? 'high' : 'medium',
                recommendation: 'avoid_forced_play'
            }))
        };
        
        return sendSuccess(res, {
            championTrends: trendAnalysis,
            summary: {
                risingCount: prediction.risingChampions.length,
                fallingCount: prediction.fallingChampions.length,
                highImpactChanges: [
                    ...prediction.risingChampions.filter(c => c.trendStrength > 0.4),
                    ...prediction.fallingChampions.filter(c => c.trendStrength < -0.3)
                ].length,
                analysisDate: prediction.predictionDate
            }
        }, `챔피언 트렌드 분석 (${language}) 완료`);
        
    } catch (error) {
        logger.error('[AI Meta] 챔피언 트렌드 조회 실패:', error);
        return next(error);
    }
});

/**
 * GET /api/ai-meta/item-trends/:language?
 * 아이템 메타 변화 조회
 */
router.get('/item-trends/:language?', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const language = req.params.language || 'ko';
        
        logger.info(`[AI Meta] 아이템 트렌드 요청 - 언어: ${language}`);
        
        const prediction = await getPredictedMeta(language);
        
        // 아이템을 카테고리별로 분류
        const itemsByCategory = prediction.itemMetaShifts.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, typeof prediction.itemMetaShifts>);
        
        // 효율성 기준 상위 아이템
        const topItems = prediction.itemMetaShifts
            .sort((a, b) => b.effectiveness - a.effectiveness)
            .slice(0, 10);
            
        return sendSuccess(res, {
            itemTrends: {
                byCategory: itemsByCategory,
                topEffective: topItems,
                all: prediction.itemMetaShifts
            },
            recommendations: {
                priorityItems: topItems.slice(0, 5).map(item => item.name),
                avoidItems: prediction.itemMetaShifts
                    .filter(item => item.effectiveness < 60)
                    .slice(0, 3)
                    .map(item => item.name)
            }
        }, `아이템 트렌드 분석 (${language}) 완료`);
        
    } catch (error) {
        logger.error('[AI Meta] 아이템 트렌드 조회 실패:', error);
        return next(error);
    }
});

/**
 * GET /api/ai-meta/cache-status
 * 캐시 상태 및 성능 정보
 */
router.get('/cache-status', (_req: Request, res: Response) => {
    // AIMetaPredictor의 캐시 상태는 private하므로 일반적인 정보만 제공
    return sendSuccess(res, {
        cacheInfo: {
            cacheDuration: '5분',
            status: 'active',
            description: '메타 예측 결과는 5분간 캐시되어 빠른 응답 제공'
        },
        performance: {
            avgResponseTime: '150-300ms (캐시 히트시 <50ms)',
            updateFrequency: '5분마다',
            confidenceRange: '60-95%'
        },
        features: {
            realTimePrediction: true,
            personalizedRecommendation: true,
            trendAnalysis: true,
            multilanguageSupport: true
        }
    }, 'AI Meta Prediction 캐시 및 성능 정보');
});

// 라우터 export 전 로깅
logger.info('[AI Meta Router] AI 메타 예측 라우터 설정 완료', {
    endpoints: [
        'GET /',
        'GET /prediction/:language?',
        'POST /personalized/:language?', 
        'GET /trending-comps/:language?',
        'GET /champion-trends/:language?',
        'GET /item-trends/:language?',
        'GET /cache-status'
    ]
});

export default router;