// backend/src/routes/deckBuilder.ts
import express, { Request, Response, NextFunction } from 'express';
import UserDeck from '../models/UserDeck';
import { getTFTDataWithLanguage } from '../services/tftData';
import logger from '../config/logger';
import { NotFoundError } from '../utils/errors';
import CursorPagination from '../utils/cursorPagination';
// import authMiddleware from '../middlewares/auth'; // (미래) 로그인 인증 미들웨어

const router = express.Router();

// 덱 생성 API
router.post('/', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    // _req.body 에는 deckName, placements 등이 포함됩니다.
    const newDeck = new UserDeck(_req.body);
    await newDeck.save();
    _res.status(201).json(newDeck);
  } catch (_error) {
    _next(_error);
  }
});

// 특정 덱 조회 API
router.get('/:deckId', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { deckId } = _req.params;
    
    const deck = await UserDeck.findById(deckId);
    if (!deck) {
      throw new NotFoundError('덱을 찾을 수 없습니다.');
    }
    
    // 공개 덱이 아닌 경우 (미래에 권한 체크 로직 추가)
    if (!deck.isPublic) {
      throw new NotFoundError('비공개 덱입니다.');
    }
    
    _res.json(deck);
  } catch (_error) {
    _next(_error);
  }
});

// 덱 목록 조회 API (예: 최신순, 인기순)
router.get('/', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = _req.query;
    
    // 페이지네이션 계산
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // 정렬 방식 설정
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder;
    
    // TFT 데이터 가져오기 (아이템/챔피언 정보 등)
    const tftData = await getTFTDataWithLanguage();
    
    // 공개 덱 목록 조회
    const decks = await UserDeck.find({ isPublic: true })
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // 총 개수 (페이지네이션 정보를 위함)
    const totalDecks = await UserDeck.countDocuments({ isPublic: true });
    
    // 응답 데이터 구조화
    const response = {
      decks: decks,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalDecks / limitNum),
        totalDecks: totalDecks,
        hasNextPage: skip + limitNum < totalDecks,
        hasPrevPage: pageNum > 1
      },
      tftData: tftData ? {
        champions: tftData.champions,
        items: tftData.items,
        traits: tftData.traits
      } : null
    };
    
    _res.json(response);
  } catch (_error) {
    logger.error('덱 목록 조회 중 오류 발생:', _error);
    _next(_error);
  }
});

// 덱 목록 조회 API - 커서 기반 페이지네이션
router.get('/cursor', async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const { cursor, limit = '20', sortBy = 'createdAt', order = 'desc' } = _req.query;
    
    // 커서 페이지네이션 옵션 설정
    const paginationOptions = {
      cursor: cursor as string,
      limit: Math.min(Number(limit), 50), // 최대 50개 제한
      sortField: sortBy as string,
      sortOrder: (order === 'asc' ? 1 : -1) as 1 | -1,
      filter: { isPublic: true } // 공개 덱만 조회
    };

    // TFT 데이터 가져오기 (아이템/챔피언 정보 등)
    const tftData = await getTFTDataWithLanguage();

    // 커서 기반 페이지네이션 실행
    const result = await CursorPagination.paginate(
      UserDeck.find(),
      paginationOptions
    );

    const response = {
      decks: result.items,
      pagination: CursorPagination.createPaginationMeta(result),
      meta: {
        sortField: paginationOptions.sortField,
        sortOrder: paginationOptions.sortOrder,
        limit: paginationOptions.limit
      },
      tftData: tftData ? {
        champions: tftData.champions,
        items: tftData.items,
        traits: tftData.traits
      } : null
    };
    
    _res.json(response);
  } catch (_error) {
    logger.error('커서 기반 덱 목록 조회 중 오류 발생:', _error);
    _next(_error);
  }
});

export default router;