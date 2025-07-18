// routes/match.ts

import express, { Request, Response, NextFunction } from 'express';
import { getMatchHistory, getMatchDetail } from '../services/riotApi';
import { getTFTDataWithLanguage } from '../services/tftData';
import { getAccountsByPuuids } from '../services/riotAccountApi';
import logger from '../config/logger';
import { validatePuuid, validateMatchId, validatePagination } from '../middlewares/validation';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { getTraitStyleInfo } from '../utils/tft-helpers';

const router = express.Router();

// 매치 쿼리 파라미터 인터페이스
interface MatchQueryParams {
  region: string;
  puuid: string;
  page?: string;
  limit?: string;
  placement?: string; // 등수 필터링
  minLevel?: string; // 최소 레벨 필터링
  maxLevel?: string; // 최대 레벨 필터링
  champion?: string; // 특정 챔피언 포함 필터링
  trait?: string; // 특정 특성 포함 필터링
  sortBy?: string; // 정렬 기준 (datetime, placement, level)
  sortOrder?: string; // 정렬 순서 (asc, desc)
}

// PUUID로 매치 기록 리스트 조회 (개선된 버전)
router.get('/', validatePuuid, validatePagination, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const {
      region,
      puuid,
      page = '1',
      limit = '20',
      placement,
      minLevel,
      maxLevel,
      champion,
      trait,
      sortBy = 'datetime',
      sortOrder = 'desc'
    } = _req.query as unknown as MatchQueryParams;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // 최대 100개 제한
    
    const tft = await getTFTDataWithLanguage();
    
    // TFT 데이터 검증
    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.completed?.length || !tft.nameMap?.size) {
      logger.error('TFT static 데이터 로드 실패 또는 불완전 (match.ts)');
      return sendError(_res, 'TFT_DATA_INCOMPLETE', 'TFT static 데이터가 완전하지 않습니다.', 503);
    }
    
    const rawMatches = await getMatchHistory(region as any, puuid);
    
    // 서머너 페이지와 동일한 형식으로 매치 데이터 처리
    const processedMatches: ProcessedMatch[] = rawMatches.map(match => {
      const me = match?.info?.participants?.find((p: any) => p.puuid === puuid);
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
            color: '',
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
        puuid: puuid,
      };
    }).filter((m): m is ProcessedMatch => m !== null);
    
    // 필터링 로직 적용
    let filteredMatches = processedMatches;
    
    // 등수 필터링
    if (placement) {
      const placementNum = parseInt(placement);
      filteredMatches = filteredMatches.filter(match => match.placement === placementNum);
    }
    
    // 레벨 필터링
    if (minLevel) {
      const minLevelNum = parseInt(minLevel);
      filteredMatches = filteredMatches.filter(match => match.level >= minLevelNum);
    }
    
    if (maxLevel) {
      const maxLevelNum = parseInt(maxLevel);
      filteredMatches = filteredMatches.filter(match => match.level <= maxLevelNum);
    }
    
    // 특정 챔피언 포함 필터링
    if (champion) {
      const championName = champion.toLowerCase();
      filteredMatches = filteredMatches.filter(match => 
        match.units.some(unit => 
          unit.character_id?.toLowerCase().includes(championName) || 
          unit.name?.toLowerCase().includes(championName)
        )
      );
    }
    
    // 특정 특성 포함 필터링
    if (trait) {
      const traitName = trait.toLowerCase();
      filteredMatches = filteredMatches.filter(match => 
        match.traits.some(t => 
          t.name?.toLowerCase().includes(traitName) || 
          t.apiName?.toLowerCase().includes(traitName)
        )
      );
    }
    
    // 정렬 로직 적용
    filteredMatches.sort((a, b) => {
      let sortValue = 0;
      
      switch (sortBy) {
        case 'placement':
          sortValue = a.placement - b.placement;
          break;
        case 'level':
          sortValue = a.level - b.level;
          break;
        case 'datetime':
        default:
          sortValue = a.game_datetime - b.game_datetime;
          break;
      }
      
      return sortOrder === 'asc' ? sortValue : -sortValue;
    });
    
    // 페이지네이션 적용
    const totalCount = filteredMatches.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedMatches = filteredMatches.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(totalCount / limitNum);
    
    // 페이지네이션 메타데이터와 함께 응답
    const response = {
      matches: paginatedMatches,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      },
      filters: {
        placement: placement ? parseInt(placement) : undefined,
        minLevel: minLevel ? parseInt(minLevel) : undefined,
        maxLevel: maxLevel ? parseInt(maxLevel) : undefined,
        champion: champion || undefined,
        trait: trait || undefined,
        sortBy: sortBy,
        sortOrder: sortOrder
      }
    };
    
    return sendSuccess(_res, response, '매치 기록이 성공적으로 조회되었습니다.');
  } catch (_err) {
    return _next(_err);
  }
});

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
  puuid: string; // required로 변경 (타입 predicate 오류 해결)
}

