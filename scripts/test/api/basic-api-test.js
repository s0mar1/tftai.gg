/**
 * 기본 API 테스트 스크립트
 * 
 * @description 백엔드 API의 기본 응답 구조를 확인하는 테스트 스크립트
 * @endpoint /api/static-data/tft-data
 * @purpose 
 *   - API 응답 구조 검증
 *   - 필수 데이터 필드 존재 여부 확인
 *   - 데이터 타입 및 길이 검증
 * 
 * @usage
 *   npm run test:api:basic
 *   또는
 *   node scripts/test/api/basic-api-test.js
 * 
 * @requirements 백엔드 서버가 http://localhost:4001에서 실행 중이어야 함
 * @author TFT Meta Analyzer Team
 */
fetch('http://localhost:4001/api/static-data/tft-data')
  .then(response => response.json())
  .then(data => {
    console.log('API Response Structure:');
    console.log('- success:', data.success);
    console.log('- data exists:', !!data.data);
    console.log('- data.champions exists:', !!data.data?.champions);
    console.log('- data.champions length:', data.data?.champions?.length);
    console.log('- data.traitMap exists:', !!data.data?.traitMap);
    console.log('- data.nameMap exists:', !!data.data?.nameMap);
    
    if (data.data?.traitMap) {
      console.log('- traitMap length:', data.data.traitMap.length);
    }
    if (data.data?.nameMap) {
      console.log('- nameMap length:', data.data.nameMap.length);
    }
  })
  .catch(error => {
    console.error('API Error:', error);
  });