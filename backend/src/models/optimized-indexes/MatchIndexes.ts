// Match 모델 최적화된 인덱스 설계
import { Schema } from 'mongoose';

export function addOptimizedMatchIndexes(schema: Schema): void {
  // 🚀 기존 인덱스 (유지) - metadata.match_id는 unique: true로 이미 인덱스 생성됨
  schema.index({ 'info.game_datetime': -1 });
  schema.index({ createdAt: -1 });
  
  // 🆕 최적화된 복합 인덱스들
  
  // 1. 사용자별 최신 매치 조회 최적화 (가장 자주 사용됨)
  schema.index({ 
    'info.participants.puuid': 1, 
    'info.game_datetime': -1 
  }, {
    name: 'user_recent_matches',
    background: true,
    partialFilterExpression: {
      'info.participants.puuid': { $exists: true },
      'info.game_datetime': { $exists: true }
    }
  });
  
  // 2. 날짜 범위 + 사용자 집계 최적화
  schema.index({
    'info.game_datetime': -1,
    'info.participants.puuid': 1,
    'info.participants.placement': 1
  }, {
    name: 'user_stats_aggregation',
    background: true,
    partialFilterExpression: {
      'info.game_datetime': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  });
  
  // 3. AI 피드백 분석 최적화 (metadata.match_id는 unique로 이미 인덱스됨)
  schema.index({
    'aiFeedback.analyzedAt': -1,
    'aiFeedback.userPuuid': 1
  }, {
    name: 'ai_feedback_analysis',
    background: true,
    sparse: true
  });
  
  // 4. 매치 검색 및 필터링 최적화
  schema.index({
    'info.game_datetime': -1,
    'info.participants.placement': 1
  }, {
    name: 'match_search_filter',
    background: true
  });
  
  // 5. 부분 인덱스 - 최근 30일 매치만 (메모리 효율성)
  schema.index({
    'info.participants.puuid': 1,
    'info.game_datetime': -1,
    'info.participants.level': -1
  }, {
    name: 'recent_user_matches_detailed',
    background: true,
    partialFilterExpression: {
      'info.game_datetime': { 
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      }
    }
  });
  
  // 6. 텍스트 검색 최적화 (AI 피드백)
  schema.index({
    'aiFeedback.feedback': 'text',
    'aiFeedback.structuredAnalysis': 'text'
  }, {
    name: 'ai_feedback_text_search',
    weights: {
      'aiFeedback.feedback': 10,
      'aiFeedback.structuredAnalysis': 5
    },
    background: true
  });
}

// 예상 성능 개선 효과
export const MATCH_INDEX_PERFORMANCE_ESTIMATES = {
  user_recent_matches: {
    queryType: 'getUserRecentMatches',
    currentPerformance: 'COLLSCAN (100ms+)',
    optimizedPerformance: 'IXSCAN (5-10ms)',
    improvementFactor: '10-20x',
    memoryUsage: '~50MB (1M matches)'
  },
  user_stats_aggregation: {
    queryType: 'getUserMatchStats',
    currentPerformance: 'COLLSCAN (500ms+)',
    optimizedPerformance: 'IXSCAN (20-50ms)',
    improvementFactor: '10-25x',
    memoryUsage: '~30MB (recent matches only)'
  },
  ai_feedback_analysis: {
    queryType: 'getAIFeedbackByMatch',
    currentPerformance: 'COLLSCAN (200ms+)',
    optimizedPerformance: 'IXSCAN (5-15ms)',
    improvementFactor: '10-40x',
    memoryUsage: '~20MB (sparse index)'
  }
};