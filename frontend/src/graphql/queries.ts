/**
 * GraphQL 쿼리 정의
 * 타입 안전성을 보장하는 GraphQL 쿼리들
 */

import { gql } from '@apollo/client';

/**
 * 소환사 통합 조회 쿼리
 * 소환사 정보 + 최근 매치 + 리그 정보를 한 번에 조회
 */
export const GET_SUMMONER_INTEGRATED = gql`
  query GetSummonerIntegrated($name: String!, $region: String = "kr", $matchCount: Int = 10) {
    summonerIntegrated(name: $name, region: $region, matchCount: $matchCount) {
      success
      data {
        summoner {
          puuid
          summonerId
          name
          profileIconId
          summonerLevel
          tier
          rank
          leaguePoints
          wins
          losses
        }
        region
        recentMatches {
          gameId
          gameDateTime
          queueType
          placement
          level
          totalDamageToPlayers
          traits {
            name
            apiName
            level
            tier_current
            description
            style
            styleOrder
            image_url
          }
          units {
            championId
            name
            image_url
            tier
            cost
            items {
              name
              image_url
            }
          }
          companionData {
            skinId
            speciesId
          }
        }
        leagueEntries {
          leagueId
          queueType
          tier
          rank
          summonerId
          leaguePoints
          wins
          losses
          hotStreak
          veteran
          freshBlood
          inactive
        }
        lastUpdated
      }
      message
      error {
        code
        message
        field
      }
      meta {
        timestamp
        processingTime
        version
      }
    }
  }
`;

/**
 * 티어리스트 조회 쿼리
 * 언어별로 최적화된 캐싱과 필요한 필드만 선택적 조회
 */
export const GET_TIERLIST = gql`
  query GetTierlist($language: Language = KO) {
    tierlist(language: $language) {
      success
      data {
        decks {
          id
          name
          tier
          champions {
            name
            apiName
            image_url
            cost
            tier
            traits
            recommendedItems {
              name
              image_url
            }
          }
          traits {
            name
            level
            description
          }
          winRate
          playRate
          avgPlacement
          keyUnits
          items {
            name
            champion
            priority
          }
        }
        lastUpdated
        totalDecks
      }
      message
      error {
        code
        message
        field
      }
      meta {
        timestamp
        processingTime
        version
      }
    }
  }
`;

/**
 * 챔피언 데이터 조회 쿼리
 * 언어별 캐싱과 함께 챔피언 정보 조회
 */
export const GET_CHAMPIONS = gql`
  query GetChampions($language: Language = KO) {
    champions(language: $language) {
      success
      data {
        TFTChampions {
          key
          champion {
            name
            cost
            traits
            ability {
              name
              description
            }
            stats {
              health
              mana
              damage
              armor
              magicResist
              attackSpeed
              critChance
            }
          }
        }
      }
      message
      error {
        code
        message
        field
      }
      meta {
        timestamp
        processingTime
        version
      }
    }
  }
`;

/**
 * 소환사 기본 정보만 조회 (빠른 조회용)
 */
export const GET_SUMMONER_BASIC = gql`
  query GetSummonerBasic($name: String!, $region: String = "kr") {
    summoner(name: $name, region: $region) {
      success
      data {
        summoner {
          puuid
          summonerId
          name
          profileIconId
          summonerLevel
          tier
          rank
          leaguePoints
          wins
          losses
        }
        region
      }
      message
      error {
        code
        message
        field
      }
      meta {
        timestamp
        processingTime
        version
      }
    }
  }
`;

/**
 * AI 매치 분석 요청
 */
export const ANALYZE_MATCH = gql`
  mutation AnalyzeMatch($input: MatchAnalysisInput!) {
    analyzeMatch(input: $input) {
      success
      data {
        matchId
        userPuuid
        analysis {
          placement
          deckComposition {
            mainCarry
            supportUnits
            traits {
              name
              level
              description
            }
          }
          itemAnalysis {
            optimal
            actual
            effectiveness
          }
          recommendations {
            category
            suggestion
            priority
          }
          score {
            overall
            positioning
            itemization
            economy
          }
        }
      }
      message
      error {
        code
        message
        field
      }
      meta {
        timestamp
        processingTime
        version
      }
    }
  }
`;

/**
 * 매치 분석 진행상황 구독 (선택적 실시간 기능)
 */
export const SUBSCRIBE_MATCH_ANALYSIS_PROGRESS = gql`
  subscription MatchAnalysisProgress($matchId: String, $userPuuid: String) {
    matchAnalysisUpdated(matchId: $matchId, userPuuid: $userPuuid) {
      matchId
      userPuuid
      eventType
      progress
      message
      timestamp
      data {
        matchId
        userPuuid
        analysis {
          placement
          score {
            overall
            positioning
            itemization
            economy
          }
        }
      }
      error {
        code
        message
        field
      }
    }
  }
`;

/**
 * 서비스 정보 조회
 */
export const GET_SERVICE_INFO = gql`
  query GetServiceInfo {
    serviceInfo {
      name
      version
      description
      features
      supportedLanguages
      lastUpdated
    }
  }
`;