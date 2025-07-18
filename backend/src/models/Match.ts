import mongoose, { Document, Model, Schema } from 'mongoose';

// AI Feedback 인터페이스
interface IAIFeedback {
  userPuuid: string;
  feedback?: string;
  structuredAnalysis?: any;
  analyzedAt: Date;
}

// Match Document 인터페이스
export interface IMatch extends Document {
  'metadata.match_id'?: string;
  metadata: any;
  info: any;
  aiFeedback: IAIFeedback[];
  createdAt: Date;
  updatedAt: Date;
  
  // 보안 강화를 위한 정적 메서드들은 스키마에서 직접 구현
}

// Match 스키마 (보안 강화)
const MatchSchema = new Schema<IMatch>({
  'metadata.match_id': {
    type: String,
    unique: true,
    required: false, 
    sparse: true,
    validate: {
      validator: function(v: string) {
        // 매치 ID 형식 검증 (영문, 숫자, 하이픈, 언더스코어만 허용)
        return !v || /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'Invalid match ID format'
    }
  },
  metadata: { 
    type: Object,
    validate: {
      validator: function(v: any) {
        // 메타데이터 크기 제한 (100KB)
        return !v || JSON.stringify(v).length < 100000;
      },
      message: 'Metadata too large'
    }
  },
  info: { 
    type: Object,
    validate: {
      validator: function(v: any) {
        // 게임 정보 크기 제한 (500KB)
        return !v || JSON.stringify(v).length < 500000;
      },
      message: 'Info data too large'
    }
  },
  aiFeedback: [{
    userPuuid: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          // PUUID 형식 검증 (영문, 숫자, 하이픈, 언더스코어만 허용, 70-80자)
          return /^[a-zA-Z0-9_-]{70,80}$/.test(v);
        },
        message: 'Invalid PUUID format'
      }
    },
    feedback: { 
      type: String, 
      required: false,
      maxlength: [10000, 'Feedback too long'] // 피드백 최대 길이 제한
    },
    structuredAnalysis: { 
      type: Object,
      validate: {
        validator: function(v: any) {
          // 구조화된 분석 크기 제한 (50KB)
          return !v || JSON.stringify(v).length < 50000;
        },
        message: 'Structured analysis too large'
      }
    },
    analyzedAt: { type: Date, default: Date.now }
  }]
}, {
  strict: true, // strict 모드로 변경하여 스키마에 정의되지 않은 필드 차단
  timestamps: true,
  // 보안 강화를 위한 추가 옵션
  minimize: false, // 빈 객체도 저장
  versionKey: false, // __v 필드 제거
});

// 🚀 성능 최적화를 위한 인덱스 추가 (최적화됨)
MatchSchema.index({ 'metadata.match_id': 1 }); // 매치 ID 검색용
MatchSchema.index({ 'info.game_datetime': -1 }); // 최신 게임순 정렬용
MatchSchema.index({ 'metadata.match_id': 1, 'aiFeedback.userPuuid': 1 }); // 복합 인덱스 (AI 분석 조회용)
MatchSchema.index({ createdAt: -1 }); // 생성일 기준 정렬용
// 'info.participants.puuid' 단일 인덱스 제거 - 아래 복합 인덱스에서 커버됨

// 🔍 새로운 텍스트 검색 인덱스 추가 (AI 피드백 검색용)
MatchSchema.index({ 
  'aiFeedback.feedback': 'text',
  'aiFeedback.structuredAnalysis': 'text'
}, {
  name: 'ai_feedback_text_search',
  weights: {
    'aiFeedback.feedback': 10,
    'aiFeedback.structuredAnalysis': 5
  }
});

// 📊 AI 피드백 분석을 위한 추가 인덱스
MatchSchema.index({ 'aiFeedback.userPuuid': 1, 'aiFeedback.analyzedAt': -1 }); // 사용자별 AI 분석 이력
MatchSchema.index({ 'aiFeedback.analyzedAt': -1 }); // 최근 AI 분석 순서

