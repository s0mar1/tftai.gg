import express, { Request, Response, NextFunction } from 'express';
import { translateUITexts, translateAllLanguages } from '../services/translationService';
import cacheManager from '../services/cacheManager';
import asyncHandler from '../utils/asyncHandler';
import { getDirname } from '../utils/pathUtils';

const router = express.Router();

/**
 * @swagger
 * /translation:
 *   get:
 *     summary: 번역 API 정보를 조회합니다.
 *     description: |
 *       번역 API의 사용 가능한 엔드포인트와 기능을 안내합니다.
 *       - UI 텍스트 다국어 번역
 *       - 번역 캐시 관리
 *       - 지원 언어: 한국어(ko), 영어(en), 일본어(ja), 중국어(zh)
 *     tags: [Translation]
 *     responses:
 *       200:
 *         description: API 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: "TFT Translation API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                   example: "TFT UI 텍스트 다국어 번역 서비스를 제공합니다."
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                         example: "POST"
 *                       path:
 *                         type: string
 *                         example: "/api/translation/ui"
 *                       description:
 *                         type: string
 *                         example: "UI 텍스트 번역"
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [
 *                     "UI 텍스트 자동 번역",
 *                     "4개 언어 지원 (ko, en, ja, zh)",
 *                     "번역 캐시 관리",
 *                     "강제 업데이트 지원",
 *                     "일괄 번역 기능",
 *                     "Google Translate API 기반"
 *                   ]
 *                 supportedLanguages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                   example: [
 *                     {"code": "ko", "name": "한국어"},
 *                     {"code": "en", "name": "English"},
 *                     {"code": "ja", "name": "日本語"},
 *                     {"code": "zh", "name": "中文"}
 *                   ]
 *                 cacheInfo:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     ttl:
 *                       type: string
 *                       example: "24 hours"
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-07-15T10:30:00.000Z"
 */
router.get('/', (_req: Request, _res: Response) => {
  _res.json({
    success: true,
    service: 'TFT Translation API',
    version: '1.0.0',
    description: 'TFT UI 텍스트 다국어 번역 서비스를 제공합니다.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/translation/ui',
        description: 'UI 텍스트 번역',
        requiredParams: ['targetLanguage'],
        optionalParams: ['forceUpdate']
      },
      {
        method: 'POST',
        path: '/api/translation/ui/all',
        description: '모든 언어 일괄 번역'
      },
      {
        method: 'GET',
        path: '/api/translation/cache/status',
        description: '번역 캐시 상태 확인'
      },
      {
        method: 'POST',
        path: '/api/translation/cache/invalidate',
        description: '캐시 무효화',
        optionalParams: ['targetLanguage']
      },
      {
        method: 'GET',
        path: '/api/translation/status',
        description: '번역 파일 상태 확인'
      }
    ],
    features: [
      'UI 텍스트 자동 번역',
      '4개 언어 지원 (ko, en, ja, zh)',
      '번역 캐시 관리',
      '강제 업데이트 지원',
      '일괄 번역 기능',
      'Google Translate API 기반'
    ],
    supportedLanguages: [
      { code: 'ko', name: '한국어' },
      { code: 'en', name: 'English' },
      { code: 'ja', name: '日本語' },
      { code: 'zh', name: '中文' }
    ],
    cacheInfo: {
      enabled: true,
      ttl: '24 hours',
      description: '번역 결과를 24시간 동안 캐시하여 성능 최적화'
    },
    lastUpdated: new Date().toISOString()
  });
});

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
  
  // ESM 호환 방식으로 경로 생성
  const localesDir = path.join(getDirname(import.meta.url), '../../..', 'frontend/public/locales');
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