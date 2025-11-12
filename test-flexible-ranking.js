#!/usr/bin/env node

/**
 * 유연한 랭킹 시스템 테스트 스크립트
 * 
 * 이 스크립트는 새로운 유연한 랭킹 시스템이 제대로 작동하는지 테스트합니다.
 * Set 15 시즌 초기 상황에서 Challenger가 없을 때 자동으로 하위 티어로 내려가는지 확인합니다.
 */

require('dotenv').config();

// ESM import 에뮬레이션
async function loadESMModules() {
  // 동적 import로 ESM 모듈들을 로드
  const { getFlexibleHighTierPlayers } = await import('./backend/dist/services/riotApi.js');
  const { connectDB } = await import('./backend/dist/config/db.js');
  
  return { getFlexibleHighTierPlayers, connectDB };
}

async function testFlexibleRanking() {
  console.log('🚀 유연한 랭킹 시스템 테스트 시작\n');
  
  try {
    const { getFlexibleHighTierPlayers, connectDB } = await loadESMModules();
    
    // MongoDB 연결 (필요시)
    // await connectDB();
    
    console.log('📊 테스트 시나리오별 실행...\n');
    
    // 시나리오 1: 기본 설정 (플래티넘 이상, 50명)
    console.log('=== 시나리오 1: 기본 설정 ===');
    try {
      const result1 = await getFlexibleHighTierPlayers('kr', 50, 'PLATINUM');
      console.log(`✅ 성공: ${result1.usedTier}에서 ${result1.totalPlayers}명 확보`);
      console.log(`📊 데이터 소스: ${result1.source}`);
      console.log(`🏆 첫 번째 플레이어 LP: ${result1.players[0]?.leaguePoints || 'N/A'}`);
    } catch (error) {
      console.error(`❌ 실패: ${error.message}`);
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
    
    // 시나리오 2: 더 낮은 티어까지 허용 (골드 이상, 30명)
    console.log('=== 시나리오 2: 골드 이상 허용 ===');
    try {
      const result2 = await getFlexibleHighTierPlayers('kr', 30, 'GOLD');
      console.log(`✅ 성공: ${result2.usedTier}에서 ${result2.totalPlayers}명 확보`);
      console.log(`📊 데이터 소스: ${result2.source}`);
      console.log(`🏆 상위 3명 LP: ${result2.players.slice(0, 3).map(p => p.leaguePoints).join(', ')}`);
    } catch (error) {
      console.error(`❌ 실패: ${error.message}`);
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
    
    // 시나리오 3: 많은 수 요청 (100명)
    console.log('=== 시나리오 3: 대용량 요청 (100명) ===');
    try {
      const result3 = await getFlexibleHighTierPlayers('kr', 100, 'PLATINUM');
      console.log(`✅ 성공: ${result3.usedTier}에서 ${result3.totalPlayers}명 확보`);
      console.log(`📊 데이터 소스: ${result3.source}`);
      
      // 티어별 분포 분석
      const tierDistribution = {};
      result3.players.forEach(player => {
        const tierKey = `${player.tier} ${player.rank}`;
        tierDistribution[tierKey] = (tierDistribution[tierKey] || 0) + 1;
      });
      
      console.log('📈 티어 분포:');
      Object.entries(tierDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([tier, count]) => {
          console.log(`   ${tier}: ${count}명`);
        });
        
    } catch (error) {
      console.error(`❌ 실패: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 유연한 랭킹 시스템 테스트 완료!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 직접 실행인지 확인
if (require.main === module) {
  testFlexibleRanking().catch(console.error);
}

module.exports = { testFlexibleRanking };