// 🎯 매치 분석을 위한 성능 최적화 인덱스 (Phase 2 최적화)
MatchSchema.index({ 
  'info.participants.puuid': 1, 
  'info.game_datetime': -1 
}); // 사용자별 최신 매치 조회 최적화 (Gemini 분석 기반)

// 🚀 Phase 2: 사용자 매치 통계 집계 최적화
MatchSchema.index({
  'info.game_datetime': -1,
  'info.participants.puuid': 1
}); // 날짜 범위 + 사용자 조회 최적화

// 보안 강화를 위한 정적 메서드들
MatchSchema.statics.findByMatchIdSecure = function(matchId: string): Promise<IMatch | null> {
  // 입력 검증
  if (!matchId || typeof matchId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(matchId)) {
    throw new Error('Invalid match ID');
  }
  
  return this.findOne({ 'metadata.match_id': matchId }).select({
    'metadata': 1,
    'info': 1,
    'aiFeedback': 1,
    'createdAt': 1,
    'updatedAt': 1
  }).lean();
};

MatchSchema.statics.findByUserPuuidSecure = function(userPuuid: string, limit: number = 10): Promise<IMatch[]> {
  // 입력 검증
  if (!userPuuid || typeof userPuuid !== 'string' || !/^[a-zA-Z0-9_-]{70,80}$/.test(userPuuid)) {
    throw new Error('Invalid user PUUID');
  }
  
  // 제한 검증
  const safeLimit = Math.min(Math.max(1, limit), 100); // 1-100 사이로 제한
  
  return this.find({ 'info.participants.puuid': userPuuid })
    .select({
      'metadata': 1,
      'info': 1,
      'aiFeedback': 1,
      'createdAt': 1,
      'updatedAt': 1
    })
    .sort({ 'info.game_datetime': -1 })
    .limit(safeLimit)
    .lean();
};

MatchSchema.statics.createSecure = function(matchData: any): Promise<IMatch> {
  // 입력 검증
  if (!matchData || typeof matchData !== 'object') {
    throw new Error('Invalid match data');
  }
  
  // 필수 필드 검증
  if (!matchData.metadata || !matchData.info) {
    throw new Error('Missing required fields');
  }
  
  // 메타데이터 크기 검증
  if (JSON.stringify(matchData.metadata).length > 100000) {
    throw new Error('Metadata too large');
  }
  
  // 게임 정보 크기 검증
  if (JSON.stringify(matchData.info).length > 500000) {
    throw new Error('Info data too large');
  }
  
  // 매치 ID 검증
  if (matchData.metadata.match_id && !/^[a-zA-Z0-9_-]+$/.test(matchData.metadata.match_id)) {
    throw new Error('Invalid match ID format');
  }
  
  return this.create(matchData);
};

MatchSchema.statics.updateAIFeedbackSecure = function(matchId: string, userPuuid: string, feedback: any): Promise<IMatch | null> {
  // 입력 검증
  if (!matchId || typeof matchId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(matchId)) {
    throw new Error('Invalid match ID');
  }
  
  if (!userPuuid || typeof userPuuid !== 'string' || !/^[a-zA-Z0-9_-]{70,80}$/.test(userPuuid)) {
    throw new Error('Invalid user PUUID');
  }
  
  if (!feedback || typeof feedback !== 'object') {
    throw new Error('Invalid feedback data');
  }
  
  // 피드백 크기 검증
  if (feedback.feedback && feedback.feedback.length > 10000) {
    throw new Error('Feedback too long');
  }
  
  if (feedback.structuredAnalysis && JSON.stringify(feedback.structuredAnalysis).length > 50000) {
    throw new Error('Structured analysis too large');
  }
  
  return this.findOneAndUpdate(
    { 'metadata.match_id': matchId, 'aiFeedback.userPuuid': { $ne: userPuuid } },
    { 
      $push: { 
        aiFeedback: {
          userPuuid,
          feedback: feedback.feedback,
          structuredAnalysis: feedback.structuredAnalysis,
          analyzedAt: new Date()
        }
      }
    },
    { new: true, runValidators: true }
  );
};

// 모델 생성 및 export
const Match: Model<IMatch> = mongoose.model<IMatch>('Match', MatchSchema);

export default Match;