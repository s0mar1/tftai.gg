import axios, { AxiosInstance, AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import { TFT_RANKED_QUEUE_ID } from './constants';
import logger from '../config/logger';
import {
  RiotAccountDTO,
  RiotMatchDTO,
  RiotSummonerDTO,
  RiotLeagueEntryDTO,
  RiotChallengerLeagueDTO
} from '../types/riot-api';

dotenv.config();

// API 요청 설정 (타임아웃 및 에러 처리 개선)
interface ApiConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers: Record<string, string>;
}

const API_CONFIG: ApiConfig = {
  timeout: 10000, // 10초 타임아웃
  retryAttempts: 3,
  retryDelay: 1000, // 기본 지연 시간 (지수 백오프에서 사용)
  headers: {
    'X-Riot-Token': process.env.RIOT_API_KEY || '',
    'User-Agent': 'tft-meta-analyzer/1.0'
  }
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
      return 'asia'; // Default or throw error
  }
};

const RIOT_API_KEY = process.env.RIOT_API_KEY;

if (!RIOT_API_KEY) {
  throw new Error('Riot API key not found in .env file');
}

// 연결 풀 및 요청 최적화를 위한 Axios 인스턴스 설정
const optimizedAxios = axios.create({
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
  // HTTP 연결 풀 설정
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000
  })
});

// 요청 큐 관리
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly maxConcurrent = 5;
  private activeRequests = 0;

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (_error) {
          reject(_error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.activeRequests >= this.maxConcurrent) return;
    
    this.processing = true;
    
    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (request) {
        this.activeRequests++;
        request().finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
      }
    }
    
    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

// 지수 백오프를 적용한 재시도 로직 포함 API 요청 헬퍼 (최적화됨)
const apiRequestWithRetry = async <T>(url: string, options: Record<string, any> = {}): Promise<T> => {
  return requestQueue.add(async () => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= API_CONFIG.retryAttempts; attempt++) {
      try {
        const response: AxiosResponse<T> = await optimizedAxios.get(url, {
          ...options,
          // 요청별 타임아웃 설정
          timeout: attempt === 1 ? API_CONFIG.timeout : API_CONFIG.timeout * attempt
        });
        return response.data;
      } catch (_error: any) {
        lastError = _error;
        
        // 재시도하지 않을 에러들
        if (_error.response?.status === 404 || _error.response?.status === 403 || _error.response?.status === 401) {
          throw _error;
        }
        
        // Rate limit 에러 처리
        if (_error.response?.status === 429) {
          const retryAfter = _error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // 기본 1분
          logger.warn(`Rate limit 도달, ${delay}ms 후 재시도`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 마지막 시도가 아니면 지수 백오프로 재시도
        if (attempt < API_CONFIG.retryAttempts) {
          // 지수 백오프: 기본 지연 * 2^(attempt-1) + 랜덤 지터
          const baseDelay = API_CONFIG.retryDelay;
          const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 1000; // 0-1초 랜덤 지터
          const totalDelay = exponentialDelay + jitter;
          
          logger.warn(`API 요청 실패 (${attempt}/${API_CONFIG.retryAttempts}): ${url} - ${_error.message}`, {
            statusCode: _error.response?.status,
            nextRetryIn: `${Math.round(totalDelay)}ms`
          });
          
          await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
      }
    }
    
    throw lastError;
  });
};

export const api: AxiosInstance = axios.create({
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers
});

export const getAccountByRiotId = async (
  gameName: string, 
  tagLine: string, 
  region: Region = 'kr'
): Promise<RiotAccountDTO> => {
  const apiRegion = getPlatformRegion(region);
  const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return await apiRequestWithRetry<RiotAccountDTO>(url);
};

export const getMatchIdsByPUUID = async (
  puuid: string, 
  count: number = 10, 
  region: Region
): Promise<string[]> => {
  const apiRegion = getPlatformRegion(region);
  const queueId = TFT_RANKED_QUEUE_ID;
  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=${count}&queue=${queueId}`;
  
  try {
    return await apiRequestWithRetry<string[]>(url);
  } catch (_error: any) {
    if (_error.response && _error.response.status === 404) {
      logger.info(`> 정보: ${puuid.substring(0,8)}... 님은 최근 랭크 게임 기록이 없습니다. 건너뜁니다.`);
      return [];
    }
    throw _error;
  }
};

export const getMatchDetail = async (matchId: string, region: Region): Promise<RiotMatchDTO> => {
  const apiRegion = getPlatformRegion(region);
  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
  
  return await apiRequestWithRetry<RiotMatchDTO>(url);
};

export const getMatchHistory = async (region: Region, puuid: string): Promise<RiotMatchDTO[]> => {
  const matchIds = await getMatchIdsByPUUID(puuid, 10, region);
  if (!matchIds || matchIds.length === 0) {
    return [];
  }

  const matchDetailsPromises = matchIds.map(matchId => getMatchDetail(matchId, region));
  
  const results = await Promise.allSettled(matchDetailsPromises);

  const successfulMatches = results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<RiotMatchDTO>).value);

  return successfulMatches;
};

export const getChallengerLeague = async (region: Region = 'kr'): Promise<RiotChallengerLeagueDTO> => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/challenger`;
  
  
  return await apiRequestWithRetry<RiotChallengerLeagueDTO>(url);
};

export const getGrandmasterLeague = async (region: Region = 'kr'): Promise<RiotChallengerLeagueDTO> => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/grandmaster`;
  
  const response = await api.get(url);
  return response.data;
};

export const getMasterLeague = async (region: Region = 'kr'): Promise<RiotChallengerLeagueDTO> => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/master`;
  
  const response = await api.get(url);
  return response.data;
};

