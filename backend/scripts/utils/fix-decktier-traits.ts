/**
 * DeckTier 데이터에 traits 필드 추가 스크립트
 * TypeScript로 변환하여 타입 안전성 확보
 */

import mongoose, { Document, Schema } from 'mongoose';
import { config } from 'dotenv';
import { validateEnv } from '../../src/config/envSchema.js';

// 환경 변수 로드 및 검증
config();
const env = validateEnv(process.env);

/**
 * CoreUnit 인터페이스 정의
 */
interface CoreUnit {
  name: Record<string, string>;
  apiName: string;
  image_url: string;
  cost: number;
  traits: string[];
  recommendedItems: unknown[];
}

/**
 * DeckTier 문서 인터페이스
 */
interface DeckTierDocument extends Document {
  deckKey: string;
  tierRank: string;
  tierOrder: number;
  carryChampionName: Record<string, string>;
  mainTraitName: Record<string, string>;
  coreUnits: CoreUnit[];
  totalGames: number;
  top4Count: number;
  winCount: number;
  averagePlacement: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB 연결 함수
 */
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ MongoDB 연결 완료');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
  }
};

/**
 * DeckTier 스키마 정의 (기존과 동일하지만 타입 안전성 추가)
 */
const DeckTierSchema = new Schema<DeckTierDocument>({
  deckKey: { type: String, required: true },
  tierRank: { type: String, required: true },
  tierOrder: { type: Number, required: true },
  carryChampionName: { type: Object, required: true },
  mainTraitName: { type: Object, required: true },
  coreUnits: [{
    name: { type: Object, required: true },
    apiName: { type: String, required: true },
    image_url: { type: String, required: true },
    cost: { type: Number, required: true },
    traits: [{ type: String }], // 새로 추가될 필드
    recommendedItems: [{ type: Schema.Types.Mixed }]
  }],
  totalGames: { type: Number, required: true },
  top4Count: { type: Number, required: true },
  winCount: { type: Number, required: true },
  averagePlacement: { type: Number, required: true }
}, { timestamps: true });

const DeckTier = mongoose.model<DeckTierDocument>('DeckTier', DeckTierSchema);

/**
 * 샘플 특성 데이터 (실제로는 TFT API에서 가져와야 함)
 * TODO: TFT Static Data API에서 동적으로 가져오도록 개선
 */
const SAMPLE_CHAMPION_TRAITS: Record<string, string[]> = {
  'TFT14_Akali': ['TFT14_Edgerunner', 'TFT14_Armorclad'],
  'TFT14_Azir': ['TFT14_DiviCorp', 'TFT14_Cutter'],
  'TFT14_Blitzcrank': ['TFT14_Suits', 'TFT14_Vanguard'],
  'TFT14_Briar': ['TFT14_Streetdemon', 'TFT14_Bruiser'],
  'TFT14_Caitlyn': ['TFT14_Immortal', 'TFT14_Marksman'],
  // 필요에 따라 더 많은 챔피언 데이터 추가
} as const;

/**
 * DeckTier 데이터의 traits 필드를 수정하는 메인 함수
 */
const fixDeckTierTraits = async (): Promise<void> => {
  try {
    await connectDB();
    
    console.log('🔧 DeckTier 데이터 수정 시작...');
    
    // 모든 DeckTier 문서 가져오기
    const deckTiers = await DeckTier.find({});
    console.log(`📊 총 ${deckTiers.length}개의 DeckTier 문서를 찾았습니다.`);
    
    let updatedCount = 0;
    
    for (const deckTier of deckTiers) {
      let needsUpdate = false;
      
      // coreUnits에 traits 필드 추가
      const updatedCoreUnits: CoreUnit[] = deckTier.coreUnits.map((unit) => {
        if (!unit.traits || unit.traits.length === 0) {
          needsUpdate = true;
          // 샘플 데이터에서 특성 정보 가져오기 (실제로는 TFT API에서)
          const traits = SAMPLE_CHAMPION_TRAITS[unit.apiName] || [];
          
          return {
            ...unit.toObject(),
            traits
          } as CoreUnit;
        }
        return unit;
      });
      
      if (needsUpdate) {
        await DeckTier.updateOne(
          { _id: deckTier._id },
          { $set: { coreUnits: updatedCoreUnits } }
        );
        updatedCount++;
        console.log(`✅ ${deckTier.deckKey} 업데이트 완료`);
      }
    }
    
    console.log(`🎉 총 ${updatedCount}개의 DeckTier 문서를 업데이트했습니다.`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB 연결 종료');
  }
};

/**
 * 스크립트 실행 (CLI에서 직접 호출될 때만)
 */
if (require.main === module) {
  fixDeckTierTraits()
    .then(() => {
      console.log('✨ 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { fixDeckTierTraits };