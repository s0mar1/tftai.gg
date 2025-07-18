/**
 * TFT 특성 데이터 확인 스크립트
 * TypeScript로 변환하여 타입 안전성 확보
 */

import axios, { AxiosResponse } from 'axios';

/**
 * TFT 챔피언 데이터 인터페이스
 */
interface TFTChampion {
  name: Record<string, string>;
  apiName: string;
  traits: string[];
  cost?: number;
  image_url?: string;
}

/**
 * TFT 정적 데이터 응답 인터페이스
 */
interface TFTStaticDataResponse {
  champions: TFTChampion[];
  krNameMap?: [string, string][];
  traits?: Record<string, unknown>;
  items?: Record<string, unknown>;
}

/**
 * API 응답 타입 정의
 */
interface ApiResponse {
  data: TFTStaticDataResponse;
  success?: boolean;
  message?: string;
}

/**
 * TFT 특성 데이터를 확인하는 메인 함수
 */
async function checkTraits(): Promise<void> {
  try {
    console.log('🔍 TFT 특성 데이터 확인 시작...');
    
    const response: AxiosResponse<ApiResponse> = await axios.get(
      'http://localhost:4001/api/static-data/tft-data',
      {
        timeout: 10000, // 10초 타임아웃
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TFT-Meta-Analyzer-Script/1.0'
        }
      }
    );
    
    const data = response.data.data;
    
    if (!data || !data.champions || data.champions.length === 0) {
      console.warn('⚠️ 챔피언 데이터가 없습니다.');
      return;
    }
    
    // 첫 번째 챔피언 정보 출력
    const firstChampion = data.champions[0];
    console.log('📋 첫 번째 챔피언:', {
      name: firstChampion.name,
      apiName: firstChampion.apiName,
      traits: firstChampion.traits,
      cost: firstChampion.cost,
      traitsCount: firstChampion.traits?.length || 0
    });
    
    // 두 번째 챔피언 정보 출력 (존재하는 경우)
    if (data.champions.length > 1) {
      const secondChampion = data.champions[1];
      console.log('\n📋 두 번째 챔피언:', {
        name: secondChampion.name,
        apiName: secondChampion.apiName,
        traits: secondChampion.traits,
        cost: secondChampion.cost,
        traitsCount: secondChampion.traits?.length || 0
      });
    }
    
    // 한국어 이름 맵 샘플 출력
    console.log('\n🏷️ 특성 맵 샘플 (처음 5개):');
    const krNameMapEntries = data.krNameMap?.slice(0, 5) || [];
    
    if (krNameMapEntries.length === 0) {
      console.warn('⚠️ 한국어 이름 맵 데이터가 없습니다.');
    } else {
      krNameMapEntries.forEach(([apiName, krName]: [string, string]) => {
        console.log(`  📝 ${apiName} → ${krName}`);
      });
    }
    
    // 통계 정보 출력
    console.log('\n📊 데이터 통계:');
    console.log(`  ✅ 총 챔피언 수: ${data.champions.length}`);
    console.log(`  ✅ 한국어 이름 맵 수: ${data.krNameMap?.length || 0}`);
    
    // 특성 데이터가 없는 챔피언 확인
    const championsWithoutTraits = data.champions.filter(
      (champion: TFTChampion) => !champion.traits || champion.traits.length === 0
    );
    
    if (championsWithoutTraits.length > 0) {
      console.log(`\n⚠️ 특성 데이터가 없는 챔피언: ${championsWithoutTraits.length}개`);
      championsWithoutTraits.slice(0, 3).forEach((champion: TFTChampion) => {
        console.log(`  - ${champion.apiName} (${JSON.stringify(champion.name)})`);
      });
    } else {
      console.log('\n✅ 모든 챔피언에 특성 데이터가 있습니다.');
    }
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
        console.error('   예상 서버 주소: http://localhost:4001');
      } else if (error.response) {
        console.error(`❌ API 오류 (${error.response.status}):`, error.response.data);
      } else if (error.request) {
        console.error('❌ 네트워크 오류:', error.message);
      } else {
        console.error('❌ 요청 설정 오류:', error.message);
      }
    } else {
      console.error('❌ 알 수 없는 오류:', error);
    }
    
    process.exit(1);
  }
}

/**
 * 스크립트 실행 (CLI에서 직접 호출될 때만)
 */
if (require.main === module) {
  checkTraits()
    .then(() => {
      console.log('\n✨ 특성 데이터 확인 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { checkTraits };