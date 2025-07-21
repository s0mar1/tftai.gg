// backend/src/routes/staticData.ts

import express, { Request, Response, NextFunction } from 'express';
import { getTFTDataWithLanguage } from '../services/tftData';
import fs from 'fs';
import logger from '../config/logger';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { getDataFilePath } from '../utils/pathUtils';

const router = express.Router();

// 라우터 초기화 로깅 (배포 환경 디버깅용)
logger.info('[staticData Router] 라우터 초기화 완료', {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV
});

// ESM 호환 방식으로 data 파일 경로 생성
const itemsDataPath = getDataFilePath(import.meta.url, 'tft14_items_index.json');

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
      krNameMap: tft.krNameMap ? Array.from(tft.krNameMap.entries()) : [], // krNameMap 사용
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
    logger.info(`[items-by-category] API 호출 시작 - 언어: ${language}`);
    
    // 1. tftData.ts로부터 최신 "마스터 데이터베이스"를 특정 언어로 가져옵니다.
    logger.info(`[items-by-category] getTFTDataWithLanguage 호출 중...`);
    const tft = await getTFTDataWithLanguage(language);
    
    // 응답 데이터 검증 강화
    if (!tft) {
      logger.error(`[items-by-category] getTFTDataWithLanguage 반환값이 null/undefined - 언어: ${language}`);
      throw new Error(`TFT 데이터를 '${language}' 언어로 가져올 수 없습니다.`);
    }
    
    if (!tft.items) {
      logger.error(`[items-by-category] tft.items가 존재하지 않음`, {
        language,
        tftKeys: Object.keys(tft),
        itemsValue: tft.items
      });
      throw new Error(`TFT 아이템 데이터를 서비스에서 '${language}' 언어로 가져올 수 없습니다.`);
    }
    
    logger.info(`[items-by-category] TFT 데이터 검증 완료`, {
      language,
      itemsKeys: Object.keys(tft.items),
      itemsType: typeof tft.items
    });
    
    // 안전한 Object.values() 처리
    let allItemsFromService: any[] = [];
    try {
      const itemValues = Object.values(tft.items);
      logger.info(`[items-by-category] Object.values(tft.items) 결과:`, {
        valuesLength: itemValues.length,
        valuesTypes: itemValues.map(v => Array.isArray(v) ? `array[${v.length}]` : typeof v)
      });
      
      allItemsFromService = itemValues.flat();
      logger.info(`[items-by-category] flat() 후 아이템 개수: ${allItemsFromService.length}`);
    } catch (flatError) {
      logger.error(`[items-by-category] Object.values().flat() 처리 실패:`, flatError);
      throw new Error(`아이템 데이터 구조 처리 중 오류가 발생했습니다.`);
    }

    // 2. 이름의 미세한 차이를 극복하기 위한 정규화 함수를 정의합니다.
    const normalizeName = (name: string | null | undefined): string => {
      if (!name || typeof name !== 'string') {
        logger.warn(`[items-by-category] 정규화 대상이 유효하지 않음:`, { name, type: typeof name });
        return '';
      }
      return name.toLowerCase().replace(/[\s.'']/g, '');
    };

    // 3. "정규화된 이름"을 Key로 사용���는 마스터 Map을 생성합니다.
    const masterItemMap = new Map<string, any>();
    let processedItemsCount = 0;
    let skippedItemsCount = 0;
    
    for (const item of allItemsFromService) {
      if (!item || typeof item !== 'object') {
        skippedItemsCount++;
        logger.warn(`[items-by-category] 유효하지 않은 아이템 스킵:`, { item, type: typeof item });
        continue;
      }
      
      const normalizedKey = normalizeName(item.name);
      if (normalizedKey && !masterItemMap.has(normalizedKey)) {
        masterItemMap.set(normalizedKey, item);
        processedItemsCount++;
      } else if (!normalizedKey) {
        skippedItemsCount++;
        logger.warn(`[items-by-category] 정규화된 키가 비어있는 아이템:`, { 
          itemName: item.name, 
          itemKeys: Object.keys(item) 
        });
      }
    }
    
    logger.info(`[items-by-category] 마스터 맵 생성 완료`, {
      totalItems: allItemsFromService.length,
      processedItems: processedItemsCount,
      skippedItems: skippedItemsCount,
      masterMapSize: masterItemMap.size
    });
    
    // 4. 우리가 직접 관리하는 JSON 파일(분류 기준)을 읽어옵니다.
    // 이 파일은 'korean_name'을 기준으로 매칭하므로, 언어와 상관없이 동일하게 사용됩니다.
    logger.info(`[items-by-category] JSON 파일 읽기 시작: ${itemsDataPath}`);
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(itemsDataPath)) {
      logger.error(`[items-by-category] JSON 파일이 존재하지 않음: ${itemsDataPath}`, {
        currentWorkingDirectory: process.cwd(),
        nodeEnv: process.env.NODE_ENV,
        isDistEnvironment: itemsDataPath.includes('/dist/'),
        expectedPath: itemsDataPath,
        suggestedSolution: 'npm run build를 실행하여 data 폴더가 dist/에 복사되었는지 확인하세요.'
      });
      throw new Error(`아이템 분류 데이터 파일을 찾을 수 없습니다. 경로: ${itemsDataPath}`);
    }
    
    let itemsData: any;
    try {
      const fileContent = fs.readFileSync(itemsDataPath, 'utf8');
      logger.info(`[items-by-category] 파일 읽기 완료, 크기: ${fileContent.length} bytes`);
      
      itemsData = JSON.parse(fileContent);
      logger.info(`[items-by-category] JSON 파싱 완료`, {
        categories: Object.keys(itemsData),
        categoriesCount: Object.keys(itemsData).length
      });
    } catch (fileError: unknown) {
      const error = fileError instanceof Error ? fileError : new Error(String(fileError));
      logger.error(`[items-by-category] JSON 파일 읽기/파싱 실패:`, {
        filePath: itemsDataPath,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`아이템 분류 데이터 파일 처리 중 오류가 발생했습니다.`);
    }
    
    const categorizedItems: Record<string, any[]> = {};
    
    // 5. JSON 파일의 카테고리를 순회합니다.
    logger.info(`[items-by-category] 카테고리별 매칭 시작`);
    let totalMatchAttempts = 0;
    let successfulMatches = 0;
    let failedMatches = 0;
    
    for (const category in itemsData) {
      if (Object.hasOwnProperty.call(itemsData, category)) {
        categorizedItems[category] = [];
        logger.info(`[items-by-category] 카테고리 처리 중: ${category}`);
        
        // 카테고리 데이터 검증
        if (!Array.isArray(itemsData[category])) {
          logger.error(`[items-by-category] 카테고리 '${category}'의 데이터가 배열이 아님:`, {
            category,
            dataType: typeof itemsData[category],
            dataValue: itemsData[category]
          });
          continue;
        }
        
        // 6. 각 카테고리에 속한 아이템 목록을 순회합니다.
        for (const itemFromJson of itemsData[category]) {
          totalMatchAttempts++;
          
          // JSON 아이템 데이터 검증
          if (!itemFromJson || typeof itemFromJson !== 'object') {
            failedMatches++;
            logger.warn(`[items-by-category] 유효하지 않은 JSON 아이템:`, { 
              category, 
              item: itemFromJson, 
              type: typeof itemFromJson 
            });
            continue;
          }
          
          if (!itemFromJson.korean_name) {
            failedMatches++;
            logger.warn(`[items-by-category] korean_name이 없는 JSON 아이템:`, { 
              category, 
              item: itemFromJson,
              keys: Object.keys(itemFromJson)
            });
            continue;
          }
          
          // 7. JSON 파일의 'korean_name'을 정규화하여 Key로 사용합니다.
          const normalizedKeyFromJson = normalizeName(itemFromJson.korean_name);
          
          if (!normalizedKeyFromJson) {
            failedMatches++;
            logger.warn(`[items-by-category] 정규화 실패:`, { 
              category, 
              koreanName: itemFromJson.korean_name,
              normalizedKey: normalizedKeyFromJson
            });
            continue;
          }
          
          // 8. 정규화된 Key로 마스터 Map에서 최신 아이템 정보를 찾습니다.
          const liveItemData = masterItemMap.get(normalizedKeyFromJson);
          
          if (liveItemData) {
            // 매칭에 성공하면 최종 목록에 추가합니다.
            categorizedItems[category].push(liveItemData);
            successfulMatches++;
          } else {
            failedMatches++;
            // 'ko' 언어일 때만 경고를 로깅하여 중복 경고를 피합니다.
            if (language === 'ko') {
              logger.warn(`[매칭 실패] JSON 아이템 '${itemFromJson.korean_name}'을(를) 마스터 데이터베이스에서 찾을 수 없습니다.`, {
                normalizedKey: normalizedKeyFromJson,
                availableKeys: Array.from(masterItemMap.keys()).slice(0, 5) // 처음 5개만 샘플로
              });
            }
          }
        }
        
        logger.info(`[items-by-category] 카테고리 '${category}' 처리 완료: ${categorizedItems[category].length}개 매칭`);
      }
    }
    
    logger.info(`[items-by-category] 전체 매칭 결과`, {
      totalAttempts: totalMatchAttempts,
      successful: successfulMatches,
      failed: failedMatches,
      successRate: totalMatchAttempts > 0 ? (successfulMatches / totalMatchAttempts * 100).toFixed(2) + '%' : '0%'
    });
    
    // 응답 전 카테고리 정보 로깅
    const categoryInfo = Object.entries(categorizedItems).map(([category, items]) => ({
      category,
      count: items.length
    }));
    
    logger.info(`[items-by-category] 카테고리별 아이템 정보:`, categoryInfo);
    logger.info(`[items-by-category] API 성공적으로 완료 - 언어: ${language}, 총 카테고리: ${categoryInfo.length}`);
    
    return sendSuccess(_res, categorizedItems, `카테고리별 아이템 데이터 (${language}) 조회 완료`);

  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      language: _req.params.language || 'ko',
      timestamp: new Date().toISOString(),
      requestUrl: _req.url,
      userAgent: _req.get('User-Agent')
    };
    
    logger.error("[items-by-category] 상세 에러 정보:", errorDetails);
    
    // 에러 유형별 분류
    if (error.message.includes('TFT 데이터를') || error.message.includes('getTFTDataWithLanguage')) {
      logger.error("[items-by-category] TFT 데이터 서비스 관련 에러 - 외부 API 또는 캐시 문제일 가능성");
    } else if (error.message.includes('파일')) {
      logger.error("[items-by-category] 파일 시스템 관련 에러 - JSON 파일 접근 문제");
    } else if (error.message.includes('데이터 구조')) {
      logger.error("[items-by-category] 데이터 구조 관련 에러 - 예상과 다른 데이터 형식");
    } else {
      logger.error("[items-by-category] 예상치 못한 에러 유형");
    }
    
    return _next(error);
  }
});

// 라우터 export 전 최종 확인 로깅
logger.info('[staticData Router] 라우터 export 준비 완료', {
  routerType: typeof router,
  hasStackProperty: 'stack' in router,
  routerConstructorName: router.constructor?.name || 'unknown',
  timestamp: new Date().toISOString()
});

export default router;
