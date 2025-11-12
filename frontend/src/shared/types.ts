// 공유 타입 정의 (프론트엔드-백엔드 공통)
// 백엔드 구조를 기준으로 통일

// 표준 API 응답 형태
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

// TFT 게임 관련 공유 타입들

// 챔피언 스킬 변수 타입
export interface Variable {
  name: string;
  value: number[];
}

// 챔피언 스킬 타입
export interface Ability {
  name: string;
  desc: string;
  icon: string;
  variables?: Variable[];
  manaStart?: number;
  manaCost?: number;
}

export interface Champion {
  apiName: string;
  characterId?: string;
  cost: number;
  displayName?: string;
  name: string;
  tileIcon: string;
  traits: string[];
  stats?: ChampionStats;
  ability?: Ability;
  abilities?: Ability[]; // 백워드 호환성
  // 프론트엔드 호환성을 위한 추가 필드들
  tier?: number;
  recommendedItems?: Item[];
  // 추가 UI 관련 필드들
  image_url?: string;
  icon?: string;
  role?: string;
}

export interface Item {
  apiName: string;
  associatedTraits: string[];
  composition: string[];
  desc: string;
  effects: ItemEffect[];
  from: string[] | null;
  icon: string;
  id: number | null;
  incompatibleTraits: string[];
  name: string;
  unique: boolean;
  // 프론트엔드 호환성을 위한 추가 필드들
  description?: string;
  stats?: ChampionStats; // 아이템도 동일한 스탯 구조 사용
}

export interface Trait {
  name: string;
  apiName: string;
  tier_current?: number;
  tier_total?: number;
  num_units?: number;
  icon?: string;
  effects?: TraitEffect[];
  // 프론트엔드 호환성을 위한 추가 필드들
  description?: string;
  style?: string;
  count?: number;
  isActive?: boolean;
  styleOrder?: number;
}

export interface TraitEffect {
  minUnits: number;
  maxUnits?: number;
  style: string | number;
  variables?: Record<string, number | string | boolean>;
}

// 아이템 효과 타입 정의
export interface ItemEffect {
  name?: string;
  description?: string;
  value?: number | string;
  type?: 'damage' | 'heal' | 'shield' | 'buff' | 'debuff' | 'passive' | 'active';
  duration?: number;
  cooldown?: number;
  variables?: Record<string, number | string | boolean>;
}

// 증강체 효과 타입 정의  
export interface AugmentEffect {
  name?: string;
  description?: string;
  value?: number | string;
  type?: 'trait' | 'item' | 'champion' | 'global';
  variables?: Record<string, number | string | boolean>;
}

// 챔피언 스탯 타입 정의
export interface ChampionStats {
  health?: number;
  mana?: number;
  damage?: number;
  armor?: number;
  magicResist?: number;
  attackSpeed?: number;
  critChance?: number;
  critDamage?: number;
  range?: number;
  // 기타 스탯들
  abilityPower?: number;
  dodgeChance?: number;
  healingReduction?: number;
  [key: string]: number | undefined;
}

export interface Augment {
  apiName: string;
  desc: string;
  effects: AugmentEffect[];
  icon: string;
  incompatibleTraits: string[];
  name: string;
}

export interface ActiveTrait {
  name: string;
  numUnits: number;
  style: number;
  tierCurrent: number;
  tier_current: number;
  tierTotal: number;
}

// 매치 데이터 타입
export interface Match {
  matchId?: string;
  metadata?: {
    match_id: string;
    participants: string[];
  };
  info?: {
    game_creation: number;
    game_length: number;
    participants: Participant[];
  };
  // 프론트엔드 호환성을 위한 추가 필드들
  puuid?: string;
  placement?: number;
  level?: number;
  lastRound?: number;
  playersEliminated?: number;
  totalDamageToPlayers?: number;
  timeEliminated?: number;
  traits?: Trait[];
  units?: Champion[];
  companion?: {
    contentId: string;
    skinId: number;
    species: string;
  };
}

export interface Participant {
  puuid: string;
  placement: number;
  level: number;
  last_round: number;
  gold_left: number;
  total_damage_to_players: number;
  traits: Trait[];
  units: Unit[];
  items?: Item[];
}

export interface Unit {
  character_id: string;
  name: string;
  tier: number;
  items: number[];
  rarity: number;
}

// 소환사 데이터 타입
export interface SummonerData {
  puuid?: string;
  accountId?: string;
  summonerId?: string;
  name?: string;
  profileIconId?: number;
  summonerLevel?: number;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
  // 프론트엔드 호환성을 위한 추가 필드들
  account?: {
    puuid: string;
    gameName: string;
    tagLine: string;
  };
  summoner?: {
    id: string;
    summonerLevel: number;
    profileIconId: number;
  };
  league?: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  };
  matches?: Match[];
}

