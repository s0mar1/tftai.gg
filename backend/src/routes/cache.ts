// 캐시 관리 API
import express, { Request, Response } from 'express';
import { metaCacheService } from '../services/metaDataService';
import { clearTFTDataCache, getTFTDataCacheStats } from '../services/tftData';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// 캐시 상태 조회
router.get('/status', asyncHandler(async (_req: Request, _res: Response) => {
  const status = await metaCacheService.getCacheStatus();
  _res.json({
    success: true,
    data: status
  });
}));

// 캐시 통계
router.get('/stats', asyncHandler(async (_req: Request, _res: Response) => {
  const stats = await metaCacheService.getCacheStats();
  _res.json({
    success: true,
    data: stats
  });
}));

// 캐시 새로고침
router.post('/refresh', asyncHandler(async (_req: Request, _res: Response) => {
  const success = await metaCacheService.refreshCache();
  
  if (success) {
    _res.json({
      success: true,
      message: '캐시 새로고침이 완료되었습니다.'
    });
  } else {
    _res.status(429).json({
      success: false,
      error: '캐시 새로고침 간격 제한 또는 이미 진행 중입니다.'
    });
  }
}));

// TFT 데이터 캐시 클리어
router.post('/clear-tft', asyncHandler(async (_req: Request, _res: Response) => {
  clearTFTDataCache();
  _res.json({
    success: true,
    message: 'TFT 데이터 캐시가 클리어되었습니다.'
  });
}));

// TFT 데이터 캐시 통계 조회
router.get('/tft-stats', asyncHandler(async (_req: Request, _res: Response) => {
  const stats = getTFTDataCacheStats();
  _res.json({
    success: true,
    data: {
      ...stats,
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;