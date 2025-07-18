import express, { Request, Response, NextFunction } from 'express';
import Ranker from '../models/Ranker';
import logger from '../config/logger';
import { validatePagination } from '../middlewares/validation';
import { checkDBConnection } from '../middlewares/dbConnectionCheck';
import CursorPagination from '../utils/cursorPagination';

const router = express.Router();

interface PaginatedRankingQuery {
  page?: string | number;
  limit?: string | number;
}

interface CursorRankingQuery {
  cursor?: string;
  limit?: string | number;
  sortField?: string;
  sortOrder?: string;
}

// GET /api/ranking?page=1&limit=50 (기존 offset 기반)
router.get('/', validatePagination, checkDBConnection, async (_req: Request<{}, {}, {}, PaginatedRankingQuery>, _res: Response, _next: NextFunction) => {
  try {
    const page = Number(_req.query.page) || 1;
    const limit = Number(_req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // DB에서 랭커 데이터를 LP순으로 정렬하여 가져옵니다.
    const rankers = await Ranker.find()
      .sort({ leaguePoints: -1 })
      .skip(skip)
      .limit(limit);

    // 전체 랭커 수를 구해서 총 페이지 수를 계산합니다.
    const totalRankers = await Ranker.countDocuments();
    const totalPages = Math.ceil(totalRankers / limit);

    _res.json({
      rankers,
      currentPage: page,
      totalPages,
    });
  } catch (_error: any) {
    logger.error('랭킹 정보 조회 중 에러 발생:', _error.message);
    _next(_error);
  }
});

// GET /api/ranking/cursor?cursor=xxx&limit=50 (새로운 커서 기반)
router.get('/cursor', checkDBConnection, async (_req: Request<{}, {}, {}, CursorRankingQuery>, _res: Response, _next: NextFunction) => {
  try {
    const options = CursorPagination.parseQueryParams(_req.query);
    
    // 랭킹 데이터는 leaguePoints 기준으로 정렬
    const paginationOptions = {
      ...options,
      sortField: _req.query.sortField || 'leaguePoints',
      sortOrder: (_req.query.sortOrder === '1' ? 1 : -1) as 1 | -1,
      limit: Math.min(Number(_req.query.limit) || 50, 100) // 최대 100개 제한
    };

    const result = await CursorPagination.paginate(
      Ranker.find(),
      paginationOptions
    );

    _res.json({
      rankers: result.items,
      pagination: CursorPagination.createPaginationMeta(result),
      meta: {
        sortField: paginationOptions.sortField,
        sortOrder: paginationOptions.sortOrder,
        limit: paginationOptions.limit
      }
    });
  } catch (_error: any) {
    logger.error('커서 기반 랭킹 정보 조회 중 에러 발생:', _error.message);
    _next(_error);
  }
});

export default router;