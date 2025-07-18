import mongoose, { Document, Model, Schema } from 'mongoose';

// ActivationLevel 인터페이스
interface IActivationLevel {
  level: number;
  games: number;
  wins: number;
  top4: number;
  winRate: number;
  top4Rate: number;
  averagePlacement: number;
}

// TraitStats Document 인터페이스
export interface ITraitStats extends Document {
  traitId: string;
  traitName: string;
  traitIcon?: string;
  traitType?: 'origin' | 'class' | 'unknown';
  totalGames: number;
  totalTop4: number;
  totalWins: number;
  winRate: number;
  top4Rate: number;
  averagePlacement: number;
  placementSum: number;
  activationLevels: IActivationLevel[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// TraitStats 스키마
const TraitStatsSchema = new Schema<ITraitStats>({
  traitId: {
    type: String,
    required: true,
    unique: true
  },
  traitName: {
    type: String,
    required: true
  },
  traitIcon: String,
  traitType: {
    type: String,
    enum: ['origin', 'class', 'unknown']
  },
  totalGames: {
    type: Number,
    default: 0
  },
  totalTop4: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  top4Rate: {
    type: Number,
    default: 0
  },
  averagePlacement: {
    type: Number,
    default: 0
  },
  placementSum: {
    type: Number,
    default: 0
  },
  activationLevels: [{
    level: Number,
    games: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    top4: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    top4Rate: { type: Number, default: 0 },
    averagePlacement: { type: Number, default: 0 }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 🚀 Phase 2: 인덱스 최적화 (Gemini 분석 기반)
// 1. 기본 조회용 인덱스 (traitId는 unique로 이미 인덱스 존재)
TraitStatsSchema.index({ traitName: 1 }); // 이름으로 검색
TraitStatsSchema.index({ traitType: 1 }); // 타입별 필터링

// 2. 🎯 필터링 + 정렬 복합 인덱스 (필드 순서 최적화)
TraitStatsSchema.index({ traitType: 1, winRate: -1 }); // 타입별 승률 정렬
TraitStatsSchema.index({ traitType: 1, top4Rate: -1 }); // 타입별 Top4 비율 정렬
TraitStatsSchema.index({ traitType: 1, averagePlacement: 1 }); // 타입별 평균 등수 정렬
TraitStatsSchema.index({ traitType: 1, totalGames: -1 }); // 타입별 게임 수 정렬

// 3. 날짜 기반 인덱스 (최근 업데이트 데이터 조회)
TraitStatsSchema.index({ lastUpdated: -1 }); // 최근 업데이트 순
TraitStatsSchema.index({ createdAt: -1 }); // 생성일 순

// 4. 게임 수 기반 인덱스 (충분한 데이터가 있는 특성만 조회)
TraitStatsSchema.index({ totalGames: -1 }); // 게임 수 순 정렬

// 5. 텍스트 검색 인덱스 (특성 이름 검색)
TraitStatsSchema.index({ traitName: 'text' });

// 모델 생성 및 export
const TraitStats: Model<ITraitStats> = mongoose.model<ITraitStats>('TraitStats', TraitStatsSchema);

export default TraitStats;