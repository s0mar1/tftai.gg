// backend/src/migrations/versions/001_initial_schema.ts

import mongoose from 'mongoose';
import logger from '../../config/logger';
import { Migration } from '../migrationRunner';

/**
 * 초기 스키마 설정 마이그레이션
 * - 기존 컬렉션들의 인덱스 정리 및 최적화
 * - 스키마 버전 필드 추가
 */
export const migration001: Migration = {
  version: 1,
  name: 'initial_schema_setup',
  description: '초기 스키마 설정 및 기본 인덱스 생성',

  async up(): Promise<void> {
    logger.info('📋 초기 스키마 설정 시작...');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('데이터베이스 연결이 없습니다.');
    }

    // 1. Match 컬렉션 최적화
    logger.info('🔧 Match 컬렉션 인덱스 설정...');
    try {
      await db.collection('matches').createIndex(
        { 'metadata.match_id': 1 },
        { 
          unique: true, 
          sparse: true,
          name: 'match_id_unique_idx',
          background: true
        }
      );

      await db.collection('matches').createIndex(
        { createdAt: -1 },
        { 
          name: 'created_at_desc_idx',
          background: true
        }
      );

      await db.collection('matches').createIndex(
        { 'info.game_datetime': -1 },
        { 
          name: 'game_datetime_desc_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('Match 컬렉션 인덱스 설정 중 일부 오류 발생 (기존 인덱스 존재 가능):', error);
    }

    // 2. DeckTier 컬렉션 최적화  
    logger.info('🔧 DeckTier 컬렉션 인덱스 설정...');
    try {
      await db.collection('decktiers').createIndex(
        { tier: 1, winRate: -1 },
        { 
          name: 'tier_winrate_idx',
          background: true
        }
      );

      await db.collection('decktiers').createIndex(
        { patch: 1, createdAt: -1 },
        { 
          name: 'patch_created_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('DeckTier 컬렉션 인덱스 설정 중 일부 오류 발생:', error);
    }

    // 3. ItemStats 컬렉션 최적화
    logger.info('🔧 ItemStats 컬렉션 인덱스 설정...');
    try {
      await db.collection('itemstats').createIndex(
        { itemId: 1, patch: 1 },
        { 
          name: 'item_patch_idx',
          background: true
        }
      );

      await db.collection('itemstats').createIndex(
        { winRate: -1, pickRate: -1 },
        { 
          name: 'winrate_pickrate_desc_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('ItemStats 컬렉션 인덱스 설정 중 일부 오류 발생:', error);
    }

    // 4. TraitStats 컬렉션 최적화
    logger.info('🔧 TraitStats 컬렉션 인덱스 설정...');
    try {
      await db.collection('traitstats').createIndex(
        { traitId: 1, patch: 1 },
        { 
          name: 'trait_patch_idx',
          background: true
        }
      );

      await db.collection('traitstats').createIndex(
        { winRate: -1, avgPlacement: 1 },
        { 
          name: 'winrate_placement_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('TraitStats 컬렉션 인덱스 설정 중 일부 오류 발생:', error);
    }

    // 5. UserDeck 컬렉션 최적화
    logger.info('🔧 UserDeck 컬렉션 인덱스 설정...');
    try {
      await db.collection('userdecks').createIndex(
        { userId: 1, createdAt: -1 },
        { 
          name: 'user_created_desc_idx',
          background: true
        }
      );

      await db.collection('userdecks').createIndex(
        { isPublic: 1, likes: -1 },
        { 
          name: 'public_likes_desc_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('UserDeck 컬렉션 인덱스 설정 중 일부 오류 발생:', error);
    }

    // 6. 스키마 버전 정보 추가 (향후 확장성을 위해)
    logger.info('📊 스키마 버전 메타데이터 설정...');
    try {
      await db.collection('schema_metadata').replaceOne(
        { _id: 'schema_version' as any },
        {
          _id: 'schema_version',
          version: 1,
          description: '초기 스키마 버전',
          appliedAt: new Date(),
          features: [
            'basic_indexes',
            'performance_optimization',
            'unique_constraints'
          ]
        },
        { upsert: true }
      );
    } catch (error) {
      logger.warn('스키마 메타데이터 설정 중 오류 발생:', error);
    }

    logger.info('✅ 초기 스키마 설정 완료');
  },

  async down(): Promise<void> {
    logger.info('📋 초기 스키마 설정 롤백 시작...');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('데이터베이스 연결이 없습니다.');
    }

    // 인덱스 제거 (생성한 인덱스들을 역순으로 제거)
    const collections = [
      { name: 'matches', indexes: ['match_id_unique_idx', 'created_at_desc_idx', 'game_datetime_desc_idx'] },
      { name: 'decktiers', indexes: ['tier_winrate_idx', 'patch_created_idx'] },
      { name: 'itemstats', indexes: ['item_patch_idx', 'winrate_pickrate_desc_idx'] },
      { name: 'traitstats', indexes: ['trait_patch_idx', 'winrate_placement_idx'] },
      { name: 'userdecks', indexes: ['user_created_desc_idx', 'public_likes_desc_idx'] }
    ];

    for (const collection of collections) {
      logger.info(`🔧 ${collection.name} 컬렉션 인덱스 제거...`);
      
      for (const indexName of collection.indexes) {
        try {
          await db.collection(collection.name).dropIndex(indexName);
          logger.info(`  ✅ ${indexName} 제거 완료`);
        } catch (error) {
          logger.warn(`  ⚠️ ${indexName} 제거 실패 (존재하지 않을 수 있음):`, error);
        }
      }
    }

    // 스키마 메타데이터 제거
    try {
      await db.collection('schema_metadata').deleteOne({ _id: 'schema_version' as any });
      logger.info('📊 스키마 메타데이터 제거 완료');
    } catch (error) {
      logger.warn('스키마 메타데이터 제거 중 오류 발생:', error);
    }

    logger.info('✅ 초기 스키마 설정 롤백 완료');
  }
};