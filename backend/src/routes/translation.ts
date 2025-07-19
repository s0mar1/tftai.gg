import express, { Request, Response, NextFunction } from 'express';
import { translateUITexts, translateAllLanguages } from '../services/translationService';
import cacheManager from '../services/cacheManager';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

interface UITranslationBody {
  targetLanguage: string;
  forceUpdate?: boolean;
}

interface CacheInvalidateBody {
  targetLanguage?: string;
}

// UI 텍스트 번역 API
router.post('/ui', asyncHandler(async (_req: Request<{}, {}, UITranslationBody>, _res: Response, _next: NextFunction) => {
  const { targetLanguage, forceUpdate = false } = _req.body;
  
  if (!targetLanguage) {
    return _res.status(400).json({
      success: false,
      error: 'targetLanguage는 필수입니다. (예: en, ja, zh)'
    });
  }

  // 지원하는 언어 확인
  const supportedLanguages = ['en', 'ja', 'zh'];
  if (!supportedLanguages.includes(targetLanguage)) {
    return _res.status(400).json({
      success: false,
      error: `지원하지 않는 언어입니다. 지원 언어: ${supportedLanguages.join(', ')}`
    });
  }

  // logger.info(`UI 번역 요청: ${targetLanguage}${forceUpdate ? ' (강제 업데이트)' : ''}`);
  const result = await translateUITexts(targetLanguage, forceUpdate);
  
  return _res.json(result);
}));

// 모든 언어 일괄 번역 API
router.post('/ui/all', asyncHandler(async (_req: Request, _res: Response, _next: NextFunction) => {
  // logger.info('모든 언어 UI 번역 시작...');
  const results = await translateAllLanguages();
  
  const summary = {
    success: true,
    message: '모든 언어 번역이 완료되었습니다.',
    results: results,
    totalLanguages: Object.keys(results).length,
    successCount: Object.values(results).filter(r => r.success).length,
    failureCount: Object.values(results).filter(r => !r.success).length
  };
  
  return _res.json(summary);
}));



// 번역 캐시 상태 확인 API
router.get('/cache/status', asyncHandler(async (_req: Request, _res: Response) => {
  const cacheStatus = cacheManager.getCacheStatus();
  
  return _res.json({
    success: true,
    ...cacheStatus
  });
}));

// 캐시 무효화 API
router.post('/cache/invalidate', asyncHandler(async (_req: Request<{}, {}, CacheInvalidateBody>, _res: Response) => {
  const { targetLanguage } = _req.body;
  
  cacheManager.invalidateCache(targetLanguage);
  
  return _res.json({
    success: true,
    message: targetLanguage 
      ? `${targetLanguage} 언어 캐시가 무효화되었습니다.`
      : '모든 번역 캐시가 무효화되었습니다.'
  });
}));

// 번역 상태 확인 API (기존 호환성)
router.get('/status', asyncHandler(async (_req: Request, _res: Response) => {
  const fs = await import('fs');
  const path = await import('path');
  
  // CommonJS 환경에서는 __dirname이 자동으로 사용 가능
  const localesDir = path.join(__dirname, '../../..', 'frontend/public/locales');
  const languages = ['ko', 'en', 'ja', 'zh'];
  
  const status: Record<string, any> = {};
  
  for (const lang of languages) {
    const filePath = path.join(localesDir, lang, 'translation.json');
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const textCount = JSON.stringify(data).match(/:/g)?.length || 0;
      
      status[lang] = {
        exists: true,
        lastModified: stats.mtime,
        fileSize: stats.size,
        estimatedTextCount: textCount
      };
    } else {
      status[lang] = {
        exists: false
      };
    }
  }
  
  return _res.json({
    success: true,
    status: status
  });
}));

export default router;