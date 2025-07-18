// 캐시 관리 API
import express, { Request, Response } from 'express';
import metaCacheService from '../services/metaCacheService';
import { clearTFTDataCache, getTFTDataCacheStats } from '../services/tftData';
import logger from '../config/logger';

const router = express.Router();

// 캐시 상태 조회
router.get('/status', async (_req: Request, _res: Response) => {
  try {
    const status = await metaCacheService.getCacheStatus();
    _res.json({
      success: true,
      data: status
    });
  } catch (_error: any) {
    logger.error('캐시 상태 조회 실패:', _error);
    _res.status(500).json({
      success: false,
      _error: _error.message
    });
  }
});

// 캐시 통계
router.get('/stats', async (_req: Request, _res: Response) => {
  try {
    const stats = await metaCacheService.getCacheStats();
    _res.json({
      success: true,
      data: stats
    });
  } catch (_error: any) {
    logger.error('캐시 통계 조회 실패:', _error);
    _res.status(500).json({
      success: false,
      _error: _error.message
    });
  }
});

// 캐시 새로고침
router.post('/refresh', async (_req: Request, _res: Response) => {
  try {
    const success = await metaCacheService.refreshCache();
    
    if (success) {
      _res.json({
        success: true,
        message: '캐시 새로고침이 완료되었습니다.'
      });
    } else {
      _res.status(429).json({
        success: false,
        _error: '캐시 새로고침 간격 제한 또는 이미 진행 중입니다.'
      });
    }
  } catch (_error: any) {
    logger.error('캐시 새로고침 실패:', _error);
    _res.status(500).json({
      success: false,
      _error: _error.message
    });
  }
});

// TFT 데이터 캐시 클리어
router.post('/clear-tft', async (_req: Request, _res: Response) => {
  try {
    clearTFTDataCache();
    _res.json({
      success: true,
      message: 'TFT 데이터 캐시가 클리어되었습니다.'
    });
  } catch (_error: any) {
    logger.error('TFT 캐시 클리어 실패:', _error);
    _res.status(500).json({
      success: false,
      _error: _error.message
    });
  }
});

// TFT 데이터 캐시 통계 조회
router.get('/tft-stats', async (_req: Request, _res: Response) => {
  try {
    const stats = getTFTDataCacheStats();
    _res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (_error: any) {
    logger.error('TFT 데이터 캐시 통계 조회 실패:', _error);
    _res.status(500).json({
      success: false,
      _error: _error.message
    });
  }
});

export default router;