// 기본 모델 인터페이스
export interface BaseModel {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 공유 타입에서 임포트
import { Champion, Item, Trait } from '../shared/types';

// 덱 구성 인터페이스
export interface DeckComposition {
  units: Champion[];
  traits: Trait[];
  items: Item[];
}

// 덱 가이드 타입 (백엔드 전용)
export interface DeckGuide extends BaseModel {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  deck: DeckComposition;
  author?: string;
  tags?: string[];
}

// 사용자 덱 타입 (백엔드 전용)
export interface UserDeck extends BaseModel {
  userId: string;
  name: string;
  deck: DeckComposition;
  isPrivate: boolean;
  tags: string[];
}

// 기타 타입들은 공유 타입으로 이동됨