import mongoose, { Document, Model, Schema } from 'mongoose';

// SummonerData Document 인터페이스
export interface ISummonerData extends Document {
  puuid: string;
  gameName: string;
  tagLine: string;
  data: any;
  lastUpdated: Date;
}

// SummonerData 스키마
const SummonerDataSchema = new Schema<ISummonerData>({
  // 고유 식별자
  puuid: {
    type: String,
    required: true,
    unique: true,
    // index: true, // unique: true가 이미 인덱스를 생성하므로 제거
  },
  gameName: {
    type: String,
    required: true,
  },
  tagLine: {
    type: String,
    required: true,
  },
  // 캐시된 데이터 본문
  // 프론트엔드로 전달되는 account, league, matches 객체를 그대로 저장
  data: {
    type: Object,
    required: true,
  },
  // 마지막 갱신 시간
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// 성능 최적화를 위한 인덱스 추가
// puuid는 unique: true로 이미 인덱스가 생성되므로 중복 제거
SummonerDataSchema.index({ gameName: 1, tagLine: 1 }); // 게임명+태그라인 검색용
SummonerDataSchema.index({ lastUpdated: -1 }); // 최근 업데이트순 정렬용
SummonerDataSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 3600 }); // 1시간 후 자동 삭제 (TTL)

// 모델 생성 및 export
const SummonerData: Model<ISummonerData> = mongoose.model<ISummonerData>('SummonerData', SummonerDataSchema);

export default SummonerData;