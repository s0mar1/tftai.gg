/**
 * GraphQL PubSub 시스템
 * 실시간 구독을 위한 발행-구독 시스템을 관리합니다.
 */

import { PubSub } from 'graphql-subscriptions';
import logger from '../config/logger';
import type {
  MatchAnalysisProgressEvent,
  TierlistUpdateEvent,
  SummonerDataUpdateEvent,
  SystemStatusEvent,
  EventType,
  SystemStatus
} from './types';

// PubSub 인스턴스 생성
export const pubsub = new PubSub();

// 구독 채널 이름 상수
export const SUBSCRIPTION_CHANNELS = {
  MATCH_ANALYSIS_UPDATED: 'MATCH_ANALYSIS_UPDATED',
  TIERLIST_UPDATED: 'TIERLIST_UPDATED',
  SUMMONER_DATA_UPDATED: 'SUMMONER_DATA_UPDATED',
  SYSTEM_STATUS: 'SYSTEM_STATUS'
} as const;

/**
 * 매치 분석 진행상황 이벤트 발행
 */
export function publishMatchAnalysisUpdate(event: MatchAnalysisProgressEvent): void {
  try {
    logger.info(`📡 [PubSub] 매치 분석 이벤트 발행: ${event.eventType}`, {
      matchId: event.matchId,
      progress: event.progress,
      userPuuid: event.userPuuid
    });
    
    pubsub.publish(SUBSCRIPTION_CHANNELS.MATCH_ANALYSIS_UPDATED, {
      matchAnalysisUpdated: event
    });
  } catch (error: any) {
    logger.error('❌ [PubSub] 매치 분석 이벤트 발행 실패:', error);
  }
}

/**
 * 티어리스트 업데이트 이벤트 발행
 */
export function publishTierlistUpdate(event: TierlistUpdateEvent): void {
  try {
    logger.info(`📡 [PubSub] 티어리스트 업데이트 이벤트 발행: ${event.eventType}`, {
      totalDecks: event.totalDecks,
      changedDecks: event.changedDecks
    });
    
    pubsub.publish(SUBSCRIPTION_CHANNELS.TIERLIST_UPDATED, {
      tierlistUpdated: event
    });
  } catch (error: any) {
    logger.error('❌ [PubSub] 티어리스트 업데이트 이벤트 발행 실패:', error);
  }
}

/**
 * 소환사 데이터 업데이트 이벤트 발행
 */
export function publishSummonerDataUpdate(event: SummonerDataUpdateEvent): void {
  try {
    logger.info(`📡 [PubSub] 소환사 데이터 업데이트 이벤트 발행: ${event.eventType}`, {
      summonerName: event.summonerName,
      region: event.region
    });
    
    pubsub.publish(SUBSCRIPTION_CHANNELS.SUMMONER_DATA_UPDATED, {
      summonerDataUpdated: event
    });
  } catch (error: any) {
    logger.error('❌ [PubSub] 소환사 데이터 업데이트 이벤트 발행 실패:', error);
  }
}

/**
 * 시스템 상태 변경 이벤트 발행
 */
export function publishSystemStatusUpdate(event: SystemStatusEvent): void {
  try {
    logger.info(`📡 [PubSub] 시스템 상태 변경 이벤트 발행: ${event.status}`, {
      eventType: event.eventType,
      services: event.services
    });
    
    pubsub.publish(SUBSCRIPTION_CHANNELS.SYSTEM_STATUS, {
      systemStatus: event
    });
  } catch (error: any) {
    logger.error('❌ [PubSub] 시스템 상태 변경 이벤트 발행 실패:', error);
  }
}

/**
 * 편의 함수들 - 자주 사용되는 이벤트 생성
 */

export function createMatchAnalysisStartedEvent(matchId: string, userPuuid: string): MatchAnalysisProgressEvent {
  return {
    matchId,
    userPuuid,
    eventType: 'MATCH_ANALYSIS_STARTED',
    progress: 0,
    message: '매치 분석을 시작합니다...',
    timestamp: new Date().toISOString()
  };
}

export function createMatchAnalysisProgressEvent(
  matchId: string, 
  userPuuid: string, 
  progress: number, 
  message: string
): MatchAnalysisProgressEvent {
  return {
    matchId,
    userPuuid,
    eventType: 'MATCH_ANALYSIS_PROGRESS',
    progress,
    message,
    timestamp: new Date().toISOString()
  };
}

export function createMatchAnalysisCompletedEvent(
  matchId: string, 
  userPuuid: string, 
  data: any
): MatchAnalysisProgressEvent {
  return {
    matchId,
    userPuuid,
    eventType: 'MATCH_ANALYSIS_COMPLETED',
    progress: 100,
    message: '매치 분석이 완료되었습니다.',
    timestamp: new Date().toISOString(),
    data
  };
}

export function createTierlistUpdateStartedEvent(): TierlistUpdateEvent {
  return {
    eventType: 'TIERLIST_UPDATE_STARTED',
    message: '티어리스트 업데이트를 시작합니다...',
    timestamp: new Date().toISOString()
  };
}

export function createTierlistUpdateCompletedEvent(
  totalDecks: number, 
  changedDecks: number, 
  data: any
): TierlistUpdateEvent {
  return {
    eventType: 'TIERLIST_UPDATE_COMPLETED',
    message: `티어리스트 업데이트가 완료되었습니다. (${changedDecks}개 덱 변경됨)`,
    timestamp: new Date().toISOString(),
    totalDecks,
    changedDecks,
    data
  };
}

export function createSummonerDataUpdatedEvent(
  summonerName: string, 
  region: string, 
  data: any
): SummonerDataUpdateEvent {
  return {
    summonerName,
    region,
    eventType: 'SUMMONER_DATA_UPDATED',
    message: `${summonerName} 소환사 데이터가 업데이트되었습니다.`,
    timestamp: new Date().toISOString(),
    data
  };
}

export function createSystemStatusEvent(
  status: SystemStatus, 
  message: string, 
  services?: any
): SystemStatusEvent {
  return {
    eventType: 'SYSTEM_STATUS_CHANGED',
    status,
    message,
    timestamp: new Date().toISOString(),
    services
  };
}

// PubSub 상태 모니터링
export function logPubSubStats(): void {
  logger.info('📊 [PubSub] 구독 상태 정보:', {
    channels: Object.values(SUBSCRIPTION_CHANNELS),
    // 추가적인 상태 정보가 필요하면 여기에 추가
  });
}