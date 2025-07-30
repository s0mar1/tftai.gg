import mongoose, { Document, Model, Schema } from 'mongoose';

// UnitPlacement 인터페이스
interface IUnitPlacement {
  unitApiName: string;
  x: number;
  y: number;
}

// UserDeck Document 인터페이스
export interface IUserDeck extends Document {
  deckName: string;
  authorPuuid?: string;
  authorName?: string;
  description?: string;
  coreUnits: string[];
  placements: IUnitPlacement[];
  version: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// UnitPlacement 스키마
const UnitPlacementSchema = new Schema<IUnitPlacement>({
  unitApiName: { type: String, required: true },
  x: { type: Number, required: true }, // 헥사곤 그리드 x 좌표
  y: { type: Number, required: true }, // 헥사곤 그리드 y 좌표
}, { _id: false });

// UserDeck 스키마
const UserDeckSchema = new Schema<IUserDeck>({
  deckName: { type: String, required: true, trim: true },
  authorPuuid: { type: String, index: true }, // 작성자 (추후 로그인 기능 연동)
  authorName: { type: String },
  description: { type: String }, // 덱 설명 및 공략
  coreUnits: [{ type: String }], // 이 덱의 핵심 유닛 apiName 목록
  placements: [UnitPlacementSchema], // 유닛 배치 정보
  version: { type: String, default: "Set15" }, // TFT 시즌 정보
  isPublic: { type: Boolean, default: true }, // 공개/비공개 여부
}, { timestamps: true });

// 🚀 인덱스 최적화 - 사용자 덱 조회 성능 향상
// 1. 기본 조회 인덱스 (authorPuuid는 이미 설정됨)
UserDeckSchema.index({ deckName: 1 }); // 덱 이름으로 검색
UserDeckSchema.index({ isPublic: 1 }); // 공개 덱 필터링

// 2. 복합 인덱스 (사용자별 덱 조회 최적화)
UserDeckSchema.index({ authorPuuid: 1, createdAt: -1 }); // 사용자별 최신 덱 순
UserDeckSchema.index({ isPublic: 1, createdAt: -1 }); // 공개 덱 최신 순

// 3. 버전별 인덱스 (시즌별 덱 조회)
UserDeckSchema.index({ version: 1, isPublic: 1 }); // 시즌별 공개 덱
UserDeckSchema.index({ version: 1, createdAt: -1 }); // 시즌별 최신 덱

// 4. 핵심 유닛 기반 인덱스 (유닛별 덱 검색)
UserDeckSchema.index({ coreUnits: 1 }); // 특정 유닛을 포함한 덱 검색
UserDeckSchema.index({ coreUnits: 1, isPublic: 1 }); // 공개된 유닛별 덱

// 5. 텍스트 검색 인덱스 (덱 이름 및 설명 검색)
UserDeckSchema.index({ 
  deckName: 'text', 
  description: 'text',
  authorName: 'text'
}, {
  name: 'deck_text_search',
  weights: {
    deckName: 10,
    description: 5,
    authorName: 3
  }
});

// 6. 날짜 기반 인덱스 (최근 생성/수정 덱 조회)
UserDeckSchema.index({ createdAt: -1 }); // 최신 생성 순
UserDeckSchema.index({ updatedAt: -1 }); // 최신 수정 순

// 모델 생성 및 export
const UserDeck: Model<IUserDeck> = mongoose.model<IUserDeck>('UserDeck', UserDeckSchema);

export default UserDeck;