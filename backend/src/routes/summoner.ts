// backend/src/routes/summoner.ts

import express, { Request, Response, NextFunction } from 'express';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getMatchIdsByPUUID,
  getMatchDetail,
  getLeagueEntriesByPuuid,
} from '../services/riotApi';
import { getTFTDataWithLanguage } from '../services/tftData';
import cacheManager from '../services/cacheManager'; // cacheManager import
import { CACHE_TTL } from '../config/cacheTTL';
import logger from '../config/logger';
import { ValidationError, NotFoundError } from '../utils/errors';
import { getTraitStyleInfo } from '../utils/tft-helpers';
import { validateRegion, validatePagination } from '../middlewares/validation';
import { sendSuccess, sendError, sendCachedSuccess, sendValidationError, sendRateLimit } from '../utils/responseHelper';
import { processMatchDetailsBatch, logBatchStats } from '../utils/batchProcessor';

type Region = 'kr' | 'jp' | 'na' | 'br' | 'la1' | 'la2' | 'euw' | 'eune' | 'tr' | 'ru';

const router = express.Router();

interface SummonerQuery {
  region: string;
  gameName: string;
  tagLine: string;
  forceRefresh?: string;
}

interface ProcessedItem {
  name: string;
  image_url: string | null;
}

interface ProcessedUnit {
  character_id: string;
  name: string;
  image_url: string | null;
  tier: number;
  cost: number;
  items: ProcessedItem[];
}

interface ProcessedTrait {
  name: string;
  apiName: string;
  image_url: string;
  tier_current: number;
  style: string;
  styleOrder: number;
  color: string;
  currentThreshold: number;
  nextThreshold: number | null;
}

interface ProcessedMatch {
  matchId: string;
  game_datetime: number;
  placement: number;
  level: number;
  units: ProcessedUnit[];
  traits: ProcessedTrait[];
  puuid: string; // required로 추가 (match.ts와 동일하게)
}

const REFRESH_COOLDOWN_SECONDS = 120; // 2분 쿨타임

