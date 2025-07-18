// src/services/constants.ts

export const REGION_HOSTS = {
  // TFT 계정 조회용 (이름+태그 → puuid)
  TFT_ACCOUNT: 'asia.api.riotgames.com',

  // TFT 매치 조회용 (매치 ID 목록, 상세 매치)
  TFT_MATCH: 'asia.api.riotgames.com',

  // (기존 LoL 전적 조회라면) 필요하다면 여기에 추가 가능
  // LOL: 'kr.api.riotgames.com',
} as const;

export const TFT_RANKED_QUEUE_ID = 1100; // TFT 랭크 게임의 고유 ID
export const DEFAULT_MATCH_COUNT = 10; // 기본 매치 조회 개수

export const DEFAULT_REGION = 'kr'; // 기본 지역 코드
export const MATCH_COLLECTOR_MATCH_COUNT = 5; // 매치 수집 시 가져올 매치 개수
export const TOP_RANKER_COUNT = 50; // 랭커 수집 시 가져올 랭커 수
export const MATCH_DETAIL_PROCESS_LIMIT = 50; // 매치 상세 정보 처리 개수

export const PARTICIPANTS_PER_MATCH = 8; // 한 매치당 참가자 수