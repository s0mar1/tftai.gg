import Match from '../models/Match';
import Ranker from '../models/Ranker';
import { isMongoConnected } from '../config/db';
import logger from '../config/logger';

interface FirstPlaceStat {
  _id: string;
  firstPlaceWins: number;
}

/**
 * DB의 모든 랭커에 대해 1등 횟수를 계산하고 업데이트하는 함수
 * MongoDB Aggregation Pipeline을 사용하여 성능 최적화
 */
export const analyzePlayerStats = async (): Promise<void> => {
  // MongoDB 연결 상태 확인
  if (!isMongoConnected()) {
    logger.warn('[Player Stats Analyzer] MongoDB 연결이 끊어진 상태입니다. 작업을 건너뜁니다.');
    return;
  }

  logger.info('[Player Stats Analyzer] 랭커별 1등 횟수 분석 작업 시작 - MongoDB 연결 확인됨');
  try {
    // Aggregation Pipeline을 사용하여 각 puuid별 1등 횟수 계산
    const firstPlaceStats: FirstPlaceStat[] = await Match.aggregate([
      // participants 배열을 풀어서 각 참가자를 별도의 문서로 만듦
      { $unwind: '$info.participants' },
      
      // 1등만 필터링
      { $match: { 'info.participants.placement': 1 } },
      
      // puuid별로 그룹화하고 카운트
      {
        $group: {
          _id: '$info.participants.puuid',
          firstPlaceWins: { $sum: 1 }
        }
      }
    ]);

    // 통계를 Map으로 변환하여 빠른 조회 가능하게 함
    const statsMap = new Map<string, number>();
    firstPlaceStats.forEach(stat => {
      statsMap.set(stat._id, stat.firstPlaceWins);
    });

    // 모든 랭커의 1등 횟수를 벌크 업데이트
    const bulkOps: Array<{
      updateOne: {
        filter: { puuid: string };
        update: { $set: { firstPlaceWins: number } };
      };
    }> = [];
    const allRankers = await Ranker.find({}, 'puuid');
    
    for (const ranker of allRankers) {
      const wins = statsMap.get(ranker.puuid) || 0;
      bulkOps.push({
        updateOne: {
          filter: { puuid: ranker.puuid },
          update: { $set: { firstPlaceWins: wins } }
        }
      });
    }

    // 벌크 업데이트 실행
    if (bulkOps.length > 0) {
      const result = await Ranker.bulkWrite(bulkOps);
      console.log(`총 ${result.modifiedCount}명의 랭커 통계 업데이트 완료.`);
    }

  } catch (error) {
    const err = error as Error;
    console.error('랭커 통계 분석 중 에러 발생:', err.message);
  } finally {
    console.log('--- 랭커별 1등 횟수 분석 작업 완료 ---');
  }
};