/**
 * @swagger
 * /summoner:
 *   get:
 *     summary: 소환사 정보 및 TFT 매치 히스토리를 조회합니다.
 *     description: |
 *       라이엇 계정 정보를 기반으로 소환사 정보, 랭크 정보, 최근 20경기의 TFT 매치 히스토리를 조회합니다.
 *       - 캐시 시스템을 통해 빠른 응답 제공
 *       - 강제 새로고침 시 2분 쿨타임 적용
 *       - 매치 데이터는 TFT 정적 데이터와 매핑되어 가공됨
 *     tags: [Summoner]
 *     parameters:
 *       - name: region
 *         in: query
 *         required: true
 *         description: 서버 지역 (kr, jp, na, br, la1, la2, euw, eune, tr, ru)
 *         schema:
 *           type: string
 *           enum: [kr, jp, na, br, la1, la2, euw, eune, tr, ru]
 *           example: kr
 *       - name: gameName
 *         in: query
 *         required: true
 *         description: 라이엇 게임 이름 (1-16자)
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 16
 *           example: "Faker"
 *       - name: tagLine
 *         in: query
 *         required: true
 *         description: 라이엇 태그라인 (1-5자)
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 5
 *           example: "KR1"
 *       - name: forceRefresh
 *         in: query
 *         required: false
 *         description: 강제 새로고침 여부 (true 시 캐시 무시하고 새로 조회)
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           example: "false"
 *     responses:
 *       200:
 *         description: 소환사 정보 조회 성공
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
 *                     account:
 *                       type: object
 *                       properties:
 *                         puuid:
 *                           type: string
 *                           example: "abc123-def456-ghi789"
 *                         gameName:
 *                           type: string
 *                           example: "Faker"
 *                         tagLine:
 *                           type: string
 *                           example: "KR1"
 *                         id:
 *                           type: string
 *                           example: "summoner-id-123"
 *                         name:
 *                           type: string
 *                           example: "Faker"
 *                         profileIconId:
 *                           type: number
 *                           example: 1234
 *                         summonerLevel:
 *                           type: number
 *                           example: 456
 *                     league:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         tier:
 *                           type: string
 *                           example: "CHALLENGER"
 *                         rank:
 *                           type: string
 *                           example: "I"
 *                         leaguePoints:
 *                           type: number
 *                           example: 1234
 *                         wins:
 *                           type: number
 *                           example: 87
 *                         losses:
 *                           type: number
 *                           example: 23
 *                     matches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           matchId:
 *                             type: string
 *                             example: "KR_123456789"
 *                           game_datetime:
 *                             type: number
 *                             example: 1647890123000
 *                           placement:
 *                             type: number
 *                             example: 1
 *                           level:
 *                             type: number
 *                             example: 8
 *                           units:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 character_id:
 *                                   type: string
 *                                   example: "TFT4_Kayle"
 *                                 name:
 *                                   type: string
 *                                   example: "케일"
 *                                 image_url:
 *                                   type: string
 *                                   nullable: true
 *                                   example: "https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/Kayle_0.jpg"
 *                                 tier:
 *                                   type: number
 *                                   example: 2
 *                                 cost:
 *                                   type: number
 *                                   example: 4
 *                                 items:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       name:
 *                                         type: string
 *                                         example: "무한의 대검"
 *                                       image_url:
 *                                         type: string
 *                                         nullable: true
 *                                         example: "https://ddragon.leagueoflegends.com/cdn/img/item/223006.png"
 *                           traits:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                   example: "용족"
 *                                 apiName:
 *                                   type: string
 *                                   example: "TFT4_Dragon"
 *                                 image_url:
 *                                   type: string
 *                                   example: "https://ddragon.leagueoflegends.com/cdn/img/tft-trait/TFT4_Dragon.png"
 *                                 tier_current:
 *                                   type: number
 *                                   example: 2
 *                                 style:
 *                                   type: string
 *                                   example: "gold"
 *                                 styleOrder:
 *                                   type: number
 *                                   example: 3
 *                                 color:
 *                                   type: string
 *                                   example: ""
 *                                 currentThreshold:
 *                                   type: number
 *                                   example: 2
 *                                 nextThreshold:
 *                                   type: number
 *                                   nullable: true
 *                                   example: 4
 *                 message:
 *                   type: string
 *                   example: "소환사 정보가 성공적으로 조회되었습니다."
 *                 meta:
 *                   type: object
 *                   properties:
 *                     cached:
 *                       type: boolean
 *                       example: false
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-07-15T10:30:00.000Z"
 *       400:
 *         description: 잘못된 요청 (필수 파라미터 누락 또는 유효하지 않은 값)
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
 *                       example: "게임 이름은 1-16자의 문자열이어야 합니다"
 *                     field:
 *                       type: string
 *                       example: "gameName"
 *       404:
 *         description: 소환사를 찾을 수 없음
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
 *                       example: "소환사를 찾을 수 없습니다"
 *       429:
 *         description: 요청 횟수 초과 (강제 새로고침 쿨타임)
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
 *                       example: "전적 갱신은 85초 후에 다시 시도할 수 있습니다."
 *                     retryAfter:
 *                       type: number
 *                       example: 85
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
 *                       example: "서버에서 오류가 발생했습니다"
 *       503:
 *         description: 서비스 이용 불가 (TFT 정적 데이터 로드 실패)
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
 *                       example: "TFT_DATA_INCOMPLETE"
 *                     message:
 *                       type: string
 *                       example: "TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요."
 */
