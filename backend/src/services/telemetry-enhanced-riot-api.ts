// backend/src/services/telemetry-enhanced-riot-api.ts - 텔레메트리 강화된 Riot API 서비스
import axios, { AxiosResponse } from 'axios';
import { trace } from '@opentelemetry/api';
import { SummonerFlowTracer } from './telemetry/distributedTracing';
import { recordExternalApiCall, updateRiotApiRateLimit } from './telemetry/tftMetrics';
import logger from '../config/logger';
import {
  RiotAccountDTO,
  RiotMatchDTO,
  RiotLeagueEntryDTO,
} from '../types/riot-api';

const tracer = trace.getTracer('tft-meta-analyzer', '1.0.0');

// API 설정
interface ApiConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers: Record<string, string>;
}

const API_CONFIG: ApiConfig = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  headers: {
    'X-Riot-Token': process.env.RIOT_API_KEY || '',
    'User-Agent': 'tft-meta-analyzer/1.0 (telemetry-enhanced)',
  },
};

type Region = 'kr' | 'jp' | 'na' | 'br' | 'la1' | 'la2' | 'euw' | 'eune' | 'tr' | 'ru';
type PlatformRegion = 'asia' | 'americas' | 'europe';

const getPlatformRegion = (regionalRegion: Region): PlatformRegion => {
  switch (regionalRegion.toLowerCase()) {
    case 'kr':
    case 'jp':
      return 'asia';
    case 'na':
    case 'br':
    case 'la1':
    case 'la2':
      return 'americas';
    case 'euw':
    case 'eune':
    case 'tr':
    case 'ru':
      return 'europe';
    default:
      return 'asia';
  }
};

/**
 * 텔레메트리 강화된 Riot API 요청 헬퍼
 */
