/**
 * 티어리스트 테스트 데이터 초기화 스크립트
 * DeckTier 컬렉션에 샘플 데이터를 삽입합니다.
 */

import mongoose from 'mongoose';
import DeckTier from '../src/models/DeckTier';
import logger from '../src/config/logger';

// 환경변수 로드
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tft-meta';

// 샘플 티어리스트 데이터
const sampleTierlistData = [
  {
    deckKey: 'reroll_champions_s_tier',
    tierRank: 'S',
    tierOrder: 1,
    carryChampionName: {
      ko: '리롤 챔피언',
      en: 'Reroll Champions',
      ja: 'リロールチャンピオン',
      zh: '重掷英雄'
    },
    mainTraitName: {
      ko: '사기꾼',
      en: 'Rogue',
      ja: 'ならず者',
      zh: '盗贼'
    },
    coreUnits: [
      {
        name: {
          ko: '트위스티드 페이트',
          en: 'Twisted Fate',
          ja: 'ツイステッド・フェイト',
          zh: '崔斯特'
        },
        apiName: 'TwistedFate',
        image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/TwistedFate.png',
        cost: 4,
        traits: ['rogue', 'mage'],
        recommendedItems: [
          {
            name: {
              ko: '무한의 대검',
              en: 'Infinity Edge',
              ja: 'インフィニティ・エッジ',
              zh: '无尽之刃'
            },
            image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/3031.png'
          }
        ]
      },
      {
        name: {
          ko: '아칼리',
          en: 'Akali',
          ja: 'アカリ',
          zh: '阿卡丽'
        },
        apiName: 'Akali',
        image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Akali.png',
        cost: 3,
        traits: ['rogue', 'assassin'],
        recommendedItems: []
      },
      {
        name: {
          ko: '베이가',
          en: 'Veigar',
          ja: 'ベイガー',
          zh: '维迦'
        },
        apiName: 'Veigar',
        image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Veigar.png',
        cost: 5,
        traits: ['mage', 'yordle'],
        recommendedItems: []
      },
      {
        name: {
          ko: '룰루',
          en: 'Lulu',
          ja: 'ルル',
          zh: '璐璐'
        },
        apiName: 'Lulu',
        image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Lulu.png',
        cost: 1,
        traits: ['mage', 'yordle'],
        recommendedItems: []
      }
    ],
    totalGames: 1250,
    top4Count: 750,
    winCount: 200,
    averagePlacement: 3.8
  },
  {
    deckKey: 'assassin_comp_a_tier',
    tierRank: 'A',
    tierOrder: 2,
    carryChampionName: {
      ko: '암살자 조합',
      en: 'Assassin Comp',
      ja: 'アサシン構成',
      zh: '刺客阵容'
    },
    mainTraitName: {
      ko: '암살자',
      en: 'Assassin',
      ja: 'アサシン',
      zh: '刺客'
    },
    coreUnits: [
      {
        name: {
          ko: '아칼리',
          en: 'Akali',
          ja: 'アカリ',
          zh: '阿卡丽'
        },
        apiName: 'Akali',
        image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Akali.png',
        cost: 3,
        traits: ['assassin', 'ninja'],
        recommendedItems: [
          {
            name: {
              ko: '구인수의 격노검',
              en: 'Guinsoo\'s Rageblade',
              ja: 'グインソー・レイジブレード',
              zh: '鬼索的狂暴之刃'
            },
            image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/3124.png'
          }
        ]
      }
    ],
    totalGames: 980,
    top4Count: 520,
    winCount: 145,
    averagePlacement: 4.2
  },
  {
    deckKey: 'magic_damage_b_tier',
    tierRank: 'B',
    tierOrder: 3,
    carryChampionName: {
      ko: '마법 딜러',
      en: 'Magic Damage',
      ja: '魔法ダメージ',
      zh: '魔法伤害'
    },
    mainTraitName: {
      ko: '마법사',
      en: 'Mage',
      ja: 'メイジ',
      zh: '法师'
    },
    coreUnits: [
      {
        name: {
          ko: '베이가',
          en: 'Veigar',
          ja: 'ベイガー',
          zh: '维迦'
        },
        apiName: 'Veigar',
        image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Veigar.png',
        cost: 5,
        traits: ['mage', 'yordle'],
        recommendedItems: [
          {
            name: {
              ko: '라바돈의 죽음모자',
              en: 'Rabadon\'s Deathcap',
              ja: 'ラバドン・デスキャップ',
              zh: '拉巴顿的死亡之帽'
            },
            image_url: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/3089.png'
          }
        ]
      }
    ],
    totalGames: 750,
    top4Count: 320,
    winCount: 85,
    averagePlacement: 4.6
  }
];

async function initTierlistData() {
  try {
    // MongoDB 연결
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB 연결 성공');

    // 기존 데이터 삭제 (선택적)
    await DeckTier.deleteMany({});
    logger.info('기존 DeckTier 데이터 삭제 완료');

    // 샘플 데이터 삽입
    await DeckTier.insertMany(sampleTierlistData);
    logger.info(`${sampleTierlistData.length}개의 샘플 티어리스트 데이터 삽입 완료`);

    // 삽입된 데이터 확인
    const insertedCount = await DeckTier.countDocuments();
    logger.info(`총 ${insertedCount}개의 DeckTier 문서가 데이터베이스에 저장됨`);

    console.log('✅ 티어리스트 데이터 초기화 완료');
  } catch (error) {
    logger.error('티어리스트 데이터 초기화 실패:', error);
    console.error('❌ 초기화 실패:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('MongoDB 연결 해제');
  }
}

// 스크립트 실행 (ESM 방식)
if (import.meta.url === `file://${process.argv[1]}`) {
  initTierlistData();
}

export default initTierlistData;