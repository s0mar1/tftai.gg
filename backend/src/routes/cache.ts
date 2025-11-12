// 캐시 관리 API
import express, { Request, Response } from 'express';
import { metaCacheService } from '../services/metaDataService';
import { clearTFTDataCache, getTFTDataCacheStats } from '../services/tftData';
import asyncHandler from '../utils/asyncHandler';

// 언어별 메시지 정의
const messages = {
  ko: {
    refreshCompleted: '캐시 새로고침이 완료되었습니다.',
    refreshLimitOrInProgress: '캐시 새로고침 간격 제한 또는 이미 진행 중입니다.',
    tftDataCleared: 'TFT 데이터 캐시가 클리어되었습니다.'
  },
  en: {
    refreshCompleted: 'Cache refresh completed.',
    refreshLimitOrInProgress: 'Cache refresh rate limited or already in progress.',
    tftDataCleared: 'TFT data cache has been cleared.'
  },
  ja: {
    refreshCompleted: 'キャッシュ更新が完了しました。',
    refreshLimitOrInProgress: 'キャッシュ更新間隔制限または既に進行中です。',
    tftDataCleared: 'TFTデータキャッシュがクリアされました。'
  },
  zh: {
    refreshCompleted: '缓存刷新完成。',
    refreshLimitOrInProgress: '缓存刷新频率限制或已在进行中。',
    tftDataCleared: 'TFT数据缓存已清除。'
  }
};

// Accept-Language 헤더에서 언어 추출
function getLanguageFromRequest(req: Request): string {
  const acceptLanguage = req.headers['accept-language'] || '';
  const queryLang = req.query.lang as string;
  
  // 쿼리 파라미터 우선
  if (queryLang && messages[queryLang as keyof typeof messages]) {
    return queryLang;
  }
  
  // Accept-Language 헤더에서 추출
  const languages = acceptLanguage.split(',').map(lang => {
    const parts = lang.split(';');
    return parts[0]?.trim() || lang.trim();
  });
  
  for (const lang of languages) {
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('en')) return 'en';
  }
  
  return 'ko'; // 기본값
}

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
  const lang = getLanguageFromRequest(_req);
  const langMessages = messages[lang as keyof typeof messages];
  const success = await metaCacheService.refreshCache();
  
  if (success) {
    _res.json({
      success: true,
      message: langMessages.refreshCompleted
    });
  } else {
    _res.status(429).json({
      success: false,
      error: langMessages.refreshLimitOrInProgress
    });
  }
}));

// TFT 데이터 캐시 클리어
router.post('/clear-tft', asyncHandler(async (_req: Request, _res: Response) => {
  const lang = getLanguageFromRequest(_req);
  const langMessages = messages[lang as keyof typeof messages];
  clearTFTDataCache();
  _res.json({
    success: true,
    message: langMessages.tftDataCleared
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