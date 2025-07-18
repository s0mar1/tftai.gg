// MCP 통합 테스트 스크립트
import { mcpService } from '../services/mcpService';
import { dashboardService } from '../services/dashboardService';
import logger from '../config/logger';

async function testMCPIntegration() {
  console.log('=== MCP 통합 테스트 시작 ===');
  
  try {
    // 1. MongoDB 연결 테스트
    console.log('\n--- MongoDB 연결 테스트 ---');
    const dbStats = await mcpService.getDatabaseStats({ type: 'overview' });
    console.log('Database stats:', JSON.stringify(dbStats, null, 2));
    
    // 2. 자연어 쿼리 테스트
    console.log('\n--- 자연어 쿼리 테스트 ---');
    const queries = [
      { query: 'recent matches', collection: 'matches', operation: 'find' },
      { query: 'high rank players', collection: 'players', operation: 'find' },
      { query: 'error logs', collection: 'logs', operation: 'find' },
    ];
    
    for (const queryTest of queries) {
      try {
        console.log(`\n쿼리: "${queryTest.query}"`);
        const result = await mcpService.executeMongoDBQuery(queryTest);
        console.log('결과:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(`쿼리 실패: ${queryTest.query}`, error);
      }
    }
    
    // 3. 컬렉션 목록 조회
    console.log('\n--- 컬렉션 목록 조회 ---');
    const collections = await mcpService.getDatabaseStats({ type: 'collections' });
    console.log('Collections:', JSON.stringify(collections, null, 2));
    
    // 4. 인덱스 정보 조회
    console.log('\n--- 인덱스 정보 조회 ---');
    const indexes = await mcpService.getDatabaseStats({ type: 'indexes' });
    console.log('Indexes:', JSON.stringify(indexes, null, 2));
    
    // 5. 성능 분석 테스트
    console.log('\n--- 성능 분석 테스트 ---');
    const performanceAnalysis = await mcpService.analyzePerformance({ 
      collection: 'matches', 
      timeRange: '1h' 
    });
    console.log('Performance analysis:', JSON.stringify(performanceAnalysis, null, 2));
    
    // 6. 쿼리 설명 테스트
    console.log('\n--- 쿼리 설명 테스트 ---');
    try {
      const explainResult = await mcpService.explainQuery({
        collection: 'matches',
        query: { tier: 'DIAMOND' }
      });
      console.log('Query explanation:', JSON.stringify(explainResult, null, 2));
    } catch (error) {
      console.error('쿼리 설명 실패:', error);
    }
    
    // 7. 대시보드 통합 테스트
    console.log('\n--- 대시보드 통합 테스트 ---');
    const mcpMetrics = await dashboardService.getMCPMetrics();
    console.log('Dashboard MCP metrics:', JSON.stringify(mcpMetrics, null, 2));
    
    // 8. 건강 상태 체크 (MCP 통합)
    console.log('\n--- 건강 상태 체크 ---');
    const healthCheck = await dashboardService.getHealthCheck();
    console.log('Health check:', JSON.stringify(healthCheck, null, 2));
    
    console.log('\n=== MCP 통합 테스트 완료 ===');
    
  } catch (error) {
    console.error('MCP 통합 테스트 실패:', error);
    logger.error('MCP 통합 테스트 실패', error);
  }
}

// 스키마 분석 테스트
async function testSchemaAnalysis() {
  console.log('\n=== 스키마 분석 테스트 ===');
  
  const collections = ['matches', 'players', 'rankings', 'statistics'];
  
  for (const collection of collections) {
    try {
      console.log(`\n--- ${collection} 컬렉션 스키마 분석 ---`);
      const schema = await mcpService.executeMongoDBQuery({
        query: `analyze schema for ${collection}`,
        collection,
        operation: 'schema'
      });
      console.log(`${collection} schema:`, JSON.stringify(schema, null, 2));
    } catch (error) {
      console.error(`${collection} 스키마 분석 실패:`, error);
    }
  }
}

// 자연어 쿼리 정확도 테스트
async function testNaturalLanguageQueries() {
  console.log('\n=== 자연어 쿼리 정확도 테스트 ===');
  
  const nlQueries = [
    {
      description: '최근 24시간 내 생성된 매치들',
      query: 'recent matches created in last 24 hours',
      collection: 'matches',
      operation: 'find'
    },
    {
      description: '다이아몬드 이상 랭크 플레이어들',
      query: 'high rank players above diamond',
      collection: 'players',
      operation: 'find'
    },
    {
      description: '오류 상태의 데이터들',
      query: 'failed or error status entries',
      collection: 'logs',
      operation: 'find'
    },
    {
      description: '매치 수를 티어별로 그룹화',
      query: 'count matches grouped by tier',
      collection: 'matches',
      operation: 'aggregate'
    },
    {
      description: '유니크한 챔피언 목록',
      query: 'distinct champions used',
      collection: 'matches',
      operation: 'distinct'
    }
  ];
  
  for (const nlQuery of nlQueries) {
    try {
      console.log(`\n--- ${nlQuery.description} ---`);
      console.log(`원본 쿼리: "${nlQuery.query}"`);
      
      const result = await mcpService.executeMongoDBQuery(nlQuery);
      console.log('결과:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`쿼리 실패: ${nlQuery.description}`, error);
    }
  }
}

// 메인 테스트 함수
async function runAllTests() {
  console.log('🚀 MCP 통합 테스트 시작');
  
  await testMCPIntegration();
  await testSchemaAnalysis();
  await testNaturalLanguageQueries();
  
  console.log('\n✅ 모든 테스트 완료');
}

// 개별 테스트 실행 함수들
export {
  testMCPIntegration,
  testSchemaAnalysis,
  testNaturalLanguageQueries,
  runAllTests
};

// 스크립트 직접 실행시
if (require.main === module) {
  runAllTests().catch(console.error);
}