/**
 * MongoDB 컬렉션 상태 확인 스크립트
 */

import mongoose from 'mongoose';
import Match from '../src/models/Match.js';
import DeckTier from '../src/models/DeckTier.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tft-meta';

async function checkDbStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB 연결 성공');

    console.log('\n=== DeckTier 컬렉션 상태 ===');
    const deckCount = await DeckTier.countDocuments();
    console.log('총 DeckTier 문서 수:', deckCount);

    if (deckCount > 0) {
      const sampleDeck = await DeckTier.findOne();
      console.log('\n샘플 DeckTier 데이터:');
      console.log('- deckKey:', sampleDeck?.deckKey);
      console.log('- tierRank:', sampleDeck?.tierRank);
      console.log('- carryChampionName.ko:', sampleDeck?.carryChampionName?.ko);
      console.log('- averagePlacement:', sampleDeck?.averagePlacement);
      console.log('- totalGames:', sampleDeck?.totalGames);
      console.log('- coreUnits 수:', sampleDeck?.coreUnits?.length || 0);
      if (sampleDeck?.coreUnits?.length > 0) {
        console.log('- 첫 번째 coreUnit traits:', sampleDeck.coreUnits[0]?.traits);
      }
      console.log('\n전체 데이터 구조:');
      console.log(JSON.stringify(sampleDeck, null, 2));
    }

    console.log('\n=== Match 컬렉션 상태 ===');
    const matchCount = await Match.countDocuments();
    console.log('총 Match 문서 수:', matchCount);

    if (matchCount > 0) {
      const sampleMatch = await Match.findOne();
      console.log('\n샘플 Match 데이터 (간략):');
      console.log('- matchId:', sampleMatch?.metadata?.match_id);
      console.log('- gameDateTime:', sampleMatch?.info?.game_datetime);
      console.log('- participantCount:', sampleMatch?.info?.participants?.length || 0);
    }

    console.log('\n✅ 데이터베이스 상태 확인 완료');
  } catch (error) {
    console.error('❌ 데이터베이스 확인 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 해제');
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDbStatus();
}

export default checkDbStatus;