// backend/src/utils/simpleIndexValidator.js
// 간단한 인덱스 검증 스크립트 (JavaScript 버전)

import mongoose from 'mongoose';

// MongoDB 연결
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tft-meta-analyzer', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB 연결됨');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
  }
}

// 인덱스 정보 조회
async function getIndexInfo(collectionName) {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    
    const indexes = await collection.indexes();
    const stats = await collection.stats();
    
    console.log(`\n📦 ${collectionName} 컬렉션:`);
    console.log(`  - 총 인덱스 수: ${indexes.length}`);
    console.log(`  - 인덱스 크기: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  - 문서 수: ${stats.count}`);
    
    console.log('  인덱스 목록:');
    indexes.forEach(index => {
      console.log(`    - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    return { indexes, stats };
  } catch (error) {
    console.error(`❌ ${collectionName} 인덱스 정보 조회 실패:`, error.message);
    return null;
  }
}

// 쿼리 성능 테스트
async function testQueryPerformance(collectionName, query, sort, limit) {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    
    const startTime = Date.now();
    
    let cursor = collection.find(query);
    if (sort) cursor = cursor.sort(sort);
    if (limit) cursor = cursor.limit(limit);
    
    const explain = await cursor.explain('executionStats');
    const executionTime = Date.now() - startTime;
    
    const stats = explain.executionStats;
    const isOptimized = stats.stage === 'IXSCAN' && stats.executionTimeMillis < 100;
    
    console.log(`\n🔍 ${collectionName} 쿼리 성능:`, {
      query: JSON.stringify(query),
      sort: sort ? JSON.stringify(sort) : 'none',
      status: isOptimized ? '✅ 최적화됨' : '❌ 최적화 필요',
      executionTime: `${stats.executionTimeMillis}ms`,
      totalDocsExamined: stats.totalDocsExamined,
      totalDocsReturned: stats.totalDocsReturned,
      stage: stats.stage,
      indexUsed: stats.indexName || 'none'
    });
    
    if (!isOptimized) {
      console.log(`  ⚠️  최적화 권장사항:`);
      if (stats.stage === 'COLLSCAN') {
        console.log(`    - 컬렉션 스캔 발생. 적절한 인덱스를 생성하세요.`);
      }
      if (stats.totalDocsExamined > stats.totalDocsReturned * 10) {
        console.log(`    - 너무 많은 문서를 검사합니다. 인덱스를 최적화하세요.`);
      }
    }
    
    return { isOptimized, stats };
  } catch (error) {
    console.error(`❌ ${collectionName} 쿼리 성능 테스트 실패:`, error.message);
    return null;
  }
}

// Phase 2 핵심 쿼리 패턴 테스트
async function testPhase2Queries() {
  console.log('\n🚀 Phase 2 핵심 쿼리 패턴 테스트');
  
  const testCases = [
    {
      collection: 'matches',
      query: { 'info.participants.puuid': 'test-puuid' },
      sort: { 'info.game_datetime': -1 },
      limit: 20,
      description: '소환사 매치 조회'
    },
    {
      collection: 'decktiers',
      query: {},
      sort: { tierOrder: 1, averagePlacement: 1 },
      limit: 50,
      description: '티어리스트 조회'
    },
    {
      collection: 'itemstats',
      query: { itemType: 'completed' },
      sort: { winRate: -1 },
      limit: 20,
      description: '아이템 통계 조회'
    },
    {
      collection: 'traitstats',
      query: { traitType: 'origin' },
      sort: { winRate: -1 },
      limit: 20,
      description: '특성 통계 조회'
    },
    {
      collection: 'decktiers',
      query: { totalGames: { $gte: 3 } },
      sort: { totalGames: -1, winCount: -1 },
      limit: 50,
      description: '집계 쿼리'
    }
  ];
  
  let optimizedCount = 0;
  let totalCount = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n📋 테스트: ${testCase.description}`);
    const result = await testQueryPerformance(
      testCase.collection,
      testCase.query,
      testCase.sort,
      testCase.limit
    );
    
    if (result && result.isOptimized) {
      optimizedCount++;
    }
  }
  
  console.log(`\n📊 최적화 요약:`);
  console.log(`  - 총 테스트: ${totalCount}개`);
  console.log(`  - 최적화된 쿼리: ${optimizedCount}개`);
  console.log(`  - 최적화 비율: ${(optimizedCount / totalCount * 100).toFixed(1)}%`);
  
  return { optimizedCount, totalCount };
}

// 메인 실행 함수
async function main() {
  console.log('🔍 Phase 2 인덱스 성능 검증 시작');
  
  await connectDB();
  
  // 1. 각 컬렉션의 인덱스 정보 조회
  const collections = ['matches', 'decktiers', 'itemstats', 'traitstats'];
  
  for (const collection of collections) {
    await getIndexInfo(collection);
  }
  
  // 2. 핵심 쿼리 패턴 테스트
  await testPhase2Queries();
  
  console.log('\n✅ Phase 2 인덱스 성능 검증 완료');
  await mongoose.disconnect();
}

// 실행
main().catch(error => {
  console.error('❌ 검증 실패:', error);
  process.exit(1);
});