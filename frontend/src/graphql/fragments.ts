/**
 * GraphQL Fragments for Frontend
 * 컴포넌트별로 필요한 데이터를 명시적으로 정의
 */

import { gql } from '@apollo/client';

// 기본 챔피언 정보 Fragment
export const CHAMPION_BASIC_INFO = gql`
  fragment ChampionBasicInfo on ChampionData {
    name
    apiName
    cost
    image_url
  }
`;

// 챔피언 카드 컴포넌트용 Fragment
export const CHAMPION_CARD_DATA = gql`
  fragment ChampionCardData on ChampionData {
    name
    apiName
    cost
    image_url
    traits
  }
`;

// 챔피언 상세 정보 Fragment
export const CHAMPION_DETAIL_INFO = gql`
  fragment ChampionDetailInfo on ChampionData {
    ...ChampionBasicInfo
    traits
    ability {
      name
      description
    }
    stats {
      damage
      health
      armor
      magicResistance
      attackSpeed
      critChance
      range
    }
  }
  ${CHAMPION_BASIC_INFO}
`;

// 특성 기본 정보 Fragment
export const TRAIT_BASIC_INFO = gql`
  fragment TraitBasicInfo on TraitData {
    name
    apiName
    description
    image_url
  }
`;

// 특성 상세 정보 Fragment (게임 내 활성화 상태 포함)
export const TRAIT_DETAIL_INFO = gql`
  fragment TraitDetailInfo on TraitData {
    ...TraitBasicInfo
    tier_current
    style
    styleOrder
  }
  ${TRAIT_BASIC_INFO}
`;

// 아이템 기본 정보 Fragment
export const ITEM_BASIC_INFO = gql`
  fragment ItemBasicInfo on ItemData {
    name
    apiName
    description
    image_url
  }
`;

// 소환사 기본 정보 Fragment
export const SUMMONER_BASIC_INFO = gql`
  fragment SummonerBasicInfo on SummonerInfo {
    name
    tag
    puuid
    summonerId
    profileIconId
    summonerLevel
  }
`;

// 소환사 랭크 정보 Fragment
export const SUMMONER_RANK_INFO = gql`
  fragment SummonerRankInfo on SummonerInfo {
    tier
    rank
    leaguePoints
    wins
    losses
  }
`;

// 소환사 완전 정보 Fragment
export const SUMMONER_COMPLETE_INFO = gql`
  fragment SummonerCompleteInfo on SummonerInfo {
    ...SummonerBasicInfo
    ...SummonerRankInfo
  }
  ${SUMMONER_BASIC_INFO}
  ${SUMMONER_RANK_INFO}
`;

// 매치 기본 정보 Fragment
export const MATCH_BASIC_INFO = gql`
  fragment MatchBasicInfo on MatchInfo {
    gameId
    gameDateTime
    queueType
    placement
    level
    totalDamageToPlayers
  }
`;

// 매치 참가자 정보 Fragment (특성 + 유닛 포함)
export const MATCH_PARTICIPANT_INFO = gql`
  fragment MatchParticipantInfo on MatchInfo {
    ...MatchBasicInfo
    traits {
      name
      apiName
      level
      style
      styleOrder
    }
    units {
      name
      apiName
      tier
      cost
      items {
        name
        apiName
        image_url
      }
    }
  }
  ${MATCH_BASIC_INFO}
`;

// 덱 기본 정보 Fragment
export const DECK_BASIC_INFO = gql`
  fragment DeckBasicInfo on DeckData {
    name
    tier
    difficulty
    playstyle
  }
`;

// 덱 구성 정보 Fragment
export const DECK_COMPOSITION = gql`
  fragment DeckComposition on DeckData {
    champions
    traits
    items
    augments
  }
`;

// 덱 완전 정보 Fragment
export const DECK_COMPLETE_INFO = gql`
  fragment DeckCompleteInfo on DeckData {
    ...DeckBasicInfo
    ...DeckComposition
    patch
    winRate
    avgPlacement
  }
  ${DECK_BASIC_INFO}
  ${DECK_COMPOSITION}
`;

// 에러 정보 Fragment
export const ERROR_INFO = gql`
  fragment ErrorInfo on ErrorData {
    code
    message
    details
    retryable
    timestamp
  }
`;

// AI 분석 기본 정보 Fragment
export const AI_ANALYSIS_BASIC_INFO = gql`
  fragment AIAnalysisBasicInfo on AIAnalysisResult {
    analysisId
    status
    createdAt
    completedAt
  }
`;

// AI 분석 상세 정보 Fragment
export const AI_ANALYSIS_DETAIL_INFO = gql`
  fragment AIAnalysisDetailInfo on AIAnalysisResult {
    ...AIAnalysisBasicInfo
    analysis {
      strengths
      weaknesses
      recommendations
      confidence
    }
    metadata {
      model
      version
      parameters
    }
  }
  ${AI_ANALYSIS_BASIC_INFO}
`;

