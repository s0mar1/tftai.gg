/**
 * @fileoverview 시스템 통합 테스트 스크립트
 * @description 백엔드 API, 프론트엔드 서버, 데이터 타입 정합성을 포함한 전체 시스템의 
 *              통합 테스트를 수행하는 스크립트입니다.
 * @purpose 
 *   • 주요 백엔드 API 엔드포인트 동작 검증 (tierlist, tft-data, items-by-category)
 *   • 프론트엔드 서버 접근성 테스트
 *   • API 응답 데이터의 타입 정합성 검증
 *   • 시스템 전체 연결성 및 안정성 확인
 * @usage node scripts/test/integration/system-integration-test.js
 * @requirements 
 *   • 백엔드 서버가 localhost:4001에서 실행 중이어야 함
 *   • 프론트엔드 서버가 localhost:5173에서 실행 중이어야 함
 *   • Node.js 18+ (내장 fetch 사용)
 *   • 모든 필수 API 엔드포인트가 활성화되어 있어야 함
 * @author TFT Meta Analyzer Team
 */

// 통합 테스트 스크립트
async function testIntegration() {
  console.log('🔍 통합 테스트 시작...');
  
  // 1. 백엔드 API 테스트
  console.log('\n1. 백엔드 API 테스트');
  try {
    // Node.js 18+ 내장 fetch 사용
    const tierlistResponse = await fetch('http://localhost:4001/api/tierlist/ko');
    const tierlistData = await tierlistResponse.json();
    console.log('✅ Tierlist API:', tierlistData.success ? 'OK' : 'Failed');
    console.log('  - 데이터 개수:', tierlistData.data?.length || 0);
    
    const tftDataResponse = await fetch('http://localhost:4001/api/static-data/tft-data/ko');
    const tftData = await tftDataResponse.json();
    console.log('✅ TFT Data API:', tftData.success ? 'OK' : 'Failed');
    console.log('  - 챔피언 수:', tftData.data?.champions?.length || 0);
    console.log('  - 특성 수:', tftData.data?.traits?.length || 0);
    
    const itemsResponse = await fetch('http://localhost:4001/api/static-data/items-by-category/ko');
    const itemsData = await itemsResponse.json();
    console.log('✅ Items API:', itemsData.success ? 'OK' : 'Failed');
    console.log('  - 아이템 카테고리 수:', itemsData.data ? Object.keys(itemsData.data).length : 0);
    
  } catch (error) {
    console.error('❌ 백엔드 API 테스트 실패:', error.message);
    return;
  }
  
  // 2. 프론트엔드 접근성 테스트
  console.log('\n2. 프론트엔드 접근성 테스트');
  try {
    const frontendResponse = await fetch('http://localhost:5173');
    if (frontendResponse.ok) {
      console.log('✅ 프론트엔드 서버 접근 가능');
    } else {
      console.log('❌ 프론트엔드 서버 접근 불가');
    }
  } catch (error) {
    console.error('❌ 프론트엔드 접근 테스트 실패:', error.message);
  }
  
  // 3. 타입 정합성 테스트
  console.log('\n3. 타입 정합성 테스트');
  try {
    // 타입 일치 여부 확인 (간단한 키 비교)
    const tierlistResponse = await fetch('http://localhost:4001/api/tierlist/ko');
    const tierlistData = await tierlistResponse.json();
    
    if (tierlistData.success && tierlistData.data?.length > 0) {
      const firstDeck = tierlistData.data[0];
      const requiredFields = ['deckKey', 'tierRank', 'carryChampionName', 'mainTraitName'];
      const hasAllFields = requiredFields.every(field => firstDeck.hasOwnProperty(field));
      
      if (hasAllFields) {
        console.log('✅ 타입 정합성 확인됨');
        console.log('  - 필수 필드 모두 존재:', requiredFields.join(', '));
      } else {
        console.log('❌ 타입 정합성 불일치');
        console.log('  - 누락된 필드:', requiredFields.filter(field => !firstDeck.hasOwnProperty(field)));
      }
    }
    
  } catch (error) {
    console.error('❌ 타입 정합성 테스트 실패:', error.message);
  }
  
  console.log('\n🎉 통합 테스트 완료!');
}

// 실행
testIntegration().catch(console.error);