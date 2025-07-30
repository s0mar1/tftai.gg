/**
 * GraphQL 전용 타입 정의
 * TypeScript 철의 장막 규칙을 준수하며 GraphQL 스키마와 매핑되는 타입들을 정의합니다.
 */

import type { Request, Response } from 'express';
import { DataLoaderManager } from './dataLoaders';
import type { AuthenticatedUser } from '../middlewares/auth';

// 언어 코드 타입
export type Language = 'ko' | 'en' | 'ja' | 'zh';

// 공통 응답 인터페이스
export interface GraphQLResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: GraphQLErrorInfo;
  meta?: GraphQLMeta;
}

export interface GraphQLErrorInfo {
  code: string;
  message: string;
  field?: string;
}

export interface GraphQLMeta {
  timestamp: string;
  processingTime?: number;
  version?: string;
}

// Champions 관련 타입
export interface ChampionData {
  name: string;
  cost: number;
  traits: string[];
  ability?: {
    name: string;
    description: string;
  };
  stats?: {
    health: number;
    mana: number;
    damage: number;
    armor: number;
    magicResist: number;
    attackSpeed: number;
    critChance: number;
  };
}

export interface ChampionsData {
  TFTChampions: Record<string, ChampionData>;
}

export interface ChampionResponse extends GraphQLResponse<ChampionsData> {}

// Tierlist 관련 타입
export interface DeckConfiguration {
  id: string;
  name: string;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  champions: string[];
  traits: TraitInfo[];
  winRate: number;
  playRate: number;
  avgPlacement: number;
  keyUnits: string[];
  items: ItemInfo[];
}

export interface TraitInfo {
  name: string;
  level: number;
  description?: string;
}

export interface ItemInfo {
  name: string;
  champion: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TierlistData {
  decks: DeckConfiguration[];
  lastUpdated: string;
  totalDecks: number;
}

export interface TierlistResponse extends GraphQLResponse<TierlistData> {}

// Summoner 관련 타입
export interface SummonerInfo {
  puuid: string;
  summonerId: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
}

export interface SummonerData {
  summoner: SummonerInfo;
  region: string;
}

export interface SummonerResponse extends GraphQLResponse<SummonerData> {}

// Summoner Integrated 관련 타입
export interface MatchInfo {
  gameId: string;
  gameDateTime: string;
  queueType: string;
  placement: number;
  totalDamageToPlayers: number;
  traits: TraitInfo[];
  units: UnitInfo[];
  companionData?: CompanionInfo;
}

export interface UnitInfo {
  championId: string;
  tier: number;
  items: string[];
}

export interface CompanionInfo {
  skinId: string;
  speciesId: string;
}

export interface LeagueInfo {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface SummonerIntegratedData {
  summoner: SummonerInfo;
  region: string;
  recentMatches: MatchInfo[];
  leagueEntries: LeagueInfo[];
  lastUpdated: string;
}

export interface SummonerIntegratedResponse extends GraphQLResponse<SummonerIntegratedData> {}

// Match Analysis 관련 타입
export interface MatchAnalysisInput {
  matchId: string;
  userPuuid: string;
}

export interface MatchAnalysisResult {
  matchId: string;
  userPuuid: string;
  analysis: {
    placement: number;
    deckComposition: {
      mainCarry: string;
      supportUnits: string[];
      traits: TraitInfo[];
    };
    itemAnalysis: {
      optimal: string[];
      actual: string[];
      effectiveness: number;
    };
    recommendations: Array<{
      category: 'positioning' | 'itemization' | 'economy' | 'leveling';
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    score: {
      overall: number;
      positioning: number;
      itemization: number;
      economy: number;
    };
  };
}

export interface MatchAnalysisResponse extends GraphQLResponse<MatchAnalysisResult> {}

// Subscription 관련 타입
export type EventType = 
  | 'MATCH_ANALYSIS_STARTED'
  | 'MATCH_ANALYSIS_PROGRESS'
  | 'MATCH_ANALYSIS_COMPLETED'
  | 'MATCH_ANALYSIS_FAILED'
  | 'TIERLIST_UPDATE_STARTED'
  | 'TIERLIST_UPDATE_COMPLETED'
  | 'SUMMONER_DATA_UPDATED'
  | 'SYSTEM_STATUS_CHANGED';

export type SystemStatus = 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE' | 'ERROR';

export interface MatchAnalysisProgressEvent {
  matchId: string;
  userPuuid: string;
  eventType: EventType;
  progress: number;
  message: string;
  timestamp: string;
  data?: MatchAnalysisResult;
  error?: GraphQLErrorInfo;
}

export interface TierlistUpdateEvent {
  eventType: EventType;
  message: string;
  timestamp: string;
  totalDecks?: number;
  changedDecks?: number;
  data?: TierlistData;
  error?: GraphQLErrorInfo;
}

export interface SummonerDataUpdateEvent {
  summonerName: string;
  region: string;
  eventType: EventType;
  message: string;
  timestamp: string;
  data?: SummonerData;
  error?: GraphQLErrorInfo;
}

export interface SystemStatusEvent {
  eventType: EventType;
  status: SystemStatus;
  message: string;
  timestamp: string;
  services?: {
    database: string;
    cache: string;
    scheduler: string;
    aiService: string;
  };
}

// Context 타입 (Apollo Server에서 사용)
export interface GraphQLContext {
  // HTTP 요청/응답 객체
  req: Request;
  res: Response | null; // WebSocket에서는 null 가능
  
