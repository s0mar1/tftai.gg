import mongoose, { Document, Model, Schema } from 'mongoose';

// ItemStats Document 인터페이스
export interface IItemStats extends Document {
  itemId: string;
  itemName: string;
  itemIcon?: string;
  itemType?: 'basic' | 'completed' | 'ornn' | 'radiant' | 'emblem';
  totalGames: number;
  totalTop4: number;
  totalWins: number;
  winRate: number;
  top4Rate: number;
  averagePlacement: number;
  placementSum: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ItemStats 스키마
const ItemStatsSchema = new Schema<IItemStats>({
  itemId: {
    type: String,
    required: true,
    unique: true
  },
  itemName: {
    type: String,
    required: true
  },
  itemIcon: String,
  itemType: {
    type: String,
    enum: ['basic', 'completed', 'ornn', 'radiant', 'emblem']
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
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 🚀 Phase 2: 인덱스 최적화 (Gemini 분석 기반)
// 1. 기본 조회용 인덱스 (itemId는 unique로 이미 인덱스 존재)
ItemStatsSchema.index({ itemName: 1 }); // 이름으로 검색
ItemStatsSchema.index({ itemType: 1 }); // 타입별 필터링

// 2. 🎯 필터링 + 정렬 복합 인덱스 (필드 순서 최적화)
ItemStatsSchema.index({ itemType: 1, winRate: -1 }); // 타입별 승률 정렬
ItemStatsSchema.index({ itemType: 1, top4Rate: -1 }); // 타입별 Top4 비율 정렬
ItemStatsSchema.index({ itemType: 1, averagePlacement: 1 }); // 타입별 평균 등수 정렬
ItemStatsSchema.index({ itemType: 1, totalGames: -1 }); // 타입별 게임 수 정렬

// 3. 날짜 기반 인덱스 (최근 업데이트 데이터 조회)
ItemStatsSchema.index({ lastUpdated: -1 }); // 최근 업데이트 순
ItemStatsSchema.index({ createdAt: -1 }); // 생성일 순

// 4. 게임 수 기반 인덱스 (충분한 데이터가 있는 아이템만 조회)
ItemStatsSchema.index({ totalGames: -1 }); // 게임 수 순 정렬

// 5. 텍스트 검색 인덱스 (아이템 이름 검색)
ItemStatsSchema.index({ itemName: 'text' });

// 모델 생성 및 export
const ItemStats: Model<IItemStats> = mongoose.model<IItemStats>('ItemStats', ItemStatsSchema);

export default ItemStats;