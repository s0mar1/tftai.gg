import mongoose, { Document, Model, Schema } from 'mongoose';

// 다국어 이름 저장을 위한 인터페이스
interface ILocaleName {
  ko: string;
  en: string;
  ja: string;
  zh: string;
}

// CoreUnit 인터페이스
interface ICoreUnit {
  name: ILocaleName; // 다국어 이름
  apiName: string;
  image_url: string;
  cost: number;
  traits: string[]; // 특성 API 이름들
  recommendedItems: {
    name: ILocaleName; // 다국어 이름
    image_url: string;
  }[];
}

// DeckTier Document 인터페이스
export interface IDeckTier extends Document {
  deckKey: string;
  tierRank?: string;
  tierOrder?: number;
  carryChampionName: ILocaleName; // 다국어 이름
  mainTraitName?: ILocaleName; // 다국어 이름
  coreUnits: ICoreUnit[];
  totalGames: number;
  top4Count: number;
  winCount: number;
  averagePlacement: number;
  createdAt: Date;
  updatedAt: Date;
}

// 다국어 이름 저장을 위한 스키마
const LocaleNameSchema = new Schema({
  ko: { type: String, required: true },
  en: { type: String, required: true },
  ja: { type: String, required: true },
  zh: { type: String, required: true },
}, { _id: false });


// DeckTier 스키마
const DeckTierSchema = new Schema<IDeckTier>({
  deckKey: { type: String, required: true, unique: true },
  tierRank: { type: String },
  tierOrder: { type: Number },
  carryChampionName: { type: LocaleNameSchema, required: true },
  mainTraitName: { type: LocaleNameSchema },
  
  coreUnits: [{
    name: LocaleNameSchema,
    apiName: String,
    image_url: String,
    cost: Number,
    traits: [String], // 특성 API 이름 배열
    recommendedItems: [{
        name: LocaleNameSchema,
        image_url: String,
    }]
  }],
  
  totalGames: { type: Number, default: 0 },
  top4Count: { type: Number, default: 0 },
  winCount: { type: Number, default: 0 },
  averagePlacement: { type: Number, default: 0 },
}, { timestamps: true });

// 성능 최적화를 위한 인덱스 추가
// deckKey 인덱스는 이미 unique: true로 자동 생성됨

// 🚀 Phase 2: 티어리스트 조회 최적화 (Gemini 분석 기반)
DeckTierSchema.index({ tierOrder: 1, averagePlacement: 1 }); // 기존 유지
DeckTierSchema.index({ 'carryChampionName.ko': 1 }); // 한국어 이름으로 인덱싱
DeckTierSchema.index({ 'carryChampionName.en': 1 }); // 영어 이름으로 인덱싱
DeckTierSchema.index({ 'mainTraitName.ko': 1 });
DeckTierSchema.index({ 'mainTraitName.en': 1 });

// 🎯 집계 쿼리 최적화 (aggregationService 개선)
DeckTierSchema.index({ totalGames: -1, winCount: -1, averagePlacement: 1 }); // 메타 덱 집계용
DeckTierSchema.index({ totalGames: 1 }); // 최소 게임 수 필터링용
DeckTierSchema.index({ averagePlacement: 1 }); // 평균 등수 정렬용

// 텍스트 검색을 위한 인덱스 (다국어 필드 지정)
DeckTierSchema.index({ 
  'deckKey': 'text', 
  'carryChampionName.ko': 'text', 
  'carryChampionName.en': 'text',
  'mainTraitName.ko': 'text',
  'mainTraitName.en': 'text'
}, { 
  weights: { 
    'deckKey': 10, 
    'carryChampionName.ko': 5,
    'carryChampionName.en': 5, 
    'mainTraitName.ko': 3,
    'mainTraitName.en': 3 
  },
  default_language: "none" // 다국어 텍스트 인덱싱 시 권장
});


// 모델 생성 및 export
const DeckTier: Model<IDeckTier> = mongoose.model<IDeckTier>('DeckTier', DeckTierSchema);

export default DeckTier;
