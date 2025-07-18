#!/usr/bin/env node

// backend/scripts/migrate.ts
// 마이그레이션 CLI 도구

import mongoose from 'mongoose';
import { migrationRunner, initializeMigrations } from '../src/migrations';
import logger from '../src/config/logger';
import { loadAndValidateEnv } from '../src/initialization/envLoader';

/**
 * 사용법 출력
 */
function printUsage(): void {
  console.log(`
🗄️  TFT Meta Analyzer - Database Migration Tool

사용법:
  npm run migrate <command> [options]

명령어:
  status                    현재 마이그레이션 상태 확인
  up [version]             마이그레이션 실행 (선택적 대상 버전)
  down [version]           마이그레이션 롤백 (선택적 대상 버전)
  dry-run [version]        드라이런 모드 (실제 실행 없이 확인)

옵션:
  --force                  안전 체크 건너뛰기
  --skip-validation        무결성 검증 건너뛰기

예시:
  npm run migrate status                 # 현재 상태 확인
  npm run migrate up                     # 모든 대기 중인 마이그레이션 실행
  npm run migrate up 2                   # 버전 2까지 마이그레이션 실행
  npm run migrate down                   # 마지막 마이그레이션 롤백
  npm run migrate down 1                 # 버전 1까지 롤백
  npm run migrate dry-run                # 드라이런 모드로 확인
  npm run migrate up --force             # 안전 체크 없이 즉시 실행

환경 변수:
  MONGODB_URI               MongoDB 연결 문자열
  NODE_ENV                  실행 환경 (development/production)
`);
}

/**
 * MongoDB 연결
 */
async function connectToDatabase(): Promise<void> {
  const envResult = loadAndValidateEnv();
  
  if (!envResult.isValid) {
    throw new Error('환경 변수 검증 실패');
  }

  const dbConfig = envResult.accessors.getDatabaseConfig();
  
  if (!dbConfig.uri) {
    throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
  }

  await mongoose.connect(dbConfig.uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  logger.info('✅ MongoDB 연결 성공');
}

/**
 * 마이그레이션 상태 출력
 */
async function showStatus(): Promise<void> {
  const status = await migrationRunner.getStatus();
  
  console.log('\n📊 마이그레이션 상태:');
  console.log(`   적용됨: ${status.appliedCount}개`);
  console.log(`   대기중: ${status.pendingCount}개`);
  
  if (status.applied.length > 0) {
    console.log('\n✅ 적용된 마이그레이션:');
    status.applied.forEach(migration => {
      console.log(`   v${migration.version}: ${migration.name} (${migration.appliedAt.toISOString()})`);
    });
  }
  
  if (status.pending.length > 0) {
    console.log('\n⏳ 대기 중인 마이그레이션:');
    status.pending.forEach(migration => {
      console.log(`   v${migration.version}: ${migration.name} - ${migration.description}`);
    });
  } else {
    console.log('\n✨ 모든 마이그레이션이 최신 상태입니다!');
  }
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  try {
    // 환경 변수 및 DB 연결
    await connectToDatabase();
    
    // 마이그레이션 초기화
    await initializeMigrations();

    // 명령어 실행
    switch (command) {
      case 'status': {
        await showStatus();
        break;
      }

      case 'up': {
        const targetVersion = args[1] ? parseInt(args[1]) : undefined;
        const force = args.includes('--force');
        const skipValidation = args.includes('--skip-validation');

        if (force) {
          await migrationRunner.runMigrations({ 
            targetVersion, 
            skipValidation 
          });
        } else {
          await migrationRunner.runSafely({ 
            targetVersion, 
            skipValidation 
          });
        }
        break;
      }

      case 'down': {
        const targetVersion = args[1] ? parseInt(args[1]) : undefined;
        
        console.log('⚠️  마이그레이션 롤백은 데이터 손실을 일으킬 수 있습니다.');
        console.log('   계속하시겠습니까? (y/N)');
        
        // 사용자 확인 (프로덕션에서는 추가 확인 단계 필요)
        if (!args.includes('--force')) {
          console.log('⏸️  롤백을 진행하려면 --force 플래그를 사용하세요.');
          process.exit(1);
        }

        await migrationRunner.rollback(targetVersion);
        break;
      }

      case 'dry-run': {
        const targetVersion = args[1] ? parseInt(args[1]) : undefined;
        const skipValidation = args.includes('--skip-validation');
        
        console.log('🔍 드라이런 모드: 실제 변경 없이 실행 계획만 확인합니다.\n');
        
        await migrationRunner.runMigrations({ 
          dryRun: true, 
          targetVersion, 
          skipValidation 
        });
        break;
      }

      default: {
        console.error(`❌ 알 수 없는 명령어: ${command}`);
        printUsage();
        process.exit(1);
      }
    }

  } catch (error) {
    logger.error('마이그레이션 실행 중 오류 발생:', error);
    console.error(`\n❌ 오류: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 MongoDB 연결 종료');
  }
}

// 처리되지 않은 예외 핸들링
process.on('uncaughtException', (error) => {
  logger.error('처리되지 않은 예외:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('처리되지 않은 Promise 거부:', reason);
  process.exit(1);
});

// 스크립트 실행
if (require.main === module) {
  main().catch((error) => {
    console.error('스크립트 실행 중 오류:', error);
    process.exit(1);
  });
}