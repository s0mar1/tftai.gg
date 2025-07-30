/**
 * 실시간 이벤트 서비스
 * 기존 API와 GraphQL Subscriptions을 통합합니다.
 */

import logger from '../config/logger';
import {
  publishMatchAnalysisUpdate,
  publishTierlistUpdate,
  publishSummonerDataUpdate,
  publishSystemStatusUpdate,
  createMatchAnalysisStartedEvent,
  createMatchAnalysisProgressEvent,
  createMatchAnalysisCompletedEvent,
  createTierlistUpdateStartedEvent,
  createTierlistUpdateCompletedEvent,
  createSummonerDataUpdatedEvent,
  createSystemStatusEvent
} from '../graphql/pubsub';

import type {
  MatchAnalysisResult,
  TierlistData,
  SummonerData,
  SystemStatus
} from '../graphql/types';

/**
 * 매치 분석 이벤트 발행 서비스
 */
export class MatchAnalysisEventService {
  static publishStarted(matchId: string, userPuuid: string): void {
    const event = createMatchAnalysisStartedEvent(matchId, userPuuid);
    publishMatchAnalysisUpdate(event);
  }

  static publishProgress(matchId: string, userPuuid: string, progress: number, message: string): void {
    const event = createMatchAnalysisProgressEvent(matchId, userPuuid, progress, message);
    publishMatchAnalysisUpdate(event);
  }

  static publishCompleted(matchId: string, userPuuid: string, analysisResult: MatchAnalysisResult): void {
    const event = createMatchAnalysisCompletedEvent(matchId, userPuuid, analysisResult);
    publishMatchAnalysisUpdate(event);
  }

  static publishFailed(matchId: string, userPuuid: string, error: string): void {
    const event = {
      matchId,
      userPuuid,
      eventType: 'MATCH_ANALYSIS_FAILED' as const,
      progress: 0,
      message: '매치 분석이 실패했습니다.',
      timestamp: new Date().toISOString(),
      error: {
        code: 'ANALYSIS_FAILED',
        message: error
      }
    };
    publishMatchAnalysisUpdate(event);
  }
}

/**
 * 티어리스트 업데이트 이벤트 발행 서비스
 */
export class TierlistUpdateEventService {
  static publishStarted(): void {
    const event = createTierlistUpdateStartedEvent();
    publishTierlistUpdate(event);
  }

  static publishCompleted(totalDecks: number, changedDecks: number, data: TierlistData): void {
    const event = createTierlistUpdateCompletedEvent(totalDecks, changedDecks, data);
    publishTierlistUpdate(event);
  }

  static publishFailed(error: string): void {
    const event = {
      eventType: 'TIERLIST_UPDATE_STARTED' as const,
      message: `티어리스트 업데이트가 실패했습니다: ${error}`,
      timestamp: new Date().toISOString(),
      error: {
        code: 'TIERLIST_UPDATE_FAILED',
        message: error
      }
    };
    publishTierlistUpdate(event);
  }
}

/**
 * 소환사 데이터 업데이트 이벤트 발행 서비스
 */
export class SummonerDataEventService {
  static publishUpdated(summonerName: string, region: string, data: SummonerData): void {
    const event = createSummonerDataUpdatedEvent(summonerName, region, data);
    publishSummonerDataUpdate(event);
  }

  static publishFailed(summonerName: string, region: string, error: string): void {
    const event = {
      summonerName,
      region,
      eventType: 'SUMMONER_DATA_UPDATED' as const,
      message: `소환사 데이터 업데이트가 실패했습니다: ${error}`,
      timestamp: new Date().toISOString(),
      error: {
        code: 'SUMMONER_UPDATE_FAILED',
        message: error
      }
    };
    publishSummonerDataUpdate(event);
  }
}

/**
 * 시스템 상태 이벤트 발행 서비스
 */
export class SystemStatusEventService {
  static publishHealthy(message: string = '모든 시스템이 정상 작동 중입니다'): void {
    const event = createSystemStatusEvent('HEALTHY', message, {
      database: 'connected',
      cache: 'active',
      scheduler: 'running',
      aiService: 'available'
    });
    publishSystemStatusUpdate(event);
  }

  static publishDegraded(message: string, services?: any): void {
    const event = createSystemStatusEvent('DEGRADED', message, services);
    publishSystemStatusUpdate(event);
  }

  static publishMaintenance(message: string): void {
    const event = createSystemStatusEvent('MAINTENANCE', message);
    publishSystemStatusUpdate(event);
  }

  static publishError(message: string, services?: any): void {
    const event = createSystemStatusEvent('ERROR', message, services);
    publishSystemStatusUpdate(event);
  }
}

/**
 * 통합 이벤트 서비스 - 기존 코드에서 쉽게 사용할 수 있는 헬퍼 함수들
 */
export class RealtimeEventService {
  // 매치 분석 관련
  static matchAnalysisStarted = MatchAnalysisEventService.publishStarted;
  static matchAnalysisProgress = MatchAnalysisEventService.publishProgress;
  static matchAnalysisCompleted = MatchAnalysisEventService.publishCompleted;
  static matchAnalysisFailed = MatchAnalysisEventService.publishFailed;

  // 티어리스트 관련
  static tierlistUpdateStarted = TierlistUpdateEventService.publishStarted;
  static tierlistUpdateCompleted = TierlistUpdateEventService.publishCompleted;
  static tierlistUpdateFailed = TierlistUpdateEventService.publishFailed;

  // 소환사 데이터 관련
  static summonerDataUpdated = SummonerDataEventService.publishUpdated;
  static summonerDataFailed = SummonerDataEventService.publishFailed;

  // 시스템 상태 관련
  static systemHealthy = SystemStatusEventService.publishHealthy;
  static systemDegraded = SystemStatusEventService.publishDegraded;
  static systemMaintenance = SystemStatusEventService.publishMaintenance;
  static systemError = SystemStatusEventService.publishError;

  /**
   * 서버 시작 시 시스템 상태 알림
   */
  static notifyServerStarted(): void {
    logger.info('📡 [Realtime Events] 서버 시작 이벤트 발행');
    this.systemHealthy('TFT Meta Analyzer 서버가 시작되었습니다');
  }

  /**
   * 데이터 수집 시작 알림
   */
  static notifyDataCollectionStarted(): void {
    logger.info('📡 [Realtime Events] 데이터 수집 시작 이벤트 발행');
    this.systemHealthy('정기 데이터 수집 작업이 시작되었습니다');
  }

  /**
   * 데이터 수집 완료 알림
   */
  static notifyDataCollectionCompleted(): void {
    logger.info('📡 [Realtime Events] 데이터 수집 완료 이벤트 발행');
    this.systemHealthy('정기 데이터 수집 작업이 완료되었습니다');
  }
}

export default RealtimeEventService;