async function telemetryEnhancedApiRequest<T>(
  url: string,
  region: Region,
  endpoint: string,
  options: Record<string, any> = {}
): Promise<T> {
  const span = tracer.startSpan('riot_api_request', {
    attributes: {
      'tft.api.type': 'riot',
      'tft.api.region': region,
      'tft.api.endpoint': endpoint,
      'tft.api.url': url,
      'http.method': 'GET',
    },
  });

  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 1; attempt <= API_CONFIG.retryAttempts; attempt++) {
    try {
      const response: AxiosResponse<T> = await axios.get(url, {
        ...options,
        timeout: attempt === 1 ? API_CONFIG.timeout : API_CONFIG.timeout * attempt,
        headers: API_CONFIG.headers,
      });

      const duration = Date.now() - startTime;
      
      // 속도 제한 헤더 처리
      const rateLimitHeaders = {
        appRateLimit: response.headers['x-app-rate-limit'],
        appRateLimitCount: response.headers['x-app-rate-limit-count'],
        methodRateLimit: response.headers['x-method-rate-limit'],
        methodRateLimitCount: response.headers['x-method-rate-limit-count'],
      };

      // 성공 메트릭 기록
      recordExternalApiCall('riot', region, true, duration);
      
      // 속도 제한 정보 업데이트
      if (rateLimitHeaders.appRateLimit) {
        const [requests, _timeWindow] = rateLimitHeaders.appRateLimit.split(':');
        const [usedRequests] = rateLimitHeaders.appRateLimitCount?.split(':') || ['0'];
        const remainingRequests = parseInt(requests) - parseInt(usedRequests);
        updateRiotApiRateLimit(region, remainingRequests, remainingRequests);
      }

      span.setAttributes({
        'tft.api.success': true,
        'tft.api.response_time': duration,
        'tft.api.response_size': JSON.stringify(response.data).length,
        'tft.api.status_code': response.status,
        'tft.api.attempt': attempt,
        'tft.api.rate_limit.app': rateLimitHeaders.appRateLimit || 'unknown',
        'tft.api.rate_limit.method': rateLimitHeaders.methodRateLimit || 'unknown',
      });

      span.end();
      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      lastError = error;
      
      // 재시도하지 않을 에러들
      if (error.response?.status === 404 || error.response?.status === 403 || error.response?.status === 401) {
        recordExternalApiCall('riot', region, false, duration);
        span.setAttributes({
          'tft.api.success': false,
          'tft.api.response_time': duration,
          'tft.api.status_code': error.response?.status || 0,
          'tft.api.error_type': 'client_error',
          'tft.api.final_attempt': true,
        });
        span.recordException(error);
        span.end();
        throw error;
      }
      
      // Rate limit 에러 특별 처리
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        updateRiotApiRateLimit(region, 0, 0);
        
        span.setAttributes({
          'tft.api.rate_limit_hit': true,
          'tft.api.retry_after': retryAfter,
        });
        
        logger.warn(`Rate limit 도달 (${region}), ${retryAfter}초 후 재시도`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      // 마지막 시도가 아니면 재시도
      if (attempt < API_CONFIG.retryAttempts) {
        const baseDelay = API_CONFIG.retryDelay;
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000;
        const totalDelay = exponentialDelay + jitter;
        
        span.setAttributes({
          'tft.api.retry_attempt': attempt,
          'tft.api.retry_delay': totalDelay,
        });
        
        logger.warn(`Riot API 요청 실패 (${attempt}/${API_CONFIG.retryAttempts}): ${url} - ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      } else {
        // 최종 실패
        recordExternalApiCall('riot', region, false, duration);
        span.setAttributes({
          'tft.api.success': false,
          'tft.api.response_time': duration,
          'tft.api.status_code': error.response?.status || 0,
          'tft.api.error_type': getErrorType(error),
          'tft.api.final_attempt': true,
        });
      }
    }
  }
  
  span.recordException(lastError);
  span.end();
  throw lastError;
}

/**
 * 텔레메트리 강화된 소환사 조회 (분산 추적 포함)
 */
export async function getAccountByRiotIdWithTracing(
  gameName: string,
  tagLine: string,
  region: Region = 'kr'
): Promise<RiotAccountDTO> {
  const flowTracer = new SummonerFlowTracer(gameName, tagLine, region);
  
  try {
    const apiRegion = getPlatformRegion(region);
    const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    
    const result = await flowTracer.traceRiotApiCall(
      url,
      region,
      async () => await telemetryEnhancedApiRequest<RiotAccountDTO>(url, region, 'getAccountByRiotId')
    );
    
    flowTracer.finish(true);
    return result;
  } catch (error) {
    flowTracer.finish(false, (error as Error).message);
    throw error;
  }
}

/**
 * 텔레메트리 강화된 매치 상세 조회
 */
export async function getMatchDetailWithTracing(
  matchId: string,
  region: Region
): Promise<RiotMatchDTO> {
  const span = tracer.startSpan('get_match_detail_with_tracing', {
    attributes: {
      'tft.match.id': matchId,
      'tft.match.region': region,
    },
  });

  try {
    const apiRegion = getPlatformRegion(region);
    const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
    
    const result = await telemetryEnhancedApiRequest<RiotMatchDTO>(url, region, 'getMatchDetail');
    
    span.setAttributes({
      'tft.match.participants_count': result.info.participants.length,
      'tft.match.game_length': result.info.game_length,
      'tft.match.set_core_name': result.info.tft_set_core_name,
    });
    
    span.end();
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.end();
    throw error;
  }
}

/**
 * 텔레메트리 강화된 매치 ID 목록 조회
 */
export async function getMatchIdsByPUUIDWithTracing(
  puuid: string,
  count: number = 10,
  region: Region
): Promise<string[]> {
  const span = tracer.startSpan('get_match_ids_with_tracing', {
    attributes: {
      'tft.user.puuid': puuid.substring(0, 8) + '...',
      'tft.query.count': count,
      'tft.query.region': region,
    },
  });

  try {
    const apiRegion = getPlatformRegion(region);
    const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=${count}&queue=1100`;
    
    const result = await telemetryEnhancedApiRequest<string[]>(url, region, 'getMatchIdsByPUUID');
    
    span.setAttributes({
      'tft.match.ids_count': result.length,
      'tft.match.ids_requested': count,
    });
    
    span.end();
    return result;
  } catch (error: any) {
    if (error.response?.status === 404) {
      logger.info(`소환사 ${puuid.substring(0, 8)}... 최근 랭크 게임 기록 없음`);
      span.setAttributes({
        'tft.match.no_recent_matches': true,
      });
      span.end();
      return [];
    }
    
    span.recordException(error);
    span.end();
    throw error;
  }
}

/**
 * 텔레메트리 강화된 매치 히스토리 조회 (배치 처리)
 */
export async function getMatchHistoryWithTracing(
  region: Region,
  puuid: string
): Promise<RiotMatchDTO[]> {
  const span = tracer.startSpan('get_match_history_batch', {
    attributes: {
      'tft.user.puuid': puuid.substring(0, 8) + '...',
      'tft.query.region': region,
    },
  });

  try {
    const matchIds = await getMatchIdsByPUUIDWithTracing(puuid, 10, region);
    
    if (!matchIds || matchIds.length === 0) {
      span.setAttributes({
        'tft.match.history_empty': true,
      });
      span.end();
      return [];
    }

    // 병렬 처리로 매치 상세 정보 조회
    const matchDetailsPromises = matchIds.map(matchId => 
      getMatchDetailWithTracing(matchId, region)
    );
    
    const results = await Promise.allSettled(matchDetailsPromises);
    const successfulMatches = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<RiotMatchDTO>).value);

    const failedCount = results.filter(result => result.status === 'rejected').length;
    
    span.setAttributes({
      'tft.match.history_total': matchIds.length,
      'tft.match.history_successful': successfulMatches.length,
      'tft.match.history_failed': failedCount,
      'tft.match.history_success_rate': successfulMatches.length / matchIds.length,
    });
    
    if (failedCount > 0) {
      logger.warn(`매치 히스토리 조회 중 ${failedCount}개 실패`);
    }
    
    span.end();
    return successfulMatches;
  } catch (error) {
    span.recordException(error as Error);
    span.end();
    throw error;
  }
}

/**
 * 텔레메트리 강화된 리그 정보 조회
 */
export async function getLeagueEntriesByPuuidWithTracing(
  puuid: string,
  region: Region
): Promise<RiotLeagueEntryDTO | null> {
  const span = tracer.startSpan('get_league_entries_with_tracing', {
    attributes: {
      'tft.user.puuid': puuid.substring(0, 8) + '...',
      'tft.query.region': region,
    },
  });

  try {
    const url = `https://${region}.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`;
    const response = await telemetryEnhancedApiRequest<RiotLeagueEntryDTO[]>(url, region, 'getLeagueEntriesByPuuid');
    
    if (!Array.isArray(response)) {
      logger.warn('getLeagueEntriesByPuuid: 배열이 아닌 응답 수신:', response);
      span.setAttributes({
        'tft.league.invalid_response': true,
      });
      span.end();
      return null;
    }
    
    const rankedEntry = response.find(entry => entry.queueType === 'RANKED_TFT') || null;
    
    if (rankedEntry) {
      span.setAttributes({
        'tft.league.tier': rankedEntry.tier,
        'tft.league.rank': rankedEntry.rank,
        'tft.league.lp': rankedEntry.leaguePoints,
        'tft.league.wins': rankedEntry.wins,
        'tft.league.losses': rankedEntry.losses,
      });
    } else {
      span.setAttributes({
        'tft.league.unranked': true,
      });
    }
    
    span.end();
    return rankedEntry;
  } catch (error: any) {
    if (error.response?.status === 404) {
      span.setAttributes({
        'tft.league.not_found': true,
      });
      span.end();
      return null;
    }
    
    span.recordException(error);
    span.end();
    throw error;
  }
}

// 헬퍼 함수들
function getErrorType(error: any): string {
  if (error.response?.status === 404) return 'not_found';
  if (error.response?.status === 429) return 'rate_limit';
  if (error.response?.status === 403) return 'forbidden';
  if (error.response?.status === 401) return 'unauthorized';
  if (error.code === 'ENOTFOUND') return 'dns_error';
  if (error.code === 'ECONNREFUSED') return 'connection_refused';
  if (error.code === 'ETIMEDOUT') return 'timeout';
  return 'unknown';
}

logger.info('🔍 텔레메트리 강화된 Riot API 서비스 초기화 완료');