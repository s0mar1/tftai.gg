import mongoose, { Document, Model, Schema } from 'mongoose';

// Ranker Document 인터페이스
export interface IRanker extends Document {
  puuid: string;
  summonerId: string;
  summonerName: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  leaguePoints: number;
  tier?: string;
  rank?: string;
  wins: number;
  losses: number;
  firstPlaceWins: number;
  droppedFromChallenger: boolean;
  droppedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Ranker 스키마
const RankerSchema = new Schema<IRanker>({
  puuid: {
    type: String,
    required: true,
    unique: true,
    // index: true, // unique: true가 이미 인덱스를 생성하므로 제거
  },
  summonerId: {
    type: String,
    required: true,
  },
  summonerName: {
    type: String,
    required: true,
  },
  gameName: { // 검색을 위한 실제 게임 이름
    type: String,
    required: true,
  },
  tagLine: { // 검색을 위한 태그
    type: String,
    required: true,
  },
  profileIconId: { // 프로필 아이콘 ID
    type: Number,
  },
  leaguePoints: {
    type: Number,
    required: true,
  },
  tier: {
    type: String,
  },
  rank: {
    type: String,
  },
  wins: {
    type: Number,
    required: true,
  },
  losses: {
    type: Number,
    required: true,
  },
  firstPlaceWins: { type: Number, default: 0 },
  droppedFromChallenger: { type: Boolean, default: false }, // 챌린저에서 제외된 랭커 표시
  droppedAt: { type: Date }, // 챌린저에서 제외된 시점
}, {
  timestamps: true,
});

// 성능 최적화를 위한 인덱스 추가
// puuid는 unique: true로 이미 인덱스가 생성되므로 중복 제거
RankerSchema.index({ leaguePoints: -1 }); // LP 기준 내림차순 정렬용 (기존)
RankerSchema.index({ gameName: 1, tagLine: 1 }); // 게임명+태그라인 검색용
RankerSchema.index({ tier: 1, rank: 1 }); // 티어+랭크별 조회용
RankerSchema.index({ wins: -1 }); // 승수별 정렬용
RankerSchema.index({ firstPlaceWins: -1 }); // 1등 수별 정렬용
RankerSchema.index({ updatedAt: -1 }); // 최근 업데이트순 정렬용
RankerSchema.index({ droppedFromChallenger: 1 }); // 챌린저 제외 여부 조회용
RankerSchema.index({ droppedAt: -1 }); // 챌린저 제외 시점 정렬용

// 모델 생성 및 export
const Ranker: Model<IRanker> = mongoose.model<IRanker>('Ranker', RankerSchema);

export default Ranker;