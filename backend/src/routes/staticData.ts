// backend/src/routes/staticData.ts - Set 15 전용 간소화 버전

import express, { Request, Response, NextFunction } from 'express';
import { getTFTDataWithLanguage } from '../services/tftData';
import logger from '../config/logger';
import { sendSuccess, sendError } from '../utils/responseHelper';

const router = express.Router();

// 라우터 초기화 로깅
logger.info('[staticData Router] Set 15 전용 라우터 초기화 완료', {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV
});

// API 루트 경로 - 사용 가능한 엔드포인트 정보 제공
router.get('/', (_req: Request, _res: Response) => {
  return sendSuccess(_res, {
    message: 'TFT Static Data API - Set 15 전용',
    version: '2.0.0',
    set: 'Set 15 (K.O. Coliseum)',
    endpoints: [
      {
        path: '/tft-data/:language?',
        method: 'GET',
        description: 'Get complete Set 15 TFT data including champions, traits, items, and augments',
        parameters: {
          language: {
            type: 'string',
            optional: true,
            default: 'ko',
            description: 'Language code (ko, en, etc.)'
          }
        },
        example: '/api/static-data/tft-data/ko'
      },
      {
        path: '/items-by-category/:language?',
        method: 'GET', 
        description: 'Get Set 15 items organized by categories (basic, completed, etc.)',
        parameters: {
          language: {
            type: 'string',
            optional: true,
            default: 'ko',
            description: 'Language code (ko, en, etc.)'
          }
        },
        example: '/api/static-data/items-by-category/ko'
      }
    ]
  }, 'TFT Set 15 Static Data API - 엔드포인트 정보');
});

// TFT 데이터 조회 API (Set 15 전용)
router.get('/tft-data/:language?', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const language = _req.params.language || 'ko';
    logger.info(`[GET /tft-data/${language}] Set 15 데이터 조회 시작`);
    
    const tftData = await getTFTDataWithLanguage(language);
    
    if (!tftData) {
      logger.error(`[GET /tft-data/${language}] Set 15 데이터 조회 실패`);
      throw new Error(`Set 15 TFT 데이터를 '${language}' 언어로 가져올 수 없습니다.`);
    }

    // Set 15 데이터 응답 구성
    const responseTft = {
      champions: tftData.champions || [],
      items: tftData.items || {},
      traits: tftData.traits || [],
      augments: tftData.augments || [],
      traitMap: Array.from(tftData.traitMap?.entries() || []),
      krNameMap: Array.from(tftData.krNameMap?.entries() || []),
      currentSet: 'Set15',
      version: '15.0.0',
      language: language,
      lastUpdated: new Date().toISOString(),
      metadata: {
        totalChampions: tftData.champions?.length || 0,
        totalTraits: tftData.traits?.length || 0,
        totalItems: Object.values(tftData.items || {}).flat().length,
        totalAugments: tftData.augments?.length || 0
      }
    };

    logger.info(`[GET /tft-data/${language}] Set 15 데이터 조회 성공`, {
      champions: responseTft.metadata.totalChampions,
      traits: responseTft.metadata.totalTraits,
      items: responseTft.metadata.totalItems,
      augments: responseTft.metadata.totalAugments
    });

    return sendSuccess(_res, responseTft, `Set 15 TFT 데이터 (${language}) 조회 완료`);
  } catch (_err) {
    logger.error(`[GET /tft-data/${_req.params.language || 'ko'}] 오류 발생:`, _err);
    return _next(_err);
  }
});

// 카테고리별 아이템 조회 API (Set 15 전용, 간소화)
router.get('/items-by-category/:language?', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const language = _req.params.language || 'ko';
    logger.info(`[items-by-category] Set 15 아이템 데이터 조회 시작 - 언어: ${language}`);
    
    // tftData 서비스에서 Set 15 데이터 가져오기
    const tftData = await getTFTDataWithLanguage(language);
    
    if (!tftData?.items) {
      logger.error(`[items-by-category] Set 15 아이템 데이터를 가져올 수 없음`, { language });
      throw new Error(`Set 15 아이템 데이터를 '${language}' 언어로 가져올 수 없습니다.`);
    }
    
    // tftData.items는 이미 카테고리별로 구성되어 있음 (Set 15 전용)
    const categorizedItems = tftData.items;
    
    // Set 15에 맞게 카테고리 정리 (support 아이템 제거됨)
    const set15Categories = {
      basic: categorizedItems.basic || [],
      completed: categorizedItems.completed || [],
      ornn: categorizedItems.ornn || [],
      radiant: categorizedItems.radiant || [],
      emblem: categorizedItems.emblem || [],
      robot: categorizedItems.robot || [],
      unknown: categorizedItems.unknown || []
    };
    
    // 통계 계산
    const itemCounts = Object.entries(set15Categories).map(([category, items]) => ({
      category,
      count: items.length
    }));
    
    const totalItems = Object.values(set15Categories).flat().length;
    
    logger.info(`[items-by-category] Set 15 아이템 데이터 조회 완료`, {
      language,
      categories: Object.keys(set15Categories),
      totalItems,
      itemCounts
    });
    
    const responseData = {
      ...set15Categories,
      metadata: {
        currentSet: 'Set15',
        language,
        totalItems,
        categoryBreakdown: itemCounts,
        lastUpdated: new Date().toISOString(),
        note: 'Set 15에서는 support 아이템이 제거되었습니다.'
      }
    };
    
    return sendSuccess(_res, responseData, `Set 15 카테고리별 아이템 데이터 (${language}) 조회 완료`);
  } catch (_err) {
    logger.error(`[items-by-category] Set 15 아이템 조회 오류:`, _err);
    return _next(_err);
  }
});

// 라우터 export 전 최종 확인 로깅
logger.info('[staticData Router] Set 15 전용 라우터 export 준비 완료', {
  routerType: typeof router,
  hasStackProperty: 'stack' in router,
  routerConstructorName: router.constructor?.name || 'unknown',
  timestamp: new Date().toISOString()
});

export default router;