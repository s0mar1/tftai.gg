// backend/src/migrations/migrationRunner.ts

import mongoose from 'mongoose';
import logger from '../config/logger';
// import { getEnvAccessors } from '../initialization/envLoader'; // Currently not used

/**
 * 마이그레이션 인터페이스
 */
export interface Migration {
  version: number;
  name: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

/**
 * 마이그레이션 히스토리 스키마
 */
interface IMigrationHistory extends mongoose.Document {
  version: number;
  name: string;
  description: string;
  appliedAt: Date;
  executionTime: number; // 실행 시간 (ms)
  checksum: string; // 마이그레이션 무결성 검증용
}

const MigrationHistorySchema = new mongoose.Schema<IMigrationHistory>({
  version: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now },
  executionTime: { type: Number, required: true },
  checksum: { type: String, required: true }
});

const MigrationHistory = mongoose.model<IMigrationHistory>('MigrationHistory', MigrationHistorySchema);

/**
 * 마이그레이션 러너 클래스
 */
export class MigrationRunner {
  private migrations: Migration[] = [];
  // private readonly collectionName = 'migrationhistories';
  // Note: collectionName is not currently used but kept for potential future use

  /**
   * 마이그레이션 등록
   */
  register(migration: Migration): void {
    // 중복 버전 체크
    const existing = this.migrations.find(m => m.version === migration.version);
    if (existing) {
      throw new Error(`Migration version ${migration.version} already registered`);
    }

    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * 마이그레이션 체크섬 생성
   */
  private generateChecksum(migration: Migration): string {
    const content = migration.up.toString() + migration.down.toString();
    return Buffer.from(content).toString('base64').substring(0, 32);
  }

  /**
   * 적용된 마이그레이션 목록 조회
   */
  private async getAppliedMigrations(): Promise<IMigrationHistory[]> {
    try {
      return await MigrationHistory.find().sort({ version: 1 }).exec();
    } catch (error) {
      logger.warn('마이그레이션 히스토리 컬렉션을 찾을 수 없습니다. 새로 생성합니다.');
      return [];
    }
  }

  /**
   * 대기 중인 마이그레이션 목록 조회
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    const appliedVersions = applied.map(m => m.version);
    
    return this.migrations.filter(m => !appliedVersions.includes(m.version));
  }

  /**
   * 마이그레이션 무결성 검증
   */
  private async validateIntegrity(): Promise<void> {
    const applied = await this.getAppliedMigrations();
    
    for (const appliedMigration of applied) {
      const currentMigration = this.migrations.find(m => m.version === appliedMigration.version);
      
      if (!currentMigration) {
        logger.warn(`적용된 마이그레이션 v${appliedMigration.version}이 현재 코드에서 찾을 수 없습니다.`);
        continue;
      }

      const currentChecksum = this.generateChecksum(currentMigration);
      if (currentChecksum !== appliedMigration.checksum) {
        throw new Error(
          `마이그레이션 v${appliedMigration.version}의 체크섬이 일치하지 않습니다. ` +
          `무결성 검증 실패: 기대값=${appliedMigration.checksum}, 현재값=${currentChecksum}`
        );
      }
    }
  }

  /**
   * 마이그레이션 실행
   */
  async runMigrations(options: {
    dryRun?: boolean;
    targetVersion?: number;
    skipValidation?: boolean;
  } = {}): Promise<void> {
    const { dryRun = false, targetVersion, skipValidation = false } = options;

    logger.info('🔄 마이그레이션 시작...');

    // 무결성 검증
    if (!skipValidation) {
      await this.validateIntegrity();
    }

    // 대기 중인 마이그레이션 조회
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      logger.info('✅ 모든 마이그레이션이 이미 적용되었습니다.');
      return;
    }

    // 대상 버전 필터링
    const toApply = targetVersion 
      ? pending.filter(m => m.version <= targetVersion)
      : pending;

    if (toApply.length === 0) {
      logger.info(`✅ 버전 ${targetVersion}까지 모든 마이그레이션이 적용되었습니다.`);
      return;
    }

    logger.info(`📋 적용할 마이그레이션: ${toApply.length}개`);
    toApply.forEach(m => {
      logger.info(`  - v${m.version}: ${m.name}`);
    });

    if (dryRun) {
      logger.info('🔍 드라이런 모드: 실제 마이그레이션은 실행되지 않습니다.');
      return;
    }

    // 마이그레이션 실행
    for (const migration of toApply) {
      await this.executeMigration(migration);
    }

    logger.info('✅ 모든 마이그레이션이 성공적으로 완료되었습니다.');
  }

