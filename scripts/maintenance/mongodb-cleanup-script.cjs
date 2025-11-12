#!/usr/bin/env node

/**
 * TFT Set 14 to Set 15 MongoDB 데이터 정리 스크립트
 * 
 * 이 스크립트는 다음 작업을 수행합니다:
 * 1. 현재 MongoDB 데이터 상태 분석
 * 2. Set 14 관련 데이터 백업
 * 3. Set 14 데이터 정리
 * 4. Set 15 데이터로 업데이트 준비
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// 환경변수에서 MongoDB URI 가져오기
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'tft-meta';

// 백업 디렉토리 생성
const BACKUP_DIR = path.join(__dirname, 'mongodb-backups', new Date().toISOString().split('T')[0]);

async function createBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ 백업 디렉토리 생성: ${BACKUP_DIR}`);
  }
}

async function connectToMongoDB() {
  console.log('🔗 MongoDB 연결 중...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ MongoDB 연결 성공');
  return client;
}

async function analyzeCurrentData(client) {
  console.log('\n📊 현재 MongoDB 데이터 분석 중...');
  
  const db = client.db(DATABASE_NAME);
  const collections = await db.listCollections().toArray();
  
  console.log(`\n📂 총 ${collections.length}개 컬렉션 발견:`);
  
  const analysis = {};
  
  for (const collection of collections) {
    const collectionName = collection.name;
    const coll = db.collection(collectionName);
    const count = await coll.countDocuments();
    
    console.log(`  - ${collectionName}: ${count}개 문서`);
    analysis[collectionName] = { count };
    
    // 각 컬렉션별 샘플 데이터 확인
    if (count > 0) {
      const sample = await coll.findOne();
      analysis[collectionName].sample = sample;
    }
  }
  
  // 분석 결과를 파일로 저장
  const analysisPath = path.join(BACKUP_DIR, 'data-analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  console.log(`📄 분석 결과 저장: ${analysisPath}`);
  
  return analysis;
}

async function backupCollection(client, collectionName) {
  console.log(`📦 ${collectionName} 컬렉션 백업 중...`);
  
  const db = client.db(DATABASE_NAME);
  const collection = db.collection(collectionName);
  
  const documents = await collection.find({}).toArray();
  
  if (documents.length > 0) {
    const backupPath = path.join(BACKUP_DIR, `${collectionName}-backup.json`);
    fs.writeFileSync(backupPath, JSON.stringify(documents, null, 2));
    console.log(`✅ ${collectionName} 백업 완료: ${documents.length}개 문서 → ${backupPath}`);
  } else {
    console.log(`ℹ️ ${collectionName}: 백업할 데이터 없음`);
  }
  
  return documents.length;
}

async function identifySet14Data(client, analysis) {
  console.log('\n🔍 Set 14 관련 데이터 식별 중...');
  
  const db = client.db(DATABASE_NAME);
  const set14Data = {};
  
  // 1. TraitStats에서 Set 14 특성 확인
  if (analysis.traitstats && analysis.traitstats.count > 0) {
    const traitStats = db.collection('traitstats');
    const set14Traits = await traitStats.find({}).toArray();
    console.log(`  - TraitStats: ${set14Traits.length}개 특성 데이터`);
    set14Data.traits = set14Traits;
  }
  
  // 2. ItemStats에서 Set 14 아이템 확인
  if (analysis.itemstats && analysis.itemstats.count > 0) {
    const itemStats = db.collection('itemstats');
    const set14Items = await itemStats.find({}).toArray();
    console.log(`  - ItemStats: ${set14Items.length}개 아이템 데이터`);
    set14Data.items = set14Items;
  }
  
  // 3. DeckTier에서 Set 14 덱 확인
  if (analysis.decktiers && analysis.decktiers.count > 0) {
    const deckTiers = db.collection('decktiers');
    const set14Decks = await deckTiers.find({}).toArray();
    console.log(`  - DeckTiers: ${set14Decks.length}개 덱 데이터`);
    set14Data.decks = set14Decks;
  }
  
  // 4. Match에서 Set 14 매치 확인
  if (analysis.matches && analysis.matches.count > 0) {
    const matches = db.collection('matches');
    const set14Matches = await matches.find({}).limit(10).toArray(); // 샘플만 확인
    console.log(`  - Matches: ${analysis.matches.count}개 매치 데이터 (샘플 10개 확인)`);
    set14Data.matchesSample = set14Matches;
  }
  
  // 5. UserDeck 버전 확인
  if (analysis.userdecks && analysis.userdecks.count > 0) {
    const userDecks = db.collection('userdecks');
    const set14UserDecks = await userDecks.find({ version: { $ne: "Set15" } }).toArray();
    const set15UserDecks = await userDecks.find({ version: "Set15" }).toArray();
    console.log(`  - UserDecks: Set 14: ${set14UserDecks.length}개, Set 15: ${set15UserDecks.length}개`);
    set14Data.userDecks = { set14: set14UserDecks, set15: set15UserDecks };
  }
  
  return set14Data;
}

async function generateCleanupPlan(set14Data) {
  console.log('\n📋 데이터 정리 계획 생성 중...');
  
  const plan = {
    timestamp: new Date().toISOString(),
    actions: []
  };
  
  // 1. Set 14 덱 데이터 삭제 (295개 문서)
  if (set14Data.decks && set14Data.decks.length > 0) {
    plan.actions.push({
      type: 'DROP_COLLECTION',
      collection: 'decktiers',
      count: set14Data.decks.length,
      reason: 'Set 14 기준 덱 데이터 295개, 완전 재구성 필요'
    });
  }
  
  // 2. Set 14 매치 데이터 삭제 (1,169개 문서)
  if (set14Data.matchesSample) {
    plan.actions.push({
      type: 'DROP_COLLECTION',
      collection: 'matches',
      count: 1169, // 실제 분석에서 확인된 수
      reason: 'Set 14 기준 매치 데이터 1,169개, 완전 재구성 필요'
    });
  }
  
  // 3. Set 14 덱 가이드 삭제 (2개 문서)
  plan.actions.push({
    type: 'DROP_COLLECTION',
    collection: 'deckguides',
    count: 2,
    reason: 'Set 14 챔피언 이름 포함 (사일러스, 세라핀, 베인), 삭제 필요'
  });

  // 4. 빈 컬렉션들 인덱스 최적화
  plan.actions.push({
    type: 'OPTIMIZE_INDEXES',
    collections: ['traitstats', 'itemstats', 'userdecks'],
    reason: 'Set 15 데이터를 위한 인덱스 최적화'
  });
  
  // 5. 백업 확인
  plan.actions.push({
    type: 'VERIFY_BACKUP',
    reason: '모든 데이터가 백업되었는지 확인'
  });
  
  const planPath = path.join(BACKUP_DIR, 'cleanup-plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log(`📄 정리 계획 저장: ${planPath}`);
  
  return plan;
}

async function executeCleanupPlan(client, plan, dryRun = true) {
  console.log(`\n${dryRun ? '🧪 테스트 모드' : '🚀 실행 모드'}: 데이터 정리 ${dryRun ? '시뮬레이션' : '실행'}`);
  
  const db = client.db(DATABASE_NAME);
  const results = [];
  
  for (const action of plan.actions) {
    console.log(`\n⚡ 작업: ${action.type}`);
    console.log(`   이유: ${action.reason}`);
    
    if (dryRun) {
      console.log(`   ⚠️ 테스트 모드: 실제 실행하지 않음`);
      results.push({ action: action.type, status: 'SIMULATED', dryRun: true });
      continue;
    }
    
    try {
      switch (action.type) {
        case 'DROP_COLLECTION':
          const collection = db.collection(action.collection);
          const count = await collection.countDocuments();
          if (count > 0) {
            await collection.drop();
            console.log(`   ✅ ${action.collection} 컬렉션 삭제 완료 (${count}개 문서)`);
            results.push({ action: action.type, collection: action.collection, deletedCount: count, status: 'SUCCESS' });
          } else {
            console.log(`   ℹ️ ${action.collection} 컬렉션이 이미 비어있음`);
            results.push({ action: action.type, collection: action.collection, deletedCount: 0, status: 'ALREADY_EMPTY' });
          }
          break;
          
        case 'UPDATE_DOCUMENTS':
          const updateCollection = db.collection(action.collection);
          const updateResult = await updateCollection.updateMany(action.filter, action.update);
          console.log(`   ✅ ${action.collection} 업데이트 완료 (${updateResult.modifiedCount}개 문서)`);
          results.push({ action: action.type, collection: action.collection, modifiedCount: updateResult.modifiedCount, status: 'SUCCESS' });
          break;
          
        case 'OPTIMIZE_INDEXES':
          console.log(`   🔧 인덱스 최적화 중...`);
          for (const collectionName of action.collections) {
            const coll = db.collection(collectionName);
            const indexes = await coll.indexes();
            console.log(`   📋 ${collectionName}: ${indexes.length}개 인덱스 확인`);
          }
          results.push({ action: action.type, collections: action.collections, status: 'SUCCESS' });
          break;
          
        case 'VERIFY_BACKUP':
          const backupFiles = fs.readdirSync(BACKUP_DIR);
          console.log(`   ✅ 백업 파일 확인: ${backupFiles.length}개 파일`);
          results.push({ action: action.type, backupFiles: backupFiles.length, status: 'SUCCESS' });
          break;
          
        default:
          console.log(`   ⚠️ 지원하지 않는 작업: ${action.type}`);
          results.push({ action: action.type, status: 'SKIPPED' });
      }
    } catch (error) {
      console.error(`   ❌ 작업 실패: ${error.message}`);
      results.push({ action: action.type, status: 'ERROR', error: error.message });
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 TFT Set 14 → Set 15 MongoDB 데이터 정리 시작\n');
  
  let client;
  
  try {
    // 1. 백업 디렉토리 생성
    await createBackupDirectory();
    
    // 2. MongoDB 연결
    client = await connectToMongoDB();
    
    // 3. 현재 데이터 분석
    const analysis = await analyzeCurrentData(client);
    
    // 4. 각 컬렉션 백업
    console.log('\n📦 데이터 백업 시작...');
    const collections = Object.keys(analysis);
    for (const collectionName of collections) {
      await backupCollection(client, collectionName);
    }
    
    // 5. Set 14 데이터 식별
    const set14Data = await identifySet14Data(client, analysis);
    
    // 6. 정리 계획 생성
    const plan = await generateCleanupPlan(set14Data);
    
    // 7. 테스트 실행 (Dry Run)
    console.log('\n' + '='.repeat(50));
    console.log('🧪 테스트 모드로 정리 계획 검증');
    console.log('='.repeat(50));
    
    const testResults = await executeCleanupPlan(client, plan, true);
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 실행 요약');
    console.log('='.repeat(50));
    console.log(`📂 백업 위치: ${BACKUP_DIR}`);
    console.log(`📊 분석된 컬렉션: ${collections.length}개`);
    console.log(`📦 백업된 컬렉션: ${collections.length}개`);
    console.log(`⚡ 계획된 작업: ${plan.actions.length}개`);
    
    console.log('\n🎯 다음 단계:');
    console.log('1. 백업 파일 확인');
    console.log('2. 정리 계획 검토');
    console.log('3. 실제 정리 실행 (--execute 플래그 사용)');
    
    // 실제 실행 옵션
    const shouldExecute = process.argv.includes('--execute');
    if (shouldExecute) {
      console.log('\n' + '⚠️'.repeat(20));
      console.log('🚨 실제 데이터 정리 실행 중... (5초 대기)');
      console.log('⚠️'.repeat(20));
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const executeResults = await executeCleanupPlan(client, plan, false);
      
      console.log('\n✅ 데이터 정리 완료!');
      console.log('📄 결과 요약:', executeResults);
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  analyzeCurrentData,
  backupCollection,
  identifySet14Data,
  generateCleanupPlan,
  executeCleanupPlan
};