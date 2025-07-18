/**
 * @fileoverview 프론트엔드 TFTDataContext 디버깅 스크립트
 * @description 백엔드 API 응답 구조와 프론트엔드 TFTDataContext에서 기대하는 데이터 구조를 비교하여
 *              데이터 매핑 문제를 진단하고 디버깅하는 스크립트입니다.
 * @purpose 
 *   • 백엔드 API (/api/static-data/tft-data) 응답 구조 분석
 *   • TFTDataContext에서 기대하는 필드 구조 검증
 *   • traitMap과 nameMap 필드의 존재 여부 및 타입 확인
 *   • 데이터 구조 불일치 문제 진단
 * @usage node scripts/test/frontend/context-debug.js
 * @requirements 
 *   • 백엔드 서버가 localhost:4001에서 실행 중이어야 함
 *   • Node.js 18+ (내장 fetch 사용)
 * @author TFT Meta Analyzer Team
 */

// 프론트엔드 TFTDataContext 디버깅
fetch('http://localhost:4001/api/static-data/tft-data')
  .then(response => response.json())
  .then(data => {
    console.log('=== 백엔드 API 응답 구조 ===');
    const extractedData = data.data;
    console.log('주요 필드들:');
    console.log('- champions:', extractedData.champions ? 'exists' : 'missing', extractedData.champions?.length);
    console.log('- traitMap:', extractedData.traitMap ? 'exists' : 'missing', Array.isArray(extractedData.traitMap));
    console.log('- nameMap:', extractedData.nameMap ? 'exists' : 'missing', Array.isArray(extractedData.nameMap));
    console.log('- krNameMap:', extractedData.krNameMap ? 'exists' : 'missing');
    console.log('- currentSet:', extractedData.currentSet);
    
    console.log('\n=== TFTDataContext에서 기대하는 구조 ===');
    console.log('TFTDataContext.tsx:120-121에서 접근하려는 필드:');
    console.log('- receivedTftData.traitMap');
    console.log('- receivedTftData.nameMap (→ krNameMap으로 매핑)');
    
    console.log('\n=== 실제 데이터와 기대 구조 비교 ===');
    if (extractedData.traitMap && Array.isArray(extractedData.traitMap)) {
      console.log('✅ traitMap 필드 존재 (배열)');
    } else {
      console.log('❌ traitMap 필드 문제');
    }
    
    if (extractedData.nameMap && Array.isArray(extractedData.nameMap)) {
      console.log('✅ nameMap 필드 존재 (배열)');
    } else {
      console.log('❌ nameMap 필드 문제');
    }
  })
  .catch(error => {
    console.error('API Error:', error);
  });