export const getAccountByPuuid = async (puuid: string, region: Region): Promise<RiotAccountDTO> => {
  const apiRegion = getPlatformRegion(region);
  const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
  
  const response = await api.get(url);
  return response.data;
};

export const getSummonerByPuuid = async (puuid: string, region: Region): Promise<RiotSummonerDTO> => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`;
  
  try {
    const response = await api.get(url);
    const data = response.data;
    
    // 응답 데이터 검증
    if (!data || typeof data !== 'object') {
      logger.error(`[Riot API Error] getSummonerByPuuid: Invalid response data for PUUID ${puuid.substring(0, 8)}...`);
      throw new Error('Invalid summoner data received from Riot API');
    }
    
    // 필수 필드 검증 및 기본값 제공
    const validatedData: RiotSummonerDTO = {
      ...data,
      id: data.id || '',
      accountId: data.accountId || '',
      puuid: data.puuid || puuid,
      name: data.name || '',
      profileIconId: data.profileIconId || 0,
      revisionDate: data.revisionDate || Date.now(),
      summonerLevel: data.summonerLevel || 1
    };
    
    return validatedData;
  } catch (error: any) {
    if (error.response) {
      logger.error(`[Riot API Error] getSummonerByPuuid Status: ${error.response.status}, PUUID: ${puuid.substring(0, 8)}...`);
      if (error.response.status === 404) {
        throw new Error('Summoner not found');
      }
    } else {
      logger.error(`[Riot API Error] getSummonerByPuuid Network Error:`, error.message);
    }
    throw error;
  }
};

export const getLeagueEntriesByPuuid = async (
  puuid: string, 
  region: Region
): Promise<RiotLeagueEntryDTO | null> => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`;
  try {
    const response = await api.get(url);
    if (!Array.isArray(response.data)) {
      logger.warn(`WARN: getLeagueEntriesByPuuid expected array, but received:`, response.data);
      return null;
    }
    return response.data.find((entry: RiotLeagueEntryDTO) => entry.queueType === 'RANKED_TFT') || null;
  } catch (_error: any) {
    if (_error.response) {
      logger.error(`[Riot API Error] getLeagueEntriesByPuuid Status: ${_error.response.status}, Data:`, _error.response.data);
      if (_error.response.status === 404) {
        return null;
      }
    } else {
      logger.error(`[Riot API Error] getLeagueEntriesByPuuid Network Error:`, _error.message);
    }
    throw _error;
  }
};