router.get('/:matchId', validateMatchId, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { matchId } = _req.params;
    // 미들웨어에서 이미 검증됨

    const tft = await getTFTDataWithLanguage();
    const matchDetail = await getMatchDetail(matchId!, 'kr');

    // 💡 수정: tft.items?.completed?.length (예시)로 데이터를 검사
    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.completed?.length || !tft.nameMap?.size) { // completed 아이템이 존재함을 확인
      logger.error('TFT static 데이터 로드 실패 또는 불완전 (match.js):', tft);
      return sendError(_res, 'TFT_DATA_INCOMPLETE', 'TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요.', 503);
    }
    if (!matchDetail) {
        return sendError(_res, 'MATCH_NOT_FOUND', '매치 상세 정보를 찾을 수 없습니다.', 404);
    }

    const puuids = matchDetail.info.participants.map((p: any) => p.puuid);
    const accounts = await getAccountsByPuuids(puuids);

    const processedParticipants = matchDetail.info.participants.map((p: any) => {
      const units: ProcessedUnit[] = p.units.map((u: any) => {
        const ch = tft.champions.find(c => c.apiName?.toLowerCase() === u.character_id?.toLowerCase());
        if (!ch) {
          logger.warn(`WARN (match.js): 챔피언 ${u.character_id} (매치 ${matchDetail.metadata.match_id.substring(0,8)}...) TFT static 데이터에서 찾을 수 없음.`);
        }
        
        const processedItems: ProcessedItem[] = (u.itemNames || []).map((n: string) => {
          // 💡 수정: tft.items가 객체이므로, 모든 아이템 카테고리 배열을 순회하여 아이템을 찾도록 변경
          let foundItem: any = null;
          // 모든 아이템 카테고리를 순회하며 아이템을 찾습니다.
          for (const category in tft.items) {
              // tft.items[category]가 배열이고, 그 안에 아이템이 있다면
              if (Array.isArray((tft.items as any)[category])) {
                  foundItem = (tft.items as any)[category].find((i: any) => i.apiName?.toLowerCase() === n?.toLowerCase());
                  if (foundItem) break; // 찾았으면 반복 중단
              }
          }

          if (!foundItem) {
              logger.warn(`WARN (match.js): 아이템 ${n} (매치 ${matchDetail.metadata.match_id.substring(0,8)}... 유닛 ${u.character_id}) TFT static 데이터에서 찾을 수 없음.`);
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

      const processedTraits: (ProcessedTrait | null)[] = (p.traits || [])
        .map((riotTrait: any) => {
          const traitData = tft.traitMap.get(riotTrait.name.toLowerCase());
          if (!traitData) return null;

          const currentCount = riotTrait.num_units || riotTrait.tier_current || 0;
          let styleNumber = 0;
          let currentThreshold = 0;
          let nextThreshold: number | null = null;

          const sortedEffects = [...(traitData.effects || [])].sort((a, b) => a.minUnits - b.minUnits);

          for (const effect of sortedEffects) {
            if (currentCount >= effect.minUnits) {
              styleNumber = effect.style;
              currentThreshold = effect.minUnits;
            } else if (nextThreshold === null) {
              nextThreshold = effect.minUnits;
            }
          }

          if (styleNumber === 0) return null;

          // 스타일 매핑 (서머너 매치카드와 동일)
          const STYLE_MAP: Record<number, string> = {
            0: 'none',
            1: 'bronze',
            3: 'silver',
            4: 'chromatic',
            5: 'gold',
            6: 'prismatic'
          };

          const STYLE_ORDER: Record<string, number> = { 
            prismatic: 6, 
            chromatic: 5, 
            gold: 4, 
            silver: 3, 
            bronze: 2, 
            none: 0 
          };

          const PALETTE: Record<string, string> = {
            bronze: '#C67A32',
            silver: '#BFC4CF',
            gold: '#FFD667',
            prismatic: '#CFF1F1',
            chromatic: '#FFA773',
            unique: '#FFA773',
            none: '#374151'
          };

          let activeStyleKey = STYLE_MAP[styleNumber] || 'bronze';

          // 5코스트 개인 시너지 체크 (chromatic)
          const isUniqueChampionTrait = traitData.apiName && (
            traitData.apiName.toLowerCase().includes('uniquetrait') || 
            traitData.apiName.toLowerCase().includes('overlord') ||
            traitData.apiName.toLowerCase().includes('netgod') ||
            traitData.apiName.toLowerCase().includes('virus') ||
            traitData.apiName.toLowerCase().includes('viegouniquetrait')
          );
          
          if (isUniqueChampionTrait && currentCount >= 1) {
            activeStyleKey = 'chromatic';
          }

          // 단일 effect이고 minUnits가 1인 경우 unique 처리
          if (sortedEffects.length === 1 && sortedEffects[0]?.minUnits === 1) {
            activeStyleKey = 'unique';
          }

          const variant = activeStyleKey === 'unique' ? 'chromatic' : activeStyleKey;

          return {
            name: traitData.name,
            apiName: traitData.apiName,
            image_url: traitData.icon,
            icon: traitData.icon, // Trait 컴포넌트에서 필요한 속성 추가
            tier_current: currentCount,
            style: variant,
            styleOrder: STYLE_ORDER[activeStyleKey] || 0,
            color: PALETTE[activeStyleKey] || '#374151',
            currentThreshold: currentThreshold,
            nextThreshold: nextThreshold,
            isActive: true, // 활성화된 특성만 반환하므로 true
          };
        })
        .filter((t: ProcessedTrait | null): t is ProcessedTrait => t !== null)
        .sort((a: ProcessedTrait, b: ProcessedTrait) => (b.styleOrder - a.styleOrder) || (b.tier_current - a.tier_current));
      
      return { ...p, units, traits: processedTraits };
    });

    const responsePayload = {
      ...matchDetail,
      info: {
        ...matchDetail.info,
        participants: processedParticipants,
        accounts: Object.fromEntries(accounts),
      }
    };

    return sendSuccess(_res, responsePayload, '매치 상세 정보가 성공적으로 조회되었습니다.');

  } catch (_err) {
    return _next(_err);
  }
});

export default router;