  /**
   * 개별 마이그레이션 실행
   */
  private async executeMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    
    logger.info(`🔄 마이그레이션 실행 중: v${migration.version} - ${migration.name}`);

    try {
      // 트랜잭션 시작 (MongoDB 4.0+ 필요)
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          await migration.up();
        });

        const executionTime = Date.now() - startTime;
        const checksum = this.generateChecksum(migration);

        // 마이그레이션 히스토리 기록
        await MigrationHistory.create({
          version: migration.version,
          name: migration.name,
          description: migration.description,
          appliedAt: new Date(),
          executionTime,
          checksum
        });

        logger.info(`✅ 마이그레이션 완료: v${migration.version} (${executionTime}ms)`);
        
      } finally {
        await session.endSession();
      }

    } catch (error) {
      logger.error(`❌ 마이그레이션 실패: v${migration.version}`, error);
      throw new Error(`마이그레이션 v${migration.version} 실패: ${(error as Error).message}`);
    }
  }

  /**
   * 마이그레이션 롤백
   */
  async rollback(targetVersion?: number): Promise<void> {
    logger.info('🔄 마이그레이션 롤백 시작...');

    const applied = await this.getAppliedMigrations();
    const toRollback = targetVersion
      ? applied.filter(m => m.version > targetVersion).reverse()
      : applied.slice(-1); // 마지막 하나만

    if (toRollback.length === 0) {
      logger.info('⚠️ 롤백할 마이그레이션이 없습니다.');
      return;
    }

    logger.info(`📋 롤백할 마이그레이션: ${toRollback.length}개`);
    toRollback.forEach(m => {
      logger.info(`  - v${m.version}: ${m.name}`);
    });

    for (const appliedMigration of toRollback) {
      const migration = this.migrations.find(m => m.version === appliedMigration.version);
      
      if (!migration) {
        logger.error(`❌ 롤백할 마이그레이션을 찾을 수 없습니다: v${appliedMigration.version}`);
        continue;
      }

      await this.rollbackMigration(migration, appliedMigration);
    }

    logger.info('✅ 모든 롤백이 성공적으로 완료되었습니다.');
  }

  /**
   * 개별 마이그레이션 롤백
   */
  private async rollbackMigration(migration: Migration, appliedMigration: IMigrationHistory): Promise<void> {
    const startTime = Date.now();
    
    logger.info(`🔄 마이그레이션 롤백 중: v${migration.version} - ${migration.name}`);

    try {
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          await migration.down();
        });

        // 히스토리에서 제거
        await MigrationHistory.deleteOne({ version: migration.version });

        const executionTime = Date.now() - startTime;
        logger.info(`✅ 마이그레이션 롤백 완료: v${migration.version} (${executionTime}ms)`);
        
      } finally {
        await session.endSession();
      }

    } catch (error) {
      logger.error(`❌ 마이그레이션 롤백 실패: v${migration.version}`, error);
      throw new Error(`마이그레이션 v${migration.version} 롤백 실패: ${(error as Error).message}`);
    }
    
    // Suppress unused variable warning for appliedMigration parameter
    void appliedMigration;
  }

  /**
   * 마이그레이션 상태 조회
   */
  async getStatus(): Promise<{
    appliedCount: number;
    pendingCount: number;
    applied: IMigrationHistory[];
    pending: Migration[];
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      appliedCount: applied.length,
      pendingCount: pending.length,
      applied,
      pending
    };
  }

  /**
   * 환경별 안전 실행 체크
   */
  private checkEnvironmentSafety(): void {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production') {
      logger.warn('⚠️ 프로덕션 환경에서 마이그레이션을 실행합니다. 백업을 확인하세요.');
    }
  }

  /**
   * 백업 권장 메시지
   */
  private logBackupReminder(): void {
    logger.info('💡 마이그레이션 실행 전 데이터베이스 백업을 권장합니다.');
    logger.info('   mongodump 또는 Atlas 백업을 사용하세요.');
  }

  /**
   * 마이그레이션 실행 (안전 체크 포함)
   */
  async runSafely(options: {
    dryRun?: boolean;
    targetVersion?: number;
    skipValidation?: boolean;
    force?: boolean;
  } = {}): Promise<void> {
    this.checkEnvironmentSafety();
    this.logBackupReminder();

    if (!options.force && !options.dryRun) {
      logger.info('⏸️  5초 후 마이그레이션을 시작합니다... (강제 종료: Ctrl+C)');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await this.runMigrations(options);
  }
}

// 글로벌 마이그레이션 러너 인스턴스
export const migrationRunner = new MigrationRunner();

export default migrationRunner;