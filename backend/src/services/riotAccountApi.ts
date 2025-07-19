import { getAccountByPuuid as getAccountByPuuidFromRiotApi } from './riotApi';
import logger from '../config/logger';
import { RiotAccountDTO } from '../types/riot-api';

type Region = 'kr' | 'jp' | 'na' | 'br' | 'la1' | 'la2' | 'euw' | 'eune' | 'tr' | 'ru';

/**
 * PUUID 하나로 계정 정보를 가져오는 내부 헬퍼 함수
 * @param {string} puuid 
 * @returns {Promise<object|null>} 계정 정보 또는 실패 시 null
 */
const getAccountByPuuid = async (puuid: string): Promise<RiotAccountDTO | null> => {
  try {
    const account = await getAccountByPuuidFromRiotApi(puuid, 'kr' as Region); // riotApi.js의 getAccountByPuuid는 region 인자를 받음
    return account;
  } catch (_error: any) {
    // 404 (찾을 수 없음) 등 에러 발생 시 해당 요청은 실패 처리하고 null 반환
    logger.error(`[API Error] PUUID '${puuid}'로 계정 정보를 가져오는 데 실패했습니다: ${_error.message}`);
    return null;
  }
};

/**
 * 여러 개의 PUUID 배열을 받아, 각 계정 정보를 Map 형태로 반환하는 함수
 * @param {string[]} puuids 
 * @returns {Promise<Map<string, object>>} PUUID를 키로, 계정 정보를 값으로 갖는 Map
 */
export const getAccountsByPuuids = async (puuids: string[]): Promise<Map<string, RiotAccountDTO>> => {
  // Promise.all을 사용해 여러 개의 API 요청을 병렬로 처리
  const accountPromises = puuids.map(puuid => getAccountByPuuid(puuid));
  const results = await Promise.all(accountPromises);

  const accountsMap = new Map<string, RiotAccountDTO>();
  results.forEach((account, index) => {
    // 성공적으로 가져온 계정 정보만 Map에 추가
    if (account) {
      const puuid = puuids[index];
      if (puuid) {
        accountsMap.set(puuid, account);
      }
    }
  });

  return accountsMap;
};