// backend/src/jobs/matchCollector.ts
import { getChallengerLeague, getSummonerByPuuid, getAccountByPuuid, getMatchIdsByPUUID, getMatchDetail } from '../services/riotApi';
import Match from '../models/Match';
import Ranker from '../models/Ranker';
import { getTFTDataWithLanguage } from '../services/tftData';
import { DEFAULT_REGION, MATCH_COLLECTOR_MATCH_COUNT, TOP_RANKER_COUNT, MATCH_DETAIL_PROCESS_LIMIT } from '../services/constants';
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

    // 1단계: 랭커 목록 확보
    const challengerLeague = await getChallengerLeague(DEFAULT_REGION);
    const topRankers = challengerLeague.entries.slice(0, TOP_RANKER_COUNT);
    
    // 현재 챌린저 리그에 있는 puuid들을 Set에 추가
    topRankers.forEach(entry => currentChallengerPuuids.add((entry as any).puuid));
    
    console.log(`[1단계 완료] 챌린저 ${topRankers.length}명의 랭커 데이터 확보.`);

    // 2단계: 랭커 프로필 업데이트 (배치 처리)
    console.log(`[2단계 시작] 챌린저 ${topRankers.length}명의 프로필 업데이트 시작...`);
    
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
      const batchPromises = batch.map(async (entry: any) => {
        try {
          const summonerDetails = await getSummonerByPuuid(entry.puuid, DEFAULT_REGION);
          await delay(1200); // 918ms -> 1200ms (더 안전한 딜레이)
          
          const accountData = await getAccountByPuuid(summonerDetails.puuid, DEFAULT_REGION);
          await delay(1200); // 918ms -> 1200ms (더 안전한 딜레이)
          
          return {
            puuid: summonerDetails.puuid,
            summonerId: summonerDetails.id,
            summonerName: (summonerDetails as any).name,
            gameName: accountData.gameName,
            tagLine: accountData.tagLine,
            profileIconId: summonerDetails.profileIconId,
            leaguePoints: entry.leaguePoints,
            tier: challengerLeague.tier,
            rank: entry.rank,
            wins: entry.wins,
            losses: entry.losses,
          };
        } catch (e) {
          const error = e as Error;
          console.error(`[2단계 - 에러] 랭커 PUUID: ${entry.puuid.substring(0,10)}... 프로필 처리 중 에러: ${error.message}`);
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