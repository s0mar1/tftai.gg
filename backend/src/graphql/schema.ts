/**
 * GraphQL 스키마 정의
 * Apollo Server용 GraphQL 스키마를 정의합니다.
 * TypeScript 철의 장막 규칙을 준수하며 타입 안전성을 보장합니다.
 */

import { gql } from 'graphql-tag';

export const typeDefs = gql`
  """
  지원되는 언어 코드
  """
  enum Language {
    KO
    EN
    JA
    ZH
  }

  """
  티어 등급
  """
  enum Tier {
    S
    A
    B
    C
    D
  }

  """
  추천사항 카테고리
  """
  enum RecommendationCategory {
    POSITIONING
    ITEMIZATION
    ECONOMY
    LEVELING
  }

  """
  우선순위 레벨
  """
  enum Priority {
    HIGH
    MEDIUM
    LOW
  }

  """
  사용자 역할
  """
  enum UserRole {
    USER
    MODERATOR
    ADMIN
    SUPER_ADMIN
  }

  """
  사용자 상태
  """
  enum UserStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
    BANNED
  }

  """
  테마 설정
  """
  enum Theme {
    LIGHT
    DARK
    AUTO
  }

  """
  공통 메타데이터 정보
  """
  type Meta {
    timestamp: String!
    processingTime: Int
    version: String
  }

  """
  에러 정보
  """
  type ErrorInfo {
    code: String!
    message: String!
    field: String
  }

  """
  챔피언 능력 정보
  """
  type ChampionAbility {
    name: String!
    description: String!
  }

  """
  챔피언 스탯 정보
  """
  type ChampionStats {
    health: Int!
    mana: Int!
    damage: Int!
    armor: Int!
    magicResist: Int!
    attackSpeed: Float!
    critChance: Float!
  }

  """
  챔피언 데이터
  """
  type Champion {
    name: String!
    cost: Int!
    traits: [String!]!
    ability: ChampionAbility
    stats: ChampionStats
  }

  """
  챔피언 컬렉션
  """
  type ChampionsCollection {
    TFTChampions: [ChampionEntry!]!
  }

  """
  챔피언 엔트리 (키-값 쌍)
  """
  type ChampionEntry {
    key: String!
    champion: Champion!
  }

  """
  챔피언 API 응답
  """
  type ChampionResponse {
    success: Boolean!
    data: ChampionsCollection
    message: String
    error: ErrorInfo
    meta: Meta
  }

  """
  특성 정보
  """
  type TraitInfo {
    name: String!
    apiName: String!
    level: Int!
    tier_current: Int!
    description: String
    style: String!
    styleOrder: Int!
    image_url: String
  }

  """
  아이템 정보
  """
  type ItemInfo {
    name: String!
    champion: String!
    priority: Priority!
  }

  """
  유닛 아이템 상세 정보
  """
  type ItemDetail {
    name: String!
    image_url: String!
  }

  """
  챔피언 정보 (덱 구성용)
  """
  type ChampionInfo {
    name: String!
    apiName: String!
    image_url: String!
    cost: Int!
    tier: Int!
    traits: [String!]!
    recommendedItems: [ItemDetail!]!
  }

  """
  덱 구성
  """
  type DeckConfiguration {
    id: String!
    name: String!
    tier: Tier!
    champions: [ChampionInfo!]!
    traits: [TraitInfo!]!
    winRate: Float!
    playRate: Float!
    avgPlacement: Float!
    keyUnits: [String!]!
    items: [ItemInfo!]!
  }

  """
  티어리스트 데이터
  """
  type TierlistData {
    decks: [DeckConfiguration!]!
    lastUpdated: String!
    totalDecks: Int!
  }

  """
  티어리스트 API 응답
  """
  type TierlistResponse {
    success: Boolean!
    data: TierlistData
    message: String
    error: ErrorInfo
    meta: Meta
  }

  """
  소환사 정보
  """
  type SummonerInfo {
    puuid: String!
    summonerId: String!
    name: String!
    profileIconId: Int!
    summonerLevel: Int!
    tier: String
    rank: String
    leaguePoints: Int
    wins: Int
    losses: Int
  }

  """
  소환사 데이터
  """
  type SummonerData {
    summoner: SummonerInfo!
    region: String!
  }

  """
  소환사 API 응답
  """
  type SummonerResponse {
    success: Boolean!
    data: SummonerData
    message: String
    error: ErrorInfo
    meta: Meta
  }

  """
  매치 정보 (간소화된 버전)
  """
  type MatchInfo {
    gameId: String!
    gameDateTime: String!
    queueType: String!
    placement: Int!
    level: Int!
    totalDamageToPlayers: Int!
    traits: [TraitInfo!]!
    units: [UnitInfo!]!
    companionData: CompanionInfo
  }

  """
  유닛 정보
  """
  type UnitInfo {
    championId: String!
    name: String!
    image_url: String!
    tier: Int!
    cost: Int!
    items: [ItemDetail!]!
  }

  """
  컴패니언 정보
  """
  type CompanionInfo {
    skinId: String!
    speciesId: String!
  }

  """
  리그 정보
  """
  type LeagueInfo {
    leagueId: String!
    queueType: String!
    tier: String!
    rank: String!
    summonerId: String!
    leaguePoints: Int!
    wins: Int!
    losses: Int!
    hotStreak: Boolean!
    veteran: Boolean!
    freshBlood: Boolean!
    inactive: Boolean!
  }

  """
  통합 소환사 데이터
  """
  type SummonerIntegratedData {
    summoner: SummonerInfo!
    region: String!
    recentMatches: [MatchInfo!]!
    leagueEntries: [LeagueInfo!]!
    lastUpdated: String!
  }

  """
  통합 소환사 API 응답
  """
  type SummonerIntegratedResponse {
    success: Boolean!
    data: SummonerIntegratedData
    message: String
    error: ErrorInfo
    meta: Meta
  }

  """
  매치 분석 입력
  """
  input MatchAnalysisInput {
    matchId: String!
    userPuuid: String!
  }

  """
  덱 구성 분석
  """
  type DeckComposition {
    mainCarry: String!
    supportUnits: [String!]!
    traits: [TraitInfo!]!
  }

  """
  아이템 분석
  """
  type ItemAnalysis {
    optimal: [String!]!
    actual: [String!]!
    effectiveness: Float!
  }

  """
  추천사항
  """
  type Recommendation {
    category: RecommendationCategory!
    suggestion: String!
    priority: Priority!
  }

  """
  점수 분석
  """
  type ScoreAnalysis {
    overall: Int!
    positioning: Int!
    itemization: Int!
    economy: Int!
  }

  """
  매치 분석 결과
  """
  type MatchAnalysisResult {
    matchId: String!
    userPuuid: String!
    analysis: MatchAnalysis!
  }

  """
  매치 분석 세부사항
  """
  type MatchAnalysis {
    placement: Int!
    deckComposition: DeckComposition!
    itemAnalysis: ItemAnalysis!
    recommendations: [Recommendation!]!
    score: ScoreAnalysis!
  }

  """
  매치 분석 API 응답
  """
  type MatchAnalysisResponse {
    success: Boolean!
    data: MatchAnalysisResult
    message: String
    error: ErrorInfo
    meta: Meta
  }

  """
  Query 루트 타입
  """
  type Query {
    """
    챔피언 정보를 조회합니다.
    """
    champions(language: Language = KO): ChampionResponse!
    
    """
    티어리스트를 조회합니다.
    """
    tierlist(language: Language = KO): TierlistResponse!
    
    """
    소환사 정보를 조회합니다.
    """
    summoner(name: String!, region: String = "kr"): SummonerResponse!
    
    """
    소환사 정보, 최근 경기, 리그 정보를 한번에 조회합니다. (통합 쿼리)
    """
    summonerIntegrated(name: String!, region: String = "kr", matchCount: Int = 10): SummonerIntegratedResponse!
    
    """
    현재 로그인한 사용자 정보를 조회합니다. (인증 필요)
    """
    me: User
    
    """
    사용자 목록을 조회합니다. (관리자 권한 필요)
    """
    users(limit: Int = 10, offset: Int = 0): [User!]!
    
    """
    GraphQL API 서비스 정보를 조회합니다.
    """
    serviceInfo: ServiceInfo!
  }

  """
  Mutation 루트 타입
  """
  type Mutation {
    """
    회원가입을 진행합니다.
    """
    register(input: RegisterInput!): LoginResponse!
    
    """
    로그인을 진행합니다.
    """
    login(input: LoginInput!): LoginResponse!
    
    """
    토큰을 갱신합니다.
    """
    refreshToken(refreshToken: String!): AuthTokens!
    
    """
    로그아웃합니다. (인증 필요)
    """
    logout: Boolean!
    
    """
    사용자 프로필을 업데이트합니다. (인증 필요)
    """
    updateProfile(input: UpdateProfileInput!): User!
    
    """
    사용자 환경설정을 업데이트합니다. (인증 필요)
    """
    updatePreferences(input: UpdatePreferencesInput!): User!
    
    """
    비밀번호를 변경합니다. (인증 필요)
    """
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    
    """
    사용자를 삭제합니다. (관리자 권한 필요)
    """
    deleteUser(userId: String!): Boolean!
    
    """
    AI를 활용한 매치 분석을 수행합니다. (인증 필요)
    """
    analyzeMatch(input: MatchAnalysisInput!): MatchAnalysisResponse!
  }

  """
  서비스 정보
  """
  type ServiceInfo {
    name: String!
    version: String!
    description: String!
    features: [String!]!
    supportedLanguages: [Language!]!
    lastUpdated: String!
  }

  """
  이벤트 타입 열거형
  """
  enum EventType {
    MATCH_ANALYSIS_STARTED
    MATCH_ANALYSIS_PROGRESS
    MATCH_ANALYSIS_COMPLETED
    MATCH_ANALYSIS_FAILED
    TIERLIST_UPDATE_STARTED
    TIERLIST_UPDATE_COMPLETED
    SUMMONER_DATA_UPDATED
    SYSTEM_STATUS_CHANGED
  }

  """
  시스템 상태 열거형
  """
  enum SystemStatus {
    HEALTHY
    DEGRADED
    MAINTENANCE
    ERROR
  }

  """
  매치 분석 진행상황 이벤트
  """
  type MatchAnalysisProgressEvent {
    matchId: String!
    userPuuid: String!
    eventType: EventType!
    progress: Int!
    message: String!
    timestamp: String!
    data: MatchAnalysisResult
    error: ErrorInfo
  }

  """
  티어리스트 업데이트 이벤트
  """
  type TierlistUpdateEvent {
    eventType: EventType!
    message: String!
    timestamp: String!
    totalDecks: Int
    changedDecks: Int
    data: TierlistData
    error: ErrorInfo
  }

  """
  소환사 데이터 업데이트 이벤트
  """
  type SummonerDataUpdateEvent {
    summonerName: String!
    region: String!
    eventType: EventType!
    message: String!
    timestamp: String!
    data: SummonerData
    error: ErrorInfo
  }

  """
  시스템 상태 변경 이벤트
  """
  type SystemStatusEvent {
    eventType: EventType!
    status: SystemStatus!
    message: String!
    timestamp: String!
    services: SystemStatusDetails
  }

  """
  시스템 상태 세부사항
  """
  type SystemStatusDetails {
    database: String!
    cache: String!
    scheduler: String!
    aiService: String!
  }

  """
  사용자 정보
  """
  type User {
    id: String!
    email: String!
    username: String!
    displayName: String
    avatar: String
    role: UserRole!
    status: UserStatus!
    riotPuuid: String
    riotGameName: String
    riotTagLine: String
    linkedRegions: [String!]!
    preferences: UserPreferences!
    stats: UserStats!
    createdAt: String!
    updatedAt: String!
    lastLoginAt: String
    lastActiveAt: String
  }

  """
  사용자 환경설정
  """
  type UserPreferences {
    language: Language!
    theme: Theme!
    notifications: NotificationSettings!
  }

  """
  알림 설정
  """
  type NotificationSettings {
    email: Boolean!
    push: Boolean!
    tierlistUpdates: Boolean!
    patchNotes: Boolean!
  }

  """
  사용자 통계
  """
  type UserStats {
    analysisCount: Int!
    guideCount: Int!
    favoriteChampions: [String!]!
  }

  """
  JWT 토큰 응답
  """
  type AuthTokens {
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
  }

  """
  로그인 응답
  """
  type LoginResponse {
    success: Boolean!
    user: User
    tokens: AuthTokens
    message: String
    error: ErrorInfo
  }

  """
  회원가입 입력
  """
  input RegisterInput {
    email: String!
    username: String!
    password: String!
    displayName: String
  }

  """
  로그인 입력
  """
  input LoginInput {
    email: String!
    password: String!
  }

  """
  사용자 프로필 업데이트 입력
  """
  input UpdateProfileInput {
    displayName: String
    avatar: String
    riotGameName: String
    riotTagLine: String
    linkedRegions: [String!]
  }

  """
  사용자 환경설정 업데이트 입력
  """
  input UpdatePreferencesInput {
    language: Language
    theme: Theme
    notifications: NotificationSettingsInput
  }

  """
  알림 설정 입력
  """
  input NotificationSettingsInput {
    email: Boolean
    push: Boolean
    tierlistUpdates: Boolean
    patchNotes: Boolean
  }

  """
  Subscription 루트 타입
  """
  type Subscription {
    """
    매치 분석 진행상황을 실시간으로 구독합니다.
    """
    matchAnalysisUpdated(matchId: String, userPuuid: String): MatchAnalysisProgressEvent!
    
    """
    티어리스트 업데이트를 실시간으로 구독합니다.
    """
    tierlistUpdated: TierlistUpdateEvent!
    
    """
    소환사 데이터 업데이트를 실시간으로 구독합니다.
    """
    summonerDataUpdated(summonerName: String, region: String): SummonerDataUpdateEvent!
    
    """
    시스템 상태 변경을 실시간으로 구독합니다.
    """
    systemStatus: SystemStatusEvent!
  }
`;