router.get('/', async (_req: Request<{}, any, any, SummonerQuery>, _res: Response, _next: NextFunction) => {
  try {
    const { region, gameName, tagLine, forceRefresh } = _req.query;
    
    // 입력 검증 개선
    if (!region) throw new ValidationError('지역 정보가 필요합니다', 'region');
    if (!gameName || typeof gameName !== 'string' || gameName.length < 1 || gameName.length > 16) {
      throw new ValidationError('게임 이름은 1-16자의 문자열이어야 합니다', 'gameName');
    }
    if (!tagLine || typeof tagLine !== 'string' || tagLine.length < 1 || tagLine.length > 5) {
      throw new ValidationError('태그라인은 1-5자의 문자열이어야 합니다', 'tagLine');
    }
    
    // XSS 방지를 위한 기본 검증
    const sanitizedGameName = gameName.replace(/[<>\"']/g, '');
    const sanitizedTagLine = tagLine.replace(/[<>\"']/g, '');

    const cacheKey = `summoner:${region}:${sanitizedGameName}#${sanitizedTagLine}`;
    const cooldownKey = `summoner_refresh_cooldown:${region}:${sanitizedGameName}#${sanitizedTagLine}`;

    // 1. 강제 새로고침이 아닐 경우, 캐시에서 데이터 확인
    if (forceRefresh !== 'true') {
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        return sendCachedSuccess(_res, cachedData, { cached: true, cacheKey });
      }
    }

    // 2. 강제 새로고침일 경우, 쿨타임 확인
    if (forceRefresh === 'true') {
      const lastRefreshTime = await cacheManager.get(cooldownKey);
      const currentTime = Date.now();

      if (lastRefreshTime && (currentTime - Number(lastRefreshTime) < REFRESH_COOLDOWN_SECONDS * 1000)) {
        const remainingSeconds = Math.ceil((REFRESH_COOLDOWN_SECONDS * 1000 - (currentTime - Number(lastRefreshTime))) / 1000);
        return sendRateLimit(_res, remainingSeconds, `전적 갱신은 ${remainingSeconds}초 후에 다시 시도할 수 있습니다.`);
      }
    }

    // 3. 캐시가 없거나 강제 새로고침일 경우, Riot API에서 데이터 조회
    const tft = await getTFTDataWithLanguage();
    
    // 디버깅을 위한 상세 로깅
    logger.info('TFT 데이터 검증:', {
      exists: !!tft,
      traitMapSize: tft?.traitMap?.size,
      championsLength: tft?.champions?.length,
      completedItemsLength: tft?.items?.completed?.length,
      nameMapSize: tft?.nameMap?.size
    });
    
    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.completed?.length || !tft.nameMap?.size) {
      logger.error('TFT static 데이터 로드 실패 또는 불완전:', {
        exists: !!tft,
        traitMapSize: tft?.traitMap?.size,
        championsLength: tft?.champions?.length,
        completedItemsLength: tft?.items?.completed?.length,
        nameMapSize: tft?.nameMap?.size
      });
      return sendError(_res, 'TFT_DATA_INCOMPLETE', 'TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요.', 503);
    }

    const account = await getAccountByRiotId(gameName, tagLine, region as Region);
    const summonerInfo = await getSummonerByPuuid(account.puuid, region as Region);
    const leagueEntry = await getLeagueEntriesByPuuid(summonerInfo.puuid, region as Region).catch((err: Error) => {
      logger.error(`ERROR: getLeagueEntriesByPuuid failed:`, err.message);
      return null;
    });

    const riotMatchIds = await getMatchIdsByPUUID(account.puuid, 20, region as Region);
    
    // N+1 쿼리 문제 해결: 배치 처리로 매치 상세 정보 조회
    const matchDetailsBatchResult = await processMatchDetailsBatch(
      riotMatchIds,
      region as Region,
      getMatchDetail
    );
    
    // 배치 처리 결과 로깅
    logBatchStats(matchDetailsBatchResult.stats, '소환사 매치 상세 정보 조회');
    
    // 실패한 매치 ID들 로깅
    if (matchDetailsBatchResult.failed.length > 0) {
      logger.warn(`매치 상세 정보 조회 실패한 항목들:`, {
        failedCount: matchDetailsBatchResult.failed.length,
        totalCount: riotMatchIds.length,
        failedItems: matchDetailsBatchResult.failed.map(f => ({
          matchId: typeof f.item === 'string' ? f.item.substring(0, 10) : f.item,
          error: f.error.message,
          retryCount: f.retryCount
        }))
      });
    }
    
    const rawMatches = matchDetailsBatchResult.success;

    const processedMatches: ProcessedMatch[] = rawMatches.map(match => {
      const me = match?.info?.participants?.find((p: any) => p.puuid === account.puuid);
      if (!me) return null;

      const units: ProcessedUnit[] = me.units.map((u: any) => {
        const ch = tft.champions.find(c => c.apiName?.toLowerCase() === u.character_id?.toLowerCase());
        const processedItems: ProcessedItem[] = (u.itemNames || []).map((n: string) => {
          let foundItem: any = null;
          for (const category in tft.items) {
            if (Array.isArray((tft.items as any)[category])) {
              foundItem = (tft.items as any)[category].find((i: any) => i.apiName?.toLowerCase() === n?.toLowerCase());
              if (foundItem) break;
            }
          }
          return { name: foundItem?.name || n, image_url: foundItem?.icon || null };
        });
        return {
          character_id: u.character_id,
          name: ch?.name || u.character_id,
          image_url: ch?.tileIcon || null,
          tier: u.tier,
          cost: ch?.cost || 0,
          items: processedItems,
        };
      });

      const processedTraits: ProcessedTrait[] = (me.traits || [])
        .map((riotTrait: any) => {
          const currentCount = riotTrait.num_units || riotTrait.tier_current || 0;
          const styleInfo = getTraitStyleInfo(riotTrait.name, currentCount, tft);

          if (!styleInfo || styleInfo.style === 'inactive') {
            return null;
          }
          
          const traitData = tft.traitMap.get(riotTrait.name.toLowerCase());
          const sortedEffects = [...(traitData?.effects || [])].sort((a, b) => a.minUnits - b.minUnits);
          
          let currentThreshold = 0;
          let nextThreshold: number | null = null;

          for (const effect of sortedEffects) {
            if (currentCount >= effect.minUnits) {
              currentThreshold = effect.minUnits;
            } else {
              nextThreshold = effect.minUnits;
              break;
            }
          }

          return {
            name: styleInfo.name,
            apiName: styleInfo.apiName,
            image_url: styleInfo.image_url,
            tier_current: styleInfo.tier_current,
            style: styleInfo.style,
            styleOrder: styleInfo.styleOrder,
            color: '', // 컬러 정보는 필요 시 추가
            currentThreshold: currentThreshold,
            nextThreshold: nextThreshold,
          };
        })
        .filter((t): t is ProcessedTrait => t !== null)
        .sort((a, b) => (b.styleOrder - a.styleOrder) || (b.tier_current - a.tier_current));

      return {
        matchId: match?.metadata?.match_id,
        game_datetime: match?.info?.game_datetime,
        placement: me.placement,
        level: me.level,
        units,
        traits: processedTraits,
      };
    }).filter((m): m is ProcessedMatch => m !== null);

    const payload = { account: { ...account, ...summonerInfo }, league: leagueEntry, matches: processedMatches };
    
    // 4. 새로운 데이터를 캐시에 저장
    await cacheManager.set(cacheKey, payload, CACHE_TTL.SUMMONER_DATA);

    // 5. 강제 새로고침이었다면, 쿨타임 정보 저장
    if (forceRefresh === 'true') {
      await cacheManager.set(cooldownKey, Date.now().toString(), CACHE_TTL.SUMMONER_COOLDOWN);
    }

    return sendCachedSuccess(_res, payload, { cached: false }, '소환사 정보가 성공적으로 조회되었습니다.');
  } catch (_err: any) {
    logger.error('--- [중앙 에러 핸들러] ---');
    return _next(_err);
  }
});

export default router;