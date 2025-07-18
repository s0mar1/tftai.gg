// backend/src/migrations/index.ts

import { migrationRunner } from './migrationRunner';
import { migration001 } from './versions/001_initial_schema';
import { migration002 } from './versions/002_performance_indexes';

/**
 * 모든 마이그레이션 등록
 */
export function registerAllMigrations(): void {
  // 버전 순서대로 등록
  migrationRunner.register(migration001);
  migrationRunner.register(migration002);
}

/**
 * 마이그레이션 초기화
 */
export async function initializeMigrations(): Promise<void> {
  registerAllMigrations();
}

// 마이그레이션 러너 재내보내기
export { migrationRunner } from './migrationRunner';
export type { Migration } from './migrationRunner';

export default migrationRunner;