// 덱 관련 타입
export interface Deck {
  deckKey: string;
  tierRank: string;
  mainTraitName: string;
  carryChampionName: string;
  averagePlacement: number;
  totalGames: number;
  top4Count: number;
  winCount: number;
  coreUnits: Champion[];
  // 프론트엔드 호환성을 위한 추가 필드들
  tierOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// 다국어 이름 인터페이스
export interface LocaleName {
  ko: string;
  en: string;
  ja: string;
  zh: string;
}

// 덱 티어 타입 (백엔드 모델 기반)
export interface DeckTier {
  _id?: string;
  deckKey: string;
  tierRank?: string;
  tierOrder?: number;
  carryChampionName: LocaleName;
  mainTraitName?: LocaleName;
  coreUnits: CoreUnit[];
  totalGames: number;
  top4Count: number;
  winCount: number;
  averagePlacement: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CoreUnit {
  name: LocaleName;
  apiName: string;
  image_url: string;
  cost: number;
  traits: string[];
  recommendedItems: {
    name: LocaleName;
    image_url: string;
  }[];
}

// 통계 타입들
export interface ItemStats {
  itemId?: string;
  apiName: string;
  name: string;
  winRate: number;
  playRate?: number;
  pickRate?: number;
  avgPlacement?: number;
  averagePlacement: number;
  totalGames?: number;
  components?: string[];
  // 프론트엔드 호환성을 위한 추가 필드들
  imageUrl?: string;
}

export interface TraitStats {
  traitId?: string;
  apiName: string;
  name: string;
  winRate: number;
  playRate?: number;
  pickRate?: number;
  avgPlacement?: number;
  averagePlacement: number;
  totalGames?: number;
  tiers?: {
    tier: number;
    winRate: number;
    playRate: number;
  }[];
  // 프론트엔드 호환성을 위한 추가 필드들
  iconUrl?: string;
}

// 리그 엔트리 타입
export interface LeagueEntry {
  leagueId: string;
  summonerId: string;
  summonerName: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

// 랭커 타입
export interface Ranker {
  gameName: string;
  tagLine: string;
  tier: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  profileIconId: number;
}

// 가이드 관련 타입
export interface Guide {
  _id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  author: GuideAuthor;
  recommendCount: number;
  viewCount: number;
  createdAt: string;
  level_boards: LevelBoard[];
  initialDeckLevel: number;
}

export interface GuideAuthor {
  name: string;
  score: number;
}

export interface LevelBoard {
  level: number;
  board: string;
}

export interface AnalyzedDeck {
  units: Champion[];
  traits: Trait[];
}

// 서비스 결과 타입
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 에러 응답 타입
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: {
    stack?: string;
    code?: string;
    path?: string;
    method?: string;
    requestId?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

// 캐시 관련 타입
export interface CacheData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 페이지네이션 타입
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

// 필터 옵션 타입
export interface FilterOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean | string[]>;
}

// AI 분석 메타데이터 타입 (누락된 source 필드 추가)
export interface AnalysisMetadata {
  analyzedAt: string;
  matchId: string;
  userPuuid: string;
  cacheHit: boolean;
  source?: string; // AI 분석 결과의 출처 (error, cache, api 등)
}

// 메타덱 타입 (QnAService에서 사용)
export interface MetaDeck {
  deckName?: string;
  deckKey: string;
  averagePlacement: number;
  avgPlacement?: number; // 호환성을 위한 alias
  playRate?: number;
  winRate?: number;
  totalGames: number;
  // 기타 필드들
  tierRank?: string;
  top4Count?: number;
  winCount?: number;
  mainTraitName?: string;
  carryChampionName?: string;
  coreUnits?: CoreUnit[];
}

// PlayerDeck 타입 (AI 분석에서 사용)
export interface PlayerDeck {
  level?: number;
  traits?: ActiveTrait[];
  units?: PlayerUnit[];
  // 기타 필드들
  placement?: number;
  playersEliminated?: number;
  totalDamageToPlayers?: number;
  timeEliminated?: number;
  lastRound?: number;
  goldLeft?: number;
}

// PlayerUnit 타입 (AI 분석에서 사용)
export interface PlayerUnit {
  character_id: string;
  name?: string;
  cost?: number;
  tier: number;
  items?: number[];
  // 기타 필드들
  rarity?: number;
  chosen?: boolean;
  traits?: string[];
  stats?: ChampionStats;
}