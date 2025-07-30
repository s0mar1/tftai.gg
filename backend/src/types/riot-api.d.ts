// Riot API 타입 정의

export interface RiotSummonerDTO {
  accountId: string;
  profileIconId: number;
  revisionDate: number;
  id: string;
  puuid: string;
  summonerLevel: number;
  name?: string; // 일부 API 응답에서 포함될 수 있음
}

export interface RiotAccountDTO {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotLeagueEntryDTO {
  leagueId: string;
  summonerId: string;
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
  miniSeries?: {
    losses: number;
    progress: string;
    target: number;
    wins: number;
  };
}

export interface RiotMatchDTO {
  metadata: RiotMatchMetadataDTO;
  info: RiotMatchInfoDTO;
}

export interface RiotMatchMetadataDTO {
  data_version: string;
  match_id: string;
  participants: string[];
}

export interface RiotMatchInfoDTO {
  endOfGameResult: string;
  gameCreation: number;
  gameId: number;
  game_datetime: number;
  game_length: number;
  game_version: string;
  mapId: number;
  participants: RiotParticipantDTO[];
  queueId: number;
  tft_game_type: string;
  tft_set_core_name: string;
  tft_set_number: number;
}

export interface RiotParticipantDTO {
  augments: string[];
  companion: RiotCompanionDTO;
  gold_left: number;
  last_round: number;
  level: number;
  placement: number;
  players_eliminated: number;
  puuid: string;
  time_eliminated: number;
  total_damage_to_players: number;
  traits: RiotTraitDTO[];
  units: RiotUnitDTO[];
}

export interface RiotCompanionDTO {
  content_ID: string;
  item_ID: number;
  skin_ID: number;
  species: string;
}

export interface RiotTraitDTO {
  name: string;
  num_units: number;
  style: number;
  tier_current: number;
  tier_total: number;
}

export interface RiotUnitDTO {
  character_id: string;
  itemNames: string[];
  items: number[];
  name: string;
  rarity: number;
  tier: number;
  chosen?: string;
}

export interface RiotChallengerLeagueDTO {
  tier: string;
  leagueId: string;
  queue: string;
  name: string;
  entries: RiotLeagueEntryDTO[];
}

export interface RiotErrorDTO {
  status: {
    message: string;
    status_code: number;
  };
}