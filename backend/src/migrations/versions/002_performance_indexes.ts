// backend/src/migrations/versions/002_performance_indexes.ts

import mongoose from 'mongoose';
import logger from '../../config/logger';
import { Migration } from '../migrationRunner';

/**
 * 성능 최적화 인덱스 추가 마이그레이션
 * - Phase 2에서 식별된 복합 인덱스 추가
 * - 커서 페이지네이션 지원 인덱스
 * - 자주 사용되는 쿼리 패턴 최적화
 */
export const migration002: Migration = {
  version: 2,
  name: 'performance_indexes',
  description: '성능 최적화를 위한 복합 인덱스 및 커서 페이지네이션 지원 인덱스 추가',

  async up(): Promise<void> {
    logger.info('📋 성능 최적화 인덱스 추가 시작...');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('데이터베이스 연결이 없습니다.');
    }

    // 1. Match 컬렉션 성능 최적화 인덱스
    logger.info('🚀 Match 컬렉션 성능 인덱스 추가...');
    try {
      // 커서 페이지네이션용 복합 인덱스
      await db.collection('matches').createIndex(
        { 'info.game_datetime': -1, _id: 1 },
        { 
          name: 'cursor_pagination_datetime_idx',
          background: true
        }
      );

      // 사용자별 매치 조회 최적화
      await db.collection('matches').createIndex(
        { 'info.participants.puuid': 1, 'info.game_datetime': -1 },
        { 
          name: 'participant_datetime_idx',
          background: true
        }
      );

      // AI 피드백 관련 쿼리 최적화
      await db.collection('matches').createIndex(
        { 'aiFeedback.userPuuid': 1, 'aiFeedback.analyzedAt': -1 },
        { 
          name: 'ai_feedback_user_idx',
          background: true,
          sparse: true
        }
      );
    } catch (error) {
      logger.warn('Match 컬렉션 성능 인덱스 추가 중 오류:', error);
    }

    // 2. DeckTier 컬렉션 성능 최적화
    logger.info('🚀 DeckTier 컬렉션 성능 인덱스 추가...');
    try {
      // 티어리스트 조회 최적화 (등급 기준 정렬)
      await db.collection('decktiers').createIndex(
        { tier: 1, winRate: -1, _id: 1 },
        { 
          name: 'tierlist_cursor_idx',
          background: true
        }
      );

      // 패치별 메타 분석용 복합 인덱스
      await db.collection('decktiers').createIndex(
        { patch: 1, tier: 1, pickRate: -1 },
        { 
          name: 'patch_tier_pickrate_idx',
          background: true
        }
      );

      // 인기 덱 조회 최적화
      await db.collection('decktiers').createIndex(
        { pickRate: -1, winRate: -1, _id: 1 },
        { 
          name: 'popular_deck_cursor_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('DeckTier 컬렉션 성능 인덱스 추가 중 오류:', error);
    }

    // 3. ItemStats 컬렉션 성능 최적화
    logger.info('🚀 ItemStats 컬렉션 성능 인덱스 추가...');
    try {
      // 아이템 통계 커서 페이지네이션
      await db.collection('itemstats').createIndex(
        { winRate: -1, _id: 1 },
        { 
          name: 'item_winrate_cursor_idx',
          background: true
        }
      );

      // 패치별 아이템 메타 분석
      await db.collection('itemstats').createIndex(
        { patch: 1, itemId: 1, tier: 1 },
        { 
          name: 'patch_item_tier_idx',
          background: true
        }
      );

      // 인기 아이템 조회
      await db.collection('itemstats').createIndex(
        { pickRate: -1, avgPosition: 1 },
        { 
          name: 'popular_item_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('ItemStats 컬렉션 성능 인덱스 추가 중 오류:', error);
    }

    // 4. TraitStats 컬렉션 성능 최적화
    logger.info('🚀 TraitStats 컬렉션 성능 인덱스 추가...');
    try {
      // 특성 통계 커서 페이지네이션
      await db.collection('traitstats').createIndex(
        { winRate: -1, _id: 1 },
        { 
          name: 'trait_winrate_cursor_idx',
          background: true
        }
      );

      // 패치별 특성 메타 분석
      await db.collection('traitstats').createIndex(
        { patch: 1, traitId: 1, tier: 1 },
        { 
          name: 'patch_trait_tier_idx',
          background: true
        }
      );

      // 시너지 분석용 복합 인덱스
      await db.collection('traitstats').createIndex(
        { traitId: 1, avgPlacement: 1, winRate: -1 },
        { 
          name: 'synergy_analysis_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('TraitStats 컬렉션 성능 인덱스 추가 중 오류:', error);
    }

    // 5. UserDeck 컬렉션 성능 최적화
    logger.info('🚀 UserDeck 컬렉션 성능 인덱스 추가...');
    try {
      // 사용자별 덱 커서 페이지네이션
      await db.collection('userdecks').createIndex(
        { userId: 1, createdAt: -1, _id: 1 },
        { 
          name: 'user_deck_cursor_idx',
          background: true
        }
      );

      // 공개 덱 인기순 조회
      await db.collection('userdecks').createIndex(
        { isPublic: 1, likes: -1, views: -1 },
        { 
          name: 'public_popularity_idx',
          background: true
        }
      );

      // 덱 검색 최적화 (태그 기반)
      await db.collection('userdecks').createIndex(
        { tags: 1, isPublic: 1, createdAt: -1 },
        { 
          name: 'tag_search_idx',
          background: true,
          sparse: true
        }
      );
    } catch (error) {
      logger.warn('UserDeck 컬렉션 성능 인덱스 추가 중 오류:', error);
    }

    // 6. 새로운 컬렉션들을 위한 인덱스 (Ranker, DeckGuide 등)
    logger.info('🚀 추가 컬렉션 성능 인덱스 설정...');
    try {
      // Ranker 컬렉션
      await db.collection('rankers').createIndex(
        { tier: 1, lp: -1, _id: 1 },
        { 
          name: 'ranker_tier_lp_idx',
          background: true
        }
      );

      await db.collection('rankers').createIndex(
        { region: 1, tier: 1, lp: -1 },
        { 
          name: 'region_tier_lp_idx',
          background: true
        }
      );

      // DeckGuide 컬렉션
      await db.collection('deckguides').createIndex(
        { isPublished: 1, difficulty: 1, rating: -1 },
        { 
          name: 'published_guide_idx',
          background: true
        }
      );

      await db.collection('deckguides').createIndex(
        { authorId: 1, createdAt: -1 },
        { 
          name: 'author_guide_idx',
          background: true
        }
      );
    } catch (error) {
      logger.warn('추가 컬렉션 인덱스 설정 중 오류:', error);
    }

    // 7. 스키마 버전 업데이트
    await db.collection('schema_metadata').updateOne(
      { _id: 'schema_version' as any },
      {
        $set: {
          version: 2,
          description: '성능 최적화 인덱스 추가',
          lastUpdated: new Date()
        },
        $push: {
          features: {
            $each: [
              'cursor_pagination_indexes',
              'composite_performance_indexes',
              'search_optimization_indexes'
            ]
          }
        } as any
      }
    );

    logger.info('✅ 성능 최적화 인덱스 추가 완료');
  },

  async down(): Promise<void> {
    logger.info('📋 성능 최적화 인덱스 롤백 시작...');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('데이터베이스 연결이 없습니다.');
    }

    // 추가된 인덱스들을 제거
    const indexesToRemove = [
      // Match 컬렉션
      { collection: 'matches', indexes: ['cursor_pagination_datetime_idx', 'participant_datetime_idx', 'ai_feedback_user_idx'] },
      
      // DeckTier 컬렉션
      { collection: 'decktiers', indexes: ['tierlist_cursor_idx', 'patch_tier_pickrate_idx', 'popular_deck_cursor_idx'] },
      
      // ItemStats 컬렉션
      { collection: 'itemstats', indexes: ['item_winrate_cursor_idx', 'patch_item_tier_idx', 'popular_item_idx'] },
      
      // TraitStats 컬렉션
      { collection: 'traitstats', indexes: ['trait_winrate_cursor_idx', 'patch_trait_tier_idx', 'synergy_analysis_idx'] },
      
      // UserDeck 컬렉션
      { collection: 'userdecks', indexes: ['user_deck_cursor_idx', 'public_popularity_idx', 'tag_search_idx'] },
      
      // 추가 컬렉션들
      { collection: 'rankers', indexes: ['ranker_tier_lp_idx', 'region_tier_lp_idx'] },
      { collection: 'deckguides', indexes: ['published_guide_idx', 'author_guide_idx'] }
    ];

    for (const { collection, indexes } of indexesToRemove) {
      logger.info(`🔧 ${collection} 컬렉션 성능 인덱스 제거...`);
      
      for (const indexName of indexes) {
        try {
          await db.collection(collection).dropIndex(indexName);
          logger.info(`  ✅ ${indexName} 제거 완료`);
        } catch (error) {
          logger.warn(`  ⚠️ ${indexName} 제거 실패:`, error);
        }
      }
    }

    // 스키마 버전 롤백
    await db.collection('schema_metadata').updateOne(
      { _id: 'schema_version' as any },
      {
        $set: {
          version: 1,
          description: '성능 최적화 인덱스 롤백됨',
          lastUpdated: new Date()
        },
        $pull: {
          features: {
            $in: [
              'cursor_pagination_indexes',
              'composite_performance_indexes', 
              'search_optimization_indexes'
            ]
          }
        } as any
      }
    );

    logger.info('✅ 성능 최적화 인덱스 롤백 완료');
  }
};