// 공통 타입 정의

export interface Champion {
  id: string;
  name: string;
  cost: number;
  traits: string[];
  icon: string;
}

export interface Item {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category?: string;
  unique?: boolean;
  from?: string[];
  effects?: Record<string, any>;
}

export interface Trait {
  id: string;
  name: string;
  desc: string;
  effects: TraitEffect[];
  icon: string;
}

export interface TraitEffect {
  minUnits: number;
  maxUnits?: number;
  style: number;
  variables: Record<string, any>;
}

export interface Augment {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: number;
}

export interface Unit {
  character_id: string;
  tier: number;
  items: string[];
  itemNames?: string[];
  chosen?: string;
}

export interface DeckComposition {
  units: Unit[];
  traits: ActiveTrait[];
  augments: string[];
  variation?: string;
}

export interface ActiveTrait {
  name: string;
  num_units: number;
  tier_current: number;
  tier_total: number;
  style: number;
}

export interface MatchData {
  matchId: string;
  gameDateTime: number;
  gameDuration: number;
  setNumber: number;
  participants: ParticipantData[];
}

export interface ParticipantData {
  puuid: string;
  placement: number;
  level: number;
  goldLeft: number;
  lastRound: number;
  timeEliminated: number;
  totalDamageToPlayers: number;
  units: Unit[];
  traits: ActiveTrait[];
  augments: string[];
}

export interface TierData {
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface PlayerStats {
  avgPlacement: number;
  winRate: number;
  top4Rate: number;
  totalGames: number;
  recentForm: string;
}

export interface DeckStats {
  playRate: number;
  avgPlacement: number;
  winRate: number;
  top4Rate: number;
  sampleSize: number;
}

export interface MetaSnapshot {
  timestamp: Date;
  totalMatches: number;
  topDecks: DeckAnalysis[];
  trendingComps: TrendingComp[];
}

export interface DeckAnalysis {
  composition: DeckComposition;
  stats: DeckStats;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  variations: DeckVariation[];
}

export interface DeckVariation {
  name: string;
  units: Unit[];
  stats: DeckStats;
}

export interface TrendingComp {
  composition: DeckComposition;
  growthRate: number;
  popularity: number;
  performance: DeckStats;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface BuildGuide {
  composition: DeckComposition;
  earlyGame: string;
  midGame: string;
  lateGame: string;
  positioning: string;
  itemPriority: ItemPriority[];
  counters: string[];
  tips: string[];
}

export interface ItemPriority {
  champion: string;
  items: string[];
  alternatives: string[];
}

export type Region = 'BR1' | 'EUN1' | 'EUW1' | 'JP1' | 'KR' | 'LA1' | 'LA2' | 'NA1' | 'OC1' | 'PH2' | 'RU' | 'SG2' | 'TH2' | 'TR1' | 'TW2' | 'VN2';

export type QueueType = 'RANKED_TFT' | 'NORMAL_TFT' | 'RANKED_TFT_TURBO' | 'RANKED_TFT_DOUBLE_UP' | 'RANKED_TFT_PAIRS';

export type Tier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER';

export type Rank = 'I' | 'II' | 'III' | 'IV';