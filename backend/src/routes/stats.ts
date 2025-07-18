import express, { Request, Response, NextFunction } from 'express';
import ItemStats from '../models/ItemStats';
import TraitStats from '../models/TraitStats';
import statsAnalyzer from '../services/statsAnalyzer';
import { checkDBConnection } from '../middlewares/dbConnectionCheck';
import CursorPagination from '../utils/cursorPagination';

const router = express.Router();

interface StatsQuery {
  type?: string;
  sortBy?: string;
  order?: string;
  limit?: string;
  minGames?: string;
}

interface CursorStatsQuery {
  cursor?: string;
  type?: string;
  sortBy?: string;
  order?: string;
  limit?: string;
  minGames?: string;
}

interface AnalyzeBody {
  type?: 'items' | 'traits' | 'all';
}

router.get('/items', checkDBConnection, async (_req: Request<{}, {}, {}, StatsQuery>, _res: Response, _next: NextFunction) => {
  try {
    const { 
      type, 
      sortBy = 'winRate', 
      order = 'desc', 
      limit = '50',
      minGames = '10' 
    } = _req.query;

    let query: any = { totalGames: { $gte: parseInt(minGames) } };
    
    if (type && type !== 'all') {
      query.itemType = type;
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: { [key: string]: 1 | -1 } = {};
    sortObj[sortBy] = sortOrder as 1 | -1;

    const itemStats = await ItemStats.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .lean();

    _res.json({
      success: true,
      data: itemStats,
      total: itemStats.length
    });
  } catch (_error) {
    return _next(_error);
  }
});

router.get('/traits', checkDBConnection, async (_req: Request<{}, {}, {}, StatsQuery>, _res: Response, _next: NextFunction) => {
  try {
    const { 
      type, 
      sortBy = 'winRate', 
      order = 'desc', 
      limit = '50',
      minGames = '10' 
    } = _req.query;

    let query: any = { totalGames: { $gte: parseInt(minGames) } };
    
    if (type && type !== 'all') {
      query.traitType = type;
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: { [key: string]: 1 | -1 } = {};
    sortObj[sortBy] = sortOrder as 1 | -1;

    const traitStats = await TraitStats.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .lean();

    _res.json({
      success: true,
      data: traitStats,
      total: traitStats.length
    });
  } catch (_error) {
    return _next(_error);
  }
});

// 아이템 통계 조회 API - 커서 기반 페이지네이션
router.get('/items/cursor', checkDBConnection, async (_req: Request<{}, {}, {}, CursorStatsQuery>, _res: Response, _next: NextFunction) => {
  try {
    const { 
      cursor,
      type, 
      sortBy = 'winRate', 
      order = 'desc', 
      limit = '50',
      minGames = '10' 
    } = _req.query;

    // 필터 조건 설정
    let filter: any = { totalGames: { $gte: parseInt(minGames) } };
    
    if (type && type !== 'all') {
      filter.itemType = type;
    }

    // 커서 페이지네이션 옵션 설정
    const paginationOptions = {
      cursor: cursor as string,
      limit: Math.min(Number(limit), 100), // 최대 100개 제한
      sortField: sortBy as string,
      sortOrder: (order === 'asc' ? 1 : -1) as 1 | -1,
      filter
    };

    // 커서 기반 페이지네이션 실행
    const result = await CursorPagination.paginate(
      ItemStats.find(),
      paginationOptions
    );

    _res.json({
      success: true,
      data: result.items,
      pagination: CursorPagination.createPaginationMeta(result),
      meta: {
        sortField: paginationOptions.sortField,
        sortOrder: paginationOptions.sortOrder,
        limit: paginationOptions.limit,
        minGames: parseInt(minGames),
        type: type || 'all'
      }
    });
  } catch (_error) {
    return _next(_error);
  }
});

// 특성 통계 조회 API - 커서 기반 페이지네이션
router.get('/traits/cursor', checkDBConnection, async (_req: Request<{}, {}, {}, CursorStatsQuery>, _res: Response, _next: NextFunction) => {
  try {
    const { 
      cursor,
      type, 
      sortBy = 'winRate', 
      order = 'desc', 
      limit = '50',
      minGames = '10' 
    } = _req.query;

    // 필터 조건 설정
    let filter: any = { totalGames: { $gte: parseInt(minGames) } };
    
    if (type && type !== 'all') {
      filter.traitType = type;
    }

    // 커서 페이지네이션 옵션 설정
    const paginationOptions = {
      cursor: cursor as string,
      limit: Math.min(Number(limit), 100), // 최대 100개 제한
      sortField: sortBy as string,
      sortOrder: (order === 'asc' ? 1 : -1) as 1 | -1,
      filter
    };

    // 커서 기반 페이지네이션 실행
    const result = await CursorPagination.paginate(
      TraitStats.find(),
      paginationOptions
    );

    _res.json({
      success: true,
      data: result.items,
      pagination: CursorPagination.createPaginationMeta(result),
      meta: {
        sortField: paginationOptions.sortField,
        sortOrder: paginationOptions.sortOrder,
        limit: paginationOptions.limit,
        minGames: parseInt(minGames),
        type: type || 'all'
      }
    });
  } catch (_error) {
    return _next(_error);
  }
});

router.get('/traits/:traitId', checkDBConnection, async (_req: Request<{ traitId: string }>, _res: Response, _next: NextFunction) => {
  try {
    const { traitId } = _req.params;
    
    const traitStats = await TraitStats.findOne({ traitId }).lean();
    
    if (!traitStats) {
      return _res.status(404).json({
        success: false,
        message: '해당 특성의 통계를 찾을 수 없습니다.'
      });
    }

    _res.json({
      success: true,
      data: traitStats
    });
  } catch (_error) {
    return _next(_error);
  }
});

router.get('/items/:itemId', checkDBConnection, async (_req: Request<{ itemId: string }>, _res: Response, _next: NextFunction) => {
  try {
    const { itemId } = _req.params;
    
    const itemStats = await ItemStats.findOne({ itemId }).lean();
    
    if (!itemStats) {
      return _res.status(404).json({
        success: false,
        message: '해당 아이템의 통계를 찾을 수 없습니다.'
      });
    }

    _res.json({
      success: true,
      data: itemStats
    });
  } catch (_error) {
    return _next(_error);
  }
});

router.post('/analyze', checkDBConnection, async (_req: Request<{}, {}, AnalyzeBody>, _res: Response, _next: NextFunction) => {
  try {
    const { type = 'all' } = _req.body;
    
    let result;
    
    switch (type) {
      case 'items':
        result = await statsAnalyzer.analyzeItemStats();
        break;
      case 'traits':
        result = await statsAnalyzer.analyzeTraitStats();
        break;
      case 'all':
      default:
        result = await statsAnalyzer.analyzeAllStats();
        break;
    }

    _res.json({
      success: true,
      message: '통계 분석이 완료되었습니다.',
      data: result
    });
  } catch (_error) {
    return _next(_error);
  }
});

router.get('/summary', checkDBConnection, async (_req: Request, _res: Response, _next: NextFunction) => {
  try {
    const [itemCount, traitCount] = await Promise.all([
      ItemStats.countDocuments(),
      TraitStats.countDocuments()
    ]);

    const [topItems, topTraits] = await Promise.all([
      ItemStats.find({ totalGames: { $gte: 50 } })
        .sort({ winRate: -1 })
        .limit(5)
        .select('itemName winRate top4Rate totalGames')
        .lean(),
      TraitStats.find({ totalGames: { $gte: 50 } })
        .sort({ winRate: -1 })
        .limit(5)
        .select('traitName winRate top4Rate totalGames')
        .lean()
    ]);

    _res.json({
      success: true,
      data: {
        totalItems: itemCount,
        totalTraits: traitCount,
        topItems,
        topTraits
      }
    });
  } catch (_error) {
    return _next(_error);
  }
});

export default router;