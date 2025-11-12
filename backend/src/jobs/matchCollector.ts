// backend/src/jobs/matchCollector.ts
import { getChallengerLeague, getSummonerByPuuid, getSummonerById, getAccountByPuuid, getMatchIdsByPUUID, getMatchDetail, getFlexibleHighTierPlayers } from '../services/riotApi';
import Match from '../models/Match';
import Ranker from '../models/Ranker';
import { getTFTDataWithLanguage } from '../services/tftData';
import { DEFAULT_REGION, MATCH_COLLECTOR_MATCH_COUNT, TOP_RANKER_COUNT, MATCH_DETAIL_PROCESS_LIMIT, MIN_TIER_FOR_COLLECTION, FLEXIBLE_RANKING_ENABLED } from '../services/constants';
import { isMongoConnected } from '../config/db';
import logger from '../config/logger';

const delay = (ms: number): Promise<void> => new Promise(res => setTimeout(res, ms));

export const collectTopRankerMatches = async (): Promise<void> => {
  // MongoDB 연결 상태 확인
  if (!isMongoConnected()) {
    logger.warn('[Match Collector] MongoDB 연결이 끊어진 상태입니다. 작업을 건너뜁니다.');
    return;
  }

  try {
    logger.info('[Match Collector] 작업 시작 - MongoDB 연결 확인됨');
    const tftData = await getTFTDataWithLanguage('ko');
    if (!tftData) {
      logger.error('[Match Collector] TFT 데이터를 불러오지 못해 랭커 데이터 수집을 중단합니다.');
      return;
    }
    const currentSet = tftData.currentSet;
    console.log(`--- [최종] 랭커 및 매치 데이터 수집 작업 시작 (시즌 ${currentSet} 대상) ---`);

    // 증분 업데이트: 기존 데이터를 삭제하지 않고 챌린저에서 제외된 랭커만 표시
    console.log('[0단계] 증분 업데이트 모드 - 기존 데이터 유지');
    
    // 현재 챌린저 리그에 있는 모든 puuid 수집
    const currentChallengerPuuids = new Set<string>();

    // 1단계: 유연한 랭커 목록 확보 (시즌 초기 대응)
    console.log(`[1단계 시작] 유연한 랭킹 시스템으로 상위 랭커 ${TOP_RANKER_COUNT}명 확보 시도...`);
    
    let rankingResult;
    try {
      // 🚀 새로운 유연한 랭킹 시스템 사용
      rankingResult = await getFlexibleHighTierPlayers(DEFAULT_REGION, TOP_RANKER_COUNT, MIN_TIER_FOR_COLLECTION);
      
      console.log(`✅ ${rankingResult.usedTier} 티어에서 ${rankingResult.totalPlayers}명 확보`);
      console.log(`📊 사용된 데이터 소스: ${rankingResult.source.toUpperCase()}`);
      
    } catch (flexibleError) {
      // 유연한 시스템도 실패하면 기존 방식으로 폴백
      console.warn(`⚠️ 유연한 랭킹 시스템 실패: ${(flexibleError as Error).message}`);
      console.log('📦 기존 챌린저 시스템으로 폴백 시도...');
      
      try {
        const challengerLeague = await getChallengerLeague(DEFAULT_REGION);
        const topRankers = challengerLeague.entries.slice(0, TOP_RANKER_COUNT);
        
        rankingResult = {
          players: topRankers.map(entry => ({
            puuid: (entry as any).puuid,
            summonerId: (entry as any).summonerId,
            leaguePoints: entry.leaguePoints,
            tier: challengerLeague.tier,
            rank: entry.rank,
            wins: entry.wins,
            losses: entry.losses
          })),
          usedTier: 'Challenger (Fallback)',
          totalPlayers: topRankers.length,
          source: 'challenger' as const
        };
        
        console.log(`✅ 폴백 성공: 챌린저 ${rankingResult.totalPlayers}명 확보`);
      } catch (challengerError) {
        console.error(`❌ 모든 랭킹 시스템 실패: ${(challengerError as Error).message}`);
        throw new Error('랭킹 데이터를 전혀 가져올 수 없습니다');
      }
    }
    
    const topRankers = rankingResult.players;
    
    // 현재 고티어 리그에 있는 puuid들을 Set에 추가
    topRankers.forEach(player => currentChallengerPuuids.add(player.puuid));
    
    console.log(`[1단계 완료] ${rankingResult.usedTier} ${topRankers.length}명의 랭커 데이터 확보.`);

    // 2단계: 랭커 프로필 업데이트 (배치 처리)
    console.log(`[2단계 시작] ${rankingResult.usedTier} ${topRankers.length}명의 프로필 업데이트 시작...`);
    
    // 프로필 데이터를 배치로 수집 (Rate Limit 최적화)
    const profileDataPromises: Array<{
      puuid: string;
      summonerId: string;
      summonerName: string;
      gameName: string;
      tagLine: string;
      profileIconId: number;
      leaguePoints: number;
      tier: string;
      rank: string;
      wins: number;
      losses: number;
    }> = [];
    const BATCH_SIZE = 5; // 동시 처리할 요청 수 (10 -> 5로 축소)
    
    for (let i = 0; i < topRankers.length; i += BATCH_SIZE) {
      const batch = topRankers.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (player: any) => {
        try {
          // Diamond/Platinum 등은 summonerId만 있고 puuid가 없을 수 있음
          let puuid = player.puuid;
          let summonerDetails;
          
          if (puuid && puuid.length > 50) {
            // puuid가 있는 경우 (Challenger, Grandmaster, Master)
            summonerDetails = await getSummonerByPuuid(puuid, DEFAULT_REGION);
          } else {
            // summonerId만 있는 경우 (Diamond, Platinum, Gold)
            console.log(`⚠️ PUUID 없음, summonerId로 조회: ${player.summonerId}`);
            
            try {
              // summonerId로 summoner 정보를 가져와서 puuid 획득
              summonerDetails = await getSummonerById(player.summonerId, DEFAULT_REGION);
              puuid = summonerDetails.puuid;
              console.log(`✅ summonerId -> puuid 변환 성공: ${player.summonerId.substring(0, 8)}...`);
            } catch (summonerError) {
              console.warn(`⚠️ summonerId 조회 실패, 임시 데이터 사용: ${player.summonerId.substring(0, 8)}...`);
              // 임시 데이터로 대체
              puuid = player.summonerId;
              summonerDetails = {
                puuid: player.summonerId,
                id: player.summonerId,
                name: `Player_${player.summonerId.substring(0, 8)}`,
                profileIconId: 1
              };
            }
          }
          
          await delay(1200); // 918ms -> 1200ms (더 안전한 딜레이)
          
          let accountData;
          try {
            accountData = await getAccountByPuuid(puuid, DEFAULT_REGION);
          } catch (accountError) {
            console.warn(`⚠️ Account 정보 조회 실패: ${player.summonerId.substring(0, 8)}...`);
            accountData = {
              gameName: `Player_${player.summonerId.substring(0, 8)}`,
              tagLine: 'KR1'
            };
          }
          
          await delay(1200); // 918ms -> 1200ms (더 안전한 딜레이)
          
          return {
            puuid: puuid,
            summonerId: player.summonerId,
            summonerName: (summonerDetails as any).name || accountData.gameName,
            gameName: accountData.gameName,
            tagLine: accountData.tagLine,
            profileIconId: (summonerDetails as any).profileIconId || 1,
            leaguePoints: player.leaguePoints,
            tier: player.tier,
            rank: player.rank,
            wins: player.wins,
            losses: player.losses,
          };
        } catch (e) {
          const error = e as Error;
          console.error(`[2단계 - 에러] 랭커 ID: ${player.summonerId?.substring(0,10)}... 프로필 처리 중 에러: ${error.message}`);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      profileDataPromises.push(...batchResults.filter(data => data !== null));
      
      // 배치 간 딜레이 (Rate Limit 안전성 향상)
      if (i + BATCH_SIZE < topRankers.length) {
        await delay(3000); // 2000ms -> 3000ms (더 안전한 배치 간 딜레이)
      }
    }
    
    // MongoDB 벌크 업데이트 실행
    if (profileDataPromises.length > 0) {
      const bulkOps = profileDataPromises.map(data => ({
        updateOne: {
          filter: { puuid: data.puuid },
          update: { $set: data },
          upsert: true
        }
      }));
      
      const result = await Ranker.bulkWrite(bulkOps);
      console.log(`[2단계 완료] ${result.upsertedCount}명 신규 등록, ${result.modifiedCount}명 업데이트 완료.`);
    } else {
      console.log('[2단계 완료] 업데이트할 프로필이 없습니다.');
    }

    // 3단계: 매치 ID 수집
    console.log('[3단계 시작] 매치 ID 수집 시작...');
    const rankersFromDB = await Ranker.find({}).limit(10).sort({ leaguePoints: -1 });
    let allMatchIds: string[] = [];
    for (const ranker of rankersFromDB) {
      if (!ranker.puuid) continue;
      // console.log(`[3단계 - 매치 ID 수집] 랭커 ${ranker.summonerName}의 매치 ID 가져오는 중...`); // 상세 로그 제거
      const matchIds = await getMatchIdsByPUUID(ranker.puuid, MATCH_COLLECTOR_MATCH_COUNT, DEFAULT_REGION); // 최근 5개 매치 ID
      await delay(1080); // API 호출 후 딜레이

      for (const matchId of matchIds) {
        const existingMatch = await Match.findOne({ 'metadata.match_id': matchId });
        if (existingMatch) {
          // DB에 이미 존재하는 매치를 발견하면, 해당 랭커에 대한 매치 ID 수집을 중단
          break;
        } else {
          allMatchIds.push(matchId);
        }
      }
    }
    
    const uniqueMatchIds = [...new Set(allMatchIds)];
    console.log(`[3단계 완료] 총 ${uniqueMatchIds.length}개의 고유 매치 ID 확보.`);

    // 4단계: 매치 상세 정보 저장
    console.log('[4단계 시작] 매치 상세 정보 저장 시작...');
    const limitedMatchIds = uniqueMatchIds.slice(0, MATCH_DETAIL_PROCESS_LIMIT); // 최대 50개 매치만 처리
    console.log(`[4단계 - 처리 대상] 총 ${limitedMatchIds.length}개의 매치 상세 정보 조회를 시작합니다.`);

    for (const matchId of limitedMatchIds) {
      try {
        const existingMatch = await Match.findOne({ 'metadata.match_id': matchId });
        if (existingMatch) {
          // console.log(`[4단계 - 매치 상세] 🟡 매치 ${matchId.substring(0, 8)}... 이미 DB에 존재하여 건너뜀.`); // 상세 로그 제거
          continue;
        }

        // console.log(`[4단계 - 매치 상세] 매치 ${matchId.substring(0, 8)}... 상세 정보 가져오는 중...`); // 상세 로그 제거
        const matchDetail = await getMatchDetail(matchId, DEFAULT_REGION);
        await delay(1500); // API 호출 후 딜레이 (1080ms -> 1500ms)
        
        const matchDataVersion = matchDetail?.metadata?.data_version;
        if (!matchDataVersion || !matchDetail?.info?.game_length || matchDetail.info.game_length < 1) {
          // console.log(`[4단계 - 매치 상세] 🟠 매치 ${matchId.substring(0, 8)}... 유효하지 않은 데이터 (버전, 길이 등)로 건너뜀.`); // 상세 로그 제거
          continue;
        }

        // upsert 사용으로 중복 키 에러 방지
        await Match.findOneAndUpdate(
          { 'metadata.match_id': matchDetail.metadata.match_id },
          matchDetail,
          { upsert: true, new: true }
        );
      } catch (detailError) {
        const error = detailError as any;
        if (error.isAxiosError && error.response) {
            if (error.response.status === 404) {
                console.warn(`[4단계 - 매치 상세] ⚠️ 매치 ${matchId.substring(0, 8)}... Riot API에서 찾을 수 없음 (404).`);
            } else if (error.response.status === 429) {
                console.error(`[4단계 - 매치 상세] 🔴 매치 ${matchId.substring(0, 8)}... Riot API Rate Limit 초과 (429). 잠시 후 재시도 필요.`);
            } else {
                console.error(`[4단계 - 매치 상세] 🚨 매치 ${matchId.substring(0, 8)}... Riot API 에러 (${error.response.status}):`, error.message, error.response.data);
            }
        } else if (error.name === 'MongoServerError' && error.code === 11000) {
            // 중복 키 에러 처리 - 무시하고 계속 진행
            console.log(`[4단계 - 매치 상세] 🟡 매치 ${matchId.substring(0, 8)}... 이미 DB에 존재함 (중복 키).`);
        } else {
            console.error(`[4단계 - 매치 상세] ❌ 매치 ${matchId.substring(0, 8)}... 처리 중 예상치 못한 에러:`, error.message);
        }
        await delay(1500); // 에러 발생 시에도 딜레이 (1080ms -> 1500ms)
      }
    }
    console.log('[4단계 완료] 모든 매치 데이터 수집 완료.');
    
    // 5단계: 챌린저에서 제외된 랭커 처리 (증분 업데이트)
    console.log('[5단계 시작] 챌린저에서 제외된 랭커 처리...');
    
    // 현재 DB에 있는 모든 랭커 중 더 이상 챌린저가 아닌 랭커들을 찾음
    const allRankersInDB = await Ranker.find({}, 'puuid');
    const droppedRankers = allRankersInDB.filter(ranker => !currentChallengerPuuids.has(ranker.puuid));
    
    if (droppedRankers.length > 0) {
      // 챌린저에서 제외된 랭커들을 마스터로 표시 (삭제하지 않고 유지)
      const bulkOps = droppedRankers.map(ranker => ({
        updateOne: {
          filter: { puuid: ranker.puuid },
          update: { 
            $set: { 
              tier: 'MASTER',
              droppedFromChallenger: true,
              droppedAt: new Date()
            } 
          }
        }
      }));
      
      const result = await Ranker.bulkWrite(bulkOps);
      console.log(`[5단계 완료] ${result.modifiedCount}명의 랭커가 챌린저에서 제외되어 마스터로 변경됨.`);
    } else {
      console.log('[5단계 완료] 챌린저에서 제외된 랭커가 없습니다.');
    }

  } catch (error) {
    console.error('🚨 데이터 수집 작업 중 치명적인 에러 발생:', error);
  }
};