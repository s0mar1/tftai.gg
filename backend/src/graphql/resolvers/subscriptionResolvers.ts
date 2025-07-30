/**
 * GraphQL Subscription 리졸버
 * 실시간 구독 쿼리를 처리합니다.
 */

import { withFilter } from 'graphql-subscriptions';
import logger from '../../config/logger';
import { pubsub, SUBSCRIPTION_CHANNELS } from '../pubsub';

// 타입 import
import type { 
  SubscriptionResolvers,
  MatchAnalysisSubscriptionArgs,
  SummonerDataSubscriptionArgs,
  GraphQLContext,
  MatchAnalysisProgressEvent,
  TierlistUpdateEvent,
  SummonerDataUpdateEvent,
  SystemStatusEvent
} from '../types';

export const subscriptionResolvers: SubscriptionResolvers = {
  /**
   * 매치 분석 진행상황 구독
   */
  matchAnalysisUpdated: {
    subscribe: withFilter(
      () => {
        logger.info('🔄 [Subscription] 매치 분석 구독 시작');
        return pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.MATCH_ANALYSIS_UPDATED]);
      },
      (payload: { matchAnalysisUpdated: MatchAnalysisProgressEvent }, variables: MatchAnalysisSubscriptionArgs) => {
        const event = payload.matchAnalysisUpdated;
        
        // 필터링 로직: matchId나 userPuuid가 지정된 경우 해당 항목만 필터링
        if (variables.matchId && event.matchId !== variables.matchId) {
          return false;
        }
        
        if (variables.userPuuid && event.userPuuid !== variables.userPuuid) {
          return false;
        }
        
        logger.debug('✅ [Subscription] 매치 분석 이벤트 전송', {
          matchId: event.matchId,
          eventType: event.eventType,
          progress: event.progress
        });
        
        return true;
      }
    )
  },

  /**
   * 티어리스트 업데이트 구독
   */
  tierlistUpdated: {
    subscribe: () => {
      logger.info('🔄 [Subscription] 티어리스트 업데이트 구독 시작');
      return pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.TIERLIST_UPDATED]);
    }
  },

  /**
   * 소환사 데이터 업데이트 구독
   */
  summonerDataUpdated: {
    subscribe: withFilter(
      () => {
        logger.info('🔄 [Subscription] 소환사 데이터 업데이트 구독 시작');
        return pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.SUMMONER_DATA_UPDATED]);
      },
      (payload: { summonerDataUpdated: SummonerDataUpdateEvent }, variables: SummonerDataSubscriptionArgs) => {
        const event = payload.summonerDataUpdated;
        
        // 필터링 로직: summonerName이나 region이 지정된 경우 해당 항목만 필터링
        if (variables.summonerName && event.summonerName !== variables.summonerName) {
          return false;
        }
        
        if (variables.region && event.region !== variables.region) {
          return false;
        }
        
        logger.debug('✅ [Subscription] 소환사 데이터 업데이트 이벤트 전송', {
          summonerName: event.summonerName,
          region: event.region,
          eventType: event.eventType
        });
        
        return true;
      }
    )
  },

  /**
   * 시스템 상태 변경 구독
   */
  systemStatus: {
    subscribe: () => {
      logger.info('🔄 [Subscription] 시스템 상태 변경 구독 시작');
      return pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.SYSTEM_STATUS]);
    }
  }
};

/**
 * 구독 연결 관리 유틸리티 함수들
 */

// 현재 활성 구독 수 추적 (간단한 메모리 카운터)
let activeSubscriptions = {
  matchAnalysis: 0,
  tierlist: 0,
  summonerData: 0,
  systemStatus: 0
};

export function incrementSubscriptionCount(type: keyof typeof activeSubscriptions): void {
  activeSubscriptions[type]++;
  logger.info(`📈 [Subscription] ${type} 구독 수 증가: ${activeSubscriptions[type]}`);
}

export function decrementSubscriptionCount(type: keyof typeof activeSubscriptions): void {
  if (activeSubscriptions[type] > 0) {
    activeSubscriptions[type]--;
  }
  logger.info(`📉 [Subscription] ${type} 구독 수 감소: ${activeSubscriptions[type]}`);
}

export function getActiveSubscriptionCounts(): typeof activeSubscriptions {
  return { ...activeSubscriptions };
}

export function logSubscriptionStats(): void {
  const total = Object.values(activeSubscriptions).reduce((sum, count) => sum + count, 0);
  logger.info('📊 [Subscription] 현재 활성 구독 통계:', {
    ...activeSubscriptions,
    total
  });
}