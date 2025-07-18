/**
 * @fileoverview TFTDataContext 수동 테스트 스크립트
 * @description TFTDataContext의 전체 데이터 로딩 및 처리 로직을 수동으로 시뮬레이션하여
 *              실제 컨텍스트 동작과 동일한 과정을 테스트하는 스크립트입니다.
 * @purpose 
 *   • TFT 메타 데이터와 아이템 카테고리 데이터 동시 로딩 테스트
 *   • 두 API 응답의 구조 및 성공 여부 검증
 *   • Map 객체 변환 및 데이터 추출 전체 과정 테스트
 *   • TFTDataContext 로직의 전체 플로우 검증
 * @usage node scripts/test/frontend/context-manual-test.js
 * @requirements 
 *   • 백엔드 서버가 localhost:4001에서 실행 중이어야 함
 *   • Node.js 18+ (내장 fetch 사용)
 *   • /api/static-data/tft-data 및 /api/static-data/items-by-category 엔드포인트 활성화
 * @author TFT Meta Analyzer Team
 */

// 수동으로 TFTDataContext 로직 테스트
console.log('=== Manual TFTDataContext Test ===');

Promise.all([
  fetch('http://localhost:4001/api/static-data/tft-data').then(r => r.json()),
  fetch('http://localhost:4001/api/static-data/items-by-category').then(r => r.json())
]).then(([tftMetaResponse, itemsByCategoryResponse]) => {
  console.log('TFT Meta Response:', {
    success: tftMetaResponse.success,
    hasData: !!tftMetaResponse.data,
    dataKeys: Object.keys(tftMetaResponse.data || {})
  });
  
  console.log('Items by Category Response:', {
    success: itemsByCategoryResponse.success,
    hasData: !!itemsByCategoryResponse.data,
    dataKeys: Object.keys(itemsByCategoryResponse.data || {})
  });
  
  const receivedTftData = tftMetaResponse.data;
  
  if (!receivedTftData || !receivedTftData.traitMap || !receivedTftData.nameMap) {
    console.error('❌ Invalid TFT data structure');
    return;
  }
  
  try {
    console.log('Testing Map conversions...');
    const rehydratedTraitMap = new Map(receivedTftData.traitMap);
    const rehydratedKrNameMap = new Map(receivedTftData.nameMap);
    
    console.log('✅ Maps created successfully', {
      traitMapSize: rehydratedTraitMap.size,
      nameMapSize: rehydratedKrNameMap.size
    });
    
    const extractedTraits = Array.from(rehydratedTraitMap.entries()).map(([apiName, traitData]) => ({
      ...traitData,
      apiName: apiName
    }));
    
    console.log('✅ Traits extracted successfully', {
      count: extractedTraits.length,
      firstTrait: extractedTraits[0]?.name
    });
    
    console.log('✅ All TFT data processing successful');
  } catch (error) {
    console.error('❌ Error in data processing:', error);
  }
}).catch(error => {
  console.error('❌ API Error:', error);
});