import mongoose, { Document, Model, Schema } from 'mongoose';

// LevelBoard 인터페이스
interface ILevelBoard {
  level: number;
  board: string;
  notes?: string;
}

// DeckGuide Document 인터페이스
export interface IDeckGuide extends Document {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  initialDeckLevel: number;
  level_boards: ILevelBoard[];
  play_tips: string[];
  recommended_items: string[];
  recommended_augments: string[];
  createdAt: Date;
  updatedAt: Date;
}

// LevelBoard 스키마
const LevelBoardSchema = new Schema<ILevelBoard>({
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  board: {
    type: String, // 예: 챔피언 배치 정보를 담은 JSON 문자열 또는 커스텀 코드
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
});

// DeckGuide 스키마
const DeckGuideSchema = new Schema<IDeckGuide>({
  title: {
    type: String,
    required: [true, '공략 제목을 입력해주세요.'],
    trim: true,
    maxlength: [100, '제목은 100자를 초과할 수 없습니다.']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  initialDeckLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 8 // 기본값 설정
  },
  level_boards: [LevelBoardSchema],
  play_tips: {
    type: [String],
    default: []
  },
  recommended_items: {
    type: [String], // 아이템 API 이름 목록
    default: []
  },
  recommended_augments: {
    type: [String], // 증강체 API 이름 목록
    default: []
  }
}, { timestamps: true });

// 성능 최적화를 위한 인덱스 추가
DeckGuideSchema.index({ title: 1 }); // 제목별 검색용
DeckGuideSchema.index({ difficulty: 1 }); // 난이도별 조회용
DeckGuideSchema.index({ initialDeckLevel: 1 }); // 레벨별 조회용
DeckGuideSchema.index({ createdAt: -1 }); // 최신 작성순 정렬용
DeckGuideSchema.index({ updatedAt: -1 }); // 최근 수정순 정렬용

// 모델 생성 및 export
const DeckGuide: Model<IDeckGuide> = mongoose.model<IDeckGuide>('DeckGuide', DeckGuideSchema);

export default DeckGuide;