  // DataLoader를 통한 N+1 쿼리 문제 해결
  dataLoaders: DataLoaderManager;
  
  // 캐싱 및 성능 관련 메타데이터
  requestId: string;
  startTime: number;
  
  // 인증된 사용자 정보 (JWT 토큰에서 추출)
  user?: AuthenticatedUser;
}

// Resolver 타입
export interface Resolvers {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
  Subscription: SubscriptionResolvers;
}

export interface QueryResolvers {
  champions: (parent: any, args: ChampionsArgs, context: GraphQLContext) => Promise<ChampionResponse>;
  tierlist: (parent: any, args: TierlistArgs, context: GraphQLContext) => Promise<TierlistResponse>;
  summoner: (parent: any, args: SummonerArgs, context: GraphQLContext) => Promise<SummonerResponse>;
  summonerIntegrated: (parent: any, args: SummonerIntegratedArgs, context: GraphQLContext) => Promise<SummonerIntegratedResponse>;
}

export interface MutationResolvers {
  analyzeMatch: (parent: any, args: AnalyzeMatchArgs, context: GraphQLContext) => Promise<MatchAnalysisResponse>;
}

export interface SubscriptionResolvers {
  matchAnalysisUpdated: {
    subscribe: (parent: any, args: MatchAnalysisSubscriptionArgs, context: GraphQLContext) => AsyncIterator<MatchAnalysisProgressEvent>;
    resolve?: (payload: MatchAnalysisProgressEvent) => MatchAnalysisProgressEvent;
  };
  tierlistUpdated: {
    subscribe: (parent: any, args: {}, context: GraphQLContext) => AsyncIterator<TierlistUpdateEvent>;
    resolve?: (payload: TierlistUpdateEvent) => TierlistUpdateEvent;
  };
  summonerDataUpdated: {
    subscribe: (parent: any, args: SummonerDataSubscriptionArgs, context: GraphQLContext) => AsyncIterator<SummonerDataUpdateEvent>;
    resolve?: (payload: SummonerDataUpdateEvent) => SummonerDataUpdateEvent;
  };
  systemStatus: {
    subscribe: (parent: any, args: {}, context: GraphQLContext) => AsyncIterator<SystemStatusEvent>;
    resolve?: (payload: SystemStatusEvent) => SystemStatusEvent;
  };
}

// Arguments 타입
export interface ChampionsArgs {
  language?: Language;
}

export interface TierlistArgs {
  language?: Language;
}

export interface SummonerArgs {
  name: string;
  region?: string;
}

export interface SummonerIntegratedArgs {
  name: string;
  region?: string;
  matchCount?: number;
}

export interface AnalyzeMatchArgs {
  input: MatchAnalysisInput;
}

// Subscription Arguments 타입
export interface MatchAnalysisSubscriptionArgs {
  matchId?: string;
  userPuuid?: string;
}

export interface SummonerDataSubscriptionArgs {
  summonerName?: string;
  region?: string;
}

// Express를 위한 타입 확장 (이미 있을 수 있지만 명시적으로 정의)
declare global {
  namespace Express {
    interface Request {
      // GraphQL에서 사용할 추가 프로퍼티가 있다면 여기에 정의
    }
  }
}