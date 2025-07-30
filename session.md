🚀 GraphQL & WebSocket 도입 마스터플랜                                                   │
     │                                                                                          │
     │ 📊 현재 시스템 분석 결과 요약                                                            │
     │                                                                                          │
     │ ✅ 도입 유리 요소                                                                         │
     │                                                                                          │
     │ - 모듈화된 서비스 레이어: 기존 services/ 디렉토리 구조가 GraphQL 리졸버에서 재사용하기   │
     │ 최적                                                                                     │
     │ - Express 기반 확장성: 현재 Express 서버에 Apollo Server를 미들웨어로 쉽게 통합 가능     │
     │ - 이중 캐싱 시스템: 기존 Redis + In-memory 캐시를 GraphQL DataLoader와 결합 가능         │
     │ - 타입 안전성: TypeScript 철의 장막 규칙이 GraphQL 스키마와 완벽 호환                    │
     │                                                                                          │
     │ ⚠️ 주요 도전과제                                                                         │
     │                                                                                          │
     │ - N+1 쿼리 문제: DataLoader 패턴 필수 도입                                               │
     │ - 캐싱 전략 전환: 엔드포인트 캐싱 → 객체 기반 캐싱                                       │
     │ - 복잡도 관리: 쿼리 깊이/복잡도 제한 필요                                                │
     │                                                                                          │
     │ ---                                                                                      │
     │ 🗺️ 4단계 도입 로드맵                                                                     │
     │                                                                                          │
     │ Phase 1: GraphQL 기반 구축 (2주)                                                         │
     │                                                                                          │
     │ 목표: 기존 시스템에 영향 없이 GraphQL 엔드포인트 추가                                    │
     │                                                                                          │
     │ 1.1 의존성 및 기본 구조                                                                  │
     │                                                                                          │
     │ # 새로운 패키지 설치                                                                     │
     │ npm install apollo-server-express graphql graphql-tools dataloader graphql-depth-limit   │
     │                                                                                          │
     │ # 디렉토리 구조 생성                                                                     │
     │ src/graphql/                                                                             │
     │ ├── schema/                                                                              │
     │ │   ├── types/                                                                           │
     │ │   │   ├── summoner.ts                                                                  │
     │ │   │   ├── match.ts                                                                     │
     │ │   │   └── tierlist.ts                                                                  │
     │ │   └── index.ts                                                                         │
     │ ├── resolvers/                                                                           │
     │ │   ├── query.ts                                                                         │
     │ │   ├── mutation.ts                                                                      │
     │ │   └── subscription.ts                                                                  │
     │ ├── dataloaders/                                                                         │
     │ │   └── index.ts                                                                         │
     │ └── index.ts                                                                             │
     │                                                                                          │
     │ 1.2 스키마 설계                                                                          │
     │                                                                                          │
     │ - 기존 Mongoose 모델을 기반으로 GraphQL 타입 정의                                        │
     │ - REST API와 1:1 대응되는 Query 타입 생성                                                │
     │ - 점진적 마이그레이션을 위한 유연한 스키마 구조                                          │
     │                                                                                          │
     │ 1.3 서버 통합                                                                            │
     │                                                                                          │
     │ - src/server.ts에 Apollo Server 미들웨어 추가                                            │
     │ - /graphql 엔드포인트로 GraphQL Playground 활성화                                        │
     │ - 기존 REST API는 완전히 보존                                                            │
     │                                                                                          │
     │ Phase 2: 핵심 기능 마이그레이션 (3주)                                                    │
     │                                                                                          │
     │ 목표: 가장 많이 사용되는 API를 GraphQL로 점진적 전환                                     │
     │                                                                                          │
     │ 2.1 우선순위별 마이그레이션                                                              │
     │                                                                                          │
     │ 1. 소환사 조회 API (가장 높은 사용률)                                                    │
     │   - 기존: 3-4개 REST 호출 → 1개 GraphQL 쿼리                                             │
     │   - 예상 효과: 네트워크 요청 75% 감소                                                    │
     │ 2. 티어리스트/메타 데이터                                                                │
     │   - 복합 데이터 조회에 GraphQL 장점 극대화                                               │
     │   - 클라이언트별 필요 필드만 전송                                                        │
     │                                                                                          │
     │ 2.2 DataLoader 패턴 구현                                                                 │
     │                                                                                          │
     │ // src/graphql/dataloaders/summoner.ts                                                   │
     │ const summonerByPuuidLoader = new DataLoader(async (puuids: string[]) => {               │
     │   // 배치로 여러 소환사 조회                                                             │
     │   const summoners = await SummonerService.getByPuuids(puuids);                           │
     │   return puuids.map(puuid => summoners.find(s => s.puuid === puuid));                    │
     │ });                                                                                      │
     │                                                                                          │
     │ Phase 3: WebSocket & 실시간 기능 (2주)                                                   │
     │                                                                                          │
     │ 목표: GraphQL Subscription을 통한 실시간 기능 구현                                       │
     │                                                                                          │
     │ 3.1 WebSocket 서버 구축                                                                  │
     │                                                                                          │
     │ - graphql-ws 라이브러리로 WebSocket 서버 구성                                            │
     │ - 기존 HTTP 서버와 포트 공유                                                             │
     │ - PubSub 엔진 구현 (초기: 메모리, 확장: Redis)                                           │
     │                                                                                          │
     │ 3.2 실시간 기능 우선순위                                                                 │
     │                                                                                          │
     │ 1. 새 매치 감지 알림                                                                     │
     │ subscription {                                                                           │
     │   newMatchDetected(puuid: "player123") {                                                 │
     │     matchId                                                                              │
     │     gameMode                                                                             │
     │     participants                                                                         │
     │   }                                                                                      │
     │ }                                                                                        │
     │ 2. 실시간 랭킹 업데이트                                                                  │
     │ 3. 메타 변화 알림                                                                        │
     │                                                                                          │
     │ Phase 4: 프론트엔드 통합 & 최적화 (2주)                                                  │
     │                                                                                          │
     │ 목표: 클라이언트 사이드 GraphQL 통합 및 성능 최적화                                      │
     │                                                                                          │
     │ 4.1 클라이언트 라이브러리 도입                                                           │
     │                                                                                          │
     │ - Apollo Client 또는 URQL 선택                                                           │
     │ - 기존 HTTP 클라이언트와 병행 운영                                                       │
     │ - 점진적 프론트엔드 리팩토링                                                             │
     │                                                                                          │
     │ 4.2 성능 최적화                                                                          │
     │                                                                                          │
     │ - Apollo Client 캐싱 전략 수립                                                           │
     │ - Persisted Queries 도입 검토                                                            │
     │ - Bundle 크기 최적화                                                                     │
     │                                                                                          │
     │ ---                                                                                      │
     │ 📈 예상 효과 및 ROI                                                                      │
     │                                                                                          │
     │ 정량적 효과                                                                              │
     │                                                                                          │
     │ - 네트워크 요청 감소: 60-75% (평균 3.5개 → 1개)                                          │
     │ - 데이터 전송량 감소: 30-50% (필요 필드만 전송)                                          │
     │ - 초기 페이지 로딩 속도: 20-30% 개선                                                     │
     │ - 모바일 데이터 사용량: 40% 절약                                                         │
     │                                                                                          │
     │ 정성적 효과                                                                              │
     │                                                                                          │
     │ - 실시간 사용자 경험: 새로고침 없는 데이터 업데이트                                      │
     │ - 개발 생산성: 타입 안전한 API, 자동 문서화                                              │
     │ - 확장성: 새로운 클라이언트 요구사항에 유연한 대응                                       │
     │                                                                                          │
     │ ---                                                                                      │
     │ 🛡️ 리스크 관리 전략                                                                      │
     │                                                                                          │
     │ 기술적 리스크                                                                            │
     │                                                                                          │
     │ 1. N+1 문제: DataLoader 패턴 필수 구현                                                   │
     │ 2. 쿼리 복잡도: graphql-depth-limit로 제한                                               │
     │ 3. 성능 모니터링: Apollo Studio 또는 커스텀 메트릭                                       │
     │                                                                                          │
     │ 운영 리스크                                                                              │
     │                                                                                          │
     │ 1. 단계적 롤백: 각 Phase별 독립적 롤백 가능                                              │
     │ 2. A/B 테스트: GraphQL vs REST 성능 비교                                                 │
     │ 3. 모니터링 강화: 실시간 성능/에러 추적                                                  │
     │                                                                                          │
     │ ---                                                                                      │
     │ 💰 리소스 투입 계획                                                                      │
     │                                                                                          │
     │ 개발 시간                                                                                │
     │                                                                                          │
     │ - 총 소요시간: 9주 (약 2.25개월)                                                         │
     │ - 핵심 개발자: 1-2명                                                                     │
     │ - QA 및 테스트: 각 Phase마다 1주                                                         │
     │                                                                                          │
     │ 인프라 비용                                                                              │
     │                                                                                          │
     │ - 추가 서버 비용: 없음 (기존 서버 활용)                                                  │
     │ - 모니터링 도구: Apollo Studio (무료 플랜)                                               │
     │ - 개발 도구: GraphQL Playground (무료)                                                   │
     │                                                                                          │
     │ ---                                                                                      │
     │ 🎯 성공 지표 (KPI)                                                                       │
     │                                                                                          │
     │ Phase 1 완료 기준                                                                        │
     │                                                                                          │
     │ - GraphQL Playground에서 기본 쿼리 실행 가능                                             │
     │ - 기존 REST API 100% 정상 동작                                                           │
     │ - TypeScript 컴파일 에러 0개                                                             │
     │                                                                                          │
     │ Phase 2 완료 기준                                                                        │
     │                                                                                          │
     │ - 소환사 페이지 GraphQL 전환 완료                                                        │
     │ - API 응답 시간 20% 개선                                                                 │
     │ - 네트워크 요청 수 70% 감소                                                              │
     │                                                                                          │
     │ Phase 3 완료 기준                                                                        │
     │                                                                                          │
     │ - 실시간 알림 기능 동작                                                                  │
     │ - WebSocket 연결 안정성 99% 이상                                                         │
     │ - 메모리 사용량 증가 10% 미만                                                            │
     │                                                                                          │
     │ Phase 4 완료 기준                                                                        │
     │                                                                                          │
     │ - 프론트엔드 GraphQL 통합 완료                                                           │
     │ - 전체 페이지 로딩 속도 25% 개선                                                         │
     │ - 사용자 만족도 조사 실시                                                                │
     │                                                                                          │
     │ 이 계획은 현재 운영 중인 시스템의 안정성을 보장하면서도, 점진적으로 현대적인 API         │
     │ 아키텍처로 발전시킬 수 있는 현실적이고 구체적인 로드맵입니다.