// 서비스 정보 Fragment
export const SERVICE_BASIC_INFO = gql`
  fragment ServiceBasicInfo on ServiceInfo {
    status
    version
    uptime
  }
`;

/**
 * 컴포넌트별 최적화된 쿼리들
 * 기존 쿼리와 병행 사용 가능
 */

// ChampionCard 컴포넌트 최적화 쿼리
export const GET_CHAMPIONS_FOR_CARD = gql`
  query GetChampionsForCard($language: GraphQLLanguage!, $set: String) {
    champions(language: $language, set: $set) {
      ...ChampionCardData
    }
  }
  ${CHAMPION_CARD_DATA}
`;

// ChampionDetail 컴포넌트 최적화 쿼리
export const GET_CHAMPION_DETAIL = gql`
  query GetChampionDetail($language: GraphQLLanguage!, $championName: String!) {
    champions(language: $language) {
      ...ChampionDetailInfo
    }
  }
  ${CHAMPION_DETAIL_INFO}
`;

// SummonerCard 컴포넌트 최적화 쿼리
export const GET_SUMMONER_FOR_CARD = gql`
  query GetSummonerForCard($name: String!, $region: String!) {
    summonerIntegrated(name: $name, region: $region, matchCount: 1) {
      summoner {
        ...SummonerCompleteInfo
      }
    }
  }
  ${SUMMONER_COMPLETE_INFO}
`;

// MatchHistory 컴포넌트 최적화 쿼리
export const GET_MATCH_HISTORY_OPTIMIZED = gql`
  query GetMatchHistoryOptimized($name: String!, $region: String!, $matchCount: Int!) {
    summonerIntegrated(name: $name, region: $region, matchCount: $matchCount) {
      matches {
        ...MatchParticipantInfo
      }
    }
  }
  ${MATCH_PARTICIPANT_INFO}
`;

// TierList 페이지 최적화 쿼리
export const GET_TIERLIST_OPTIMIZED = gql`
  query GetTierlistOptimized($language: GraphQLLanguage!) {
    tierlist(language: $language) {
      S {
        ...DeckCompleteInfo
      }
      A {
        ...DeckBasicInfo
        ...DeckComposition
      }
      B {
        ...DeckBasicInfo
        ...DeckComposition
      }
      C {
        ...DeckBasicInfo
      }
    }
  }
  ${DECK_COMPLETE_INFO}
  ${DECK_BASIC_INFO}
  ${DECK_COMPOSITION}
`;

/**
 * Fragment 사용 예시 및 마이그레이션 가이드
 */

/*
// 기존 방식 (계속 사용 가능)
const { data } = useQuery(GET_SUMMONER_INTEGRATED, {
  variables: { name, region, matchCount: 10 }
});

// Fragment 기반 방식 (새로운 옵션)
const { data: summonerCard } = useQuery(GET_SUMMONER_FOR_CARD, {
  variables: { name, region }
});

const { data: matchHistory } = useQuery(GET_MATCH_HISTORY_OPTIMIZED, {
  variables: { name, region, matchCount: 10 }
});

// 컴포넌트에서 사용
<SummonerCard summoner={summonerCard?.summonerIntegrated?.summoner} />
<MatchHistory matches={matchHistory?.summonerIntegrated?.matches} />
*/

/**
 * Fragment 혜택:
 * 1. 컴포넌트별 필요한 데이터만 명시적으로 정의
 * 2. 쿼리 중복 제거 및 재사용성 향상
 * 3. 타입 안전성 강화 (GraphQL Code Generator와 함께 사용 시)
 * 4. 네트워크 사용량 최적화 (불필요한 필드 제거)
 * 5. 컴포넌트-데이터 의존성 명확화
 */

export {
  // 기본 Fragments
  CHAMPION_BASIC_INFO,
  CHAMPION_CARD_DATA,
  CHAMPION_DETAIL_INFO,
  TRAIT_BASIC_INFO,
  TRAIT_DETAIL_INFO,
  ITEM_BASIC_INFO,
  SUMMONER_BASIC_INFO,
  SUMMONER_RANK_INFO,
  SUMMONER_COMPLETE_INFO,
  MATCH_BASIC_INFO,
  MATCH_PARTICIPANT_INFO,
  DECK_BASIC_INFO,
  DECK_COMPOSITION,
  DECK_COMPLETE_INFO,
  ERROR_INFO,
  AI_ANALYSIS_BASIC_INFO,
  AI_ANALYSIS_DETAIL_INFO,
  SERVICE_BASIC_INFO,

  // 최적화된 쿼리들
  GET_CHAMPIONS_FOR_CARD,
  GET_CHAMPION_DETAIL,
  GET_SUMMONER_FOR_CARD,
  GET_MATCH_HISTORY_OPTIMIZED,
  GET_TIERLIST_OPTIMIZED
};