/**
 * @fileoverview 프론트엔드 데이터 처리 테스트 스크립트
 * @description 백엔드 API에서 받은 데이터를 프론트엔드에서 처리하는 로직을 테스트하는 스크립트입니다.
 *              특히 Map 객체 직렬화/역직렬화 과정과 데이터 추출 로직을 검증합니다.
 * @purpose 
 *   • traitMap과 nameMap의 타입 및 배열 구조 검증
 *   • 배열을 Map 객체로 변환하는 로직 테스트
 *   • Map 변환 후 데이터 추출 과정 테스트
 *   • 프론트엔드 데이터 처리 파이프라인 검증
 * @usage node scripts/test/frontend/data-processing-test.js
 * @requirements 
 *   • 백엔드 서버가 localhost:4001에서 실행 중이어야 함
 *   • Node.js 18+ (내장 fetch 사용)
 * @author TFT Meta Analyzer Team
 */

// 프론트엔드 데이터 처리 테스트
fetch('http://localhost:4001/api/static-data/tft-data')
  .then(response => response.json())
  .then(data => {
    console.log('Testing frontend data processing...');
    
    const receivedTftData = data.data;
    console.log('receivedTftData.traitMap type:', typeof receivedTftData.traitMap);
    console.log('receivedTftData.traitMap is array:', Array.isArray(receivedTftData.traitMap));
    console.log('receivedTftData.nameMap type:', typeof receivedTftData.nameMap);
    console.log('receivedTftData.nameMap is array:', Array.isArray(receivedTftData.nameMap));
    
    if (Array.isArray(receivedTftData.traitMap)) {
      console.log('traitMap first item:', receivedTftData.traitMap[0]);
    }
    
    if (Array.isArray(receivedTftData.nameMap)) {
      console.log('nameMap first item:', receivedTftData.nameMap[0]);
    }
    
    // Map 변환 테스트
    try {
      const rehydratedTraitMap = new Map(receivedTftData.traitMap);
      console.log('✅ TraitMap conversion successful, size:', rehydratedTraitMap.size);
    } catch (error) {
      console.log('❌ TraitMap conversion failed:', error.message);
    }
    
    try {
      const rehydratedKrNameMap = new Map(receivedTftData.nameMap);
      console.log('✅ NameMap conversion successful, size:', rehydratedKrNameMap.size);
    } catch (error) {
      console.log('❌ NameMap conversion failed:', error.message);
    }
    
    console.log('Extraction test - traits array creation...');
    try {
      const tempTraitMap = new Map(receivedTftData.traitMap);
      const extractedTraits = Array.from(tempTraitMap.entries()).map(([apiName, traitData]) => ({
        ...traitData,
        apiName: apiName, 
      }));
      console.log('✅ Traits extraction successful, count:', extractedTraits.length);
    } catch (error) {
      console.log('❌ Traits extraction failed:', error.message);
    }
  })
  .catch(error => {
    console.error('❌ API Error:', error);
  });