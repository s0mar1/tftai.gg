// backend/src/routes/staticData.ts

import express, { Request, Response, NextFunction } from 'express';
import { getTFTDataWithLanguage } from '../services/tftData';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger';
import { sendSuccess, sendError } from '../utils/responseHelper';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const itemsDataPath = path.join(__dirname, '..', 'data', 'tft14_items_index.json');

// 표준 TFT 데이터 API (다국어 지원)
// 예: /api/static/tft-data/en, /api/static/tft-data/ko
// :language 파라미터가 없으면 'ko'로 기본 설정하여 하위 호환성 유지
router.get('/tft-data/:language?', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const language = _req.params.language || 'ko'; // 언어 파라미터, 기본값 'ko'
    logger.info(`[GET /tft-data/${language}] 요청 처리 시작`);
    
    const tft = await getTFTDataWithLanguage(language);
    logger.info(`[GET /tft-data/${language}] getTFTDataWithLanguage 응답:`, {
      hasTft: !!tft,
      hasTraitMap: !!tft?.traitMap,
      traitMapSize: tft?.traitMap?.size,
      hasChampions: !!tft?.champions,
      championsCount: tft?.champions?.length,
      hasItems: !!tft?.items,
      hasCompleted: !!tft?.items?.completed,
      completedCount: tft?.items?.completed?.length,
      tftKeys: tft ? Object.keys(tft) : null
    });
    
    if (!tft) {
      logger.error(`[GET /tft-data/${language}] TFT 데이터가 null입니다`);
      return sendError(
        _res, 
        'TFT_DATA_UNAVAILABLE', 
        `TFT static 데이터를 언어 '${language}'로 불러올 수 없습니다.`, 
        503,
        { language, reason: 'null_data' }
      );
    }
    
    // 데이터 존재 확인을 완화
    if (!tft.items?.completed?.length) {
      logger.warn(`[GET /tft-data/${language}] 완성 아이템이 없습니다`);
    }
    
    // Map 객체들을 직렬화 가능한 배열로 변환하여 응답 준비
    const responseTft = {
      items: tft.items,
      augments: tft.augments,
      champions: tft.champions,
      traits: tft.traits,
      currentSet: tft.currentSet,
      language: tft.language,
      locale: tft.locale,
      traitMap: tft.traitMap ? Array.from(tft.traitMap.entries()) : [],
      nameMap: tft.nameMap ? Array.from(tft.nameMap.entries()) : [],
      krNameMap: tft.nameMap ? Array.from(tft.nameMap.entries()) : [], // 프론트엔드 호환성을 위해 추가
    };
    
    logger.info(`[GET /tft-data/${language}] 응답 데이터 준비 완료:`, {
      hasChampions: !!responseTft.champions,
      championsCount: responseTft.champions?.length,
      hasTraits: !!responseTft.traits,
      traitsCount: responseTft.traits?.length,
      traitMapLength: responseTft.traitMap?.length,
      nameMapLength: responseTft.nameMap?.length,
      responseTftKeys: Object.keys(responseTft),
      dataKeys: tft ? Object.keys(tft) : null
    });

    // 응답 전 최종 확인 로깅
    logger.info(`[GET /tft-data/${language}] 최종 응답 객체 확인:`, {
      hasChampions: !!responseTft.champions,
      hasTraits: !!responseTft.traits,
      hasItems: !!responseTft.items,
      hasTraitMap: !!responseTft.traitMap,
      hasNameMap: !!responseTft.nameMap,
      itemsKeys: responseTft.items ? Object.keys(responseTft.items) : null
    });
    
    return sendSuccess(_res, responseTft, `TFT static 데이터 (${language}) 조회 완료`);
  } catch (_err) {
    logger.error(`[GET /tft-data/${_req.params.language || 'ko'}] 오류 발생:`, _err);
    return _next(_err);
  }
});

// 카테고리별 아이템 조회 API (다국어 지원)
router.get('/items-by-category/:language?', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const language = _req.params.language || 'ko'; // 언어 파라미터, 기본값 'ko'
    
    // 1. tftData.ts로부터 최신 "마스터 데이터베이스"를 특정 언어로 가져옵니다.
    const tft = await getTFTDataWithLanguage(language);
    if (!tft || !tft.items) {
      throw new Error(`TFT 아이템 데이터를 서비스에서 '${language}' 언어로 가져올 수 없습니다.`);
    }
    const allItemsFromService = Object.values(tft.items).flat();

    // 2. 이름의 미세한 차이를 극복하기 위한 정규화 함수를 정의합니다.
    const normalizeName = (name: string): string => {
      return (name || '').toLowerCase().replace(/[\s.'']/g, '');
    };

    // 3. "정규화된 이름"을 Key로 사용���는 마스터 Map을 생성합니다.
    const masterItemMap = new Map<string, any>();
    for (const item of allItemsFromService) {
      const normalizedKey = normalizeName(item.name);
      if (normalizedKey && !masterItemMap.has(normalizedKey)) {
        masterItemMap.set(normalizedKey, item);
      }
    }
    
    // 4. 우리가 직접 관리하는 JSON 파일(분류 기준)을 읽어옵니다.
    // 이 파일은 'korean_name'을 기준으로 매칭하므로, 언어와 상관없이 동일하게 사용됩니다.
    const itemsData = JSON.parse(fs.readFileSync(itemsDataPath, 'utf8'));
    const categorizedItems: Record<string, any[]> = {};
    
    // 5. JSON 파일의 카테고리를 순회합니다.
    for (const category in itemsData) {
      if (Object.hasOwnProperty.call(itemsData, category)) {
        categorizedItems[category] = [];
        
        // 6. 각 카테고리에 속한 아이템 목록을 순회합니다.
        for (const itemFromJson of itemsData[category]) {
          // 7. JSON 파일의 'korean_name'을 정규화하여 Key로 사용합니다.
          const normalizedKeyFromJson = normalizeName(itemFromJson.korean_name);
          
          // 8. 정규화된 Key로 마스터 Map에서 최신 아이템 정보를 찾습니다.
          const liveItemData = masterItemMap.get(normalizedKeyFromJson);
          
          if (liveItemData) {
            // 매칭에 성공하면 최종 목록에 추가합니다.
            categorizedItems[category].push(liveItemData);
          } else {
            // 'ko' 언어일 때만 경고를 로깅하여 중복 경고를 피합니다.
            if (language === 'ko') {
              logger.warn(`[매칭 실패] JSON 아이템 '${itemFromJson.korean_name}'을(를) 마스터 데이터베이스에서 찾을 수 없습니다.`);
            }
          }
        }
      }
    }
    
    // 응답 전 카테고리 정보 로깅
    const categoryInfo = Object.entries(categorizedItems).map(([category, items]) => ({
      category,
      count: items.length
    }));
    
    logger.info(`[items-by-category] 카테고리별 아이템 정보:`, categoryInfo);
    
    return sendSuccess(_res, categorizedItems, `카테고리별 아이템 데이터 (${language}) 조회 완료`);

  } catch (_error) {
    logger.error("[items-by-category] 에러 발생:", _error);
    return _next(_error);
  }
});

export default router;
