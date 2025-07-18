// TTL 상수 정의 (초 단위)
export const CACHE_TTL = {
  // 정적 데이터 (거의 변하지 않음)
  STATIC_DATA: 3600 * 24, // 24시간
  
  // 소환사 정보 (반영구적 캐시 - 전적갱신 버튼 또는 정기 업데이트 시에만 갱신)
  SUMMONER_INFO: 3600 * 24, // 24시간 (반영구적)
  SUMMONER_DATA: 3600 * 24, // 24시간 (반영구적)
  SUMMONER_COOLDOWN: 120, // 2분 (쿨타임 제어용)
  
  // 매치 리스트
  MATCH_LIST: 120, // 2분
  
  // 매치 상세 정보
  MATCH_DETAIL: 3600 * 24 * 7, // 7일 (매치 정보는 변하지 않음)
  
  // 랭킹 정보
  RANKING: 600, // 10분
  
  // 메타 통계 (6시간마다 갱신되는 랭커 데이터 분석 통계)
  META_STATS: 3600 * 6, // 6시간 (MongoDB 통계 갱신 주기와 동일)
  
  // 덱 가이드
  DECK_GUIDE: 3600 * 6, // 6시간
  
  // 티어 리스트
  TIER_LIST: 3600, // 1시간
  
  // 플레이어 통계
  PLAYER_STATS: 600, // 10분
  
  // 캐시 상태
  CACHE_STATUS: 60, // 1분
  
  // Rate Limit 정보
  RATE_LIMIT: 60, // 1분
  
  // 번역 캐시
  TRANSLATION: 3600 * 24, // 24시간
  
  // AI 분석 캐시 (영구 저장 - MongoDB 저장 후 캐시 삭제)
  AI_ANALYSIS: 0, // 영구 저장 (DB 저장 후 캐시 삭제 방식)
  
  // 기본 TTL
  DEFAULT: 300 // 5분
} as const;

// TTL 타입
export type CacheTTLKey = keyof typeof CACHE_TTL;

export function validateTTL(ttl: number | undefined | null): number {
  // ttl이 유효한 숫자가 아니거나 0 이하인 경우 기본값(5분)으로 설정
  if (typeof ttl !== 'number' || ttl <= 0) {
    return CACHE_TTL.DEFAULT;
  }
  // 너무 긴 TTL 방지 (최대 30일)
  const MAX_TTL = 3600 * 24 * 30; 
  if (ttl > MAX_TTL) {
    return MAX_TTL;
  }
  return ttl;
}